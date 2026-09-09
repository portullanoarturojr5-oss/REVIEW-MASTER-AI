import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export interface ExtractedVisual {
  id: string;
  title: string;
  type: "diagram" | "flowchart" | "table" | "illustration" | "figure" | "concept_map";
  pageOrSlide?: number;
  dataUrl?: string; // Base64 data URL for display
  description?: string;
  sourceExcerpt?: string;
  sourceDoc?: string;
}

export interface GenerateReviewerCoreParams {
  content?: string;
  rawContent?: string;
  text?: string;
  notes?: string;
  sourceText?: string;
  documentText?: string;
  pdfBase64?: string;
  fileBase64?: string;
  mimeType?: string;
  title?: string;
  titleHint?: string;
  flashcardCount?: number;
  quizCount?: number;
  quizQuestionCount?: number;
  quizTypes?: string[];
  allowedQuestionTypes?: string[];
  extractedVisuals?: ExtractedVisual[];
  documentId?: string;
  fileName?: string;
  documentIds?: string[];
  fileNames?: string[];
}

/**
 * Safely extracts a clean, human-readable error message from any error object.
 * Guarantees that raw objects or "[object Object]" are NEVER returned.
 */
export function extractCleanErrorMessage(
  error: any,
  fallback = "Failed to generate study materials from content."
): string {
  if (!error) return fallback;

  // If already a non-empty string
  if (typeof error === "string") {
    const trimmed = error.trim();
    if (!trimmed || trimmed === "[object Object]") return fallback;
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractCleanErrorMessage(parsed, fallback);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  // If Error instance or object with .message
  if (typeof error.message === "string") {
    const trimmed = error.message.trim();
    if (trimmed && trimmed !== "[object Object]") {
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          return extractCleanErrorMessage(parsed, fallback);
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }
  }

  // If object has .error
  if (error.error !== undefined && error.error !== null) {
    if (typeof error.error === "string") {
      const trimmed = error.error.trim();
      if (trimmed && trimmed !== "[object Object]") {
        if (
          (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
          (trimmed.startsWith("[") && trimmed.endsWith("]"))
        ) {
          try {
            const parsed = JSON.parse(trimmed);
            return extractCleanErrorMessage(parsed, fallback);
          } catch {
            return trimmed;
          }
        }
        return trimmed;
      }
    } else if (typeof error.error === "object") {
      return extractCleanErrorMessage(error.error, fallback);
    }
  }

  // If object has .details (Google RPC error info)
  if (Array.isArray(error.details) && error.details.length > 0) {
    const firstDetail = error.details[0];
    if (typeof firstDetail?.message === "string" && firstDetail.message.trim()) {
      return firstDetail.message.trim();
    }
  }

  // If object has .statusText
  if (typeof error.statusText === "string" && error.statusText.trim()) {
    return error.statusText.trim();
  }

  // If object has .cause
  if (error.cause) {
    return extractCleanErrorMessage(error.cause, fallback);
  }

  // Safe string conversion check
  try {
    const str = String(error);
    if (str && str !== "[object Object]" && !str.startsWith("[object ")) {
      return str;
    }
  } catch {
    // Ignore conversion error
  }

  return fallback;
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not configured. Please add GEMINI_API_KEY to your environment variables (or Vercel Project Settings)."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export async function generateReviewerCore(params: GenerateReviewerCoreParams) {
  // Support content in all variations sent by PDF, DOCX, PPTX, and TXT parsers or direct API calls
  let rawSource = "";
  if (typeof params.content === "string") {
    rawSource = params.content;
  } else if (typeof params.rawContent === "string") {
    rawSource = params.rawContent;
  } else if (typeof (params as any).text === "string") {
    rawSource = (params as any).text;
  } else if (typeof (params as any).notes === "string") {
    rawSource = (params as any).notes;
  } else if (typeof (params as any).sourceText === "string") {
    rawSource = (params as any).sourceText;
  } else if (typeof (params as any).documentText === "string") {
    rawSource = (params as any).documentText;
  } else if (params.content && typeof params.content === "object") {
    if (typeof (params.content as any).text === "string") {
      rawSource = (params.content as any).text;
    } else if (typeof (params.content as any).content === "string") {
      rawSource = (params.content as any).content;
    }
  } else if ((params as any).document && typeof (params as any).document === "object") {
    if (typeof (params as any).document.text === "string") {
      rawSource = (params as any).document.text;
    }
  }

  // Reject blob: or file: URLs mistakenly sent as text content
  if (rawSource.startsWith("blob:") || rawSource.startsWith("file:") || rawSource === "[object Object]") {
    throw new Error(
      "Invalid content format received. The document text could not be read. Please re-upload your document."
    );
  }

  // Sanitize document identifiers and filenames if provided
  const safeDocId = typeof params.documentId === "string" ? params.documentId.trim() : "";
  if (safeDocId.startsWith("blob:") || safeDocId.startsWith("file:")) {
    console.warn("[Sanitizer] Ignored invalid documentId containing blob/file URL.");
  }
  const safeFileName = typeof params.fileName === "string" ? params.fileName.trim() : "";
  if (safeFileName.startsWith("blob:") || safeFileName.startsWith("file:")) {
    console.warn("[Sanitizer] Ignored invalid fileName containing blob/file URL.");
  }

  const sourceText = rawSource.trim();

  // Validate documentBase64: Ensure it is genuine base64 and never a blob: URL
  let documentBase64: string | undefined = undefined;
  const candidateDoc =
    params.pdfBase64 ||
    params.fileBase64 ||
    (params as any).base64 ||
    (params as any).fileData;
  if (typeof candidateDoc === "string") {
    if (
      candidateDoc.startsWith("blob:") ||
      candidateDoc.startsWith("http:") ||
      candidateDoc === "[object Object]"
    ) {
      console.warn("[Sanitizer] Rejected invalid documentBase64 containing URL or object reference.");
    } else {
      // Strip data URI prefix if present
      documentBase64 = candidateDoc.replace(/^data:[^;]+;base64,/, "").trim();
    }
  }

  const resolvedTitle =
    typeof params.title === "string" && params.title.trim() && params.title !== "[object Object]"
      ? params.title.trim()
      : typeof params.titleHint === "string" && params.titleHint.trim() && params.titleHint !== "[object Object]"
      ? params.titleHint.trim()
      : "Study Reviewer";

  const requestedQuizCount = Math.min(
    Math.max(Number(params.quizCount || params.quizQuestionCount || 10) || 10, 3),
    50
  );
  const requestedFlashcards = Math.min(Math.max(Number(params.flashcardCount || 12) || 12, 3), 50);

  const activeTypes = (params.quizTypes ||
    params.allowedQuestionTypes || [
      "multiple_choice",
      "true_false",
      "identification",
      "short_answer",
    ]) as string[];

  // Filter extracted visuals: strictly ensure only genuine base64 image data is passed, NEVER blob URLs
  const rawVisuals = Array.isArray(params.extractedVisuals) ? params.extractedVisuals : [];
  const extractedVisuals: ExtractedVisual[] = rawVisuals
    .filter((v) => v && typeof v === "object")
    .map((v) => {
      let safeDataUrl = v.dataUrl;
      // If dataUrl is a blob URL or invalid string, discard dataUrl to prevent Gemini error
      if (typeof safeDataUrl !== "string" || safeDataUrl.startsWith("blob:") || safeDataUrl.startsWith("file:")) {
        safeDataUrl = undefined;
      }
      return {
        ...v,
        dataUrl: safeDataUrl,
        title: typeof v.title === "string" ? v.title.slice(0, 100) : "Visual Figure",
        description: typeof v.description === "string" ? v.description.slice(0, 500) : "",
      };
    });

  if (!sourceText && !documentBase64) {
    throw new Error(
      "No study content provided. Please upload notes, PDF, PPTX, or DOCX."
    );
  }

  const ai = getGeminiClient();

  const systemInstruction = `You are the lead academic visual learning intelligence engine for "Review Master AI" (Version 1.1).

CRITICAL PERMANENT RULES — STRICT SOURCE MODE:
1. Use ONLY the uploaded documents. Never use internet knowledge, outside general trivia, or external facts.
2. NEVER invent facts, labels, diagrams, or explanations. If a fact, label, or step is not in the material, it DOES NOT EXIST.
3. Every question, flashcard, and study note must be grounded strictly in the uploaded material.

VISUAL EXTRACTION & REASONING (VERSION 1.1):
Analyze meaningful educational visuals inside uploaded documents:
- Diagrams
- Flowcharts
- Labeled illustrations
- Concept maps
- Tables & Comparison structures
- Educational figures
- Process charts
- Scientific illustrations
(Ignore purely decorative images).

STUDY NOTES REQUIREMENTS:
- Structure study notes into clear conceptual units.
- If a visual or flowchart explains a concept, include it inside the study note.
- Mandatory structure for visual study notes:
  - 'heading': Concept Title (e.g. "Piaget's Stages", "Synaptic Plasticity", "Market Elasticity")
  - 'definition': Precise definition derived from source
  - 'explanation': Clear grounded explanation from source
  - 'diagramSummary': Describe what the diagram/flowchart/table shows using ONLY visible, explicit information.
  - 'visualReference': Name, figure label, or slide reference of the visual (e.g., "Figure 1: Synaptic Transmission Cascade", "Slide 3: Process Flowchart")
- If the source contains comparison tables, include 'comparisonTable' with 'title', 'headers', 'rows', and 'summary'.

FLASHCARDS (VISUAL & TEXT):
- Create image-based/visual-based flashcards whenever appropriate (e.g., "According to the diagram, what happens after Stage 2?", "Which label identifies the frontal lobe?", "Based on the flowchart, what is the first instructional step?").
- Set 'isVisual: true' for visual flashcards and specify 'visualReference' and 'pageOrSlide'.
- Include exact 'sourceExcerpt' proving the answer.

PRACTICE QUIZ (VISUAL QUESTIONS & TABLE UNDERSTANDING):
- Generate visual questions across allowed types: multiple_choice, true_false, identification, short_answer.
- Questions must reference the uploaded visual or table only.
- TABLE UNDERSTANDING: If the document contains comparison tables, generate:
  * Compare and contrast questions
  * Matching concepts
  * Definition recall
  * Classification questions
- For each question:
  * Set 'isVisual: true' if based on a visual.
  * Set 'questionCategory': "standard", "visual", "table_comparison", or "classification".
  * Include 'visualReference', 'pageOrSlide', and verbatim 'sourceExcerpt'.
  * For short_answer: provide 2-5 essential 'rubricKeywords'.`;

  const visualSummaries = extractedVisuals
    .map(
      (v, idx) =>
        `Visual ${idx + 1}: "${v.title}" (${v.type.toUpperCase()}) - Page/Slide: ${
          v.pageOrSlide || "N/A"
        }\nDescription: ${v.description || "Educational diagram/figure extracted from source"}`
    )
    .join("\n\n");

  const promptText = `Analyze the uploaded material with Visual Learning Intelligence and generate comprehensive study materials.
Topic / Title: "${resolvedTitle}"
Target Flashcards: ${requestedFlashcards}
Target Quiz Questions: ${requestedQuizCount}
Allowed Question Formats: ${activeTypes.join(", ")}

${
  extractedVisuals.length > 0
    ? `EXTRACTED EDUCATIONAL VISUALS IN THIS DOCUMENT:\n${visualSummaries}\n\nMake sure to produce visual flashcards, diagram summaries, and visual quiz questions referencing these visuals!`
    : ""
}

Generate:
1. Title and a factual 2-4 sentence summary strictly grounded in the document.
2. 5 to 8 grounded key concepts.
3. Structured Study Notes: Each concept with heading, definition, explanation, diagramSummary (if a visual/diagram/flowchart/table exists for it), visualReference, pageOrSlide, and comparisonTable (if applicable).
4. Exactly ${requestedFlashcards} flashcards (including visual/diagram flashcards referencing figures or flowcharts).
5. Exactly ${requestedQuizCount} practice quiz questions balancing allowed formats (${activeTypes.join(
    ", "
  )}), including visual questions and comparison table questions (compare/contrast, classification).
6. Every single item must include 'sourceExcerpt' with verbatim text or exact visual reference.

SOURCE CONTENT:
"""
${sourceText ? sourceText.slice(0, 95000) : "[See attached visual document]"}
"""`;

  // Construct contents payload supporting multimodal image inspection
  const contentParts: any[] = [];

  // If extracted visuals contain base64 image data, include up to 4 key images as inlineData parts
  let visualPartCount = 0;
  for (const vis of extractedVisuals) {
    if (vis.dataUrl && visualPartCount < 4) {
      try {
        const matches = vis.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches[2]) {
          contentParts.push({
            inlineData: {
              mimeType: matches[1] || "image/png",
              data: matches[2],
            },
          });
          visualPartCount++;
        }
      } catch {
        // Skip unparseable image part
      }
    }
  }

  // If document base64 was passed, include it in contentParts
  if (documentBase64) {
    contentParts.push({
      inlineData: {
        mimeType: params.mimeType || "application/pdf",
        data: documentBase64,
      },
    });
  }

  contentParts.push({ text: promptText });

  const contentsPayload = contentParts.length === 1 ? promptText : { parts: contentParts };

  const schema = {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "Clear, descriptive title extracted directly from the subject matter.",
      },
      summary: {
        type: Type.STRING,
        description: "A factual 2-4 sentence summary of the provided text.",
      },
      keyConcepts: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Key concepts or terms directly appearing in the text.",
      },
      studyNotes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            heading: {
              type: Type.STRING,
              description: "Concept heading (e.g. Piaget's Stages, Synaptic LTP)",
            },
            definition: {
              type: Type.STRING,
              description: "Clear definition derived exclusively from the source.",
            },
            explanation: {
              type: Type.STRING,
              description: "In-depth explanation grounded in the text.",
            },
            diagramSummary: {
              type: Type.STRING,
              description:
                "Describe what the diagram/flowchart/table shows using only visible, explicit information. Leave empty if no visual for this concept.",
            },
            visualReference: {
              type: Type.STRING,
              description: "Caption or figure label if visual is present (e.g., Figure 1: Flowchart)",
            },
            pageOrSlide: {
              type: Type.INTEGER,
              description: "Page or slide number when available.",
            },
            sourceExcerpt: {
              type: Type.STRING,
              description: "Verbatim quote from the source text proving this note.",
            },
            comparisonTable: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                headers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                rows: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                summary: { type: Type.STRING },
              },
            },
          },
          required: ["heading", "definition", "explanation", "sourceExcerpt"],
        },
        description: "Structured academic study notes incorporating visual and table analysis.",
      },
      flashcards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: {
              type: Type.STRING,
              description: "Question or prompt testing a fact or visual element from the material.",
            },
            back: {
              type: Type.STRING,
              description: "Accurate answer grounded strictly in the material.",
            },
            sourceExcerpt: {
              type: Type.STRING,
              description: "Verbatim citation or quote from the source text confirming this fact.",
            },
            category: {
              type: Type.STRING,
              description: "Subject sub-topic or section name.",
            },
            isVisual: {
              type: Type.BOOLEAN,
              description: "True if question references a diagram, flowchart, figure, or table.",
            },
            visualReference: {
              type: Type.STRING,
              description: "Reference to the diagram or figure (e.g., 'Figure 1: Synaptic Flowchart')",
            },
            pageOrSlide: {
              type: Type.INTEGER,
              description: "Page or slide number if applicable.",
            },
          },
          required: ["front", "back", "sourceExcerpt"],
        },
      },
      quizQuestions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              description: "One of: multiple_choice, true_false, identification, short_answer",
            },
            question: {
              type: Type.STRING,
              description: "The question statement strictly based on the text or visual.",
            },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "For multiple_choice, 4 options. For true_false, ['True', 'False']. For identification/short_answer, empty array.",
            },
            correctAnswer: {
              type: Type.STRING,
              description:
                "The correct answer or model answer verbatim or directly derived from the text.",
            },
            rubricKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-5 key words or phrases required for short answer evaluation.",
            },
            sourceExcerpt: {
              type: Type.STRING,
              description: "Verbatim quote or visual reference proving this answer is correct.",
            },
            explanation: {
              type: Type.STRING,
              description: "Short explanation pointing directly to source evidence.",
            },
            isVisual: {
              type: Type.BOOLEAN,
              description: "True if question tests a diagram, flowchart, or illustration.",
            },
            visualReference: {
              type: Type.STRING,
              description: "Figure, chart, or table reference.",
            },
            pageOrSlide: {
              type: Type.INTEGER,
              description: "Page or slide number if available.",
            },
            questionCategory: {
              type: Type.STRING,
              description: "One of: standard, visual, table_comparison, classification",
            },
            tableContext: {
              type: Type.STRING,
              description: "Summary of the comparison table if testing table understanding.",
            },
          },
          required: ["type", "question", "correctAnswer", "sourceExcerpt", "explanation"],
        },
      },
    },
    required: ["title", "summary", "keyConcepts", "flashcards", "quizQuestions"],
  };

  const candidateModels = [
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest",
  ];

  let parsedData: any = null;
  let lastError: any = null;

  for (const modelName of candidateModels) {
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        console.log(
          `[Gemini API] Requesting study materials using model: ${modelName} (attempt ${attempt}/${maxAttempts})`
        );
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contentsPayload,
          config: {
            systemInstruction,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        });

        const text = response.text?.trim();
        if (!text) {
          throw new Error(`Empty response returned by ${modelName}`);
        }

        let cleaned = text;
        if (cleaned.startsWith("```")) {
          cleaned = cleaned
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();
        }

        parsedData = JSON.parse(cleaned);
        console.log(`[Gemini API] Successfully generated study reviewer with ${modelName}`);
        break;
      } catch (err: any) {
        lastError = err;
        const errString = String(err?.message || err || "");
        const isTransient =
          errString.includes("503") ||
          errString.includes("UNAVAILABLE") ||
          errString.includes("high demand") ||
          errString.includes("429") ||
          errString.includes("RESOURCE_EXHAUSTED");

        if (isTransient && attempt < maxAttempts) {
          const delayMs = attempt * 1000;
          console.warn(
            `[Gemini API] Model ${modelName} experienced high demand spike (${errString.slice(0, 100)}). Retrying attempt ${attempt + 1} in ${delayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        console.warn(
          `[Gemini API] Model ${modelName} failed: ${errString.slice(0, 150)}. Trying next candidate...`
        );
        break;
      }
    }

    if (parsedData) {
      break;
    }
  }

  if (!parsedData) {
    console.error(
      "[Gemini API] All candidate models failed. Last error:",
      extractCleanErrorMessage(lastError).slice(0, 300)
    );
    const cleanMsg = extractCleanErrorMessage(
      lastError,
      "The AI service is temporarily experiencing high demand. Please try again in a few moments."
    );
    if (
      cleanMsg.includes("503") ||
      cleanMsg.includes("UNAVAILABLE") ||
      cleanMsg.includes("high demand")
    ) {
      throw new Error(
        "The Gemini AI service is currently experiencing temporary high demand spikes. Please try clicking Generate again in a few moments."
      );
    } else if (cleanMsg.includes("429") || cleanMsg.includes("RESOURCE_EXHAUSTED") || cleanMsg.includes("rate limit")) {
      throw new Error(
        "Gemini rate limit reached. Please wait a moment before trying again."
      );
    } else if (
      cleanMsg.includes("GEMINI_API_KEY") ||
      cleanMsg.includes("API_KEY_INVALID") ||
      cleanMsg.includes("authentication credentials") ||
      cleanMsg.includes("401") ||
      cleanMsg.includes("UNAUTHENTICATED")
    ) {
      throw new Error(
        "GEMINI_API_KEY environment variable is missing or invalid. Please check GEMINI_API_KEY in your server environment."
      );
    }
    throw new Error(cleanMsg);
  }

  // Cross-link extracted visual data URLs into studyNotes, flashcards, and quizQuestions
  if (extractedVisuals.length > 0) {
    parsedData.extractedVisuals = extractedVisuals;

    // Helper to find matching visual
    const findVisual = (ref?: string, pageNum?: number) => {
      if (!ref && !pageNum) return undefined;
      return extractedVisuals.find((v) => {
        if (pageNum && v.pageOrSlide === pageNum) return true;
        if (ref && v.title.toLowerCase().includes(ref.toLowerCase())) return true;
        if (ref && ref.toLowerCase().includes(v.title.toLowerCase())) return true;
        return false;
      }) || (extractedVisuals.length === 1 ? extractedVisuals[0] : undefined);
    };

    // Cross-link into studyNotes
    if (Array.isArray(parsedData.studyNotes)) {
      parsedData.studyNotes = parsedData.studyNotes.map((note: any, idx: number) => {
        const matched = findVisual(note.visualReference, note.pageOrSlide) || (note.diagramSummary && extractedVisuals[idx % extractedVisuals.length]);
        return {
          id: `note-${Date.now()}-${idx}`,
          ...note,
          visualDataUrl: matched?.dataUrl || note.visualDataUrl,
          visualReference: note.visualReference || matched?.title,
        };
      });
    }

    // Cross-link into flashcards
    if (Array.isArray(parsedData.flashcards)) {
      parsedData.flashcards = parsedData.flashcards.map((fc: any, idx: number) => {
        const isVis = fc.isVisual || !!fc.visualReference;
        const matched = isVis ? findVisual(fc.visualReference, fc.pageOrSlide) : undefined;
        return {
          ...fc,
          isVisual: isVis,
          visualDataUrl: matched?.dataUrl || fc.visualDataUrl,
        };
      });
    }

    // Cross-link into quizQuestions
    if (Array.isArray(parsedData.quizQuestions)) {
      parsedData.quizQuestions = parsedData.quizQuestions.map((q: any) => {
        const isVis = q.isVisual || q.questionCategory === "visual" || !!q.visualReference;
        const matched = isVis ? findVisual(q.visualReference, q.pageOrSlide) : undefined;
        return {
          ...q,
          isVisual: isVis,
          visualDataUrl: matched?.dataUrl || q.visualDataUrl,
        };
      });
    }
  } else {
    // Add IDs to study notes if present
    if (Array.isArray(parsedData.studyNotes)) {
      parsedData.studyNotes = parsedData.studyNotes.map((note: any, idx: number) => ({
        id: `note-${Date.now()}-${idx}`,
        ...note,
      }));
    }
  }

  return parsedData;
}
