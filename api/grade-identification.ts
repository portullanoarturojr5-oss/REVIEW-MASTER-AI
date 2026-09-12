import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export type IdentificationVerdict = "correct" | "partially_correct" | "incorrect";

export interface IdentificationGradingResult {
  scorePercent: number; // 0 to 100
  verdict: IdentificationVerdict;
  verdictLabel: "Correct" | "Correct (same meaning)" | "Partially Correct" | "Incorrect";
  groundedAnswer: string;
  explanation: string;
  matchedConcepts: string[];
  missingConcepts: string[];
  isAiGraded?: boolean;
}

/**
 * Intelligent Identification Grading
 * Evaluates semantic similarity based on meaning rather than exact character matching.
 * Strictly adheres to source material and the grounded reviewer answer.
 */

// Common academic acronyms and expansions
const KNOWN_SYNONYMS_AND_ACRONYMS: Record<string, string[]> = {
  atp: ["adenosine triphosphate", "cellular energy currency"],
  dna: ["deoxyribonucleic acid", "genetic blueprint", "genetic material"],
  rna: ["ribonucleic acid"],
  mrna: ["messenger rna", "messenger ribonucleic acid"],
  cpu: ["central processing unit", "processor"],
  ram: ["random access memory", "volatile memory"],
  rom: ["read only memory", "nonvolatile memory"],
  gdp: ["gross domestic product", "economic output"],
  ped: ["price elasticity of demand", "elasticity of demand"],
  mitochondria: ["mitochondrion", "powerhouse of the cell", "cellular powerhouse"],
  mitochondrion: ["mitochondria", "powerhouse of the cell", "cellular powerhouse"],
  nucleus: ["nuclei", "brain of the cell", "cellular control center"],
  nuclei: ["nucleus", "brain of the cell", "cellular control center"],
  lysosome: ["lysosomes", "suicide bag", "suicide bags", "digestive organelle"],
  lysosomes: ["lysosome", "suicide bag", "suicide bags", "digestive organelle"],
  chloroplast: ["chloroplasts", "photosynthetic organelle"],
  chloroplasts: ["chloroplast", "photosynthetic organelle"],
  photosynthesis: ["photosynthetic process", "light conversion process"],
  osmosis: ["water diffusion", "movement of water across membrane"],
  diffusion: ["passive movement of molecules", "passive particle movement"],
  ribosome: ["ribosomes", "protein factory", "protein factories"],
  ribosomes: ["ribosome", "protein factory", "protein factories"],
  "cell membrane": ["plasma membrane", "semipermeable membrane", "phospholipid bilayer"],
  "plasma membrane": ["cell membrane", "semipermeable membrane", "phospholipid bilayer"],
  "law of demand": ["demand law", "inverse relationship between price and quantity demanded"],
  "law of supply": ["supply law", "direct relationship between price and quantity supplied"],
  inelastic: ["inelasticity", "price inelastic"],
  elastic: ["elasticity", "price elastic"],
  increase: ["rise", "growth", "grow", "surge", "gain", "upward"],
  decrease: ["fall", "drop", "decline", "reduction", "downward", "diminish"],
};

// Common irregular singular/plural stem mappings
const STEM_DICTIONARY: Record<string, string> = {
  mitochondria: "mitochondrion",
  bacteria: "bacterium",
  nuclei: "nucleus",
  fungi: "fungus",
  algae: "alga",
  protozoa: "protozoon",
  hypotheses: "hypothesis",
  theses: "thesis",
  analyses: "analysis",
  crises: "crisis",
  criteria: "criterion",
  phenomena: "phenomenon",
  indices: "index",
  matrices: "matrix",
  appendices: "appendix",
  leaves: "leaf",
  halves: "half",
  knives: "knife",
  lives: "life",
  wolves: "wolf",
  children: "child",
  men: "man",
  women: "woman",
  feet: "foot",
  teeth: "tooth",
  mice: "mouse",
  people: "person",
};

// Antonym / contradiction pairs: student using the opposite must be rejected/penalized
const CONTRADICTION_PAIRS: [string, string][] = [
  ["increase", "decrease"],
  ["grow", "shrink"],
  ["rise", "fall"],
  ["drop", "gain"],
  ["inflation", "deflation"],
  ["elastic", "inelastic"],
  ["aerobic", "anaerobic"],
  ["dominant", "recessive"],
  ["endothermic", "exothermic"],
  ["positive", "negative"],
  ["prokaryotic", "eukaryotic"],
  ["prokaryote", "eukaryote"],
  ["active", "passive"],
  ["acidic", "basic"],
  ["acid", "base"],
  ["micro", "macro"],
  ["voluntary", "involuntary"],
  ["internal", "external"],
  ["sympathetic", "parasympathetic"],
  ["mitosis", "meiosis"],
  ["cation", "anion"],
  ["somatic", "germ"],
];

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "in", "on", "at", "to", "for", "with", "by", "about", "against",
  "between", "into", "through", "during", "before", "after", "above",
  "below", "from", "up", "down", "of", "and", "or", "as", "it", "its",
  "this", "that", "these", "those", "which", "who", "whom", "what",
  "refers", "referred", "known", "called", "term", "process", "concept",
]);

/**
 * Normalizes text: lowercase, replaces punctuation with spaces, trims extra whitespace.
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Stems a word taking into account irregular plurals and standard English plural suffixes.
 */
export function stemWord(word: string): string {
  const w = word.toLowerCase().trim();
  if (!w) return "";
  if (STEM_DICTIONARY[w]) return STEM_DICTIONARY[w];

  // Standard regular plural reductions
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (w.endsWith("es") && w.length > 3) {
    if (w.endsWith("sses") || w.endsWith("shes") || w.endsWith("ches") || w.endsWith("xes")) {
      return w.slice(0, -2);
    }
    return w.slice(0, -1);
  }
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) {
    return w.slice(0, -1);
  }
  return w;
}

/**
 * Tokenizes text into normalized, stemmed content tokens.
 */
export function tokenizeContent(text: string): string[] {
  const clean = normalizeText(text);
  if (!clean) return [];
  return clean
    .split(/\s+/)
    .map((token) => stemWord(token))
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/**
 * Computes Levenshtein edit distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Normalized string similarity (0 to 1) based on edit distance.
 */
function stringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshtein(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Checks if two words are synonymous or match via acronym/expansion.
 */
function areWordsSynonymous(w1: string, w2: string): boolean {
  if (w1 === w2) return true;
  if (stemWord(w1) === stemWord(w2)) return true;

  const syns1 = KNOWN_SYNONYMS_AND_ACRONYMS[w1];
  if (syns1 && syns1.some((s) => normalizeText(s) === normalizeText(w2))) return true;

  const syns2 = KNOWN_SYNONYMS_AND_ACRONYMS[w2];
  if (syns2 && syns2.some((s) => normalizeText(s) === normalizeText(w1))) return true;

  // Edit distance allowance for minor typos (e.g., "mitocondria" vs "mitochondria")
  if (w1.length >= 5 && w2.length >= 5 && stringSimilarity(w1, w2) >= 0.82) {
    return true;
  }
  return false;
}

/**
 * Detects if the student answer contains a direct contradiction or negation of the grounded answer.
 */
function detectContradiction(grounded: string, student: string): boolean {
  const normGrounded = normalizeText(grounded);
  const normStudent = normalizeText(student);

  // Check explicit negation mismatch
  const negationWords = ["not", "no", "never", "non", "opposite", "neither"];
  const groundedHasNegation = negationWords.some((nw) =>
    new RegExp(`\\b${nw}\\b`, "i").test(normGrounded)
  );
  const studentHasNegation = negationWords.some((nw) =>
    new RegExp(`\\b${nw}\\b`, "i").test(normStudent)
  );
  if (groundedHasNegation !== studentHasNegation) {
    return true;
  }

  // Check antonym conflicts
  for (const [w1, w2] of CONTRADICTION_PAIRS) {
    const groundedHasW1 = normGrounded.includes(w1);
    const groundedHasW2 = normGrounded.includes(w2);
    const studentHasW1 = normStudent.includes(w1);
    const studentHasW2 = normStudent.includes(w2);

    if (groundedHasW1 && !groundedHasW2 && studentHasW2 && !studentHasW1) return true;
    if (groundedHasW2 && !groundedHasW1 && studentHasW1 && !studentHasW2) return true;
  }

  return false;
}

/**
 * Extracts key conceptual terms from the grounded answer for reporting matched/missing concepts.
 */
function extractGroundedConcepts(groundedAnswer: string): string[] {
  const clean = normalizeText(groundedAnswer);
  if (!clean) return [];

  // If answer contains phrases with "and", comma, or slash, split into logical parts
  const subphrases = groundedAnswer
    .split(/[,;/]|(?:\s+and\s+)|(?:\s+or\s+)/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 1);

  if (subphrases.length > 1) {
    return subphrases;
  }

  // Otherwise extract key content words
  const tokens = clean
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  return tokens.length > 0 ? tokens : [groundedAnswer.trim()];
}

/**
 * Intelligent Local Evaluator for Identification Answers.
 * Evaluates semantic similarity (0-100%) ignoring capitalization, punctuation,
 * plural/singular differences, word order, minor spelling, and synonymous phrasing.
 * Strictly respects the uploaded document's grounded answer.
 */
export function gradeIdentificationAnswerLocally(
  groundedAnswer: string,
  studentAnswer: string,
  question?: string,
  _sourceExcerpt?: string
): IdentificationGradingResult {
  const trimmedStudent = (studentAnswer || "").trim();
  const trimmedGrounded = (groundedAnswer || "").trim();

  // Edge case: Empty student answer
  if (!trimmedStudent) {
    return {
      scorePercent: 0,
      verdict: "incorrect",
      verdictLabel: "Incorrect",
      groundedAnswer: trimmedGrounded,
      explanation: "No answer was provided.",
      matchedConcepts: [],
      missingConcepts: extractGroundedConcepts(trimmedGrounded),
    };
  }

  const normGrounded = normalizeText(trimmedGrounded);
  const normStudent = normalizeText(trimmedStudent);

  // 1. Direct or normalized identical match
  if (normGrounded === normStudent) {
    return {
      scorePercent: 100,
      verdict: "correct",
      verdictLabel: "Correct",
      groundedAnswer: trimmedGrounded,
      explanation: "Your answer matches the grounded concept from your notes.",
      matchedConcepts: extractGroundedConcepts(trimmedGrounded),
      missingConcepts: [],
    };
  }

  // 2. Check known full synonym or acronym match (e.g. "ATP" vs "adenosine triphosphate")
  for (const [key, synList] of Object.entries(KNOWN_SYNONYMS_AND_ACRONYMS)) {
    const isKeyGrounded = normGrounded === key || synList.some((s) => normalizeText(s) === normGrounded);
    const isKeyStudent = normStudent === key || synList.some((s) => normalizeText(s) === normStudent);
    if (isKeyGrounded && isKeyStudent) {
      return {
        scorePercent: 95,
        verdict: "correct",
        verdictLabel: "Correct (same meaning)",
        groundedAnswer: trimmedGrounded,
        explanation: "Your answer uses an accepted synonym or abbreviation that shares the exact same meaning as the notes.",
        matchedConcepts: extractGroundedConcepts(trimmedGrounded),
        missingConcepts: [],
      };
    }
  }

  // 3. Check for contradiction / antonym
  const hasContradiction = detectContradiction(trimmedGrounded, trimmedStudent);
  if (hasContradiction) {
    const concepts = extractGroundedConcepts(trimmedGrounded);
    return {
      scorePercent: 20,
      verdict: "incorrect",
      verdictLabel: "Incorrect",
      groundedAnswer: trimmedGrounded,
      explanation: "Your answer contradicts or opposes the grounded concept specified in the notes.",
      matchedConcepts: [],
      missingConcepts: concepts,
    };
  }

  // 4. Tokenization & Stemming
  const groundedTokens = tokenizeContent(trimmedGrounded);
  const studentTokens = tokenizeContent(trimmedStudent);

  // If both token lists are identical regardless of word order (e.g. "supply and demand" vs "demand and supply")
  if (
    groundedTokens.length > 0 &&
    groundedTokens.length === studentTokens.length &&
    [...groundedTokens].sort().join(" ") === [...studentTokens].sort().join(" ")
  ) {
    return {
      scorePercent: 98,
      verdict: "correct",
      verdictLabel: "Correct",
      groundedAnswer: trimmedGrounded,
      explanation: "Your answer correctly identifies all key terms in your notes (word order variation accepted).",
      matchedConcepts: extractGroundedConcepts(trimmedGrounded),
      missingConcepts: [],
    };
  }

  // 5. Check if student answer contains the grounded answer embedded in a descriptive phrase
  // e.g. Student says: "The term is photosynthesis" for answer "photosynthesis"
  if (normGrounded.length > 2 && normStudent.includes(normGrounded)) {
    return {
      scorePercent: 96,
      verdict: "correct",
      verdictLabel: "Correct",
      groundedAnswer: trimmedGrounded,
      explanation: "Your answer identifies the grounded concept directly within your response.",
      matchedConcepts: extractGroundedConcepts(trimmedGrounded),
      missingConcepts: [],
    };
  }

  // Check if grounded answer contains student answer and student is sufficiently specific
  if (normStudent.length > 4 && normGrounded.includes(normStudent) && normStudent.length / normGrounded.length >= 0.7) {
    return {
      scorePercent: 88,
      verdict: "correct",
      verdictLabel: "Correct (same meaning)",
      groundedAnswer: trimmedGrounded,
      explanation: "Your answer accurately captures the core term grounded in your reviewer.",
      matchedConcepts: extractGroundedConcepts(trimmedGrounded),
      missingConcepts: [],
    };
  }

  // 6. Detailed Concept Matching & Overlap Calculation
  const rawConcepts = extractGroundedConcepts(trimmedGrounded);
  const matchedConcepts: string[] = [];
  const missingConcepts: string[] = [];

  rawConcepts.forEach((concept) => {
    const conceptTokens = tokenizeContent(concept);
    const conceptNorm = normalizeText(concept);

    // Direct substring or synonymous check
    const matchedDirect =
      normStudent.includes(conceptNorm) ||
      conceptTokens.some((ct) => studentTokens.some((st) => areWordsSynonymous(ct, st)));

    if (matchedDirect) {
      matchedConcepts.push(concept);
    } else {
      missingConcepts.push(concept);
    }
  });

  // Calculate token overlap score
  let tokenMatches = 0;
  groundedTokens.forEach((gt) => {
    const isMatched = studentTokens.some((st) => areWordsSynonymous(gt, st));
    if (isMatched) tokenMatches++;
  });

  const tokenRatio = groundedTokens.length > 0 ? tokenMatches / groundedTokens.length : 0;
  const conceptRatio = rawConcepts.length > 0 ? matchedConcepts.length / rawConcepts.length : 0;
  const editSim = stringSimilarity(normGrounded, normStudent);

  // Compute weighted similarity percentage (0 - 100)
  let similarityScore = Math.round(
    conceptRatio * 50 + tokenRatio * 35 + editSim * 15
  );

  // If there are extra irrelevant tokens in student answer, apply gentle penalty
  if (studentTokens.length > groundedTokens.length * 2 && groundedTokens.length > 0) {
    similarityScore = Math.max(25, similarityScore - 12);
  }

  // Calibrate similarityScore to the exact requested scoring brackets:
  // 90–100% -> Correct
  // 75–89%  -> Correct (same meaning)
  // 60–74%  -> Partially Correct
  // Below 60% -> Incorrect
  let verdict: IdentificationVerdict = "incorrect";
  let verdictLabel: "Correct" | "Correct (same meaning)" | "Partially Correct" | "Incorrect" = "Incorrect";
  let explanation = "";

  if (similarityScore >= 90) {
    verdict = "correct";
    verdictLabel = "Correct";
    explanation = matchedConcepts.length > 0
      ? `Full concept match. Successfully identified: ${matchedConcepts.join(", ")}.`
      : "Your answer matches the grounded concept from your notes.";
  } else if (similarityScore >= 75) {
    verdict = "correct";
    verdictLabel = "Correct (same meaning)";
    explanation = `Paraphrased answer accepted with the same meaning.${
      matchedConcepts.length > 0 ? ` Matched: ${matchedConcepts.join(", ")}.` : ""
    }${missingConcepts.length > 0 ? ` Note phrasing in reviewer: "${trimmedGrounded}".` : ""}`;
  } else if (similarityScore >= 60) {
    verdict = "partially_correct";
    verdictLabel = "Partially Correct";
    explanation = `Partially captured the concept.${
      matchedConcepts.length > 0 ? ` Matched concepts: ${matchedConcepts.join(", ")}.` : ""
    }${missingConcepts.length > 0 ? ` Missing key terms: ${missingConcepts.join(", ")}.` : ""}`;
  } else {
    verdict = "incorrect";
    verdictLabel = "Incorrect";
    explanation = `Did not match the grounded answer.${
      missingConcepts.length > 0 ? ` Missing required concept: ${missingConcepts.join(", ")}.` : ""
    } Reviewer specifies: "${trimmedGrounded}".`;
  }

  return {
    scorePercent: Math.min(100, Math.max(0, similarityScore)),
    verdict,
    verdictLabel,
    groundedAnswer: trimmedGrounded,
    explanation,
    matchedConcepts,
    missingConcepts,
  };
}

// In-memory cache for fast, instant repeat lookups
const gradingCache = new Map<string, IdentificationGradingResult>();

function getCacheKey(question: string, grounded: string, student: string): string {
  return `${question.trim().toLowerCase()}|||${grounded.trim().toLowerCase()}|||${student.trim().toLowerCase()}`;
}

/**
 * Main evaluation entry point.
 * Performs intelligent semantic grading using Gemini server API when available,
 * with zero-lag fallback to the local linguistic semantic evaluator.
 */
export async function gradeIdentificationAnswer(params: {
  question: string;
  groundedAnswer: string;
  studentAnswer: string;
  sourceExcerpt?: string;
}): Promise<IdentificationGradingResult> {
  const { question, groundedAnswer, studentAnswer, sourceExcerpt } = params;

  // Check cache first
  const cacheKey = getCacheKey(question, groundedAnswer, studentAnswer);
  if (gradingCache.has(cacheKey)) {
    return gradingCache.get(cacheKey)!;
  }

  // Edge case: empty input
  if (!studentAnswer || !studentAnswer.trim()) {
    const res = gradeIdentificationAnswerLocally(groundedAnswer, studentAnswer, question, sourceExcerpt);
    gradingCache.set(cacheKey, res);
    return res;
  }

  // Local evaluation available immediately as reliable foundation
  const localResult = gradeIdentificationAnswerLocally(
    groundedAnswer,
    studentAnswer,
    question,
    sourceExcerpt
  );

  // If local evaluation is an exact/near-exact 100% match or direct contradiction,
  // return immediately without unnecessary network roundtrip
  if (localResult.scorePercent >= 98 || localResult.scorePercent <= 20) {
    gradingCache.set(cacheKey, localResult);
    return localResult;
  }

  // Attempt server AI grading for nuanced paraphrasing with a fast 3.5s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch("/api/grade-identification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        groundedAnswer,
        studentAnswer,
        sourceExcerpt,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.scorePercent === "number") {
        const aiScore = Math.min(100, Math.max(0, Math.round(data.scorePercent)));
        let verdict: IdentificationVerdict = "incorrect";
        let verdictLabel: "Correct" | "Correct (same meaning)" | "Partially Correct" | "Incorrect" = "Incorrect";

        if (aiScore >= 90) {
          verdict = "correct";
          verdictLabel = "Correct";
        } else if (aiScore >= 75) {
          verdict = "correct";
          verdictLabel = "Correct (same meaning)";
        } else if (aiScore >= 60) {
          verdict = "partially_correct";
          verdictLabel = "Partially Correct";
        } else {
          verdict = "incorrect";
          verdictLabel = "Incorrect";
        }

        const result: IdentificationGradingResult = {
          scorePercent: aiScore,
          verdict,
          verdictLabel: data.verdictLabel || verdictLabel,
          groundedAnswer: data.groundedAnswer || groundedAnswer,
          explanation: data.explanation || localResult.explanation,
          matchedConcepts: Array.isArray(data.matchedConcepts) ? data.matchedConcepts : localResult.matchedConcepts,
          missingConcepts: Array.isArray(data.missingConcepts) ? data.missingConcepts : localResult.missingConcepts,
          isAiGraded: true,
        };

        gradingCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (_err) {
    // Network or server timeout: seamlessly use localResult without disrupting user
  }

  gradingCache.set(cacheKey, localResult);
  return localResult;
}

export function extractCleanErrorMessage(
  error: any,
  fallback = "Failed to grade identification answer."
): string {
  if (!error) return fallback;
  if (typeof error === "string") {
    const trimmed = error.trim();
    if (!trimmed || trimmed === "[object Object]") return fallback;
    return trimmed;
  }
  if (typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

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
