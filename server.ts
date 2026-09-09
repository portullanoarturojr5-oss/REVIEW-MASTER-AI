import express from "express";
import path from "path";
import dotenv from "dotenv";
import { generateReviewerCore, extractCleanErrorMessage } from "./api/generateReviewerCore";
import { gradeIdentificationCore } from "./api/gradeIdentificationCore";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for document and visual uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check endpoint (support both /api/health and /health)
app.get(["/api/health", "/health"], (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  return res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Generate reviewer endpoint strictly grounded in uploaded content
app.post(["/api/generate-reviewer", "/generate-reviewer"], async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  // Verify server-side GEMINI_API_KEY
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const errorMsg =
      "GEMINI_API_KEY environment variable is not configured. Please add GEMINI_API_KEY to your environment variables.";
    console.error("[Server Error] GEMINI_API_KEY environment variable is not configured.");
    return res.status(500).json({
      success: false,
      message: errorMsg,
      error: errorMsg,
    });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (parseErr) {
        console.error("Invalid JSON body in /api/generate-reviewer:", parseErr);
        return res.status(400).json({
          success: false,
          message: "Invalid JSON request payload.",
          error: "Invalid JSON request payload.",
        });
      }
    }

    if (!body || (typeof body === "object" && Object.keys(body).length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Missing study materials request body.",
        error: "Missing study materials request body.",
      });
    }

    const data = await generateReviewerCore(body);
    return res.status(200).json({ success: true, data, ...data });
  } catch (error: any) {
    console.error("Original exception in POST /api/generate-reviewer:", error);
    const readableMessage = extractCleanErrorMessage(
      error,
      "Failed to generate study materials from content."
    );
    const isRateLimit =
      readableMessage.includes("rate limit") ||
      readableMessage.includes("RESOURCE_EXHAUSTED") ||
      readableMessage.includes("429") ||
      error?.status === 429;
    const isHighDemand =
      readableMessage.includes("high demand") ||
      readableMessage.includes("UNAVAILABLE") ||
      readableMessage.includes("503") ||
      error?.status === 503;
    const isBadInput =
      readableMessage.includes("No study content provided") ||
      readableMessage.includes("Invalid content format") ||
      readableMessage.includes("Missing study materials") ||
      error?.status === 400;

    const statusCode = isBadInput ? 400 : isRateLimit ? 429 : isHighDemand ? 503 : 500;
    return res.status(statusCode).json({
      success: false,
      message: readableMessage,
      error: readableMessage,
    });
  }
});

// Grade identification endpoint evaluating semantic similarity based on meaning in Strict Source Mode
app.post(["/api/grade-identification", "/grade-identification"], async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { question, groundedAnswer, studentAnswer, sourceExcerpt } = req.body || {};
    const result = await gradeIdentificationCore({
      question,
      groundedAnswer: groundedAnswer || "",
      studentAnswer: studentAnswer || "",
      sourceExcerpt,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error("Original exception in POST /api/grade-identification:", error);
    const msg = extractCleanErrorMessage(error, "Failed to evaluate identification answer.");
    return res.status(500).json({
      success: false,
      message: msg,
      error: msg,
    });
  }
});

// Explicit JSON fallback for all unmatched /api/* requests (NEVER return HTML)
app.all(["/api", "/api/*"], (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  const notFoundMsg = "API endpoint not found. Please verify the requested API path.";
  return res.status(404).json({
    success: false,
    message: notFoundMsg,
    error: notFoundMsg,
  });
});

// Global error-handling middleware to ensure errors always return clean JSON
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled Express server error:", err);
  res.setHeader("Content-Type", "application/json");
  const statusCode = err.status || err.statusCode || 500;
  const cleanMsg = extractCleanErrorMessage(err, "An unexpected server error occurred.");
  return res.status(statusCode).json({
    success: false,
    message: cleanMsg,
    error: cleanMsg,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Review Master AI server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start standalone server when executed directly as main script (not when imported in serverless functions or tests)
const isVercel = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const isDirectRun = Boolean(
  process.argv[1] &&
    (process.argv[1].endsWith("server.ts") ||
      process.argv[1].endsWith("server.cjs") ||
      process.argv[1].endsWith("server.js"))
);

if (isDirectRun && !isVercel && process.env.NODE_ENV !== "test") {
  startServer();
}

export { app };
export default app;

