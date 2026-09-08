import dotenv from "dotenv";
import { generateReviewerCore } from "../src/server/generateReviewerCore";

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
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed. Please use POST.`,
    });
  }

  // Check server-side GEMINI_API_KEY environment variable
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error("[Vercel Function Error] GEMINI_API_KEY environment variable is not configured.");
    return res.status(500).json({
      success: false,
      error:
        "GEMINI_API_KEY environment variable is not configured. Please add GEMINI_API_KEY in your Vercel Project Settings (Settings > Environment Variables) or server environment.",
    });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (parseErr) {
        return res.status(400).json({
          success: false,
          error: "Invalid JSON request payload.",
        });
      }
    }

    if (!body) {
      return res.status(400).json({
        success: false,
        error: "Missing request body.",
      });
    }

    const data = await generateReviewerCore(body);
    return res.status(200).json({
      success: true,
      data,
      ...data,
    });
  } catch (error: any) {
    console.error("[Vercel Function] Error in /api/generate-reviewer:", error);
    const msg = error.message || "Failed to generate study materials from content.";
    const statusCode = msg.includes("GEMINI_API_KEY") ? 500 : msg.includes("rate limit") ? 429 : 503;
    return res.status(statusCode).json({
      success: false,
      error: msg,
    });
  }
}

