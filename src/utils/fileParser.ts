import JSZip from "jszip";
import { DocumentFileType, FolderDocument, ExtractedVisual } from "../types";

// Lazy-loaded pdfjs reference to prevent top-level initialization errors in unsupported browsers
let cachedPdfjs: typeof import("pdfjs-dist") | null = null;

async function getPdfjsLib(): Promise<typeof import("pdfjs-dist")> {
  if (!cachedPdfjs) {
    const pdfjs = await import("pdfjs-dist");
    if (typeof window !== "undefined") {
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
      } catch {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || "6.3.289"}/build/pdf.worker.min.mjs`;
      }
    }
    cachedPdfjs = pdfjs;
  }
  return cachedPdfjs;
}

export interface ParsedDocument {
  text: string;
  fileName: string;
  sourceType: "notes" | "pdf" | "pptx" | "docx";
  fileType: DocumentFileType;
  sizeBytes: number;
  pdfBase64?: string;
  pageOrSlideCount?: number;
  extractedVisuals?: ExtractedVisual[];
}

export async function parseUploadedFile(file: File): Promise<ParsedDocument> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const sizeBytes = file.size;

  if (extension === "docx") {
    const { text, visuals } = await parseDocx(file);
    return {
      text,
      fileName: file.name,
      sourceType: "docx",
      fileType: "docx",
      sizeBytes,
      extractedVisuals: visuals,
    };
  }

  if (extension === "pptx") {
    const { text, slideCount, visuals } = await parsePptx(file);
    return {
      text,
      fileName: file.name,
      sourceType: "pptx",
      fileType: "pptx",
      sizeBytes,
      pageOrSlideCount: slideCount,
      extractedVisuals: visuals,
    };
  }

  if (extension === "pdf") {
    const { text, pageCount, visuals } = await parsePdf(file);
    return {
      text,
      fileName: file.name,
      sourceType: "pdf",
      fileType: "pdf",
      sizeBytes,
      pageOrSlideCount: pageCount,
      extractedVisuals: visuals,
    };
  }

  // Fallback for .txt, .md, or other plain text files
  const text = await file.text();
  return {
    text: text.trim() || `[Uploaded Note: ${file.name}]`,
    fileName: file.name,
    sourceType: "notes",
    fileType: "txt",
    sizeBytes,
  };
}

/**
 * Combines multiple folder documents into a single strictly delimited source corpus
 * for the AI study generator, preserving text and visuals.
 */
export function combineDocumentsCorpus(docs: FolderDocument[]): {
  combinedText: string;
  titleHint: string;
  summaryHint: string;
  extractedVisuals: ExtractedVisual[];
} {
  if (docs.length === 0) {
    return { combinedText: "", titleHint: "", summaryHint: "", extractedVisuals: [] };
  }

  const allVisuals: ExtractedVisual[] = [];
  docs.forEach((doc) => {
    if (doc.extractedVisuals && doc.extractedVisuals.length > 0) {
      allVisuals.push(...doc.extractedVisuals);
    }
  });

  if (docs.length === 1) {
    const cleanName = docs[0].name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    return {
      combinedText: docs[0].text,
      titleHint: cleanName,
      summaryHint: `Study materials generated exclusively from ${docs[0].name}.`,
      extractedVisuals: allVisuals,
    };
  }

  const sections = docs.map((doc, idx) => {
    const typeLabel = doc.fileType.toUpperCase();
    return `=================================================================\n=== SOURCE DOCUMENT [${idx + 1} of ${docs.length}]: ${doc.name} (Type: ${typeLabel}) ===\n=================================================================\n\n${doc.text.trim()}\n`;
  });

  const combinedText = sections.join("\n\n");
  const docNames = docs.map((d) => d.name.replace(/\.[^/.]+$/, "")).slice(0, 3).join(", ");
  const titleHint =
    docs.length <= 2
      ? `Combined Study: ${docNames}`
      : `Combined Study: ${docs[0].name.replace(/\.[^/.]+$/, "")} + ${docs.length - 1} documents`;

  const summaryHint = `Comprehensive study set synthesized exclusively from ${docs.length} documents: ${docs
    .map((d) => d.name)
    .join(", ")}.`;

  return { combinedText, titleHint, summaryHint, extractedVisuals: allVisuals };
}

// Convert ArrayBuffer / Uint8Array to Base64
function bufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

// DOCX parser using JSZip and DOMParser with Heading, Table, and Visual extraction
async function parseDocx(
  file: File
): Promise<{ text: string; visuals: ExtractedVisual[] }> {
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

    // Extract educational visuals from word/media/
    const visuals: ExtractedVisual[] = [];
    const mediaFiles: { name: string; zipFile: any }[] = [];

    zip.forEach((relPath, zipFile) => {
      if (
        relPath.startsWith("word/media/") &&
        /\.(png|jpe?g|webp|svg)$/i.test(relPath)
      ) {
        mediaFiles.push({ name: relPath, zipFile });
      }
    });

    let visualCounter = 1;
    for (const media of mediaFiles) {
      try {
        const u8 = await media.zipFile.async("uint8array");
        // Filter out decorative icons, bullet graphics, or transparent spacers (< 3500 bytes)
        if (u8.length >= 3500 && visuals.length < 8) {
          const ext = media.name.split(".").pop()?.toLowerCase() || "png";
          const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
          const b64 = bufferToBase64(u8);
          const dataUrl = `data:${mime};base64,${b64}`;

          visuals.push({
            id: `docx-vis-${visualCounter}`,
            title: `Figure ${visualCounter}: Educational Visual Diagram`,
            type: "diagram",
            dataUrl,
            sourceDoc: file.name,
            description: `Diagram/illustration extracted from ${file.name} (word/media/${media.name.split("/").pop()})`,
          });
          visualCounter++;
        }
      } catch (err) {
        console.warn("Could not extract DOCX media:", media.name, err);
      }
    }

    // Traverse body elements in document order preserving headings, paragraphs, and tables
    const body = xmlDoc.getElementsByTagName("w:body")[0];
    const outputLines: string[] = [];

    if (body) {
      const childNodes = Array.from(body.childNodes);
      for (const node of childNodes) {
        if (node.nodeName === "w:p") {
          // Paragraph handling
          const p = node as Element;
          const styleNode = p.getElementsByTagName("w:pStyle")[0];
          const styleVal = styleNode?.getAttribute("w:val") || "";

          // Text extraction
          const textNodes = p.getElementsByTagName("w:t");
          let pText = "";
          for (let i = 0; i < textNodes.length; i++) {
            pText += textNodes[i].textContent || "";
          }
          pText = pText.trim();

          if (!pText) continue;

          // Check if it is a heading
          if (/^Heading\s*1$/i.test(styleVal)) {
            outputLines.push(`\n# ${pText}`);
          } else if (/^Heading\s*2$/i.test(styleVal)) {
            outputLines.push(`\n## ${pText}`);
          } else if (/^Heading\s*3$/i.test(styleVal)) {
            outputLines.push(`\n### ${pText}`);
          } else {
            // Check for numbered/bullet list
            const numPr = p.getElementsByTagName("w:numPr")[0];
            if (numPr) {
              outputLines.push(`• ${pText}`);
            } else {
              outputLines.push(pText);
            }
          }
        } else if (node.nodeName === "w:tbl") {
          // Table extraction - Preserve structure for Table Understanding!
          const tbl = node as Element;
          const rows = Array.from(tbl.getElementsByTagName("w:tr"));
          if (rows.length > 0) {
            outputLines.push("\n[TABLE: Comparison / Data Table]");
            const tableMatrix: string[][] = [];

            for (const tr of rows) {
              const cells = Array.from(tr.getElementsByTagName("w:tc"));
              const rowValues: string[] = [];
              for (const tc of cells) {
                const textNodes = tc.getElementsByTagName("w:t");
                let cellText = "";
                for (let i = 0; i < textNodes.length; i++) {
                  cellText += textNodes[i].textContent || "";
                }
                rowValues.push(cellText.trim().replace(/\|/g, "\\|") || "-");
              }
              if (rowValues.length > 0) {
                tableMatrix.push(rowValues);
              }
            }

            if (tableMatrix.length > 0) {
              // Header row
              const headerRow = tableMatrix[0];
              outputLines.push(`| ${headerRow.join(" | ")} |`);
              outputLines.push(`| ${headerRow.map(() => "---").join(" | ")} |`);

              // Body rows
              for (let r = 1; r < tableMatrix.length; r++) {
                outputLines.push(`| ${tableMatrix[r].join(" | ")} |`);
              }
              outputLines.push("\n");
            }
          }
        }
      }
    }

    // Append visual references into the corpus if visuals were found
    if (visuals.length > 0) {
      outputLines.push("\n--- [EXTRACTED EDUCATIONAL VISUALS] ---");
      visuals.forEach((vis, i) => {
        outputLines.push(
          `[VISUAL FIGURE ${i + 1}]: "${vis.title}" (${vis.type.toUpperCase()})\nContext: Educational visual diagram extracted directly from ${file.name}.`
        );
      });
    }

    const combined = outputLines.join("\n\n").trim();
    if (!combined) {
      throw new Error("No readable text found in this DOCX file.");
    }

    return { text: combined, visuals };
  } catch (err: any) {
    console.error("DOCX parsing error:", err);
    throw new Error(`Failed to parse DOCX file: ${err.message || "Unknown error"}`);
  }
}

// PPTX parser using JSZip and DOMParser with Slide, Table, and Visual extraction
async function parsePptx(
  file: File
): Promise<{ text: string; slideCount: number; visuals: ExtractedVisual[] }> {
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

    slideFiles.sort((a, b) => a.num - b.num);

    // Extract educational visuals from ppt/media/
    const visuals: ExtractedVisual[] = [];
    const mediaFiles: { name: string; zipFile: any }[] = [];

    zip.forEach((relPath, zipFile) => {
      if (
        relPath.startsWith("ppt/media/") &&
        /\.(png|jpe?g|webp|svg)$/i.test(relPath)
      ) {
        mediaFiles.push({ name: relPath, zipFile });
      }
    });

    // Map relationships from slide rels if possible
    const slideImageMap: Record<number, string[]> = {};
    for (const slide of slideFiles) {
      const relsFile = zip.file(`ppt/slides/_rels/slide${slide.num}.xml.rels`);
      if (relsFile) {
        const relsXml = await relsFile.async("string");
        const matches = relsXml.matchAll(/Target="\.\.\/media\/([^"]+)"/g);
        slideImageMap[slide.num] = [];
        for (const m of matches) {
          slideImageMap[slide.num].push(`ppt/media/${m[1]}`);
        }
      }
    }

    let visualCounter = 1;
    for (const media of mediaFiles) {
      try {
        const u8 = await media.zipFile.async("uint8array");
        // Filter out decorative icons, bullet graphics, or small textures (< 3500 bytes)
        if (u8.length >= 3500 && visuals.length < 10) {
          // Find which slide uses this media
          let associatedSlide: number | undefined;
          for (const [sNum, paths] of Object.entries(slideImageMap)) {
            if (paths.includes(media.name)) {
              associatedSlide = Number(sNum);
              break;
            }
          }

          const ext = media.name.split(".").pop()?.toLowerCase() || "png";
          const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
          const b64 = bufferToBase64(u8);
          const dataUrl = `data:${mime};base64,${b64}`;

          const slideLabel = associatedSlide ? `Slide ${associatedSlide}` : "Slide";
          visuals.push({
            id: `pptx-vis-${visualCounter}`,
            title: `${slideLabel} Visual Diagram / Flowchart`,
            type: "diagram",
            pageOrSlide: associatedSlide,
            dataUrl,
            sourceDoc: file.name,
            description: `Educational diagram or chart from ${slideLabel} in ${file.name}.`,
          });
          visualCounter++;
        }
      } catch (err) {
        console.warn("Could not extract PPTX media:", media.name, err);
      }
    }

    const parser = new DOMParser();
    const slideOutputs: string[] = [];

    for (const slide of slideFiles) {
      const xmlString = await zip.file(slide.name)?.async("string");
      if (!xmlString) continue;

      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      const slideLines: string[] = [];

      // Check for visual on this slide
      const slideVisuals = visuals.filter((v) => v.pageOrSlide === slide.num);
      if (slideVisuals.length > 0) {
        slideVisuals.forEach((v) => {
          slideLines.push(`[VISUAL ON SLIDE ${slide.num}]: ${v.title} (${v.type.toUpperCase()})`);
        });
      }

      // Extract tables on this slide
      const tables = Array.from(xmlDoc.getElementsByTagName("a:tbl"));
      for (const tbl of tables) {
        const rows = Array.from(tbl.getElementsByTagName("a:tr"));
        if (rows.length > 0) {
          slideLines.push(`\n[TABLE: Comparison / Data Table on Slide ${slide.num}]`);
          const tableMatrix: string[][] = [];
          for (const tr of rows) {
            const cells = Array.from(tr.getElementsByTagName("a:tc"));
            const rowVals: string[] = [];
            for (const tc of cells) {
              const textNodes = tc.getElementsByTagName("a:t");
              let cText = "";
              for (let i = 0; i < textNodes.length; i++) {
                cText += textNodes[i].textContent || "";
              }
              rowVals.push(cText.trim().replace(/\|/g, "\\|") || "-");
            }
            if (rowVals.length > 0) {
              tableMatrix.push(rowVals);
            }
          }
          if (tableMatrix.length > 0) {
            const headerRow = tableMatrix[0];
            slideLines.push(`| ${headerRow.join(" | ")} |`);
            slideLines.push(`| ${headerRow.map(() => "---").join(" | ")} |`);
            for (let r = 1; r < tableMatrix.length; r++) {
              slideLines.push(`| ${tableMatrix[r].join(" | ")} |`);
            }
          }
        }
      }

      // Extract text lines from <a:p>
      const paragraphs = Array.from(xmlDoc.getElementsByTagName("a:p"));
      for (const p of paragraphs) {
        const textNodes = p.getElementsByTagName("a:t");
        let pText = "";
        for (let i = 0; i < textNodes.length; i++) {
          pText += textNodes[i].textContent || "";
        }
        if (pText.trim()) {
          slideLines.push(pText.trim());
        }
      }

      if (slideLines.length > 0) {
        slideOutputs.push(`--- [Slide ${slide.num}] ---\n${slideLines.join("\n")}`);
      }
    }

    const combined = slideOutputs.join("\n\n");
    if (!combined.trim()) {
      throw new Error("No readable text found on slides.");
    }

    return {
      text: combined,
      slideCount: slideFiles.length,
      visuals,
    };
  } catch (err: any) {
    console.error("PPTX parsing error:", err);
    throw new Error(`Failed to parse PPTX file: ${err.message || "Unknown error"}`);
  }
}

// Fallback text scanner if PDF.js worker fails on older devices
function extractTextFromPdfRawBuffer(buffer: ArrayBuffer): string {
  try {
    const uint8 = new Uint8Array(buffer);
    const decoder = new TextDecoder("latin1");
    const raw = decoder.decode(uint8);

    const textPieces: string[] = [];
    const tjRegex = /\(([^)]{2,})\)\s*(?:Tj|TJ|'|")/g;
    let match;
    while ((match = tjRegex.exec(raw)) !== null) {
      const piece = match[1].trim();
      if (piece.length > 1 && !/^[\x00-\x1F\xFF]+$/.test(piece)) {
        textPieces.push(piece);
      }
    }

    if (textPieces.length > 5) {
      return textPieces.join(" ").replace(/\s+/g, " ");
    }
  } catch {
    // Ignore fallback failure
  }
  return "";
}

// PDF parser using pdfjs-dist with text, page order, and educational visual capture
async function parsePdf(
  file: File
): Promise<{ text: string; pageCount: number; visuals: ExtractedVisual[] }> {
  const arrayBuffer = await file.arrayBuffer();
  let extractedText = "";
  let pageCount = 0;
  const visuals: ExtractedVisual[] = [];

  try {
    const pdfjsLib = await getPdfjsLib();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    pageCount = pdf.numPages;

    const pageTexts: string[] = [];
    for (let pageNum = 1; pageNum <= Math.min(pageCount, 150); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const rawItems = Array.isArray(textContent?.items)
        ? textContent.items
        : Array.from(textContent?.items || []);
      const pageStr = rawItems
        .map((item: any) => item?.str || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageStr) {
        pageTexts.push(`--- [Page ${pageNum} of ${pageCount}] ---\n${pageStr}`);
      }

      // Visual Intelligence: Detect educational figures, diagrams, flowcharts or tables on this page
      const hasFigureKeyword = /\b(figure|fig\.|diagram|flowchart|chart|table|illustration|model|cycle)\b/i.test(
        pageStr
      );

      // For pages with educational diagrams (or key pages if small doc), capture a crisp canvas snapshot!
      if (
        (hasFigureKeyword || (pageCount <= 6 && pageNum <= 3)) &&
        visuals.length < 6 &&
        typeof document !== "undefined"
      ) {
        try {
          const viewport = page.getViewport({ scale: 1.0 });
          // Only capture if sensible dimension
          if (viewport.width > 100 && viewport.height > 100) {
            const canvas = document.createElement("canvas");
            canvas.width = Math.min(viewport.width, 1000);
            canvas.height = Math.min(viewport.height, 1200);
            const ctx = canvas.getContext("2d");
            if (ctx) {
              await page.render({
                canvasContext: ctx,
                canvas: canvas,
                viewport: page.getViewport({
                  scale: canvas.width / viewport.width,
                }),
              } as any).promise;

              const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
              const labelMatch = pageStr.match(
                /\b(Figure\s*\d+|Diagram\s*\d+|Table\s*\d+|Flowchart|Chart)\b[^\.\n]*/i
              );
              const figTitle = labelMatch
                ? labelMatch[0].trim().slice(0, 50)
                : `Page ${pageNum} Visual Diagram`;

              visuals.push({
                id: `pdf-vis-p${pageNum}`,
                title: figTitle,
                type: /flowchart/i.test(figTitle)
                  ? "flowchart"
                  : /table/i.test(figTitle)
                  ? "table"
                  : "diagram",
                pageOrSlide: pageNum,
                dataUrl,
                sourceDoc: file.name,
                description: `Educational diagram or visual figure from Page ${pageNum} of ${file.name}.`,
              });
            }
          }
        } catch (canvasErr) {
          console.warn(`Could not render visual snapshot for Page ${pageNum}:`, canvasErr);
        }
      }
    }

    extractedText = pageTexts.join("\n\n").trim();
  } catch (pdfErr) {
    console.warn("PDF.js text extraction warning, using buffer scanner:", pdfErr);
  }

  // If PDF.js produced no text, use the buffer text scanner
  if (!extractedText || extractedText.length < 20) {
    const fallbackText = extractTextFromPdfRawBuffer(arrayBuffer);
    if (fallbackText && fallbackText.length > extractedText.length) {
      extractedText = fallbackText;
    }
  }

  if (!extractedText || extractedText.trim().length === 0) {
    extractedText = `[Document: ${file.name}]\nNote: This PDF appears to contain scanned image pages or rasterized diagrams without embedded text layers.`;
  }

  // Inject visual markers into extractedText if any visuals captured
  if (visuals.length > 0) {
    const visHeaders = visuals
      .map(
        (v) =>
          `[EDUCATIONAL VISUAL ON PAGE ${v.pageOrSlide}]: "${v.title}" (${v.type.toUpperCase()})`
      )
      .join("\n");
    extractedText = `${extractedText}\n\n--- [EXTRACTED EDUCATIONAL VISUALS & DIAGRAMS] ---\n${visHeaders}`;
  }

  return {
    text: extractedText,
    pageCount: pageCount || 1,
    visuals,
  };
}
