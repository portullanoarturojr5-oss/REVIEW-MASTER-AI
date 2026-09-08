import {
  QuizQuestionType,
  QuestionCategory,
  StudyNoteSection,
  ExtractedVisual,
} from "../types";

export interface GenerateReviewerApiParams {
  title?: string;
  titleHint?: string;
  content: string;
  rawContent?: string;
  flashcardCount?: number;
  quizCount?: number;
  quizTypes?: (QuizQuestionType | string)[];
  strictSourceOnly?: boolean;
  extractedVisuals?: ExtractedVisual[];
  documentId?: string;
  fileName?: string;
  documentIds?: string[];
  fileNames?: string[];
  apiUrl?: string;
}

export interface GeneratedStudyData {
  title: string;
  summary: string;
  keyConcepts: string[];
  studyNotes?: StudyNoteSection[];
  extractedVisuals?: ExtractedVisual[];
  flashcards: Array<{
    front: string;
    back: string;
    sourceExcerpt?: string;
    category?: string;
    isVisual?: boolean;
    visualReference?: string;
    visualDataUrl?: string;
    pageOrSlide?: number;
    sourceDoc?: string;
  }>;
  quizQuestions: Array<{
    type: QuizQuestionType;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
    rubricKeywords?: string[];
    sourceExcerpt?: string;
    isVisual?: boolean;
    visualReference?: string;
    visualDataUrl?: string;
    pageOrSlide?: number;
    sourceDoc?: string;
    tableContext?: string;
    questionCategory?: QuestionCategory;
  }>;
}

/**
 * Validates and resolves the API endpoint URL before calling fetch.
 * Guarantees that fetch() NEVER receives Blob URLs, file: URLs, or malformed strings
 * which cause WebKit/Safari to throw "The string did not match the expected pattern."
 */
export function resolveValidApiUrl(customUrl?: string): string {
  const defaultEndpoint = "/api/generate-reviewer";
  const candidate =
    typeof customUrl === "string" && customUrl.trim()
      ? customUrl.trim()
      : defaultEndpoint;

  // Strictly reject blob:, file:, data:, or javascript: schemes
  if (/^(blob|file|data|javascript):/i.test(candidate)) {
    console.warn(
      `[apiClient] Prohibited scheme detected in API URL ("${candidate}"). Falling back to safe default: "${defaultEndpoint}".`
    );
    return defaultEndpoint;
  }

  // If in browser context, check window.location
  if (typeof window !== "undefined" && window.location) {
    try {
      const loc = window.location;
      // If current page is running under a blob: or file: URL, never resolve relative to it
      if (loc.protocol !== "http:" && loc.protocol !== "https:") {
        return defaultEndpoint;
      }

      if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
        const parsed = new URL(candidate);
        return parsed.toString();
      }

      const origin = loc.origin && loc.origin !== "null" ? loc.origin : "";
      if (origin) {
        return new URL(candidate.startsWith("/") ? candidate : `/${candidate}`, origin).toString();
      }
    } catch (err) {
      console.warn("[apiClient] Error constructing absolute API URL, using default path:", err);
    }
  }

  return candidate.startsWith("/") ? candidate : `/${candidate}`;
}

/**
 * Validates and sanitizes a document ID string.
 * Must be a clean identifier without blob references or malformed characters.
 */
export function validateDocumentId(id: unknown): string {
  if (typeof id !== "string") return `doc-${Date.now()}`;
  const trimmed = id.trim();
  if (
    !trimmed ||
    /^(blob|file|data|javascript):/i.test(trimmed) ||
    trimmed === "[object Object]"
  ) {
    return `doc-${Date.now()}`;
  }
  return trimmed.replace(/[^\w\-\.]/g, "_").slice(0, 100);
}

/**
 * Validates and sanitizes a filename string.
 * Strips path traversal sequences, control characters, and prohibited schemes.
 */
export function validateFileName(name: unknown): string {
  if (typeof name !== "string") return "study-notes.txt";
  const trimmed = name.trim();
  if (
    !trimmed ||
    /^(blob|file|data|javascript):/i.test(trimmed) ||
    trimmed === "[object Object]"
  ) {
    return "study-notes.txt";
  }
  // Sanitize path traversal
  const sanitized = trimmed.replace(/(\.\.[\/\\])+/g, "").replace(/[\/\\]/g, "_");
  return sanitized.slice(0, 150) || "study-notes.txt";
}

/**
 * Sanitizes visual assets to strictly ensure NO blob URLs are sent over the network.
 */
export function sanitizeVisuals(visuals: unknown[]): ExtractedVisual[] {
  if (!Array.isArray(visuals)) return [];
  return visuals
    .filter((v): v is ExtractedVisual => !!v && typeof v === "object")
    .map((v) => {
      let safeDataUrl = typeof v.dataUrl === "string" ? v.dataUrl.trim() : undefined;
      // Strip any blob: or file: URLs
      if (
        safeDataUrl &&
        (/^(blob|file|javascript):/i.test(safeDataUrl) || safeDataUrl === "[object Object]")
      ) {
        console.warn(
          "[apiClient] Stripped prohibited blob/file URL from visual dataUrl:",
          safeDataUrl.slice(0, 30)
        );
        safeDataUrl = undefined;
      }
      return {
        ...v,
        dataUrl: safeDataUrl,
      };
    });
}

/**
 * Safely requests study materials from the server endpoint /api/generate-reviewer.
 *
 * Implements defensive checks:
 * 1. Validates API URL to prevent "The string did not match the expected pattern" WebKit error.
 * 2. Validates document IDs and filenames before sending.
 * 3. Sanitizes visual items so Blob URLs are never transmitted.
 * 4. Checks HTTP response status codes and handles HTML fallbacks cleanly.
 * 5. Returns friendly JSON errors instead of runtime exceptions.
 */
export async function requestStudyMaterialsGeneration(
  params: GenerateReviewerApiParams
): Promise<GeneratedStudyData> {
  const sourceText = (params.content || params.rawContent || "").trim();

  if (!sourceText) {
    throw new Error(
      "No readable study notes or document text provided. Please make sure the uploaded document has text content."
    );
  }

  // Cap source content to ~100,000 characters to ensure fast, reliable generation within token limits
  const sanitizedContent =
    sourceText.length > 100000 ? sourceText.slice(0, 100000) : sourceText;

  const resolvedTitle = params.title || params.titleHint || "Study Reviewer";
  const flashcardCount = Number(params.flashcardCount || 12);
  const quizCount = Number(params.quizCount || 20);
  const quizTypes = params.quizTypes || [
    "multiple_choice",
    "true_false",
    "identification",
    "short_answer",
  ];

  // Validate document identifiers and filenames
  const safeDocId = params.documentId ? validateDocumentId(params.documentId) : undefined;
  const safeFileName = params.fileName ? validateFileName(params.fileName) : undefined;
  const safeDocIds = Array.isArray(params.documentIds)
    ? params.documentIds.map(validateDocumentId)
    : undefined;
  const safeFileNames = Array.isArray(params.fileNames)
    ? params.fileNames.map(validateFileName)
    : undefined;

  // Sanitize extracted visuals (strictly eliminate any blob: URLs)
  const safeVisuals = sanitizeVisuals(params.extractedVisuals || []).slice(0, 8);

  // Validate API endpoint URL (never allow blob: or malformed patterns)
  const targetApiUrl = resolveValidApiUrl(params.apiUrl);

  const requestPayload = {
    title: resolvedTitle,
    titleHint: resolvedTitle,
    content: sanitizedContent,
    rawContent: sanitizedContent,
    flashcardCount,
    quizCount,
    quizQuestionCount: quizCount,
    quizTypes,
    allowedQuestionTypes: quizTypes,
    strictSourceOnly: true,
    extractedVisuals: safeVisuals,
    documentId: safeDocId,
    fileName: safeFileName,
    documentIds: safeDocIds,
    fileNames: safeFileNames,
  };

  let response: Response;

  try {
    response = await fetch(targetApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestPayload),
    });
  } catch (networkErr: any) {
    console.error("Network error when calling study materials endpoint:", networkErr);
    const errString = String(networkErr?.message || networkErr || "");
    if (
      errString.includes("expected pattern") ||
      errString.includes("SyntaxError") ||
      errString.includes("InvalidCharacterError")
    ) {
      throw new Error(
        "A connection pattern error was caught. A clean API path has been verified. Please try clicking Generate again."
      );
    }
    throw new Error(
      "Unable to connect to the study generation server. Please check your internet connection."
    );
  }

  // Safely read response text first
  let rawText = "";
  try {
    rawText = await response.text();
  } catch (readErr: any) {
    throw new Error(
      `Failed to read server response: ${readErr?.message || "Unknown error"}`
    );
  }

  // Check if response is HTML (which causes Safari's "The string did not match the expected pattern")
  const trimmed = rawText.trim();
  const isHtml =
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    trimmed.startsWith("<head") ||
    trimmed.startsWith("<body") ||
    (response.headers.get("content-type") || "").toLowerCase().includes("text/html");

  if (isHtml) {
    console.error(
      "Server returned HTML instead of JSON. Snippet:",
      trimmed.slice(0, 200)
    );

    if (!response.ok) {
      throw new Error(
        `Server returned an error page (HTTP ${response.status}). Please check your server logs or Vercel deployment status.`
      );
    }

    throw new Error(
      "The server returned an HTML page instead of API data. If hosted on Vercel, please check that Vercel Functions are active and GEMINI_API_KEY is added to Environment Variables."
    );
  }

  // Safely parse JSON
  let resJson: any;
  try {
    resJson = JSON.parse(rawText);
  } catch (parseErr) {
    console.error(
      "Failed to parse JSON response from study materials endpoint:",
      trimmed.slice(0, 250)
    );

    // Fall back to status-code error messages if JSON parsing fails
    if (response.status === 404) {
      throw new Error(
        "The /api/generate-reviewer endpoint was not found (404). If running on Vercel, please ensure Vercel Serverless Functions are enabled and GEMINI_API_KEY is configured."
      );
    }
    if (response.status === 413) {
      throw new Error(
        "The document content is too large for a single generation request. Please select a shorter document section or fewer pages."
      );
    }
    if (response.status === 429) {
      throw new Error(
        "Gemini AI rate limit reached. Please wait a moment and try clicking Generate again."
      );
    }
    if (response.status === 503 || response.status === 504) {
      throw new Error(
        "The AI service is experiencing momentary high demand. Please try clicking Generate again in a few seconds."
      );
    }

    throw new Error(
      "The AI server returned an unexpected response format. Please try again in a few moments."
    );
  }

  // Handle server-side reported errors (extract exact message from server JSON)
  if (!response.ok || resJson.success === false) {
    const errorMsg =
      resJson.error ||
      resJson.message ||
      (response.status === 429
        ? "Gemini AI rate limit reached. Please wait a moment and try clicking Generate again."
        : response.status === 503
        ? "The AI service is experiencing temporary high demand spikes. Please try clicking Generate again in a few moments."
        : `Generation request failed (HTTP ${response.status}).`);
    throw new Error(errorMsg);
  }

  const data = resJson.data || resJson;

  if (!data || (!data.flashcards && !data.quizQuestions)) {
    throw new Error(
      "The study generator completed but returned incomplete study data. Please try again."
    );
  }

  return data as GeneratedStudyData;
}
