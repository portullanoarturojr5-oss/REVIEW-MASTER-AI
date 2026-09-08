import express from "express";
import path from "path";
import dotenv from "dotenv";
import { generateReviewerCore } from "./src/server/generateReviewerCore";

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
    console.error("[Server Error] GEMINI_API_KEY environment variable is not configured.");
    return res.status(500).json({
      success: false,
      error:
        "GEMINI_API_KEY environment variable is not configured. Please add GEMINI_API_KEY in your Vercel Project Settings (Settings > Environment Variables) or server environment.",
    });
  }

  try {
    const data = await generateReviewerCore(req.body);
    return res.status(200).json({ success: true, data, ...data });
  } catch (error: any) {
    console.error("Error in /api/generate-reviewer:", error);
    const msg = error.message || "Failed to generate reviewer from content.";
    const statusCode = msg.includes("GEMINI_API_KEY") ? 500 : msg.includes("rate limit") ? 429 : 503;
    return res.status(statusCode).json({
      success: false,
      error: msg,
    });
  }
});

// Explicit JSON fallback for all unmatched /api/* requests (NEVER return HTML)
app.all(["/api", "/api/*"], (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  return res.status(404).json({
    success: false,
    error: "API endpoint not found. Please verify the requested API path.",
  });
});

// Global error-handling middleware to ensure errors always return JSON
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled Express server error:", err);
  res.setHeader("Content-Type", "application/json");
  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.message || "An unexpected server error occurred.",
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

