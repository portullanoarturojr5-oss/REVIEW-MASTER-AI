import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";
import { DocumentFileType, FolderDocument } from "../types";

// Configure pdfjs worker to load from CDN fallback if local worker is unavailable
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.10.38"}/pdf.worker.min.mjs`;
}

export interface ParsedDocument {
  text: string;
  fileName: string;
  sourceType: "notes" | "pdf" | "pptx" | "docx";
  fileType: DocumentFileType;
  sizeBytes: number;
  pdfBase64?: string;
  pageOrSlideCount?: number;
}

export async function parseUploadedFile(file: File): Promise<ParsedDocument> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const sizeBytes = file.size;

  if (extension === "docx") {
    const text = await parseDocx(file);
    return {
      text,
      fileName: file.name,
      sourceType: "docx",
      fileType: "docx",
      sizeBytes,
    };
  }

  if (extension === "pptx") {
    const { text, slideCount } = await parsePptx(file);
    return {
      text,
      fileName: file.name,
      sourceType: "pptx",
      fileType: "pptx",
      sizeBytes,
      pageOrSlideCount: slideCount,
    };
  }

  if (extension === "pdf") {
    const { text, base64, pageCount } = await parsePdf(file);
    return {
      text,
      fileName: file.name,
      sourceType: "pdf",
      fileType: "pdf",
      sizeBytes,
      pdfBase64: base64,
      pageOrSlideCount: pageCount,
    };
  }

  // Fallback for .txt, .md, or other plain text files
  const text = await file.text();
  return {
    text,
    fileName: file.name,
    sourceType: "notes",
    fileType: "txt",
    sizeBytes,
  };
}

/**
 * Combines multiple folder documents into a single strictly delimited source corpus
 * for the AI study generator.
 */
export function combineDocumentsCorpus(docs: FolderDocument[]): {
  combinedText: string;
  titleHint: string;
  summaryHint: string;
} {
  if (docs.length === 0) {
    return { combinedText: "", titleHint: "", summaryHint: "" };
  }

  if (docs.length === 1) {
    const cleanName = docs[0].name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    return {
      combinedText: docs[0].text,
      titleHint: cleanName,
      summaryHint: `Study materials generated exclusively from ${docs[0].name}.`,
    };
  }

  const sections = docs.map((doc, idx) => {
    const typeLabel = doc.fileType.toUpperCase();
    return `=================================================================\n=== SOURCE DOCUMENT [${idx + 1} of ${docs.length}]: ${doc.name} (Type: ${typeLabel}) ===\n=================================================================\n\n${doc.text.trim()}\n`;
  });

  const combinedText = sections.join("\n\n");
  const docNames = docs.map((d) => d.name.replace(/\.[^/.]+$/, "")).slice(0, 3).join(", ");
  const titleHint = docs.length <= 2 
    ? `Combined Study: ${docNames}`
    : `Combined Study: ${docs[0].name.replace(/\.[^/.]+$/, "")} + ${docs.length - 1} documents`;

  const summaryHint = `Comprehensive study set synthesized exclusively from ${docs.length} documents: ${docs.map((d) => d.name).join(", ")}.`;

  return { combinedText, titleHint, summaryHint };
}

// DOCX parser using JSZip and DOMParser
async function parseDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const documentXmlFile = zip.file("word/document.xml");

    if (!documentXmlFile) {
      throw new Error("Invalid DOCX format: word/document.xml not found.");
    }

    const xmlContent = await documentXmlFile.async("string");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

    // Paragraphs are in <w:p>
    const paragraphs = xmlDoc.getElementsByTagName("w:p");
    const resultLines: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const textNodes = p.getElementsByTagName("w:t");
      let lineText = "";
      for (let j = 0; j < textNodes.length; j++) {
        lineText += textNodes[j].textContent || "";
      }
      if (lineText.trim()) {
        resultLines.push(lineText.trim());
      }
    }

    const combined = resultLines.join("\n\n");
    if (!combined.trim()) {
      throw new Error("No readable text found in this DOCX file.");
    }
    return combined;
  } catch (err: any) {
    console.error("DOCX parsing error:", err);
    throw new Error(`Failed to parse DOCX file: ${err.message || "Unknown error"}`);
  }
}

// PPTX parser using JSZip and DOMParser
async function parsePptx(file: File): Promise<{ text: string; slideCount: number }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find all slide XML files (ppt/slides/slide1.xml, slide2.xml, etc.)
    const slideFiles: { name: string; num: number }[] = [];
    zip.forEach((relativePath) => {
      const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
      if (match) {
        slideFiles.push({ name: relativePath, num: parseInt(match[1], 10) });
      }
    });

    if (slideFiles.length === 0) {
      throw new Error("No slide files found inside this PPTX archive.");
    }

    // Sort slides numerically
    slideFiles.sort((a, b) => a.num - b.num);

    const parser = new DOMParser();
    const slideOutputs: string[] = [];

    for (const slide of slideFiles) {
      const xmlString = await zip.file(slide.name)?.async("string");
      if (!xmlString) continue;

      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      // Slide text is stored in <a:t> tags
      const textNodes = xmlDoc.getElementsByTagName("a:t");
      const slideTexts: string[] = [];

      for (let i = 0; i < textNodes.length; i++) {
        const t = textNodes[i].textContent?.trim();
        if (t) {
          slideTexts.push(t);
        }
      }

      if (slideTexts.length > 0) {
        slideOutputs.push(`--- [Slide ${slide.num}] ---\n${slideTexts.join("\n")}`);
      }
    }

    const combined = slideOutputs.join("\n\n");
    if (!combined.trim()) {
      throw new Error("No readable text found on slides.");
    }

    return {
      text: combined,
      slideCount: slideFiles.length,
    };
  } catch (err: any) {
    console.error("PPTX parsing error:", err);
    throw new Error(`Failed to parse PPTX file: ${err.message || "Unknown error"}`);
  }
}

// PDF parser using pdfjs-dist with fallback base64
async function parsePdf(file: File): Promise<{ text: string; base64: string; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Convert arrayBuffer to base64
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  let extractedText = "";
  let pageCount = 0;

  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    pageCount = pdf.numPages;

    const pageTexts: string[] = [];
    for (let pageNum = 1; pageNum <= Math.min(pageCount, 100); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStr = textContent.items
        .map((item: any) => item.str || "")
        .join(" ");

      if (pageStr.trim()) {
        pageTexts.push(`--- [Page ${pageNum}] ---\n${pageStr.trim()}`);
      }
    }

    extractedText = pageTexts.join("\n\n");
  } catch (pdfErr) {
    console.warn("pdfjs text extraction warning, will use base64 direct parsing:", pdfErr);
  }

  return {
    text: extractedText || "[PDF document uploaded - text will be processed directly by Gemini]",
    base64,
    pageCount: pageCount || 1,
  };
}
