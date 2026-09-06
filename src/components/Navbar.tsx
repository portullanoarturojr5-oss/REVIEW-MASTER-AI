import React, { useState } from "react";
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
} from "lucide-react";
import { ActiveTab, SubjectFolder } from "../types";
import { exportStudyData, importStudyData } from "../utils/storage";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  folders: SubjectFolder[];
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  onDataRefreshed: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  folders,
  selectedFolderId,
  setSelectedFolderId,
  onDataRefreshed,
}) => {
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#070D1E]/85 border-b border-blue-900/30 px-4 py-3"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            id="brand-logo-container"
            onClick={() => {
              setActiveTab("library");
              setSelectedFolderId(null);
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-600/30 border border-blue-400/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-white">
                  Review Master <span className="text-blue-400">AI</span>
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/40">
                  Private
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Grounded Flashcards & Quizzes from Your Uploads
              </p>
            </div>
          </div>

          {/* Subject Filter & Actions on Desktop / Tablet */}
          <div className="flex items-center gap-2.5">
            {/* Folder Dropdown Quick Selector */}
            {folders.length > 0 && (
              <div className="hidden md:flex items-center gap-2 bg-[#0E1A38]/90 border border-blue-500/20 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
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
