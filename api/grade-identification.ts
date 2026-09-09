import dotenv from "dotenv";
import { gradeIdentificationCore } from "../src/server/gradeIdentificationCore.ts";
import { extractCleanErrorMessage } from "../src/server/generateReviewerCore.ts";

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

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (_parseErr) {
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

    const { question, groundedAnswer, studentAnswer, sourceExcerpt } = body;

    const result = await gradeIdentificationCore({
      question,
      groundedAnswer: groundedAnswer || "",
      studentAnswer: studentAnswer || "",
      sourceExcerpt,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Original exception in POST /api/grade-identification:", error);
    const msg = extractCleanErrorMessage(error, "Failed to grade identification answer.");
    return res.status(500).json({
      success: false,
      message: msg,
      error: msg,
    });
  }
}
