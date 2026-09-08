import React, { useState } from "react";
import {
  Sparkles,
  Layers,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Loader2,
  Zap,
} from "lucide-react";
import { Reviewer, QuizQuestionType, QuizQuestionItem } from "../types";
import { updateReviewer, resetSetScores } from "../utils/storage";
import {
  requestStudyMaterialsGeneration,
  formatUserFriendlyGenerationError,
} from "../utils/apiClient";

interface GenerateStudyMaterialsModalProps {
  reviewer: Reviewer;
  onClose: () => void;
  onGenerated: (updatedReviewer: Reviewer, targetTab: "flashcards" | "quiz") => void;
}

export const GenerateStudyMaterialsModal: React.FC<GenerateStudyMaterialsModalProps> = ({
  reviewer,
  onClose,
  onGenerated,
}) => {
  const [questionCount, setQuestionCount] = useState<10 | 20 | 30 | 50>(20);
  const [bankMode, setBankMode] = useState<"append" | "replace">(
    reviewer.quizQuestions && reviewer.quizQuestions.length > 0 ? "append" : "replace"
  );
  const [flashcardCount, setFlashcardCount] = useState<number>(15);
  const [targetTab, setTargetTab] = useState<"flashcards" | "quiz">("quiz");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Question formats to include (Multiple Choice, True or False, Identification, Short Answer)
  const [includeMultipleChoice, setIncludeMultipleChoice] = useState(true);
  const [includeTrueFalse, setIncludeTrueFalse] = useState(true);
  const [includeIdentification, setIncludeIdentification] = useState(true);
  const [includeShortAnswer, setIncludeShortAnswer] = useState(true);

  // Word count & source notes stats
  const charCount = (reviewer.rawContent || "").length;
  const wordCount = (reviewer.rawContent || "").split(/\s+/).filter(Boolean).length;

  const handleGenerate = async () => {
    if (!reviewer.rawContent?.trim()) {
      setErrorMessage("This reviewer does not have any notes or text content to analyze.");
      return;
    }

    if (
      !includeMultipleChoice &&
      !includeTrueFalse &&
      !includeIdentification &&
      !includeShortAnswer
    ) {
      setErrorMessage(
        "Please select at least one quiz question format (Multiple Choice, True or False, Identification, or Short Answer)."
      );
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const allowedTypes: QuizQuestionType[] = [];
      if (includeMultipleChoice) allowedTypes.push("multiple_choice");
      if (includeTrueFalse) allowedTypes.push("true_false");
      if (includeIdentification) allowedTypes.push("identification");
      if (includeShortAnswer) allowedTypes.push("short_answer");

      const data = await requestStudyMaterialsGeneration({
        title: reviewer.title,
        content: reviewer.rawContent,
        flashcardCount,
        quizCount: questionCount,
        quizTypes: allowedTypes,
        extractedVisuals: reviewer.extractedVisuals || [],
        fileName: reviewer.sourceFileName || "Study Notes",
        documentId: reviewer.id,
      });

      const newFlashcards = (data.flashcards || []).map((fc: any, i: number) => ({
        id: `fc-${Date.now()}-${i}`,
        front: fc.front,
        back: fc.back,
        sourceExcerpt: fc.sourceExcerpt || "",
        category: fc.category || "Key Concept",
        mastery: "new" as const,
        isVisual: fc.isVisual,
        visualReference: fc.visualReference,
        visualDataUrl: fc.visualDataUrl,
        pageOrSlide: fc.pageOrSlide,
        sourceDoc: fc.sourceDoc,
      }));

      const newQuizQuestions = (data.quizQuestions || []).map((q: any, i: number) => ({
        id: `quiz-${Date.now()}-${i}`,
        type: (q.type as QuizQuestionType) || "multiple_choice",
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        rubricKeywords: q.rubricKeywords || [],
        sourceExcerpt: q.sourceExcerpt || "",
        isVisual: q.isVisual,
        visualReference: q.visualReference,
        visualDataUrl: q.visualDataUrl,
        pageOrSlide: q.pageOrSlide,
        sourceDoc: q.sourceDoc,
        tableContext: q.tableContext,
        questionCategory: q.questionCategory,
      }));

      let finalQuizQuestions = reviewer.quizQuestions || [];
      if (newQuizQuestions.length > 0) {
        if (bankMode === "append" && finalQuizQuestions.length > 0) {
          const existingSet = new Set(
            finalQuizQuestions.map((q) => q.question.toLowerCase().trim())
          );
          const uniqueNew = newQuizQuestions.filter(
            (q: QuizQuestionItem) => !existingSet.has(q.question.toLowerCase().trim())
          );
          finalQuizQuestions = [...finalQuizQuestions, ...uniqueNew];
        } else {
          finalQuizQuestions = newQuizQuestions;
          resetSetScores(reviewer.id);
        }
      }

      const updatedReviewer: Reviewer = {
        ...reviewer,
        summary: data.summary || reviewer.summary,
        keyConcepts: data.keyConcepts?.length ? data.keyConcepts : reviewer.keyConcepts,
        extractedVisuals: data.extractedVisuals?.length ? data.extractedVisuals : reviewer.extractedVisuals,
        studyNotes: data.studyNotes?.length ? data.studyNotes : reviewer.studyNotes,
        flashcards: newFlashcards.length > 0 ? newFlashcards : reviewer.flashcards,
        quizQuestions: finalQuizQuestions,
        quizStats: bankMode === "replace" ? {
          totalAttempts: 0,
          bestScore: 0,
          lastScore: 0,
          setScores: {},
        } : reviewer.quizStats,
        updatedAt: new Date().toISOString(),
      };

      updateReviewer(updatedReviewer);
      onGenerated(updatedReviewer, targetTab);
    } catch (err: any) {
      const friendlyMsg = formatUserFriendlyGenerationError(
        err,
        "Generate Study Materials"
      );
      setErrorMessage(friendlyMsg);
      setIsGenerating(false);
    }
  };

  return (
    <div
      id="generate-study-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="generate-study-modal-card"
        className="relative w-full max-w-2xl my-auto rounded-3xl bg-[#0B152E] border border-blue-500/35 p-6 sm:p-8 shadow-2xl shadow-blue-950 text-white"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-blue-900/40 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-600/30 border border-blue-300/30 shrink-0">
              <Zap className="w-6 h-6 text-white fill-current" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Generate Study Materials
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Reviewer: <strong className="text-blue-300">{reviewer.title}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Strict Source Mode Banner */}
        <div className="mb-5 rounded-2xl bg-[#060D1E] border border-emerald-500/35 p-3.5 sm:p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-300 uppercase tracking-wider text-[11px]">
                Strict Source Mode Active
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                Zero Hallucinations
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Analyzes <strong className="text-white">ONLY the notes in this reviewer</strong> ({wordCount.toLocaleString()} words, {charCount.toLocaleString()} characters). The AI is strictly forbidden from using external knowledge or inventing unverified facts. Every answer will be directly grounded in your notes with a verbatim citation quote.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl bg-red-950/60 border border-red-500/40 p-3 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* Question Count Option (10, 20, 30, or 50 questions) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Progressive Question Bank Generation
              </label>
              <span className="text-[11px] text-blue-400 font-semibold">
                {questionCount} questions ({questionCount / 10} Sets of 10)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
              {[10, 20, 30, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuestionCount(num as 10 | 20 | 30 | 50)}
                  className={`py-2.5 px-2 rounded-2xl border text-center transition-all ${
                    questionCount === num
                      ? "bg-blue-600/35 border-blue-400 text-white font-bold shadow-lg shadow-blue-600/25 ring-1 ring-blue-400"
                      : "bg-[#070D1E] border-blue-900/40 text-slate-400 hover:text-white hover:border-blue-700"
                  }`}
                >
                  <span className="block text-base sm:text-lg font-extrabold">{num}</span>
                  <span className="block text-[10px] font-medium opacity-80">{num / 10} {num / 10 === 1 ? "Set" : "Sets"}</span>
                </button>
              ))}
            </div>

            {/* Bank Strategy Mode if existing questions exist */}
            {reviewer.quizQuestions && reviewer.quizQuestions.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-[#070D1E] border border-blue-900/40 space-y-2">
                <span className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Bank Strategy (Currently {reviewer.quizQuestions.length} Questions / {Math.max(1, Math.ceil(reviewer.quizQuestions.length / 10))} Sets)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBankMode("append")}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      bankMode === "append"
                        ? "bg-blue-600/30 border-blue-400 text-white ring-1 ring-blue-400"
                        : "bg-[#0A1329] border-blue-900/30 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Append as New Sets
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Adds Set {Math.max(1, Math.ceil(reviewer.quizQuestions.length / 10)) + 1}+ without repeating existing questions.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBankMode("replace")}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      bankMode === "replace"
                        ? "bg-blue-600/30 border-blue-400 text-white ring-1 ring-blue-400"
                        : "bg-[#0A1329] border-blue-900/30 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Replace Entire Bank
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Overwrites existing question bank with fresh questions from scratch.
                    </p>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quiz Question Types Checklist (Multiple Choice, True/False, Identification, Short Answer) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Quiz Formats Included
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#070D1E] border border-blue-900/40 text-xs text-slate-300 cursor-pointer hover:border-blue-700">
                <input
                  type="checkbox"
                  checked={includeMultipleChoice}
                  onChange={(e) => setIncludeMultipleChoice(e.target.checked)}
                  className="rounded border-blue-500 text-blue-600 focus:ring-0 focus:outline-none w-4 h-4 bg-transparent"
                />
                <span className="font-medium">Multiple Choice</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#070D1E] border border-blue-900/40 text-xs text-slate-300 cursor-pointer hover:border-blue-700">
                <input
                  type="checkbox"
                  checked={includeTrueFalse}
                  onChange={(e) => setIncludeTrueFalse(e.target.checked)}
                  className="rounded border-blue-500 text-blue-600 focus:ring-0 focus:outline-none w-4 h-4 bg-transparent"
                />
                <span className="font-medium">True or False</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#070D1E] border border-blue-900/40 text-xs text-slate-300 cursor-pointer hover:border-blue-700">
                <input
                  type="checkbox"
                  checked={includeIdentification}
                  onChange={(e) => setIncludeIdentification(e.target.checked)}
                  className="rounded border-blue-500 text-blue-600 focus:ring-0 focus:outline-none w-4 h-4 bg-transparent"
                />
                <span className="font-medium">Identification</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#070D1E] border border-blue-900/40 text-xs text-slate-300 cursor-pointer hover:border-blue-700">
                <input
                  type="checkbox"
                  checked={includeShortAnswer}
                  onChange={(e) => setIncludeShortAnswer(e.target.checked)}
                  className="rounded border-blue-500 text-blue-600 focus:ring-0 focus:outline-none w-4 h-4 bg-transparent"
                />
                <span className="font-medium">Short Answer</span>
              </label>
            </div>
          </div>

          {/* Flashcard Count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">
                Flashcard Deck Size
              </label>
              <span className="font-bold text-blue-400">{flashcardCount} cards</span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[10, 15, 25].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setFlashcardCount(count)}
                  className={`py-2 px-3 rounded-xl border text-center text-xs transition-all ${
                    flashcardCount === count
                      ? "bg-blue-600/35 border-blue-400 text-white font-bold"
                      : "bg-[#070D1E] border-blue-900/40 text-slate-400 hover:text-white"
                  }`}
                >
                  {count} Flashcards
                </button>
              ))}
            </div>
          </div>

          {/* Two Tabs Destination */}
          <div className="space-y-2 pt-1 border-t border-blue-900/30">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Study Tab To Open After Generation
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetTab("flashcards")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  targetTab === "flashcards"
                    ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/20"
                    : "bg-[#070D1E] border-blue-900/40 text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Flashcards</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetTab("quiz")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  targetTab === "quiz"
                    ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/20"
                    : "bg-[#070D1E] border-blue-900/40 text-slate-400 hover:text-white"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Practice Quiz</span>
              </button>
            </div>
          </div>

          {/* Error Message Display */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold block text-white mb-0.5">Generation Notice</span>
                <span>
                  {typeof errorMessage === "string" && errorMessage !== "[object Object]"
                    ? errorMessage
                    : "The AI service is experiencing a temporary issue. Please click 'Generate Study Materials' again in a few seconds."}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-blue-900/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            id="btn-confirm-generate-study-materials"
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 border border-blue-400/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Analyzing Notes & Generating...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-blue-200 fill-current" />
                <span>Generate Study Materials</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
