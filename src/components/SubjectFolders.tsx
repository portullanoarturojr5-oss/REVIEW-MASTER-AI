import React, { useState, useRef, useEffect } from "react";
import {
  FolderPlus,
  FolderKanban,
  BookOpen,
  Layers,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  X,
  Brain,
  Atom,
  Scale,
  Code,
  Globe,
  TrendingUp,
  Award,
  Bookmark,
  Compass,
  Upload,
  FileText,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { SubjectFolder, Reviewer, FolderDocument } from "../types";
import { saveFolders, addMultipleFolderDocuments } from "../utils/storage";
import { parseUploadedFile } from "../utils/fileParser";
import { FolderDocumentLibrary } from "./FolderDocumentLibrary";

interface SubjectFoldersProps {
  folders: SubjectFolder[];
  reviewers: Reviewer[];
  documents: FolderDocument[];
  onSelectFolder: (folderId: string) => void;
  onCreateReviewerInFolder: (folderId: string) => void;
  onFoldersUpdated: (folders: SubjectFolder[]) => void;
  onDocumentsUpdated: () => void;
  onReviewerCreated: (reviewer: Reviewer) => void;
  onOpenReviewerCards: (reviewerId: string) => void;
  onOpenReviewerQuiz: (reviewerId: string) => void;
  initialOpenFolderId?: string | null;
}

const AVAILABLE_ICONS = [
  { name: "Brain", icon: Brain },
  { name: "BookOpen", icon: BookOpen },
  { name: "Atom", icon: Atom },
  { name: "Scale", icon: Scale },
  { name: "Code", icon: Code },
  { name: "Globe", icon: Globe },
  { name: "TrendingUp", icon: TrendingUp },
  { name: "Award", icon: Award },
  { name: "Bookmark", icon: Bookmark },
  { name: "Compass", icon: Compass },
];

const COLOR_PRESETS = [
  { label: "Royal Blue", value: "#2563EB" },
  { label: "Deep Navy", value: "#1D4ED8" },
  { label: "Sky Cobalt", value: "#0284C7" },
  { label: "Cyan Electric", value: "#06B6D4" },
  { label: "Indigo Mist", value: "#4F46E5" },
  { label: "Violet Sapphire", value: "#7C3AED" },
];

export const SubjectFolders: React.FC<SubjectFoldersProps> = ({
  folders,
  reviewers,
  documents,
  onSelectFolder,
  onCreateReviewerInFolder,
  onFoldersUpdated,
  onDocumentsUpdated,
  onReviewerCreated,
  onOpenReviewerCards,
  onOpenReviewerQuiz,
  initialOpenFolderId,
}) => {
  const [selectedFolderForDocs, setSelectedFolderForDocs] = useState<SubjectFolder | null>(
    () => {
      if (initialOpenFolderId) {
        return folders.find((f) => f.id === initialOpenFolderId) || null;
      }
      return null;
    }
  );
  const [initialShowNotesForDocs, setInitialShowNotesForDocs] = useState<boolean>(false);

  useEffect(() => {
    if (initialOpenFolderId) {
      const targetFolder = folders.find((f) => f.id === initialOpenFolderId);
      if (targetFolder) {
        setSelectedFolderForDocs(targetFolder);
      }
    }
  }, [initialOpenFolderId, folders]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<SubjectFolder | null>(null);

  const [folderName, setFolderName] = useState("");
  const [folderDesc, setFolderDesc] = useState("");
  const [folderColor, setFolderColor] = useState(COLOR_PRESETS[0].value);
  const [folderIcon, setFolderIcon] = useState("Brain");

  // Fast upload per folder
  const [uploadingFolderId, setUploadingFolderId] = useState<string | null>(null);
  const folderFileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadTargetFolderRef = useRef<SubjectFolder | null>(null);

  const openCreateModal = () => {
    setEditingFolder(null);
    setFolderName("");
    setFolderDesc("");
    setFolderColor(COLOR_PRESETS[0].value);
    setFolderIcon("Brain");
    setShowCreateModal(true);
  };

  const openEditModal = (folder: SubjectFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDesc(folder.description);
    setFolderColor(folder.color || COLOR_PRESETS[0].value);
    setFolderIcon(folder.icon || "Brain");
    setShowCreateModal(true);
  };

  const handleDeleteFolder = (folderId: string, folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const count = reviewers.filter((r) => r.folderId === folderId).length;
    const confirmMsg =
      count > 0
        ? `Are you sure you want to delete folder "${folderName}"? Note: ${count} reviewer(s) in this folder will remain in your library.`
        : `Delete subject folder "${folderName}"?`;

    if (window.confirm(confirmMsg)) {
      const updated = folders.filter((f) => f.id !== folderId);
      saveFolders(updated);
      onFoldersUpdated(updated);
      if (selectedFolderForDocs?.id === folderId) {
        setSelectedFolderForDocs(null);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    if (editingFolder) {
      const updated = folders.map((f) =>
        f.id === editingFolder.id
          ? {
              ...f,
              name: folderName.trim(),
              description: folderDesc.trim(),
              color: folderColor,
              icon: folderIcon,
              updatedAt: new Date().toISOString(),
            }
          : f
      );
      saveFolders(updated);
      onFoldersUpdated(updated);
      if (selectedFolderForDocs?.id === editingFolder.id) {
        setSelectedFolderForDocs(updated.find((f) => f.id === editingFolder.id) || null);
      }
    } else {
      const newFolder: SubjectFolder = {
        id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: folderName.trim(),
        description: folderDesc.trim(),
        color: folderColor,
        icon: folderIcon,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updated = [...folders, newFolder];
      saveFolders(updated);
      onFoldersUpdated(updated);
    }

    setShowCreateModal(false);
  };

  const handleCardUploadClick = (folder: SubjectFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    activeUploadTargetFolderRef.current = folder;
    if (folderFileInputRef.current) {
      folderFileInputRef.current.value = "";
      folderFileInputRef.current.click();
    }
  };

  const handleFolderFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetFolder = activeUploadTargetFolderRef.current;
    if (!targetFolder || !e.target.files || e.target.files.length === 0) return;

    const files: File[] = Array.from(e.target.files);
    setUploadingFolderId(targetFolder.id);

    try {
      const parsedResults: FolderDocument[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const parsed = await parseUploadedFile(file);
          if (parsed.text && parsed.text.trim().length > 0) {
            parsedResults.push({
              id: `doc-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
              folderId: targetFolder.id,
              name: file.name,
              fileType: parsed.fileType,
              sizeBytes: parsed.sizeBytes,
              text: parsed.text,
              pageOrSlideCount: parsed.pageOrSlideCount,
              pdfBase64: parsed.pdfBase64,
              uploadedAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error("Error parsing file:", file.name, err);
        }
      }

      if (parsedResults.length > 0) {
        addMultipleFolderDocuments(parsedResults);
        onDocumentsUpdated();
        // Immediately open the folder's document library to reveal the uploaded files
        setSelectedFolderForDocs(targetFolder);
      }
    } finally {
      setUploadingFolderId(null);
      activeUploadTargetFolderRef.current = null;
    }
  };

  const renderIcon = (iconName: string, className = "w-5 h-5") => {
    const matched = AVAILABLE_ICONS.find((i) => i.name === iconName);
    const IconComp = matched ? matched.icon : Brain;
    return <IconComp className={className} />;
  };

  // If a folder is opened, render its complete Document Library!
  if (selectedFolderForDocs) {
    return (
      <FolderDocumentLibrary
        folder={selectedFolderForDocs}
        documents={documents}
        reviewers={reviewers}
        onBack={() => {
          setSelectedFolderForDocs(null);
          setInitialShowNotesForDocs(false);
        }}
        onDocumentsUpdated={onDocumentsUpdated}
        onReviewerCreated={onReviewerCreated}
        onOpenReviewerCards={onOpenReviewerCards}
        onOpenReviewerQuiz={onOpenReviewerQuiz}
        initialShowNotes={initialShowNotesForDocs}
      />
    );
  }

  return (
    <div id="subject-folders-view" className="space-y-6">
      {/* Hidden File Input for Card Quick Upload */}
      <input
        ref={folderFileInputRef}
        type="file"
        multiple
        accept=".pdf,.pptx,.docx,.txt"
        onChange={handleFolderFileInputChange}
        className="hidden"
      />

      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-blue-400" />
            Subject Folders & Document Library
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Organize unlimited subjects. Upload multiple PDF, PPTX, DOCX, and TXT files inside every folder, and combine them into AI reviewers.
          </p>
        </div>

        <button
          id="btn-create-subject-folder"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Subject Folder</span>
        </button>
      </div>

      {/* Folders Grid */}
      {folders.length === 0 ? (
        <div
          id="empty-folders-state"
          className="rounded-2xl border border-blue-500/20 bg-[#0E1A38]/50 backdrop-blur-md p-8 sm:p-12 text-center text-slate-400"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center mx-auto mb-4 text-blue-400">
            <FolderPlus className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Subject Folders Yet</h3>
          <p className="text-xs sm:text-sm max-w-md mx-auto mb-6 text-slate-300">
            Create folders for your courses, subjects, or exam prep (e.g. Cognitive Neuroscience, Microeconomics, Civil Procedure).
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Subject</span>
          </button>
        </div>
      ) : (
        <div
          id="folders-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {folders.map((folder) => {
            const folderDocs = documents.filter((d) => d.folderId === folder.id);
            const folderReviewers = reviewers.filter((r) => r.folderId === folder.id);
            const totalFlashcards = folderReviewers.reduce(
              (acc, r) => acc + (r.flashcards?.length || 0),
              0
            );
            const totalQuizzes = folderReviewers.reduce(
              (acc, r) => acc + (r.quizQuestions?.length || 0),
              0
            );

            const isUploadingThis = uploadingFolderId === folder.id;

            return (
              <div
                key={folder.id}
                id={`folder-card-${folder.id}`}
                onClick={() => setSelectedFolderForDocs(folder)}
                className="group relative rounded-2xl bg-[#0D1836]/80 hover:bg-[#112048]/90 border border-blue-500/20 hover:border-blue-400/40 p-5 backdrop-blur-md shadow-lg shadow-blue-950/40 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Icon, Name, Action buttons */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
                        style={{
                          backgroundColor: folder.color || "#2563EB",
                          boxShadow: `0 4px 14px ${folder.color}40`,
                        }}
                      >
                        {renderIcon(folder.icon, "w-6 h-6")}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base text-white group-hover:text-blue-300 transition-colors truncate">
                          {folder.name}
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          {folderDocs.length} {folderDocs.length === 1 ? "document" : "documents"} • {folderReviewers.length} {folderReviewers.length === 1 ? "set" : "sets"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        id={`btn-edit-folder-${folder.id}`}
                        onClick={(e) => openEditModal(folder, e)}
                        title="Edit Folder"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-delete-folder-${folder.id}`}
                        onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
                        title="Delete Folder"
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {folder.description && (
                    <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                      {folder.description}
                    </p>
                  )}
                </div>

                {/* Upload Files Button & Study Stats Bar */}
                <div className="space-y-3 pt-3 border-t border-blue-900/40">
                  {/* Folder Metrics */}
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1 text-blue-300" title="Uploaded Documents">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <strong>{folderDocs.length}</strong> files
                    </span>
                    <span className="flex items-center gap-1 text-slate-300" title="Flashcard Items">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <strong>{totalFlashcards}</strong> cards
                    </span>
                    <span className="flex items-center gap-1 text-slate-300" title="Quiz questions">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <strong>{totalQuizzes}</strong> Qs
                    </span>
                  </div>

                  {/* Actions inside every folder */}
                  <div className="flex items-center gap-2">
                    {/* Requirement 1: Add an Upload Files button inside every folder */}
                    <button
                      id={`btn-card-upload-${folder.id}`}
                      onClick={(e) => handleCardUploadClick(folder, e)}
                      disabled={isUploadingThis}
                      title="Upload PDF, PPTX, DOCX, or TXT into this folder"
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 hover:text-white border border-blue-400/30 text-xs font-semibold transition-all group-hover:border-blue-400/60"
                    >
                      {isUploadingThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-blue-400" />
                          <span>Upload Files</span>
                        </>
                      )}
                    </button>

                    {/* View Document Library */}
                    <button
                      id={`btn-open-doc-library-${folder.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInitialShowNotesForDocs(false);
                        setSelectedFolderForDocs(folder);
                      }}
                      className="px-3 py-2 rounded-xl bg-[#081226] hover:bg-blue-900/30 text-slate-300 hover:text-white border border-blue-500/20 text-xs font-medium transition-colors flex items-center gap-1"
                      title="Open Document Library"
                    >
                      <span>Files</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {/* View Study Notes */}
                    <button
                      id={`btn-open-study-notes-${folder.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInitialShowNotesForDocs(true);
                        setSelectedFolderForDocs(folder);
                      }}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600 hover:to-indigo-600 text-blue-200 hover:text-white border border-blue-400/30 text-xs font-semibold transition-all flex items-center gap-1.5"
                      title="Open Subject Study Notes Reader"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-blue-300" />
                      <span>Study Notes</span>
                    </button>

                    {/* Quick New Reviewer */}
                    <button
                      id={`btn-add-reviewer-in-${folder.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateReviewerInFolder(folder.id);
                      }}
                      title="Create New Reviewer"
                      className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-400/25 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create or Edit Subject Folder */}
      {showCreateModal && (
        <div
          id="folder-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            id="folder-modal-container"
            className="w-full max-w-lg rounded-2xl bg-[#091124] border border-blue-500/30 shadow-2xl shadow-blue-950/80 p-6 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-blue-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30">
                  <FolderKanban className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-lg text-white">
                  {editingFolder ? "Edit Subject Folder" : "Create New Subject Folder"}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Subject / Course Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cognitive Neuroscience, Contract Law, Microeconomics"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D1E] border border-blue-500/30 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Description / Topic Scope
                </label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe what subjects or exams belong here..."
                  value={folderDesc}
                  onChange={(e) => setFolderDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#060D1E] border border-blue-500/30 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Folder Theme Color
                </label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFolderColor(c.value)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        folderColor === c.value
                          ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#091124]"
                          : "opacity-80 hover:scale-110"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Subject Icon
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = folderIcon === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setFolderIcon(item.name)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? "bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-600/40"
                            : "bg-[#060D1E] border-blue-900/30 text-slate-400 hover:text-white hover:border-blue-500/40"
                        }`}
                      >
                        <IconComp className="w-5 h-5 mb-1" />
                        <span className="text-[10px] truncate max-w-full">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-blue-900/40 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 border border-blue-400/30 transition-all hover:scale-[1.02]"
                >
                  {editingFolder ? "Save Changes" : "Create Subject Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
