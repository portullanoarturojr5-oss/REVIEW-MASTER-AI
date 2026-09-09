import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import type { IdentificationGradingResult } from "./identificationEvaluator.ts";
import { gradeIdentificationAnswerLocally } from "./identificationEvaluator.ts";

dotenv.config();

export interface GradeIdentificationParams {
  question?: string;
  groundedAnswer: string;
  studentAnswer: string;
  sourceExcerpt?: string;
}

export async function gradeIdentificationCore(
  params: GradeIdentificationParams
): Promise<IdentificationGradingResult> {
  const { question = "", groundedAnswer = "", studentAnswer = "", sourceExcerpt = "" } = params;

  // If student answer is empty, handle immediately
  if (!studentAnswer.trim()) {
    return gradeIdentificationAnswerLocally(groundedAnswer, studentAnswer, question, sourceExcerpt);
  }

  // Fast check: If exact match or quick local check has 100% confidence
  const localEval = gradeIdentificationAnswerLocally(groundedAnswer, studentAnswer, question, sourceExcerpt);
  if (localEval.scorePercent >= 98 || localEval.scorePercent <= 20) {
    return localEval;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[Grade Identification] GEMINI_API_KEY not found; using local linguistic evaluator.");
    return localEval;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const systemInstruction = `You are an intelligent, strict academic identification question grader operating in Strict Source Mode.
Evaluate the student's answer against the grounded source answer from the uploaded reviewer.

GRADING PRINCIPLES:
1. Grade answers based on MEANING (semantic similarity) instead of exact words.
2. Accept paraphrased answers when they express the same core idea or concept.
3. Ignore differences in:
   - capitalization (e.g., "mitochondria" vs "Mitochondria")
   - punctuation (e.g., hyphens, commas, periods)
   - plural/singular forms (e.g., "cell" vs "cells", "leaf" vs "leaves")
   - word order (e.g., "supply and demand" vs "demand and supply")
   - minor grammar mistakes or slight typos
   - synonymous wording (e.g., "powerhouse of the cell" vs "cellular organelle producing ATP")
4. Reject answers that change or contradict the meaning (e.g., "inflation" when answer is "deflation", "decreases" when answer is "increases").
5. Strict Source Mode: The correct answer must still come ONLY from the uploaded documents. Never use internet knowledge.

SCORING THRESHOLDS:
- 90–100% -> ✅ Correct
- 75–89%  -> ✅ Correct (same meaning)
- 60–74%  -> 🟡 Partially Correct
- Below 60% -> ❌ Incorrect

FEEDBACK OUTPUT:
Provide:
- scorePercent: integer between 0 and 100
- verdict: "correct" | "partially_correct" | "incorrect"
- verdictLabel: "Correct" | "Correct (same meaning)" | "Partially Correct" | "Incorrect"
- groundedAnswer: the verbatim correct answer from the reviewer
- matchedConcepts: list of key concept phrases that the student matched
- missingConcepts: list of key concept phrases that the student missed or omitted
- explanation: a concise 1-2 sentence explanation highlighting which concepts matched and which were missing`;

  const userPrompt = `EVALUATE THIS IDENTIFICATION QUESTION:
- Question: "${question}"
- Grounded Source Answer: "${groundedAnswer}"
- Source Excerpt Context: "${sourceExcerpt}"
- Student's Submitted Answer: "${studentAnswer}"

Compare the student's answer with the grounded source answer. Output strictly valid JSON matching the schema.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      scorePercent: {
        type: Type.INTEGER,
        description: "Semantic similarity score from 0 to 100",
      },
      verdict: {
        type: Type.STRING,
        description: "One of: correct, partially_correct, incorrect",
      },
      verdictLabel: {
        type: Type.STRING,
        description: "One of: 'Correct', 'Correct (same meaning)', 'Partially Correct', 'Incorrect'",
      },
      groundedAnswer: {
        type: Type.STRING,
        description: "The grounded answer from the reviewer",
      },
      matchedConcepts: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Key concepts that the student matched",
      },
      missingConcepts: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Key concepts that the student missed or omitted",
      },
      explanation: {
        type: Type.STRING,
        description: "Short explanation highlighting which concepts matched and which were missing",
      },
    },
    required: [
      "scorePercent",
      "verdict",
      "verdictLabel",
      "groundedAnswer",
      "matchedConcepts",
      "missingConcepts",
      "explanation",
    ],
  };

  const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        const score = Math.min(100, Math.max(0, Math.round(Number(parsed.scorePercent) || 0)));

        let verdict = parsed.verdict;
        let verdictLabel = parsed.verdictLabel;

        if (score >= 90) {
          verdict = "correct";
          verdictLabel = "Correct";
        } else if (score >= 75) {
          verdict = "correct";
          verdictLabel = "Correct (same meaning)";
        } else if (score >= 60) {
          verdict = "partially_correct";
          verdictLabel = "Partially Correct";
        } else {
          verdict = "incorrect";
          verdictLabel = "Incorrect";
        }

        return {
          scorePercent: score,
          verdict,
          verdictLabel,
          groundedAnswer: parsed.groundedAnswer || groundedAnswer,
          explanation: parsed.explanation || localEval.explanation,
          matchedConcepts: Array.isArray(parsed.matchedConcepts) ? parsed.matchedConcepts : localEval.matchedConcepts,
          missingConcepts: Array.isArray(parsed.missingConcepts) ? parsed.missingConcepts : localEval.missingConcepts,
          isAiGraded: true,
        };
      }
    } catch (err) {
      console.warn(`[Grade Identification] Model ${modelName} failed, trying fallback:`, err);
    }
  }

  // Fallback to local evaluation if all models fail
  return localEval;
}
