import React, { useState } from "react";
import {
  X,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sliders,
  Loader2,
  HardDrive,
  BookOpen,
} from "lucide-react";
import { SubjectFolder, FolderDocument, Reviewer, QuizQuestionType } from "../types";
import { combineDocumentsCorpus } from "../utils/fileParser";
import { saveNewReviewer } from "../utils/storage";
import { requestStudyMaterialsGeneration } from "../utils/apiClient";

interface CombinedReviewerModalProps {
  folder: SubjectFolder;
  selectedDocuments: FolderDocument[];
  onClose: () => void;
  onReviewerCreated: (reviewer: Reviewer) => void;
}

export const CombinedReviewerModal: React.FC<CombinedReviewerModalProps> = ({
  folder,
  selectedDocuments,
  onClose,
  onReviewerCreated,
}) => {
  const { combinedText, titleHint: defaultTitleHint, extractedVisuals } = combineDocumentsCorpus(selectedDocuments);

  const [titleHint, setTitleHint] = useState(
    selectedDocuments.length > 1
      ? `${folder.name}: Combined Study (${selectedDocuments.length} Documents)`
      : defaultTitleHint
  );

  const [flashcardCount, setFlashcardCount] = useState(12);
  const [quizCount, setQuizCount] = useState(20);
  const [selectedQuizTypes, setSelectedQuizTypes] = useState<QuizQuestionType[]>([
    "multiple_choice",
    "true_false",
    "identification",
    "short_answer",
  ]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [generationError, setGenerationError] = useState<string | null>(null);

  const totalWords = combinedText.trim().split(/\s+/).filter(Boolean).length;
  const totalBytes = selectedDocuments.reduce((acc, d) => acc + (d.sizeBytes || 0), 0);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!combinedText.trim()) {
      setGenerationError("The selected documents do not contain readable text.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep(`Synthesizing content across ${selectedDocuments.length} documents...`);

    try {
      const stepTimer1 = setTimeout(() => {
        setGenerationStep("Extracting key concepts and cross-referencing citations...");
      }, 1500);

      const stepTimer2 = setTimeout(() => {
        setGenerationStep("Drafting strictly grounded flashcards & questions...");
      }, 3500);

      const generatedData = await requestStudyMaterialsGeneration({
        title: titleHint.trim() || `${folder.name} Combined Reviewer`,
        titleHint: titleHint.trim() || `${folder.name} Combined Reviewer`,
        content: combinedText,
        flashcardCount,
        quizCount,
        quizTypes: selectedQuizTypes,
        extractedVisuals: extractedVisuals || [],
        documentIds: selectedDocuments.map((d) => d.id),
        fileNames: selectedDocuments.map((d) => d.name),
        fileName: selectedDocuments.length > 0 ? selectedDocuments[0].name : "Combined Documents",
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      // Determine predominant source type
      const types = new Set(selectedDocuments.map((d) => d.fileType));
      const predominantType =
        types.size === 1
          ? (selectedDocuments[0].fileType === "txt" ? "notes" : selectedDocuments[0].fileType)
          : "notes";

      const docNamesSummary = selectedDocuments.map((d) => d.name).join(", ");

      const newReviewer: Reviewer = {
        id: `rev-combined-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        folderId: folder.id,
        title: generatedData.title || titleHint.trim() || `${folder.name} Combined Reviewer`,
        summary:
          generatedData.summary ||
          `Comprehensive study set synthesized strictly from ${selectedDocuments.length} documents: ${docNamesSummary}.`,
        sourceType: predominantType as "notes" | "pdf" | "pptx" | "docx",
        sourceFileName: `${selectedDocuments.length} Documents: ${selectedDocuments.map((d) => d.name).join(", ")}`,
        rawContent: combinedText,
        keyConcepts: generatedData.keyConcepts || [],
        extractedVisuals: generatedData.extractedVisuals || extractedVisuals || [],
        studyNotes: generatedData.studyNotes || [],
        flashcards: (generatedData.flashcards || []).map((fc: any, idx: number) => ({
          id: `fc-${Date.now()}-${idx}`,
          front: fc.front,
          back: fc.back,
          sourceExcerpt: fc.sourceExcerpt || "",
          category: fc.category || "Combined Synthesis",
          mastery: "new" as const,
          isVisual: fc.isVisual,
          visualReference: fc.visualReference,
          visualDataUrl: fc.visualDataUrl,
          pageOrSlide: fc.pageOrSlide,
          sourceDoc: fc.sourceDoc,
        })),
        quizQuestions: (generatedData.quizQuestions || []).map((q: any, idx: number) => ({
          id: `qz-${Date.now()}-${idx}`,
          type: q.type as QuizQuestionType,
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          sourceExcerpt: q.sourceExcerpt || "",
          explanation: q.explanation || "",
          rubricKeywords: q.rubricKeywords || [],
          isVisual: q.isVisual,
          visualReference: q.visualReference,
          visualDataUrl: q.visualDataUrl,
          pageOrSlide: q.pageOrSlide,
          sourceDoc: q.sourceDoc,
          tableContext: q.tableContext,
          questionCategory: q.questionCategory,
        })),
        quizStats: {
          totalAttempts: 0,
          bestScore: 0,
          lastScore: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveNewReviewer(newReviewer);
      onReviewerCreated(newReviewer);
    } catch (err: any) {
      console.error("Combined reviewer generation error:", err);
      let msg = err.message || "An unexpected error occurred while generating.";
      if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
        msg = "The AI service is experiencing momentary high demand. Please try clicking Generate again in a few seconds.";
      } else if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        msg = "Rate limit reached. Please wait a few seconds before trying again.";
      } else if (msg.includes("expected pattern")) {
        msg = "A connection pattern issue was detected. A clean API path has been restored. Please try clicking Generate again.";
      }
      setGenerationError(msg);
      setIsGenerating(false);
    }
  };

  const toggleQuizType = (t: QuizQuestionType) => {
    if (selectedQuizTypes.includes(t)) {
      if (selectedQuizTypes.length > 1) {
        setSelectedQuizTypes(selectedQuizTypes.filter((type) => type !== t));
      }
    } else {
      setSelectedQuizTypes([...selectedQuizTypes, t]);
    }
  };

  return (
    <div
      id="combined-reviewer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="combined-reviewer-modal-container"
        className="w-full max-w-2xl rounded-2xl bg-[#091124] border border-blue-500/30 shadow-2xl shadow-blue-950/90 overflow-hidden text-white flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-blue-900/40 bg-[#0A1329] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Create Combined Reviewer
              </h3>
              <p className="text-xs text-slate-400">
                Synthesizing <strong className="text-blue-300">{selectedDocuments.length} files</strong> in{" "}
                <span className="text-white font-medium">{folder.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleGenerate} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Selected Files Chips */}
          <div className="rounded-xl bg-[#060C1B] border border-blue-900/40 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5 text-blue-300">
                <FileText className="w-3.5 h-3.5" />
                Included Documents ({selectedDocuments.length})
              </span>
              <span className="text-slate-400 text-[11px]">
                Combined: {formatFileSize(totalBytes)} • ~{totalWords.toLocaleString()} words
              </span>
            </div>

            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
              {selectedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0E1A38] border border-blue-500/20 text-xs text-slate-200"
                >
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                      doc.fileType === "pdf"
                        ? "bg-red-950 text-red-300 border border-red-800"
                        : doc.fileType === "pptx"
                        ? "bg-amber-950 text-amber-300 border border-amber-800"
                        : doc.fileType === "docx"
                        ? "bg-blue-950 text-blue-300 border border-blue-800"
                        : "bg-cyan-950 text-cyan-300 border border-cyan-800"
                    }`}
                  >
                    {doc.fileType}
                  </span>
                  <span className="truncate max-w-[200px]" title={doc.name}>
                    {doc.name}
                  </span>
                  <span className="text-[10px] text-slate-400">({formatFileSize(doc.sizeBytes)})</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-blue-900/30 text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>Strict source boundary: Questions are generated ONLY from these documents. No internet knowledge.</span>
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Reviewer Title
            </label>
            <input
              type="text"
              required
              value={titleHint}
              onChange={(e) => setTitleHint(e.target.value)}
              placeholder="e.g. Cognitive Neuroscience Comprehensive Exam Review"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D1E] border border-blue-500/30 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Quantities & Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#060D1E] border border-blue-900/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Flashcards
                </span>
                <span className="text-sm font-bold text-blue-300">{flashcardCount} cards</span>
              </div>
              <input
                type="range"
                min={5}
                max={25}
                step={1}
                value={flashcardCount}
                onChange={(e) => setFlashcardCount(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>5</span>
                <span>15</span>
                <span>25</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#060D1E] border border-blue-900/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Progressive Question Bank
                </span>
                <span className="text-xs font-bold text-cyan-300">{quizCount} Qs ({Math.max(1, Math.ceil(quizCount / 10))} Sets)</span>
              </div>
              <div className="grid grid-cols-4 gap-1 mb-2">
                {[10, 20, 30, 40].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuizCount(count)}
                    className={`py-1 rounded text-[11px] font-semibold border transition-all ${
                      quizCount === count
                        ? "bg-cyan-600 text-white border-cyan-400"
                        : "bg-[#0B1528] text-slate-400 border-blue-900/40 hover:text-white"
                    }`}
                  >
                    {count} Qs
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={10}
                max={40}
                step={10}
                value={quizCount}
                onChange={(e) => setQuizCount(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>10 (1 Set)</span>
                <span>20 (2 Sets)</span>
                <span>30 (3 Sets)</span>
                <span>40 (4 Sets)</span>
              </div>
            </div>
          </div>

          {/* Question Formats Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Allowed Question Types
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: "multiple_choice" as QuizQuestionType, label: "Multiple Choice" },
                { type: "true_false" as QuizQuestionType, label: "True / False" },
                { type: "identification" as QuizQuestionType, label: "Identification" },
                { type: "short_answer" as QuizQuestionType, label: "Short Answer" },
              ].map(({ type, label }) => {
                const checked = selectedQuizTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleQuizType(type)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left flex items-center gap-2 ${
                      checked
                        ? "bg-blue-600/30 border-blue-400/50 text-white"
                        : "bg-[#060D1E] border-blue-950/50 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        checked ? "bg-blue-500 border-blue-400" : "border-slate-500"
                      }`}
                    >
                      {checked && <div className="w-1.5 h-1.5 rounded-sm bg-white" />}
                    </div>
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {generationError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold block text-white mb-0.5">Generation Notice</span>
                <span>{generationError}</span>
              </div>
            </div>
          )}

          {/* Loading State Animation */}
          {isGenerating && (
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-white">{generationStep}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Review Master AI is validating citations against all selected documents...
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-blue-900/30">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/40 border border-blue-400/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Combined Reviewer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
