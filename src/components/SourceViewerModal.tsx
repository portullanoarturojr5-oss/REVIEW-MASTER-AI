import React, { useState } from "react";
import {
  FileText,
  Copy,
  Check,
  Search,
  X,
  Layers,
  HelpCircle,
  FolderKanban,
  FileSpreadsheet,
  Zap,
} from "lucide-react";
import { Reviewer, SubjectFolder } from "../types";

interface SourceViewerModalProps {
  reviewer: Reviewer;
  folders: SubjectFolder[];
  onClose: () => void;
  onStartFlashcards: () => void;
  onStartQuiz: () => void;
  onOpenGenerateMaterials?: (reviewer: Reviewer) => void;
}

export const SourceViewerModal: React.FC<SourceViewerModalProps> = ({
  reviewer,
  folders,
  onClose,
  onStartFlashcards,
  onStartQuiz,
  onOpenGenerateMaterials,
}) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const folder = folders.find((f) => f.id === reviewer.folderId);

  const handleCopy = () => {
    navigator.clipboard.writeText(reviewer.rawContent || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const lines = (reviewer.rawContent || "").split("\n");
  const filteredLines = searchQuery.trim()
    ? lines.filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase()))
    : lines;

  return (
    <div
      id="source-viewer-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="source-viewer-card"
        className="relative w-full max-w-3xl my-auto rounded-3xl bg-[#0B152E] border border-blue-500/30 p-5 sm:p-7 shadow-2xl shadow-blue-950 text-white flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-blue-900/40 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-800">
                {reviewer.sourceType.toUpperCase()}
              </span>
              {folder && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <FolderKanban className="w-3 h-3 text-blue-400" />
                  {folder.name}
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
              {reviewer.title}
            </h3>

            {reviewer.sourceFileName && (
              <p className="text-xs text-slate-400 mt-0.5">
                Source File: {reviewer.sourceFileName}
              </p>
            )}
          </div>

          <button
            id="btn-close-source-viewer"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Key Concepts Extracted strictly from Content */}
        {reviewer.keyConcepts && reviewer.keyConcepts.length > 0 && (
          <div className="mb-4 p-3 rounded-2xl bg-[#070D1E]/80 border border-blue-500/20">
            <span className="block text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-1.5">
              Grounded Key Concepts:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {reviewer.keyConcepts.map((concept, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-900/30 text-blue-200 border border-blue-700/40"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Search inside notes & Copy button */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in source notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#070D1E] border border-blue-500/30 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
            />
          </div>

          <button
            id="btn-copy-source-text"
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0C1733] hover:bg-blue-900/40 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-medium transition-colors shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy Notes"}</span>
          </button>
        </div>

        {/* Text Content Viewer */}
        <div className="flex-1 overflow-y-auto rounded-2xl bg-[#060B19] border border-blue-900/40 p-4 font-mono text-xs text-slate-300 space-y-1.5 leading-relaxed">
          {filteredLines.length > 0 ? (
            filteredLines.map((line, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="text-[10px] text-slate-600 select-none w-6 text-right shrink-0">
                  {idx + 1}
                </span>
                <span className="whitespace-pre-wrap">{line || "\u00A0"}</span>
              </div>
            ))
          ) : (
            <p className="text-slate-500 italic py-4 text-center">
              No matching lines found for "{searchQuery}".
            </p>
          )}
        </div>

        {/* Footer Quick Launch */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-blue-900/40">
          <span className="text-xs text-slate-400">
            {(reviewer.rawContent || "").length.toLocaleString()} characters •{" "}
            {reviewer.flashcards.length} flashcards • {reviewer.quizQuestions.length} quiz Qs
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenGenerateMaterials && (
              <button
                id="btn-modal-generate-study-materials"
                onClick={() => {
                  onClose();
                  onOpenGenerateMaterials(reviewer);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs font-bold shadow-md shadow-blue-600/30 border border-blue-400/40 transition-all"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Generate Study Materials</span>
              </button>
            )}

            <button
              id="btn-launch-flashcards"
              onClick={() => {
                onClose();
                onStartFlashcards();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-400/30 text-xs font-semibold transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flashcards</span>
            </button>

            <button
              id="btn-launch-quiz"
              onClick={() => {
                onClose();
                onStartQuiz();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Take Quiz</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
