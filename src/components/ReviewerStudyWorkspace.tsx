import React, { useState } from "react";
import {
  Layers,
  HelpCircle,
  Zap,
  BookOpen,
  FolderKanban,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Reviewer, SubjectFolder } from "../types";
import { FlashcardMode } from "./FlashcardMode";
import { QuizMode } from "./QuizMode";
import { StudyNotesWorkspace } from "./StudyNotesWorkspace";

interface ReviewerStudyWorkspaceProps {
  reviewers: Reviewer[];
  activeReviewerId: string | null;
  folders: SubjectFolder[];
  initialTab?: "notes" | "flashcards" | "quiz";
  onSelectReviewer: (id: string) => void;
  onOpenGenerateMaterials: (reviewer: Reviewer) => void;
  onViewSourceNotes: (reviewer: Reviewer) => void;
  onReviewerUpdated: () => void;
}

export const ReviewerStudyWorkspace: React.FC<ReviewerStudyWorkspaceProps> = ({
  reviewers,
  activeReviewerId,
  folders,
  initialTab = "notes",
  onSelectReviewer,
  onOpenGenerateMaterials,
  onViewSourceNotes,
  onReviewerUpdated,
}) => {
  const [studyTab, setStudyTab] = useState<"notes" | "flashcards" | "quiz">(initialTab);

  const currentReviewer =
    reviewers.find((r) => r.id === activeReviewerId) || reviewers[0] || null;

  const currentFolder = folders.find((f) => f.id === currentReviewer?.folderId);

  if (!currentReviewer) {
    return (
      <div className="rounded-3xl border border-blue-500/20 bg-[#0E1A38]/50 p-12 text-center text-slate-400">
        <Layers className="w-12 h-12 mx-auto mb-3 text-blue-400" />
        <h3 className="text-lg font-bold text-white mb-1">No Reviewers Available</h3>
        <p className="text-xs sm:text-sm text-slate-300">
          Upload notes or create a reviewer in your library to begin studying.
        </p>
      </div>
    );
  }

  const notesCount = currentReviewer.studyNotes?.length || currentReviewer.keyConcepts?.length || 0;
  const flashcardCount = currentReviewer.flashcards?.length || 0;
  const quizCount = currentReviewer.quizQuestions?.length || 0;

  return (
    <div id="reviewer-study-workspace" className="space-y-6 max-w-5xl mx-auto">
      {/* Top Reviewer Context Bar */}
      <div className="rounded-3xl bg-[#0D1836]/90 border border-blue-500/35 p-4 sm:p-5 backdrop-blur-xl shadow-xl shadow-blue-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {currentFolder && (
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white flex items-center gap-1 shadow-sm"
                style={{ backgroundColor: currentFolder.color || "#2563EB" }}
              >
                <FolderKanban className="w-3 h-3" />
                <span>{currentFolder.name}</span>
              </span>
            )}
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-800">
              {currentReviewer.sourceType.toUpperCase()}
            </span>
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Strict Source Grounded</span>
            </span>
            <span className="text-[10px] text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
              <Workflow className="w-3 h-3" />
              <span>Visual Learning v1.1</span>
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              id="select-reviewer-dropdown"
              value={currentReviewer.id}
              onChange={(e) => onSelectReviewer(e.target.value)}
              className="bg-[#070D1E] border border-blue-500/40 rounded-xl px-3 py-1.5 text-sm sm:text-base text-white font-bold focus:outline-none focus:border-blue-400 cursor-pointer max-w-md truncate"
            >
              {reviewers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>

            <button
              id="btn-inspect-source-notes"
              onClick={() => onViewSourceNotes(currentReviewer)}
              className="text-xs text-blue-300 hover:text-white flex items-center gap-1 font-medium underline shrink-0 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Raw Document</span>
            </button>
          </div>
        </div>

        {/* Generate Study Materials Button */}
        <button
          id="btn-workspace-generate-study-materials"
          onClick={() => onOpenGenerateMaterials(currentReviewer)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/35 border border-blue-400/40 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <Zap className="w-4 h-4 text-blue-200 fill-current" />
          <span>Generate Study Materials</span>
        </button>
      </div>

      {/* Three Study Tabs: Study Notes, Flashcards, Practice Quiz */}
      <div className="flex items-center justify-center sm:justify-start">
        <div className="flex items-center p-1.5 rounded-2xl bg-[#09122B] border border-blue-500/30 shadow-inner gap-1">
          <button
            id="tab-study-notes"
            onClick={() => setStudyTab("notes")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              studyTab === "notes"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/40 ring-1 ring-blue-400/50"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-300" />
            <span>Study Notes ({notesCount})</span>
          </button>

          <button
            id="tab-study-flashcards"
            onClick={() => setStudyTab("flashcards")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              studyTab === "flashcards"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/40 ring-1 ring-blue-400/50"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers className="w-4 h-4 text-blue-300" />
            <span>Flashcards ({flashcardCount})</span>
          </button>

          <button
            id="tab-study-quiz"
            onClick={() => setStudyTab("quiz")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              studyTab === "quiz"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/40 ring-1 ring-blue-400/50"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <HelpCircle className="w-4 h-4 text-blue-300" />
            <span>Practice Quiz ({quizCount})</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {studyTab === "notes" ? (
        <StudyNotesWorkspace
          reviewer={currentReviewer}
          onOpenGenerateMaterials={onOpenGenerateMaterials}
          onViewSourceNotes={onViewSourceNotes}
        />
      ) : studyTab === "flashcards" ? (
        <FlashcardMode
          reviewers={reviewers}
          activeReviewerId={currentReviewer.id}
          onSelectReviewer={onSelectReviewer}
          onViewSourceNotes={onViewSourceNotes}
          onOpenGenerateMaterials={onOpenGenerateMaterials}
          onReviewerUpdated={onReviewerUpdated}
        />
      ) : (
        <QuizMode
          reviewers={reviewers}
          activeReviewerId={currentReviewer.id}
          onSelectReviewer={onSelectReviewer}
          onSwitchToFlashcards={() => setStudyTab("flashcards")}
          onViewSourceNotes={onViewSourceNotes}
          onOpenGenerateMaterials={onOpenGenerateMaterials}
          onQuizCompleted={onReviewerUpdated}
        />
      )}
    </div>
  );
};
