/**
 * Safe error parser and user-friendly error formatter for Review Master AI.
 *
 * Prevents JavaScript error objects from being rendered as "[object Object]" in the UI.
 * Extracts messages from:
 * - error.message
 * - API JSON message / error fields
 * - Nested API error objects (e.g. { error: { code: 503, message: "..." } })
 * - Server response text
 *
 * Logs full errors to the console for developer debugging while presenting
 * clean, helpful, human-readable guidance to the user.
 */

/**
 * Safely extracts a clean, human-readable error string from any error object,
 * API JSON payload, server response text, or exception.
 *
 * Guarantees that "[object Object]" is NEVER returned.
 */
export function extractReadableErrorMessage(
  err: unknown,
  fallback = "Failed to generate study materials. Please try again."
): string {
  if (err === null || err === undefined) {
    return fallback;
  }

  // 1. If err is already a string
  if (typeof err === "string") {
    const trimmed = err.trim();
    if (!trimmed || trimmed === "[object Object]") {
      return fallback;
    }

    // Safely attempt to parse JSON string if it looks like serialized JSON
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractReadableErrorMessage(parsed, fallback);
      } catch {
        // Not valid JSON, keep string
      }
    }

    return trimmed;
  }

  // 2. If err is an object (Error instance, API response, or custom dictionary)
  if (typeof err === "object") {
    const obj = err as Record<string, any>;

    // Check nested API JSON `error` field (Google / Express / Custom standard)
    if (obj.error !== undefined && obj.error !== null) {
      if (typeof obj.error === "string") {
        const trimmed = obj.error.trim();
        if (trimmed && trimmed !== "[object Object]") {
          if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
              const parsed = JSON.parse(trimmed);
              return extractReadableErrorMessage(parsed, fallback);
            } catch {
              // Return trimmed
            }
          }
          return trimmed;
        }
      } else if (typeof obj.error === "object") {
        const nestedMsg = extractReadableErrorMessage(obj.error, "");
        if (nestedMsg && nestedMsg !== "[object Object]") {
          return nestedMsg;
        }
      }
    }

    // Check standard `message` property (Error.message or API JSON message)
    if (obj.message !== undefined && obj.message !== null) {
      if (typeof obj.message === "string") {
        const trimmed = obj.message.trim();
        if (trimmed && trimmed !== "[object Object]") {
          if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
              const parsed = JSON.parse(trimmed);
              return extractReadableErrorMessage(parsed, fallback);
            } catch {
              // Return trimmed
            }
          }
          return trimmed;
        }
      } else if (typeof obj.message === "object") {
        const nestedMsg = extractReadableErrorMessage(obj.message, "");
        if (nestedMsg && nestedMsg !== "[object Object]") {
          return nestedMsg;
        }
      }
    }

    // Check alternative property fields
    const candidates = [obj.msg, obj.details, obj.statusText, obj.description, obj.title];
    for (const cand of candidates) {
      if (typeof cand === "string") {
        const trimmed = cand.trim();
        if (trimmed && trimmed !== "[object Object]") {
          return trimmed;
        }
      } else if (cand && typeof cand === "object") {
        const nested = extractReadableErrorMessage(cand, "");
        if (nested && nested !== "[object Object]") {
          return nested;
        }
      }
    }

    // Check cause or data wrappers
    if (obj.cause) {
      const causeMsg = extractReadableErrorMessage(obj.cause, "");
      if (causeMsg && causeMsg !== "[object Object]") return causeMsg;
    }
    if (obj.data) {
      const dataMsg = extractReadableErrorMessage(obj.data, "");
      if (dataMsg && dataMsg !== "[object Object]") return dataMsg;
    }

    // Check array of error items
    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
      const itemMsg = extractReadableErrorMessage(obj.errors[0], "");
      if (itemMsg && itemMsg !== "[object Object]") return itemMsg;
    }

    // Check HTTP status or code properties
    if (typeof obj.status === "number" || typeof obj.code === "number" || typeof obj.statusCode === "number") {
      const statusCode = obj.status || obj.code || obj.statusCode;
      if (statusCode === 429) return "AI rate limit reached. Please wait a moment and try again.";
      if (statusCode === 503) return "The AI service is experiencing high demand. Please try again in a few moments.";
      if (statusCode === 404) return "The requested API service endpoint was not found.";
      if (statusCode === 413) return "The provided document content is too large.";
      return `Server returned status ${statusCode}.`;
    }
  }

  return fallback;
}

/**
 * Logs the full error to the console for developer debugging (Requirement 5)
 * and returns a clear, user-friendly message suitable for rendering in the UI.
 */
export function formatUserFriendlyGenerationError(
  err: unknown,
  contextTitle = "Study Generation"
): string {
  // Requirement 5: Log the full error in the console for debugging
  console.error(`[${contextTitle} Error]:`, err);

  const raw = extractReadableErrorMessage(err, "");

  if (!raw || raw === "[object Object]") {
    return "Failed to generate study materials. Please verify your connection and try clicking Generate again.";
  }

  const lower = raw.toLowerCase();

  // High demand / 503 / UNAVAILABLE / Overloaded
  if (
    lower.includes("503") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("spikes in demand") ||
    lower.includes("experiencing high demand") ||
    lower.includes("overloaded")
  ) {
    return "The AI service is experiencing high demand. Please click 'Generate Study Materials' again in a few seconds.";
  }

  // Rate limits / 429 / Quota
  if (
    lower.includes("429") ||
    lower.includes("resource_exhausted") ||
    lower.includes("rate limit") ||
    lower.includes("quota")
  ) {
    return "AI generation rate limit reached. Please wait a few seconds before trying again.";
  }

  // API Key issues / 401
  if (
    lower.includes("gemini_api_key") ||
    lower.includes("api_key_invalid") ||
    lower.includes("api key") ||
    lower.includes("unauthenticated") ||
    lower.includes("401")
  ) {
    return "The AI service credentials need attention. Please verify that GEMINI_API_KEY is configured in your project settings.";
  }

  // Safari / WebKit connection pattern issues
  if (
    lower.includes("expected pattern") ||
    lower.includes("invalidcharactererror")
  ) {
    return "A connection pattern issue was detected. A clean API path has been restored. Please try clicking Generate again.";
  }

  // Content too large / 413
  if (
    lower.includes("413") ||
    lower.includes("too large") ||
    lower.includes("token limit") ||
    lower.includes("payload too large")
  ) {
    return "The document content is too large for a single generation request. Please select a shorter document section or fewer pages.";
  }

  // Network / connection failures
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("unable to connect") ||
    lower.includes("econnrefused")
  ) {
    return "Unable to connect to the study generation server. Please check your internet connection.";
  }

  // User-facing validation messages
  if (
    lower.includes("no readable study notes") ||
    lower.includes("select at least one quiz") ||
    lower.includes("missing request body")
  ) {
    return raw;
  }

  // If raw is already a clean concise sentence without markup, return it directly
  if (!raw.includes("{") && !raw.includes("}") && !raw.includes("<") && raw.length <= 180) {
    return raw;
  }

  return "Failed to generate study materials. Please try clicking Generate again in a few moments.";
}
