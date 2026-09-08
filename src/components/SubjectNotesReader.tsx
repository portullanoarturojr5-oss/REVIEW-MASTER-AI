import React, { useState, useMemo } from "react";
import {
  BookOpen,
  FileText,
  Layers,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Search,
  Copy,
  Check,
  Printer,
  Download,
  FolderKanban,
  FileSpreadsheet,
  FileCode,
  HardDrive,
  Calendar,
  Zap,
  Upload,
  ExternalLink,
  ChevronRight,
  Bookmark,
  CheckSquare,
} from "lucide-react";
import { SubjectFolder, FolderDocument, Reviewer } from "../types";

interface SubjectNotesReaderProps {
  folder: SubjectFolder;
  documents: FolderDocument[];
  reviewers: Reviewer[];
  onBack: () => void;
  onOpenReviewerCards: (reviewerId: string) => void;
  onOpenReviewerQuiz: (reviewerId: string) => void;
  onOpenCombinedReview: () => void;
  onUploadMoreFiles: () => void;
}

export const SubjectNotesReader: React.FC<SubjectNotesReaderProps> = ({
  folder,
  documents,
  reviewers,
  onBack,
  onOpenReviewerCards,
  onOpenReviewerQuiz,
  onOpenCombinedReview,
  onUploadMoreFiles,
}) => {
  const folderDocuments = documents.filter((d) => d.folderId === folder.id);
  const folderReviewers = reviewers.filter((r) => r.folderId === folder.id);

  // Active document selection: "all" or specific document id
  const [selectedDocFilter, setSelectedDocFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [copied, setCopied] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<"notes" | "flashcards" | "quiz" | "combined">("notes");

  // Aggregate flashcards & quizzes for quick counts
  const totalFlashcards = folderReviewers.reduce((acc, r) => acc + (r.flashcards?.length || 0), 0);
  const totalQuizQuestions = folderReviewers.reduce((acc, r) => acc + (r.quizQuestions?.length || 0), 0);

  // Documents to display
  const displayedDocs = useMemo(() => {
    if (selectedDocFilter === "all") {
      return folderDocuments;
    }
    return folderDocuments.filter((d) => d.id === selectedDocFilter);
  }, [folderDocuments, selectedDocFilter]);

  // Combined text word count
  const totalWords = useMemo(() => {
    return folderDocuments.reduce((acc, doc) => {
      const words = doc.text.trim().split(/\s+/).filter(Boolean).length;
      return acc + words;
    }, 0);
  }, [folderDocuments]);

  // Handle copying all notes or selected document notes
  const handleCopyNotes = () => {
    let textToCopy = "";
    if (selectedDocFilter === "all") {
      textToCopy = folderDocuments
        .map((d) => `=== ${d.name} (${d.fileType.toUpperCase()}) ===\n\n${d.text}`)
        .join("\n\n----------------------------------------\n\n");
      // If no docs, check reviewers
      if (!textToCopy && folderReviewers.length > 0) {
        textToCopy = folderReviewers
          .map((r) => `=== ${r.title} ===\n\nSummary:\n${r.summary}\n\nNotes:\n${r.rawContent}`)
          .join("\n\n----------------------------------------\n\n");
      }
    } else {
      const doc = folderDocuments.find((d) => d.id === selectedDocFilter);
      textToCopy = doc ? doc.text : "";
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Export as text file download
  const handleExportTextFile = () => {
    let content = `# Study Notes: ${folder.name}\n`;
    content += `Folder Description: ${folder.description || "N/A"}\n`;
    content += `Date: ${new Date().toLocaleDateString()}\n\n`;

    folderDocuments.forEach((doc, idx) => {
      content += `\n========================================\n`;
      content += `[Document ${idx + 1}] ${doc.name} (${doc.fileType.toUpperCase()})\n`;
      content += `Uploaded: ${new Date(doc.uploadedAt).toLocaleDateString()}\n`;
      content += `========================================\n\n`;
      content += doc.text + "\n\n";
    });

    if (folderReviewers.length > 0) {
      content += `\n========================================\n`;
      content += `SUBJECT REVIEWERS & SUMMARIES\n`;
      content += `========================================\n\n`;
      folderReviewers.forEach((r, idx) => {
        content += `[Reviewer ${idx + 1}] ${r.title}\n`;
        content += `Summary: ${r.summary}\n`;
        if (r.keyConcepts && r.keyConcepts.length > 0) {
          content += `Key Concepts: ${r.keyConcepts.join(", ")}\n`;
        }
        content += `\n`;
      });
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${folder.name.replace(/[^a-z0-9]/gi, "_")}_Study_Notes.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print notes
  const handlePrint = () => {
    window.print();
  };

  // Font size class mapping
  const fontSizeClass =
    fontSize === "xlarge"
      ? "text-lg sm:text-xl leading-loose"
      : fontSize === "large"
      ? "text-base sm:text-lg leading-relaxed"
      : "text-sm sm:text-base leading-relaxed";

  const scrollToSection = (id: "notes" | "flashcards" | "quiz" | "combined") => {
    setActiveSection(id);
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div id="subject-notes-panel" className="space-y-6 animate-fadeIn pb-32 sm:pb-24">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#091228]/80 backdrop-blur-xl border border-blue-500/25 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <button
              id="btn-back-to-documents"
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-200 font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-blue-900/30"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Documents</span>
            </button>
            <span className="text-slate-600 text-xs">•</span>
            <span className="text-xs text-blue-300 font-medium flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              Full Study Notes Reader
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg border border-white/10 shrink-0"
              style={{ backgroundColor: folder.color || "#2563EB" }}
            >
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>{folder.name} Notes</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60">
                  {folderDocuments.length} {folderDocuments.length === 1 ? "document" : "documents"}
                </span>
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
                <span>Total Content: ~{totalWords.toLocaleString()} words</span>
                <span>•</span>
                <span>{totalFlashcards} Flashcards</span>
                <span>•</span>
                <span>{totalQuizQuestions} Quiz Questions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls in Top Right */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Font Size Selector */}
          <div className="flex items-center rounded-xl bg-[#060D1E] border border-blue-500/20 p-1">
            <button
              onClick={() => setFontSize("normal")}
              title="Normal text size"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                fontSize === "normal" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize("large")}
              title="Large text size"
              className={`px-2.5 py-1 rounded-lg text-sm font-bold transition-colors ${
                fontSize === "large" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              A+
            </button>
            <button
              onClick={() => setFontSize("xlarge")}
              title="Extra large text size"
              className={`px-2.5 py-1 rounded-lg text-base font-bold transition-colors ${
                fontSize === "xlarge" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              A++
            </button>
          </div>

          {/* Copy Notes */}
          <button
            id="btn-copy-all-notes"
            onClick={handleCopyNotes}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0E1A38] hover:bg-blue-900/40 border border-blue-500/25 text-xs text-slate-200 hover:text-white font-medium transition-colors"
            title="Copy notes to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>Copy Notes</span>
              </>
            )}
          </button>

          {/* Download Text */}
          <button
            id="btn-download-notes-file"
            onClick={handleExportTextFile}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0E1A38] hover:bg-blue-900/40 border border-blue-500/25 text-xs text-slate-200 hover:text-white font-medium transition-colors"
            title="Export as text file"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Print */}
          <button
            id="btn-print-notes"
            onClick={handlePrint}
            className="p-2 rounded-xl bg-[#0E1A38] hover:bg-blue-900/40 border border-blue-500/25 text-xs text-slate-300 hover:text-white transition-colors"
            title="Print study notes"
          >
            <Printer className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </div>

      {/* Sticky Section Quick Jumpers Bar */}
      <div className="sticky top-2 z-20 backdrop-blur-xl bg-[#070E22]/90 border border-blue-500/20 rounded-2xl p-1.5 shadow-lg flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => scrollToSection("notes")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeSection === "notes"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Study Notes Reader</span>
          </button>

          <button
            onClick={() => scrollToSection("flashcards")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeSection === "flashcards"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-300" />
            <span>Flashcards ({totalFlashcards})</span>
          </button>

          <button
            onClick={() => scrollToSection("quiz")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeSection === "quiz"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>Practice Quiz ({totalQuizQuestions})</span>
          </button>

          <button
            onClick={() => scrollToSection("combined")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeSection === "combined"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Combined Review</span>
          </button>
        </div>

        {/* Search Input in Bar */}
        <div className="relative min-w-[140px] sm:min-w-[200px] shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-8 pr-3 py-1 rounded-lg bg-[#050B1B] border border-blue-500/20 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {/* SECTION 1: FULL-PAGE SCROLLABLE STUDY NOTES READER */}
      <section id="section-notes" className="space-y-4">
        {/* Document Selector Pills (if multiple documents) */}
        {folderDocuments.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs text-slate-400 shrink-0 font-medium">Filter Document:</span>
            <button
              onClick={() => setSelectedDocFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedDocFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-[#091228] border border-blue-900/40 text-slate-400 hover:text-white"
              }`}
            >
              All Documents ({folderDocuments.length})
            </button>
            {folderDocuments.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocFilter(doc.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedDocFilter === doc.id
                    ? "bg-blue-600 text-white"
                    : "bg-[#091228] border border-blue-900/40 text-slate-300 hover:text-white"
                }`}
              >
                <span>{doc.name}</span>
                <span className="text-[10px] uppercase font-bold text-blue-300">
                  {doc.fileType}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Empty State if no documents */}
        {folderDocuments.length === 0 && folderReviewers.length === 0 ? (
          <div className="rounded-3xl border border-blue-500/20 bg-[#081024]/70 p-12 text-center backdrop-blur-xl">
            <BookOpen className="w-12 h-12 text-blue-400/50 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1.5">No Study Notes Yet</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-5">
              Upload course syllabus, lecture slides (PPTX), readings (PDF), or document notes (DOCX/TXT) to view full scrollable study notes here.
            </p>
            <button
              onClick={onUploadMoreFiles}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Notes into {folder.name}</span>
            </button>
          </div>
        ) : (
          /* Full Page Natural Vertical Scrolling Notes Container */
          <div className="rounded-3xl border border-blue-500/25 bg-[#081024]/85 backdrop-blur-2xl p-5 sm:p-8 lg:p-10 shadow-2xl space-y-8 min-h-[50vh]">
            {/* Subject Overview & Key Concepts Highlights */}
            <div className="border-b border-blue-900/40 pb-6 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Subject Reading Material & Source Notes
                </span>
                <span className="text-xs text-slate-400">
                  Natural Vertical Scrolling Reader • High Legibility
                </span>
              </div>

              {/* Aggregated Key Concepts from folder reviewers */}
              {folderReviewers.some((r) => r.keyConcepts && r.keyConcepts.length > 0) && (
                <div className="p-3.5 rounded-2xl bg-[#0C1938]/80 border border-blue-500/20">
                  <span className="block text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-2">
                    Core Subject Concepts Extracted:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(
                      new Set(
                        folderReviewers.flatMap((r) => r.keyConcepts || []).filter(Boolean)
                      )
                    ).map((concept, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-blue-950/80 border border-blue-800/60 text-xs font-medium text-blue-200"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Document Render List */}
            {displayedDocs.map((doc, docIndex) => {
              const lines = doc.text.split("\n");
              const filteredLines = searchQuery.trim()
                ? lines.filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase()))
                : lines;

              return (
                <article
                  key={doc.id}
                  id={`doc-note-${doc.id}`}
                  className="space-y-4 border-b border-blue-900/40 pb-8 last:border-b-0"
                >
                  {/* Document Heading Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-[#0D1836] border border-blue-500/20">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          doc.fileType === "pdf"
                            ? "bg-red-950/80 text-red-300 border border-red-800/60"
                            : doc.fileType === "pptx"
                            ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                            : doc.fileType === "docx"
                            ? "bg-blue-950/80 text-blue-300 border border-blue-800/60"
                            : "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                        }`}
                      >
                        {doc.fileType === "pdf" && <FileText className="w-3 h-3 text-red-400" />}
                        {doc.fileType === "pptx" && <FileSpreadsheet className="w-3 h-3 text-amber-400" />}
                        {doc.fileType === "docx" && <FileText className="w-3 h-3 text-blue-400" />}
                        {doc.fileType === "txt" && <FileCode className="w-3 h-3 text-emerald-400" />}
                        <span>{doc.fileType.toUpperCase()}</span>
                      </span>

                      <h3 className="text-base sm:text-lg font-bold text-white line-clamp-1">
                        {doc.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>
                        ~{doc.text.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words
                      </span>
                    </div>
                  </div>

                  {/* Search filter matches notice if active */}
                  {searchQuery.trim() && (
                    <div className="text-xs text-blue-300 bg-blue-950/60 px-3 py-1.5 rounded-lg border border-blue-800/40">
                      Showing {filteredLines.length} line{filteredLines.length === 1 ? "" : "s"} matching "{searchQuery}" in this file
                    </div>
                  )}

                  {/* Text Reader Body with Natural Page Scrolling */}
                  <div
                    className={`font-sans text-slate-200 select-text ${fontSizeClass} space-y-3.5 max-w-4xl`}
                  >
                    {filteredLines.map((line, lIdx) => {
                      const trimmed = line.trim();
                      if (!trimmed) {
                        return <div key={lIdx} className="h-2" />;
                      }

                      // Visual styling for headings
                      if (trimmed.startsWith("#") || trimmed.toUpperCase() === trimmed && trimmed.length > 5 && trimmed.length < 50) {
                        return (
                          <h4
                            key={lIdx}
                            className="font-bold text-white text-base sm:text-lg pt-3 text-blue-200 tracking-wide border-l-2 border-blue-400 pl-3"
                          >
                            {trimmed.replace(/^#+\s*/, "")}
                          </h4>
                        );
                      }

                      // Bullet point styling
                      if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
                        return (
                          <div key={lIdx} className="flex items-start gap-2.5 pl-2">
                            <span className="text-blue-400 mt-1.5">•</span>
                            <span className="flex-1">{trimmed.replace(/^[-•*]\s*/, "")}</span>
                          </div>
                        );
                      }

                      // Highlight searched term if present
                      if (searchQuery.trim() && trimmed.toLowerCase().includes(searchQuery.toLowerCase())) {
                        const parts = trimmed.split(new RegExp(`(${searchQuery})`, "gi"));
                        return (
                          <p key={lIdx} className="text-slate-100">
                            {parts.map((part, pIdx) =>
                              part.toLowerCase() === searchQuery.toLowerCase() ? (
                                <mark key={pIdx} className="bg-amber-400/40 text-amber-100 font-semibold px-1 rounded">
                                  {part}
                                </mark>
                              ) : (
                                part
                              )
                            )}
                          </p>
                        );
                      }

                      return (
                        <p key={lIdx} className="text-slate-200 leading-relaxed">
                          {trimmed}
                        </p>
                      );
                    })}
                  </div>
                </article>
              );
            })}

            {/* If folder has reviewers, also show reviewer notes and summaries */}
            {folderReviewers.length > 0 && selectedDocFilter === "all" && (
              <div className="space-y-6 pt-6 border-t border-blue-900/40">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Generated Reviewer Syntheses ({folderReviewers.length})
                  </h3>
                </div>

                <div className="space-y-4">
                  {folderReviewers.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-5 rounded-2xl bg-[#09142E] border border-blue-500/20 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                          {rev.sourceType.toUpperCase()} REVIEWER
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenReviewerCards(rev.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                          >
                            Study Cards ({rev.flashcards?.length || 0})
                          </button>
                          <button
                            onClick={() => onOpenReviewerQuiz(rev.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                          >
                            Quiz ({rev.quizQuestions?.length || 0})
                          </button>
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-white">{rev.title}</h4>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#050A18]/60 p-3 rounded-xl border border-blue-900/30">
                        {rev.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SECTION 2: FLASHCARDS (Preserved as a separate section) */}
      <section
        id="section-flashcards"
        className="rounded-3xl border border-blue-500/25 bg-[#081024]/85 backdrop-blur-2xl p-5 sm:p-8 shadow-2xl space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-900/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Subject Flashcard Decks</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                  {totalFlashcards} Cards Total
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Practice active recall and flip through grounded definitions extracted from your notes.
              </p>
            </div>
          </div>

          {folderReviewers.length > 0 && (
            <button
              onClick={() => onOpenReviewerCards(folderReviewers[0].id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all self-start sm:self-auto"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Launch Flashcard Mode</span>
            </button>
          )}
        </div>

        {folderReviewers.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#0A1329]/60 border border-blue-900/30 text-center space-y-3">
            <p className="text-xs sm:text-sm text-slate-300">
              No flashcard decks created for {folder.name} yet. Combine your uploaded files or generate study materials.
            </p>
            <button
              onClick={onOpenCombinedReview}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Flashcards from Notes</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {folderReviewers.map((r) => {
              const mastered = r.flashcards.filter((c) => c.mastery === "mastered").length;
              return (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-[#09132C]/80 border border-blue-500/20 hover:border-blue-400/40 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-300">{r.flashcards.length} Cards</span>
                      <span className="text-emerald-400 font-medium">
                        {mastered}/{r.flashcards.length} Mastered
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{r.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2">{r.summary}</p>
                  </div>

                  <div className="pt-3 border-t border-blue-900/40 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Deck created {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => onOpenReviewerCards(r.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all"
                    >
                      <span>Study Deck</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 3: PRACTICE QUIZ (Preserved as a separate section) */}
      <section
        id="section-quiz"
        className="rounded-3xl border border-blue-500/25 bg-[#081024]/85 backdrop-blur-2xl p-5 sm:p-8 shadow-2xl space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-900/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Practice Quiz & Progressive Sets</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {totalQuizQuestions} Questions Total
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Test your mastery with multiple choice, true/false, identification, and short answer questions.
              </p>
            </div>
          </div>

          {folderReviewers.length > 0 && (
            <button
              onClick={() => onOpenReviewerQuiz(folderReviewers[0].id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition-all self-start sm:self-auto"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Launch Quiz Mode</span>
            </button>
          )}
        </div>

        {folderReviewers.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#0A1329]/60 border border-blue-900/30 text-center space-y-3">
            <p className="text-xs sm:text-sm text-slate-300">
              No practice quizzes generated for {folder.name} yet. Create your first quiz from the uploaded study material.
            </p>
            <button
              onClick={onOpenCombinedReview}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Practice Quiz</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {folderReviewers.map((r) => {
              const best = r.quizStats?.bestScore || 0;
              const attempts = r.quizStats?.totalAttempts || 0;
              return (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-[#09132C]/80 border border-emerald-500/20 hover:border-emerald-400/40 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-300">{r.quizQuestions.length} Questions</span>
                      <span className="text-slate-400">
                        {attempts > 0 ? `Best: ${best}% (${attempts} tries)` : "Not taken yet"}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{r.title}</h4>
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-900/40">
                        Multiple Choice
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-900/40">
                        True/False
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-900/40">
                        Identification
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-blue-900/40 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Progressive 10-Question Sets
                    </span>
                    <button
                      onClick={() => onOpenReviewerQuiz(r.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all"
                    >
                      <span>Take Quiz</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 4: COMBINED REVIEW (Preserved as a separate section) */}
      <section
        id="section-combined"
        className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-[#0A132D] via-[#0D193B] to-[#0A132D] backdrop-blur-2xl p-5 sm:p-8 shadow-2xl space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-900/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/25 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Combined Review & Synthesis</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Cross-Document Analysis
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Merge multiple lectures, slides, and readings in {folder.name} into a unified master study deck and practice exam.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenCombinedReview}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition-all hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Combined Reviewer</span>
          </button>
        </div>

        {/* Documents Available for Synthesis */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
            Documents Available to Combine in this Subject:
          </span>

          {folderDocuments.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#060D1E] border border-blue-900/40 text-xs text-slate-400 text-center">
              No documents uploaded to {folder.name} yet. Upload documents to synthesize combined reviewers.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {folderDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-xl bg-[#060D1E]/80 border border-blue-500/20 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="text-xs font-medium text-white truncate">{doc.name}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-blue-300 shrink-0">
                    {doc.fileType}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
