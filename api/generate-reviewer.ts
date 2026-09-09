import dotenv from "dotenv";
import { generateReviewerCore, extractCleanErrorMessage } from "./generateReviewerCore.ts";

dotenv.config();

export default async function handler(req: any, res: any) {
  // Always guarantee JSON content type
  res.setHeader("Content-Type", "application/json");

  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    const methodError = `Method ${req.method} not allowed. Please use POST.`;
    return res.status(405).json({
      success: false,
      message: methodError,
      error: methodError,
    });
  }

  // Check server-side GEMINI_API_KEY environment variable
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const errorMsg =
      "GEMINI_API_KEY environment variable is not configured. Please add GEMINI_API_KEY in your Vercel Project Settings (Settings > Environment Variables) or server environment.";
    console.error("[Vercel Function Error] GEMINI_API_KEY environment variable is not configured.");
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
    return res.status(200).json({
      success: true,
      data,
      ...data,
    });
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
}

