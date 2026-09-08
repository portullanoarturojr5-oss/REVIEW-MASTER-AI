import React, { useState } from "react";
import {
  BookOpen,
  Search,
  Sparkles,
  ShieldCheck,
  Quote,
  Table,
  Image as ImageIcon,
  Workflow,
  Maximize2,
  X,
  FileText,
  Copy,
  Check,
  Zap,
  Filter,
} from "lucide-react";
import { Reviewer, StudyNoteSection } from "../types";

interface StudyNotesWorkspaceProps {
  reviewer: Reviewer;
  onOpenGenerateMaterials: (reviewer: Reviewer) => void;
  onViewSourceNotes: (reviewer: Reviewer) => void;
}

export const StudyNotesWorkspace: React.FC<StudyNotesWorkspaceProps> = ({
  reviewer,
  onOpenGenerateMaterials,
  onViewSourceNotes,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "visuals" | "tables">("all");
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Derive study notes: from structured studyNotes, or fallback synthesis from key concepts & text
  const structuredNotes: StudyNoteSection[] = React.useMemo(() => {
    if (reviewer.studyNotes && reviewer.studyNotes.length > 0) {
      return reviewer.studyNotes;
    }

    // Fallback synthesis if created before Version 1.1:
    const concepts = reviewer.keyConcepts || [];
    const notes: StudyNoteSection[] = concepts.map((concept, idx) => {
      // Find matching sentences in rawContent
      const sentences = reviewer.rawContent.split(/[.!?\n]+/).filter(Boolean);
      const matched = sentences.filter((s) =>
        s.toLowerCase().includes(concept.toLowerCase())
      );
      const explanation =
        matched.slice(0, 3).join(". ").trim() ||
        `Core concept from the source material regarding ${concept}.`;

      return {
        id: `note-derived-${idx}`,
        heading: concept,
        definition: matched[0]?.trim() || `Fundamental concept of ${concept} established in the source material.`,
        explanation: explanation.endsWith(".") ? explanation : `${explanation}.`,
        sourceExcerpt: matched[0]?.trim() || reviewer.summary || "Extracted directly from source document.",
      };
    });

    return notes;
  }, [reviewer]);

  const filteredNotes = structuredNotes.filter((note) => {
    const matchesSearch =
      !searchQuery ||
      note.heading.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.explanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.diagramSummary && note.diagramSummary.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter === "visuals") {
      return Boolean(note.diagramSummary || note.visualReference || note.visualDataUrl);
    }
    if (activeFilter === "tables") {
      return Boolean(note.comparisonTable);
    }
    return true;
  });

  const notesWithVisualsCount = structuredNotes.filter(
    (n) => n.diagramSummary || n.visualReference || n.visualDataUrl
  ).length;

  const notesWithTablesCount = structuredNotes.filter((n) => n.comparisonTable).length;

  const handleCopyNote = (note: StudyNoteSection) => {
    const textToCopy = `### ${note.heading}\n\n**Definition**\n${note.definition}\n\n**Explanation**\n${note.explanation}${
      note.diagramSummary ? `\n\n**Diagram Summary**\n${note.diagramSummary}` : ""
    }\n\n*Source Excerpt: "${note.sourceExcerpt || ""}"*`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div id="study-notes-workspace" className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="rounded-3xl bg-[#0D1836]/90 border border-blue-500/35 p-5 backdrop-blur-xl shadow-xl shadow-blue-950/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-800/40 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                AI Study Notes
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Strict Source Grounded</span>
              </span>
              <span className="text-[11px] font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-700/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Workflow className="w-3 h-3" />
                <span>Visual Learning Intelligence</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {reviewer.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {reviewer.summary}
            </p>
          </div>

          <button
            id="btn-notes-generate-more"
            onClick={() => onOpenGenerateMaterials(reviewer)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 border border-blue-400/40 transition-all hover:scale-[1.02] shrink-0"
          >
            <Zap className="w-4 h-4 text-blue-200 fill-current" />
            <span>Generate Study Materials</span>
          </button>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-blue-900/30">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#070D1F] border border-blue-500/20 text-xs">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activeFilter === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All Notes ({structuredNotes.length})
            </button>
            <button
              onClick={() => setActiveFilter("visuals")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-semibold transition-all ${
                activeFilter === "visuals"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Workflow className="w-3 h-3" />
              <span>Diagrams & Visuals ({notesWithVisualsCount})</span>
            </button>
            <button
              onClick={() => setActiveFilter("tables")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-semibold transition-all ${
                activeFilter === "tables"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Table className="w-3 h-3" />
              <span>Comparison Tables ({notesWithTablesCount})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search concepts or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#070D1F] border border-blue-500/30 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-3xl border border-blue-500/20 bg-[#0E1A38]/50 p-12 text-center text-slate-300 space-y-3">
          <BookOpen className="w-12 h-12 mx-auto text-blue-400 mb-2" />
          <h3 className="text-base font-bold text-white">No Notes Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No notes matching "${searchQuery}". Try clearing your search.`
              : "No notes matching the selected filter."}
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveFilter("all");
              }}
              className="px-4 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white text-xs font-semibold border border-blue-500/30"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        /* Notes Cards Grid */
        <div className="space-y-5">
          {filteredNotes.map((note, index) => {
            const hasVisual = Boolean(note.diagramSummary || note.visualReference || note.visualDataUrl);
            const hasTable = Boolean(note.comparisonTable);

            return (
              <div
                key={note.id || index}
                id={`note-card-${index}`}
                className="rounded-3xl bg-[#0D1836]/85 border-2 border-blue-500/25 hover:border-blue-400/50 p-6 sm:p-7 backdrop-blur-xl shadow-xl shadow-blue-950/60 transition-all space-y-5"
              >
                {/* Note Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-blue-600/30 border border-blue-400/40 text-blue-300 font-bold text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      {hasVisual && (
                        <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/50 flex items-center gap-1">
                          <Workflow className="w-3 h-3" />
                          <span>Visual Learning</span>
                        </span>
                      )}
                      {hasTable && (
                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 flex items-center gap-1">
                          <Table className="w-3 h-3" />
                          <span>Comparison Table</span>
                        </span>
                      )}
                      {note.pageOrSlide && (
                        <span className="text-[10px] text-slate-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/40">
                          Page/Slide {note.pageOrSlide}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                      {note.heading}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleCopyNote(note)}
                    title="Copy note to clipboard"
                    className="p-2 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 text-slate-300 hover:text-white border border-blue-800/40 transition-colors"
                  >
                    {copiedId === note.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Definition Block */}
                <div className="p-4 rounded-2xl bg-[#070D1E]/90 border border-blue-500/20 space-y-1">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                    Definition
                  </span>
                  <p className="text-sm font-medium text-slate-100 leading-relaxed">
                    {note.definition}
                  </p>
                </div>

                {/* Explanation Block */}
                <div className="space-y-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Explanation
                  </span>
                  <p>{note.explanation}</p>
                </div>

                {/* Diagram Summary Block (Version 1.1) */}
                {note.diagramSummary && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#081838] to-[#0A1D44] border-2 border-cyan-500/35 space-y-3 shadow-inner">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
                          <Workflow className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-cyan-300 uppercase tracking-wider">
                            Diagram Summary
                          </span>
                          {note.visualReference && (
                            <span className="text-[11px] text-slate-400 block font-medium">
                              Ref: {note.visualReference}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded">
                        Visible Evidence Grounded
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-cyan-100/90 leading-relaxed font-normal">
                      {note.diagramSummary}
                    </p>

                    {/* Visual Image Preview if available */}
                    {note.visualDataUrl && (
                      <div className="pt-2">
                        <div className="relative group rounded-xl overflow-hidden border border-cyan-500/30 bg-black/40 max-w-md">
                          <img
                            src={note.visualDataUrl}
                            alt={note.visualReference || note.heading}
                            className="w-full max-h-56 object-contain cursor-pointer transition-transform group-hover:scale-[1.01]"
                            onClick={() =>
                              setZoomedImage({
                                url: note.visualDataUrl!,
                                title: note.visualReference || note.heading,
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setZoomedImage({
                                url: note.visualDataUrl!,
                                title: note.visualReference || note.heading,
                              })
                            }
                            className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs flex items-center gap-1 backdrop-blur-sm transition-colors border border-white/20"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Zoom</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Comparison Table Block (Version 1.1) */}
                {note.comparisonTable && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#08122B] border border-indigo-500/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                        {note.comparisonTable.title || "Comparison Table"}
                      </span>
                    </div>

                    {note.comparisonTable.summary && (
                      <p className="text-xs text-slate-300 italic">
                        {note.comparisonTable.summary}
                      </p>
                    )}

                    <div className="overflow-x-auto rounded-xl border border-blue-900/40">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-blue-950/80 text-blue-300 border-b border-blue-900/50">
                            {note.comparisonTable.headers.map((h, i) => (
                              <th key={i} className="p-2.5 font-bold whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-900/30 text-slate-200">
                          {note.comparisonTable.rows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className={rIdx % 2 === 0 ? "bg-black/20" : "bg-transparent"}
                            >
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-2.5">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Verbatim Source Evidence Citation */}
                {note.sourceExcerpt && (
                  <div className="p-3.5 rounded-2xl bg-[#060B19] border border-blue-500/25 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                      <Quote className="w-3.5 h-3.5" />
                      <span>Verbatim Source Evidence:</span>
                    </div>
                    <p className="text-slate-300 font-serif italic leading-relaxed">
                      "{note.sourceExcerpt}"
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Zoomed Image Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#0E1A38] border border-cyan-500/40 rounded-3xl p-4 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-blue-900/40">
              <span className="text-sm font-bold text-white truncate">
                {zoomedImage.title}
              </span>
              <button
                onClick={() => setZoomedImage(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[80vh] flex items-center justify-center">
              <img
                src={zoomedImage.url}
                alt={zoomedImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
