import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Filter,
  Layers,
  HelpCircle,
  Eye,
  Trash2,
  Sparkles,
  FolderKanban,
  FileText,
  FileCode,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  Printer,
  ChevronRight,
  ShieldCheck,
  Zap,
  Upload,
} from "lucide-react";
import { Reviewer, SubjectFolder, FolderDocument } from "../types";
import { deleteReviewer } from "../utils/storage";

interface ReviewLibraryProps {
  reviewers: Reviewer[];
  folders: SubjectFolder[];
  documents?: FolderDocument[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onOpenFolderDocuments?: (folderId: string) => void;
  onOpenReviewerCards: (reviewerId: string) => void;
  onOpenReviewerQuiz: (reviewerId: string) => void;
  onOpenGenerateMaterials?: (reviewer: Reviewer) => void;
  onViewSourceNotes: (reviewer: Reviewer) => void;
  onCreateNewReviewer: (folderId?: string) => void;
  onReviewersUpdated: () => void;
  globalSearchQuery?: string;
  onGlobalSearchQueryChange?: (query: string) => void;
}

export const ReviewLibrary: React.FC<ReviewLibraryProps> = ({
  reviewers,
  folders,
  documents = [],
  selectedFolderId,
  onSelectFolder,
  onOpenFolderDocuments,
  onOpenReviewerCards,
  onOpenReviewerQuiz,
  onOpenGenerateMaterials,
  onViewSourceNotes,
  onCreateNewReviewer,
  onReviewersUpdated,
  globalSearchQuery = "",
  onGlobalSearchQueryChange,
}) => {
  const [searchQuery, setSearchQuery] = useState(globalSearchQuery);
  const [sortBy, setSortBy] = useState<"recent" | "mastery" | "cards">("recent");

  useEffect(() => {
    if (globalSearchQuery !== undefined) {
      setSearchQuery(globalSearchQuery);
    }
  }, [globalSearchQuery]);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  // Filter by folder and search
  const filteredReviewers = reviewers
    .filter((r) => {
      if (selectedFolderId && r.folderId !== selectedFolderId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchSummary = r.summary.toLowerCase().includes(q);
        const matchConcept = r.keyConcepts?.some((c) => c.toLowerCase().includes(q));
        const matchSource = r.sourceFileName?.toLowerCase().includes(q);
        return matchTitle || matchSummary || matchConcept || matchSource;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "mastery") {
        const aMastered = a.flashcards.filter((c) => c.mastery === "mastered").length / (a.flashcards.length || 1);
        const bMastered = b.flashcards.filter((c) => c.mastery === "mastered").length / (b.flashcards.length || 1);
        return bMastered - aMastered;
      }
      if (sortBy === "cards") {
        return b.flashcards.length - a.flashcards.length;
      }
      // default: recent
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleDelete = (reviewerId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete reviewer "${title}"? This cannot be undone.`)) {
      deleteReviewer(reviewerId);
      onReviewersUpdated();
    }
  };

  const printStudySheet = (r: Reviewer, e: React.MouseEvent) => {
    e.stopPropagation();
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const flashcardsHtml = r.flashcards
      .map(
        (fc, i) => `
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px; page-break-inside: avoid;">
          <p style="font-weight: bold; font-size: 14px; margin: 0 0 6px 0; color: #1e293b;">Q${i + 1}: ${fc.front}</p>
          <p style="font-size: 13px; margin: 0 0 6px 0; color: #334155;"><strong>Answer:</strong> ${fc.back}</p>
          ${
            fc.sourceExcerpt
              ? `<p style="font-size: 11px; margin: 0; color: #64748b; font-style: italic;">Source: "${fc.sourceExcerpt}"</p>`
              : ""
          }
        </div>
      `
      )
      .join("");

    const quizHtml = r.quizQuestions
      .map(
        (q, i) => `
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px; page-break-inside: avoid;">
          <p style="font-weight: bold; font-size: 14px; margin: 0 0 6px 0; color: #1e293b;">${i + 1}. [${q.type}] ${q.question}</p>
          ${
            q.options && q.options.length > 0
              ? `<ul style="margin: 4px 0 6px 20px; font-size: 13px; color: #334155;">${q.options
                  .map((opt) => `<li>${opt}</li>`)
                  .join("")}</ul>`
              : ""
          }
          <p style="font-size: 12px; margin: 4px 0 0 0; color: #0284c7;"><strong>Correct Answer:</strong> ${q.correctAnswer}</p>
          ${
            q.sourceExcerpt
              ? `<p style="font-size: 11px; margin: 2px 0 0 0; color: #64748b; font-style: italic;">Grounding: "${q.sourceExcerpt}"</p>`
              : ""
          }
        </div>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${r.title} - Study Sheet</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; max-width: 800px; margin: auto; }
            h1 { font-size: 22px; margin-bottom: 4px; color: #1e3a8a; }
            h2 { font-size: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; margin-top: 24px; color: #1e40af; }
            p.summary { font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${r.title}</h1>
          <p class="summary">${r.summary}</p>
          
          <h2>Flashcard Study Deck (${r.flashcards.length} Cards)</h2>
          ${flashcardsHtml}

          <h2>Quiz Assessment (${r.quizQuestions.length} Questions)</h2>
          ${quizHtml}

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div id="review-library-view" className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-400" />
              Review Library
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
              {reviewers.length} {reviewers.length === 1 ? "reviewer" : "reviewers"}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {selectedFolder ? (
              <span>
                Filtered to folder: <strong className="text-blue-300">{selectedFolder.name}</strong>{" "}
                <button
                  onClick={() => onSelectFolder(null)}
                  className="text-xs text-blue-400 hover:text-blue-200 underline ml-1 font-semibold"
                >
                  (Show All)
                </button>
              </span>
            ) : (
              "Browse and study all subject reviewers synthesized from notes, PDF, PPTX, and DOCX."
            )}
          </p>
        </div>

        <button
          id="btn-library-new-reviewer"
          onClick={() => onCreateNewReviewer(selectedFolderId || undefined)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Reviewer</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-library-search"
            type="text"
            placeholder="Search by topic, concept, keyword, or document filename..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onGlobalSearchQueryChange?.(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D1836]/90 border border-blue-500/20 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400 backdrop-blur-md"
          />
        </div>

        {/* Folder pills or dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            id="library-folder-filter"
            value={selectedFolderId || ""}
            onChange={(e) => onSelectFolder(e.target.value || null)}
            className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-[#0D1836]/90 border border-blue-500/20 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="">All Subjects</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <select
            id="library-sort-filter"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-[#0D1836]/90 border border-blue-500/20 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="recent">Most Recent</option>
            <option value="mastery">Highest Mastery</option>
            <option value="cards">Most Flashcards</option>
          </select>
        </div>
      </div>

      {/* Selected Folder Document Library Quick Access Banner */}
      {selectedFolder && (
        <div
          id="folder-docs-summary-banner"
          className="rounded-2xl bg-[#09132A]/80 border border-blue-500/30 p-4 backdrop-blur-md flex items-center justify-between flex-wrap gap-3 shadow-lg shadow-blue-950/40"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: selectedFolder.color || "#2563EB" }}
            >
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">{selectedFolder.name} Document Library</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                  {documents.filter((d) => d.folderId === selectedFolder.id).length} files
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload multiple PDF, PPTX, DOCX, or TXT files to synthesize combined study decks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenFolderDocuments && (
              <button
                id="btn-goto-folder-docs"
                onClick={() => onOpenFolderDocuments(selectedFolder.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-400/30 text-xs font-semibold transition-all hover:scale-[1.02]"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload & Combine Files</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reviewers List */}
      {filteredReviewers.length === 0 ? (
        <div
          id="empty-library-state"
          className="rounded-2xl border border-blue-500/20 bg-[#0E1A38]/50 backdrop-blur-md p-8 sm:p-12 text-center text-slate-400"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center mx-auto mb-4 text-blue-400">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Reviewers Found</h3>
          <p className="text-xs sm:text-sm max-w-md mx-auto mb-6 text-slate-300">
            {searchQuery
              ? `No reviewers matched "${searchQuery}". Try a different keyword or reset the filter.`
              : "Upload your first study material (PDF, PPTX, DOCX, or pasted notes) to generate grounded study materials."}
          </p>
          <button
            onClick={() => onCreateNewReviewer(selectedFolderId || undefined)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Reviewer</span>
          </button>
        </div>
      ) : (
        <div
          id="reviewers-grid"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {filteredReviewers.map((reviewer) => {
            const folder = folders.find((f) => f.id === reviewer.folderId);
            const masteredCount = reviewer.flashcards.filter(
              (c) => c.mastery === "mastered"
            ).length;
            const masteryRate =
              reviewer.flashcards.length > 0
                ? Math.round((masteredCount / reviewer.flashcards.length) * 100)
                : 0;

            return (
              <div
                key={reviewer.id}
                id={`reviewer-card-${reviewer.id}`}
                className="rounded-3xl bg-[#0D1836]/75 border border-blue-500/25 hover:border-blue-400/40 p-5 sm:p-6 backdrop-blur-md shadow-xl shadow-blue-950/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Top Subject Tag & Format Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {folder ? (
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white flex items-center gap-1 shadow-sm"
                          style={{ backgroundColor: folder.color || "#2563EB" }}
                        >
                          <FolderKanban className="w-3 h-3" />
                          <span>{folder.name}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300">
                          Unassigned
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-950/80 text-blue-300 border border-blue-800/50">
                        {reviewer.sourceType.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => printStudySheet(reviewer, e)}
                        title="Print / Save Offline Study Sheet"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-blue-300 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleDelete(reviewer.id, reviewer.title, e)}
                        title="Delete Reviewer"
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Grounded Summary */}
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 leading-snug line-clamp-2">
                    {reviewer.title}
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-2 mb-3 leading-relaxed">
                    {reviewer.summary}
                  </p>

                  {/* Key Concepts Chips */}
                  {reviewer.keyConcepts && reviewer.keyConcepts.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mb-4">
                      {reviewer.keyConcepts.slice(0, 3).map((concept, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950/60 text-blue-200 border border-blue-800/30"
                        >
                          {concept}
                        </span>
                      ))}
                      {reviewer.keyConcepts.length > 3 && (
                        <span className="text-[10px] text-slate-400">
                          +{reviewer.keyConcepts.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Stats & Launch Modes */}
                <div className="pt-3 border-t border-blue-900/30 space-y-3">
                  {/* Mastery & Quiz Indicators */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        <strong className="text-white">{reviewer.flashcards.length}</strong> cards
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-emerald-400 font-medium">
                        {masteryRate}% Mastered
                      </span>
                    </div>

                    <div className="text-slate-400 text-[11px]">
                      {reviewer.quizStats?.totalAttempts > 0 ? (
                        <span>
                          Best Quiz:{" "}
                          <strong className="text-blue-300">
                            {reviewer.quizStats.bestScore}%
                          </strong>{" "}
                          ({reviewer.quizStats.totalAttempts} taken)
                        </span>
                      ) : (
                        <span>{reviewer.quizQuestions.length} Quiz Qs</span>
                      )}
                    </div>
                  </div>

                  {/* Generate Study Materials Button Inside Reviewer */}
                  {onOpenGenerateMaterials && (
                    <button
                      id={`btn-generate-materials-${reviewer.id}`}
                      onClick={() => onOpenGenerateMaterials(reviewer)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600/25 to-blue-500/20 hover:from-blue-600 hover:to-blue-500 text-blue-200 hover:text-white border border-blue-400/35 text-xs font-bold transition-all shadow-sm group"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current text-blue-300 group-hover:text-white" />
                      <span>Generate Study Materials</span>
                    </button>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      id={`btn-cards-${reviewer.id}`}
                      onClick={() => onOpenReviewerCards(reviewer.id)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-400/30 text-xs font-semibold transition-all"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Flashcards</span>
                    </button>

                    <button
                      id={`btn-quiz-${reviewer.id}`}
                      onClick={() => onOpenReviewerQuiz(reviewer.id)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 border border-blue-400/30 transition-all"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Quiz</span>
                    </button>

                    <button
                      id={`btn-view-notes-${reviewer.id}`}
                      onClick={() => onViewSourceNotes(reviewer)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-[#070D1E] hover:bg-white/10 text-slate-300 hover:text-white border border-blue-900/40 text-xs font-medium transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Notes</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
