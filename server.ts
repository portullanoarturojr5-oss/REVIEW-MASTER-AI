import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for document uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy initialize Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
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

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Generate reviewer endpoint strictly grounded in uploaded content
app.post("/api/generate-reviewer", async (req, res) => {
  try {
    const {
      content,
      rawContent,
      pdfBase64,
      fileBase64,
      mimeType,
      titleHint,
      title,
      flashcardCount = 10,
      quizCount,
      quizQuestionCount,
      quizTypes,
      allowedQuestionTypes,
    } = req.body;

    const sourceText = content || rawContent;
    const documentBase64 = pdfBase64 || fileBase64;
    const resolvedTitle = title || titleHint || "Study Reviewer";
    const requestedQuizCount = Number(quizCount || quizQuestionCount || 10);
    const requestedFlashcards = Number(flashcardCount || 15);
    const activeTypes = (quizTypes || allowedQuestionTypes || [
      "multiple_choice",
      "true_false",
      "identification",
      "short_answer",
    ]) as string[];

    if (!sourceText && !documentBase64) {
      return res.status(400).json({
        error: "No study content provided. Please upload notes, PDF, PPTX, or DOCX.",
      });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are a strictly grounded academic study generator for "Review Master AI".
CRITICAL STRICT SOURCE MODE DIRECTIVES:
1. Generate all flashcards and quiz questions EXCLUSIVELY and SOLELY from the provided notes or document text.
2. NEVER use internet knowledge, outside general trivia, or external facts.
3. NEVER invent facts, names, or unmentioned details.
4. If a fact or term is not explicitly stated in the source text, it DOES NOT EXIST.
5. In multiple-choice questions, distractors must be plausible concepts or terms drawn directly from the text itself, not external made-up facts.
6. For short_answer questions:
   - Provide a clear, conceptual prompt derived from the notes.
   - Provide 'correctAnswer' as the comprehensive model answer (1-3 sentences) strictly summarizing the notes.
   - Provide 'rubricKeywords': an array of 2-5 essential keywords or phrases from the notes that must be present in a complete student answer.
7. For EVERY flashcard and EVERY quiz question, you MUST include 'sourceExcerpt', which is an EXACT, verbatim, word-for-word quote from the source text proving the answer.`;

    const promptText = `Analyze the following study material carefully and generate high-yield study materials.
Topic: "${resolvedTitle}"
Requested Flashcard count: ${requestedFlashcards}
Requested Quiz questions count: ${requestedQuizCount}
Allowed question types to include: ${activeTypes.join(", ")}

Generate:
1. Concise title and a factual 2-4 sentence summary strictly summarizing only what is in the text.
2. 4 to 8 key concepts/terms strictly found in the material.
3. High-yield flashcards with front (question/prompt), back (answer), category, and verbatim sourceExcerpt.
4. Exactly ${requestedQuizCount} quiz questions balancing the allowed formats (${activeTypes.join(", ")}).
   - multiple_choice: exactly 4 options with 1 correct answer.
   - true_false: options ["True", "False"].
   - identification: options [], exact term as correctAnswer.
   - short_answer: options [], model answer as correctAnswer, and 2-5 rubricKeywords.
   - Every question must include a thorough grounded explanation and verbatim sourceExcerpt.

SOURCE NOTES:
"""
${sourceText ? sourceText.slice(0, 100000) : "[See attached document]"}
"""`;

    let contentsPayload: any = promptText;

    if (documentBase64) {
      contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || "application/pdf",
              data: documentBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      };
    }

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "A clear, descriptive title extracted directly from the subject matter.",
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
        flashcards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: {
                type: Type.STRING,
                description: "Question or prompt testing a fact from the text.",
              },
              back: {
                type: Type.STRING,
                description: "Accurate answer grounded strictly in the text.",
              },
              sourceExcerpt: {
                type: Type.STRING,
                description: "Verbatim citation or quote from the source text confirming this fact.",
              },
              category: {
                type: Type.STRING,
                description: "Subject sub-topic or section name.",
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
                description: "The question statement strictly based on the text.",
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "For multiple_choice, 4 options. For true_false, ['True', 'False']. For identification and short_answer, empty array.",
              },
              correctAnswer: {
                type: Type.STRING,
                description: "The correct answer or model answer verbatim or directly derived from the text.",
              },
              rubricKeywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "2-5 key words or phrases required for short answer evaluation.",
              },
              sourceExcerpt: {
                type: Type.STRING,
                description: "Verbatim quote from the text that proves this answer is correct.",
              },
              explanation: {
                type: Type.STRING,
                description: "Short explanation pointing directly to the source text evidence.",
              },
            },
            required: ["type", "question", "correctAnswer", "sourceExcerpt", "explanation"],
          },
        },
      },
      required: ["title", "summary", "keyConcepts", "flashcards", "quizQuestions"],
    };

    // Resilient candidate models in priority order
    const candidateModels = [
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
      "gemini-3.6-flash",
    ];

    let parsedData: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`[Gemini API] Requesting study materials using model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contentsPayload,
          config: {
            systemInstruction,
            temperature: 0.2, // Low temperature for maximum factual fidelity
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        });

        const text = response.text?.trim();
        if (!text) {
          throw new Error(`Empty response returned by ${modelName}`);
        }

        // Strip markdown code fences if present
        let cleaned = text;
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        }

        parsedData = JSON.parse(cleaned);
        console.log(`[Gemini API] Successfully generated study reviewer with ${modelName}`);
        break; // Success, break out of model loop
      } catch (err: any) {
        lastError = err;
        const errString = String(err?.message || err || "");
        console.log(`[Gemini API] Model ${modelName} encountered issue (${errString.slice(0, 120)}). Moving to next candidate...`);
      }
    }

    if (!parsedData) {
      console.error("[Gemini API] All candidate models failed. Last error summary:", String(lastError?.message || lastError).slice(0, 200));
      let friendlyError = "The AI service is temporarily experiencing high demand. Please try again in a few moments.";
      const rawMsg = String(lastError?.message || lastError || "");
      if (rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
        friendlyError = "Rate limit reached. Please wait a moment before trying again.";
      } else if (rawMsg.includes("GEMINI_API_KEY")) {
        friendlyError = "Gemini API key is not configured.";
      }
      return res.status(503).json({
        error: friendlyError,
      });
    }

    return res.json({ success: true, data: parsedData, ...parsedData });
  } catch (error: any) {
    console.error("Error in /api/generate-reviewer:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate reviewer from content.",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
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

startServer();
