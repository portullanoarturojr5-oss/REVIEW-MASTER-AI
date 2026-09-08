import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  BookOpen,
  FolderKanban,
  PlusCircle,
  Layers,
  CheckCircle2,
  Sparkles,
  Download,
  Upload,
  ShieldCheck,
  Menu,
  X,
  Search,
  FileText,
  ChevronRight,
  Folder as FolderIcon,
  Eye,
  CornerDownLeft,
  ArrowRight,
  Sparkle,
  FileCode,
  FileSpreadsheet,
} from "lucide-react";
import { ActiveTab, SubjectFolder, Reviewer, FolderDocument } from "../types";
import { exportStudyData, importStudyData } from "../utils/storage";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  folders: SubjectFolder[];
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  reviewers: Reviewer[];
  documents: FolderDocument[];
  onOpenReviewerCards: (reviewerId: string) => void;
  onOpenReviewerQuiz: (reviewerId: string) => void;
  onOpenFolder: (folderId: string) => void;
  onOpenDocument: (document: FolderDocument) => void;
  onDataRefreshed: () => void;
  globalSearchQuery?: string;
  setGlobalSearchQuery?: (query: string) => void;
}

type FlatResult =
  | { type: "folder"; item: SubjectFolder }
  | { type: "reviewer"; item: Reviewer }
  | { type: "document"; item: FolderDocument };

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  folders,
  selectedFolderId,
  setSelectedFolderId,
  reviewers,
  documents,
  onOpenReviewerCards,
  onOpenReviewerQuiz,
  onOpenFolder,
  onOpenDocument,
  onDataRefreshed,
  globalSearchQuery = "",
  setGlobalSearchQuery,
}) => {
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Search State
  const [internalQuery, setInternalQuery] = useState(globalSearchQuery);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "reviewers" | "folders" | "documents">("all");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [mobileSearchVisible, setMobileSearchVisible] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Sync external search query
  useEffect(() => {
    if (globalSearchQuery !== undefined && globalSearchQuery !== internalQuery) {
      setInternalQuery(globalSearchQuery);
    }
  }, [globalSearchQuery]);

  const query = internalQuery;
  const trimmed = query.trim().toLowerCase();

  const handleQueryChange = (val: string) => {
    setInternalQuery(val);
    setGlobalSearchQuery?.(val);
    setHighlightedIndex(0);
    setIsSearchOpen(true);
  };

  const handleClearSearch = () => {
    setInternalQuery("");
    setGlobalSearchQuery?.("");
    searchInputRef.current?.focus();
    mobileInputRef.current?.focus();
  };

  // Real-time matches
  const matchedFolders = useMemo(() => {
    if (!trimmed) return [];
    return folders.filter((f) => {
      const matchName = f.name.toLowerCase().includes(trimmed);
      const matchDesc = f.description?.toLowerCase().includes(trimmed);
      return matchName || matchDesc;
    });
  }, [folders, trimmed]);

  const matchedReviewers = useMemo(() => {
    if (!trimmed) return [];
    return reviewers.filter((r) => {
      const folderName = folders.find((f) => f.id === r.folderId)?.name.toLowerCase() || "";
      const matchTitle = r.title.toLowerCase().includes(trimmed);
      const matchSummary = r.summary?.toLowerCase().includes(trimmed);
      const matchConcepts = r.keyConcepts?.some((c) => c.toLowerCase().includes(trimmed));
      const matchSource = r.sourceFileName?.toLowerCase().includes(trimmed);
      const matchFolder = folderName.includes(trimmed);
      return matchTitle || matchSummary || matchConcepts || matchSource || matchFolder;
    });
  }, [reviewers, folders, trimmed]);

  const matchedDocuments = useMemo(() => {
    if (!trimmed) return [];
    return documents.filter((d) => {
      const folderName = folders.find((f) => f.id === d.folderId)?.name.toLowerCase() || "";
      const matchName = d.name.toLowerCase().includes(trimmed);
      const matchType = d.fileType.toLowerCase().includes(trimmed);
      const matchFolder = folderName.includes(trimmed);
      const matchText = d.text ? d.text.toLowerCase().slice(0, 5000).includes(trimmed) : false;
      return matchName || matchType || matchFolder || matchText;
    });
  }, [documents, folders, trimmed]);

  const totalMatches = matchedFolders.length + matchedReviewers.length + matchedDocuments.length;

  // Flattened results for keyboard navigation
  const flatResults: FlatResult[] = useMemo(() => {
    const list: FlatResult[] = [];
    if (activeFilter === "all" || activeFilter === "folders") {
      matchedFolders.forEach((f) => list.push({ type: "folder", item: f }));
    }
    if (activeFilter === "all" || activeFilter === "reviewers") {
      matchedReviewers.forEach((r) => list.push({ type: "reviewer", item: r }));
    }
    if (activeFilter === "all" || activeFilter === "documents") {
      matchedDocuments.forEach((d) => list.push({ type: "document", item: d }));
    }
    return list;
  }, [activeFilter, matchedFolders, matchedReviewers, matchedDocuments]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global keyboard shortcuts (Ctrl+K, Cmd+K, /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" &&
          !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement))
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        mobileInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
        mobileInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  const handleSelectResult = (result: FlatResult) => {
    if (result.type === "folder") {
      onOpenFolder(result.item.id);
    } else if (result.type === "reviewer") {
      onOpenReviewerCards(result.item.id);
    } else if (result.type === "document") {
      onOpenDocument(result.item);
    }
    setIsSearchOpen(false);
    setMobileSearchVisible(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen || flatResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % flatResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < flatResults.length) {
        handleSelectResult(flatResults[highlightedIndex]);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim() || !text) return text;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark
              key={i}
              className="bg-blue-500/40 text-blue-100 font-semibold px-0.5 rounded shadow-sm"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const handleExport = () => {
    const dataStr = exportStudyData();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `review-master-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importStudyData(content);
        if (success) {
          setImportStatus("Study data imported successfully!");
          onDataRefreshed();
          setTimeout(() => {
            setShowBackupModal(false);
            setImportStatus(null);
          }, 1200);
        } else {
          setImportStatus("Failed to import. Please check file format.");
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      {/* Top Header */}
      <header
        id="app-top-header"
        className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#070D1E]/85 border-b border-blue-900/30 px-3 sm:px-4 py-2.5"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Brand (hidden on mobile if mobile search is active) */}
          <div
            id="brand-logo-container"
            onClick={() => {
              setActiveTab("library");
              setSelectedFolderId(null);
            }}
            className={`flex items-center gap-2.5 cursor-pointer group shrink-0 ${
              mobileSearchVisible ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-600/30 border border-blue-400/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                  Review Master <span className="text-blue-400">AI</span>
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/40">
                  Private
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden lg:block">
                Grounded Flashcards & Quizzes from Your Uploads
              </p>
            </div>
          </div>

          {/* GLOBAL SEARCH BAR (Desktop/Tablet & Mobile Expanded) */}
          <div
            ref={searchContainerRef}
            className={`relative ${
              mobileSearchVisible ? "flex-1 flex" : "hidden sm:flex flex-1 max-w-md lg:max-w-lg mx-1 sm:mx-3"
            }`}
          >
            <div
              className={`w-full flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl bg-[#0B1530]/90 border transition-all ${
                isSearchOpen
                  ? "border-blue-400/80 ring-2 ring-blue-500/20 shadow-lg shadow-blue-950/60 bg-[#0C1938]"
                  : "border-blue-500/25 hover:border-blue-500/40"
              }`}
            >
              <Search className="w-4 h-4 text-blue-400 shrink-0" />
              <input
                id="global-navbar-search-input"
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search reviewers, folders, documents..."
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none"
              />

              {query && (
                <button
                  id="btn-clear-global-search"
                  type="button"
                  onClick={handleClearSearch}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Keyboard Shortcut Indicator */}
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-blue-500/30 bg-[#081026] text-[10px] text-blue-300/80 font-mono shrink-0 select-none">
                ⌘K
              </kbd>

              {mobileSearchVisible && (
                <button
                  type="button"
                  onClick={() => setMobileSearchVisible(false)}
                  className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* REAL-TIME SEARCH RESULTS DROPDOWN */}
            {isSearchOpen && (
              <div
                id="global-search-dropdown-menu"
                className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-[#081026] border border-blue-500/35 shadow-2xl shadow-blue-950/90 overflow-hidden text-white backdrop-blur-2xl max-h-[75vh] sm:max-h-[70vh] flex flex-col animate-fadeIn"
              >
                {/* Header Filter Pills */}
                <div className="p-2.5 sm:p-3 border-b border-blue-900/40 bg-[#0A132C]/90 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-medium no-scrollbar py-0.5">
                    <button
                      id="search-filter-tab-all"
                      type="button"
                      onClick={() => setActiveFilter("all")}
                      className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                        activeFilter === "all"
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      All ({trimmed ? totalMatches : folders.length + reviewers.length + documents.length})
                    </button>
                    <button
                      id="search-filter-tab-reviewers"
                      type="button"
                      onClick={() => setActiveFilter("reviewers")}
                      className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                        activeFilter === "reviewers"
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <BookOpen className="w-3 h-3" />
                      Reviewers ({trimmed ? matchedReviewers.length : reviewers.length})
                    </button>
                    <button
                      id="search-filter-tab-folders"
                      type="button"
                      onClick={() => setActiveFilter("folders")}
                      className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                        activeFilter === "folders"
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <FolderIcon className="w-3 h-3" />
                      Folders ({trimmed ? matchedFolders.length : folders.length})
                    </button>
                    <button
                      id="search-filter-tab-documents"
                      type="button"
                      onClick={() => setActiveFilter("documents")}
                      className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                        activeFilter === "documents"
                          ? "bg-blue-600 text-white font-semibold shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      Documents ({trimmed ? matchedDocuments.length : documents.length})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 shrink-0"
                    title="Close search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-4">
                  {trimmed === "" ? (
                    // Initial prompt / Quick access
                    <div className="py-4 px-3 text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
                        <Search className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-200">
                          Search everything in Review Master AI
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Type any keyword to filter through reviewers, folders, and document titles in real-time.
                        </p>
                      </div>

                      {/* Quick Jump Shortcuts */}
                      {(reviewers.length > 0 || folders.length > 0 || documents.length > 0) && (
                        <div className="pt-2 text-left space-y-2 border-t border-blue-900/30">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block px-1">
                            Quick Jump
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {reviewers.slice(0, 2).map((r) => (
                              <button
                                key={r.id}
                                onClick={() => {
                                  onOpenReviewerCards(r.id);
                                  setIsSearchOpen(false);
                                  setMobileSearchVisible(false);
                                }}
                                className="flex items-center gap-2 p-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/40 border border-blue-500/20 text-left transition-colors group"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span className="text-xs text-slate-200 truncate group-hover:text-white">
                                  {r.title}
                                </span>
                              </button>
                            ))}
                            {folders.slice(0, 2).map((f) => (
                              <button
                                key={f.id}
                                onClick={() => {
                                  onOpenFolder(f.id);
                                  setIsSearchOpen(false);
                                  setMobileSearchVisible(false);
                                }}
                                className="flex items-center gap-2 p-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/40 border border-blue-500/20 text-left transition-colors group"
                              >
                                <FolderIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span className="text-xs text-slate-200 truncate group-hover:text-white">
                                  {f.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : totalMatches === 0 ? (
                    // No Results
                    <div className="py-8 px-4 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-blue-950/60 border border-blue-500/20 flex items-center justify-center mx-auto text-slate-400">
                        <Search className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-200">
                          No results found for &ldquo;{query}&rdquo;
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          We couldn&apos;t find any reviewers, folders, or document titles matching your search.
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Grouped Results
                    <>
                      {/* FOLDERS SECTION */}
                      {(activeFilter === "all" || activeFilter === "folders") && matchedFolders.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-blue-300">
                            <span className="flex items-center gap-1.5">
                              <FolderIcon className="w-3.5 h-3.5 text-blue-400" />
                              Folders ({matchedFolders.length})
                            </span>
                          </div>
                          <div className="space-y-1">
                            {matchedFolders.map((folder) => {
                              const revCount = reviewers.filter((r) => r.folderId === folder.id).length;
                              const docCount = documents.filter((d) => d.folderId === folder.id).length;
                              return (
                                <div
                                  key={folder.id}
                                  id={`search-result-folder-${folder.id}`}
                                  onClick={() => {
                                    onOpenFolder(folder.id);
                                    setIsSearchOpen(false);
                                    setMobileSearchVisible(false);
                                  }}
                                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#0E1A38]/70 hover:bg-blue-900/40 border border-blue-500/20 hover:border-blue-400/50 cursor-pointer transition-all group"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                                      style={{ backgroundColor: folder.color || "#2563EB" }}
                                    >
                                      <FolderIcon className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h5 className="font-semibold text-xs sm:text-sm text-white truncate group-hover:text-blue-300 transition-colors">
                                          {highlightMatch(folder.name, query)}
                                        </h5>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800/60 shrink-0">
                                          Folder
                                        </span>
                                      </div>
                                      {folder.description && (
                                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                          {highlightMatch(folder.description, query)}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 ml-3">
                                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                                      {revCount} rev • {docCount} docs
                                    </span>
                                    <div className="p-1 rounded bg-white/5 group-hover:bg-blue-600 text-slate-400 group-hover:text-white transition-colors">
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* REVIEWERS SECTION */}
                      {(activeFilter === "all" || activeFilter === "reviewers") && matchedReviewers.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-blue-300">
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                              Reviewers ({matchedReviewers.length})
                            </span>
                          </div>
                          <div className="space-y-1">
                            {matchedReviewers.map((reviewer) => {
                              const parentFolder = folders.find((f) => f.id === reviewer.folderId);
                              return (
                                <div
                                  key={reviewer.id}
                                  id={`search-result-reviewer-${reviewer.id}`}
                                  onClick={() => {
                                    onOpenReviewerCards(reviewer.id);
                                    setIsSearchOpen(false);
                                    setMobileSearchVisible(false);
                                  }}
                                  className="w-full p-2.5 rounded-xl bg-[#0E1A38]/70 hover:bg-blue-900/40 border border-blue-500/20 hover:border-blue-400/50 cursor-pointer transition-all group"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
                                        <BookOpen className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h5 className="font-semibold text-xs sm:text-sm text-white truncate group-hover:text-blue-300 transition-colors">
                                            {highlightMatch(reviewer.title, query)}
                                          </h5>
                                          {parentFolder && (
                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/40">
                                              {parentFolder.name}
                                            </span>
                                          )}
                                        </div>

                                        {reviewer.summary && (
                                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                            {highlightMatch(reviewer.summary, query)}
                                          </p>
                                        )}

                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                          <span className="text-blue-300 font-medium">
                                            {reviewer.flashcards.length} cards
                                          </span>
                                          <span>•</span>
                                          <span className="text-indigo-300 font-medium">
                                            {reviewer.quizQuestions.length} quiz
                                          </span>
                                          {reviewer.sourceFileName && (
                                            <>
                                              <span>•</span>
                                              <span className="truncate max-w-[120px]">
                                                {reviewer.sourceFileName}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                                      <button
                                        type="button"
                                        title="Study Flashcards"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenReviewerCards(reviewer.id);
                                          setIsSearchOpen(false);
                                          setMobileSearchVisible(false);
                                        }}
                                        className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-all"
                                      >
                                        <Layers className="w-3 h-3" />
                                        <span>Cards</span>
                                      </button>
                                      <button
                                        type="button"
                                        title="Take Quiz"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenReviewerQuiz(reviewer.id);
                                          setIsSearchOpen(false);
                                          setMobileSearchVisible(false);
                                        }}
                                        className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-all"
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Quiz</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* DOCUMENTS SECTION */}
                      {(activeFilter === "all" || activeFilter === "documents") && matchedDocuments.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-blue-300">
                            <span className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-blue-400" />
                              Document Titles ({matchedDocuments.length})
                            </span>
                          </div>
                          <div className="space-y-1">
                            {matchedDocuments.map((doc) => {
                              const parentFolder = folders.find((f) => f.id === doc.folderId);
                              const badgeColor =
                                doc.fileType === "pdf"
                                  ? "bg-rose-950/80 text-rose-300 border-rose-800/50"
                                  : doc.fileType === "docx"
                                  ? "bg-blue-950/80 text-blue-300 border-blue-800/50"
                                  : doc.fileType === "pptx"
                                  ? "bg-amber-950/80 text-amber-300 border-amber-800/50"
                                  : "bg-slate-900 text-slate-300 border-slate-700";

                              return (
                                <div
                                  key={doc.id}
                                  id={`search-result-doc-${doc.id}`}
                                  onClick={() => {
                                    onOpenDocument(doc);
                                    setIsSearchOpen(false);
                                    setMobileSearchVisible(false);
                                  }}
                                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#0E1A38]/70 hover:bg-blue-900/40 border border-blue-500/20 hover:border-blue-400/50 cursor-pointer transition-all group"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-[#14234C] border border-blue-400/20 flex items-center justify-center text-blue-300 shrink-0">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${badgeColor}`}
                                        >
                                          {doc.fileType}
                                        </span>
                                        <h5 className="font-semibold text-xs sm:text-sm text-white truncate group-hover:text-blue-300 transition-colors">
                                          {highlightMatch(doc.name, query)}
                                        </h5>
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                        {parentFolder && (
                                          <span className="text-blue-300 font-medium">
                                            In {parentFolder.name}
                                          </span>
                                        )}
                                        {parentFolder && <span>•</span>}
                                        <span>{formatFileSize(doc.sizeBytes)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenDocument(doc);
                                        setIsSearchOpen(false);
                                        setMobileSearchVisible(false);
                                      }}
                                      className="px-2 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Preview</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer Hotkey Guide */}
                <div className="p-2 sm:px-3 sm:py-2 bg-[#070D1E] border-t border-blue-900/40 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded bg-[#101D3D] text-slate-300 font-mono text-[9px]">
                        ↵
                      </kbd>{" "}
                      Open
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 rounded bg-[#101D3D] text-slate-300 font-mono text-[9px]">
                        Esc
                      </kbd>{" "}
                      Close
                    </span>
                  </div>
                  <span className="text-slate-400 hidden sm:inline text-[10px]">
                    Real-time global search across library, folders &amp; documents
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Subject Filter & Right Actions on Desktop / Tablet */}
          <div
            className={`flex items-center gap-2 sm:gap-2.5 shrink-0 ${
              mobileSearchVisible ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Mobile Search Toggle Button */}
            <button
              id="btn-mobile-search-toggle"
              type="button"
              onClick={() => {
                setMobileSearchVisible(true);
                setTimeout(() => {
                  searchInputRef.current?.focus();
                  setIsSearchOpen(true);
                }, 50);
              }}
              title="Search reviewers, folders, documents"
              className="sm:hidden p-2 rounded-lg bg-[#0E1A38]/80 hover:bg-blue-900/40 border border-blue-500/20 text-blue-300 hover:text-white transition-colors flex items-center justify-center"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Folder Dropdown Quick Selector (Desktop only) */}
            {folders.length > 0 && (
              <div className="hidden lg:flex items-center gap-2 bg-[#0E1A38]/90 border border-blue-500/20 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
                <span className="text-slate-400">Folder:</span>
                <select
                  id="header-folder-select"
                  value={selectedFolderId || ""}
                  onChange={(e) => setSelectedFolderId(e.target.value || null)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-[#0A1128] text-white">
                    All Subjects ({folders.length})
                  </option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id} className="bg-[#0A1128] text-white">
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Backup & Privacy Button */}
            <button
              id="btn-open-backup-modal"
              onClick={() => setShowBackupModal(true)}
              title="Backup & Privacy Data"
              className="p-2 rounded-lg bg-[#0E1A38]/80 hover:bg-blue-900/40 border border-blue-500/20 text-blue-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Backup</span>
            </button>

            {/* Quick Add Reviewer on Desktop */}
            <button
              id="btn-desktop-new-reviewer"
              onClick={() => setActiveTab("create")}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 border border-blue-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Reviewer</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Glassmorphic & Thumb-friendly) */}
      <nav
        id="mobile-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-[#070D1E]/90 border-t border-blue-900/40 px-3 py-2 sm:hidden safe-area-bottom shadow-2xl shadow-blue-950/80"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button
            id="tab-mobile-library"
            onClick={() => setActiveTab("library")}
            className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl transition-all ${
              activeTab === "library"
                ? "text-blue-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className={`w-5 h-5 ${activeTab === "library" ? "scale-110" : ""}`} />
            <span className="text-[10px]">Library</span>
          </button>

          <button
            id="tab-mobile-folders"
            onClick={() => setActiveTab("folders")}
            className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl transition-all ${
              activeTab === "folders"
                ? "text-blue-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FolderKanban className={`w-5 h-5 ${activeTab === "folders" ? "scale-110" : ""}`} />
            <span className="text-[10px]">Folders</span>
          </button>

          {/* Prominent Center Create Button */}
          <button
            id="tab-mobile-create"
            onClick={() => setActiveTab("create")}
            className="flex flex-col items-center -mt-5"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-600/50 border-2 border-[#070D1E] active:scale-95 transition-transform">
              <PlusCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-blue-300 mt-0.5">Create</span>
          </button>

          <button
            id="tab-mobile-flashcards"
            onClick={() => setActiveTab("flashcards")}
            className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl transition-all ${
              activeTab === "flashcards"
                ? "text-blue-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className={`w-5 h-5 ${activeTab === "flashcards" ? "scale-110" : ""}`} />
            <span className="text-[10px]">Cards</span>
          </button>

          <button
            id="tab-mobile-quiz"
            onClick={() => setActiveTab("quiz")}
            className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl transition-all ${
              activeTab === "quiz"
                ? "text-blue-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <CheckCircle2 className={`w-5 h-5 ${activeTab === "quiz" ? "scale-110" : ""}`} />
            <span className="text-[10px]">Quiz</span>
          </button>
        </div>
      </nav>

      {/* Desktop / Tablet Subnav Bar */}
      <div className="hidden sm:block max-w-7xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between backdrop-blur-md bg-[#0C1733]/60 border border-blue-500/20 rounded-xl p-1.5">
          <div className="flex items-center gap-1">
            <button
              id="tab-desktop-library"
              onClick={() => setActiveTab("library")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "library"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Review Library</span>
            </button>

            <button
              id="tab-desktop-folders"
              onClick={() => setActiveTab("folders")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "folders"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Subject Folders ({folders.length})</span>
            </button>

            <button
              id="tab-desktop-flashcards"
              onClick={() => setActiveTab("flashcards")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "flashcards"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Flashcard Mode</span>
            </button>

            <button
              id="tab-desktop-quiz"
              onClick={() => setActiveTab("quiz")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "quiz"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Quiz Mode</span>
            </button>
          </div>

          <button
            id="btn-subnav-create"
            onClick={() => setActiveTab("create")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-white border border-blue-400/30 text-xs font-medium transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-blue-400" />
            <span>Create Reviewer</span>
          </button>
        </div>
      </div>

      {/* Backup & Privacy Data Modal */}
      {showBackupModal && (
        <div
          id="backup-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <div
            id="backup-modal-card"
            className="w-full max-w-md rounded-2xl bg-[#0B152E] border border-blue-500/30 p-6 shadow-2xl shadow-blue-950/80 text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
                <h3 className="font-bold text-lg">Private Study Storage</h3>
              </div>
              <button
                id="btn-close-backup-modal"
                onClick={() => setShowBackupModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Review Master AI is your private study website. All your folders,
              reviewers, flashcards, and quizzes are stored securely in your
              browser. You can export a backup JSON at any time or transfer to
              another device.
            </p>

            <div className="space-y-3">
              <button
                id="btn-export-backup-data"
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-sm shadow-md shadow-blue-600/30 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export Backup File (.json)</span>
              </button>

              <label
                id="label-import-backup-file"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#11224D] hover:bg-[#162D66] border border-blue-500/30 font-semibold text-sm cursor-pointer transition-all text-blue-200 hover:text-white"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Import Backup File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>

            {importStatus && (
              <div className="mt-4 p-2.5 rounded-lg bg-blue-950/80 border border-blue-400/40 text-xs text-blue-200 text-center font-medium">
                {importStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

