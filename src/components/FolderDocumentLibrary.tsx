import React, { useState, useRef } from "react";
import {
  FolderKanban,
  Upload,
  FileText,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  Layers,
  CheckCircle2,
  Trash2,
  Eye,
  ArrowLeft,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  Loader2,
  PlusCircle,
  HardDrive,
  Calendar,
  BookOpen,
  Filter,
  Check,
} from "lucide-react";
import { SubjectFolder, FolderDocument, Reviewer } from "../types";
import { parseUploadedFile } from "../utils/fileParser";
import {
  addMultipleFolderDocuments,
  deleteFolderDocument,
  getFolderDocuments,
} from "../utils/storage";
import { DocumentTextPreviewModal } from "./DocumentTextPreviewModal";
import { CombinedReviewerModal } from "./CombinedReviewerModal";
import { SubjectNotesReader } from "./SubjectNotesReader";

interface FolderDocumentLibraryProps {
  folder: SubjectFolder;
  documents: FolderDocument[];
  reviewers: Reviewer[];
  onBack: () => void;
  onDocumentsUpdated: () => void;
  onReviewerCreated: (reviewer: Reviewer) => void;
  onOpenReviewerCards: (reviewerId: string) => void;
  onOpenReviewerQuiz: (reviewerId: string) => void;
  initialShowNotes?: boolean;
}

export const FolderDocumentLibrary: React.FC<FolderDocumentLibraryProps> = ({
  folder,
  documents,
  reviewers,
  onBack,
  onDocumentsUpdated,
  onReviewerCreated,
  onOpenReviewerCards,
  onOpenReviewerQuiz,
  initialShowNotes = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modals & Views
  const [showStudyNotes, setShowStudyNotes] = useState<boolean>(initialShowNotes);
  const [previewDoc, setPreviewDoc] = useState<FolderDocument | null>(null);
  const [showCombinedModal, setShowCombinedModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"documents" | "reviewers">("documents");

  // Filter documents in this folder
  const folderDocuments = documents.filter((d) => d.folderId === folder.id);
  const folderReviewers = reviewers.filter((r) => r.folderId === folder.id);

  const filteredDocs = folderDocuments.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.name.toLowerCase().includes(q) ||
      doc.fileType.toLowerCase().includes(q) ||
      doc.text.toLowerCase().includes(q)
    );
  });

  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const acceptedExtensions = ["pdf", "pptx", "docx", "txt"];
    const validFiles: File[] = [];

    for (const f of files) {
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      if (acceptedExtensions.includes(ext)) {
        validFiles.push(f);
      } else {
        setUploadError(`Ignored unsupported file "${f.name}". Supported formats: PDF, PPTX, DOCX, TXT.`);
      }
    }

    if (validFiles.length === 0) {
      setIsUploading(false);
      return;
    }

    const parsedResults: FolderDocument[] = [];
    const errors: string[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgressText(`Parsing ${i + 1} of ${validFiles.length}: "${file.name}"...`);

      try {
        const parsed = await parseUploadedFile(file);
        if (!parsed.text || parsed.text.trim().length === 0) {
          errors.push(`"${file.name}" contained no readable text.`);
          continue;
        }

        const newDoc: FolderDocument = {
          id: `doc-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          folderId: folder.id,
          name: file.name,
          fileType: parsed.fileType,
          sizeBytes: parsed.sizeBytes,
          text: parsed.text,
          pageOrSlideCount: parsed.pageOrSlideCount,
          pdfBase64: parsed.pdfBase64,
          uploadedAt: new Date().toISOString(),
        };

        parsedResults.push(newDoc);
      } catch (err: any) {
        console.error(`Error parsing ${file.name}:`, err);
        errors.push(`Failed to parse "${file.name}": ${err.message || "Unknown error"}`);
      }
    }

    if (parsedResults.length > 0) {
      addMultipleFolderDocuments(parsedResults);
      onDocumentsUpdated();
      // Auto-select newly uploaded files
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        parsedResults.forEach((d) => next.add(d.id));
        return next;
      });
    }

    if (errors.length > 0) {
      setUploadError(errors.join(" • "));
    }

    setIsUploading(false);
    setUploadProgressText("");
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedDocIds.size === filteredDocs.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(filteredDocs.map((d) => d.id)));
    }
  };

  const handleDeleteDocument = (docId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete document "${name}" from this folder?`)) {
      deleteFolderDocument(docId);
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
      onDocumentsUpdated();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const selectedDocsList = folderDocuments.filter((d) => selectedDocIds.has(d.id));

  // Full-page scrollable Study Notes Reader mode
  if (showStudyNotes) {
    return (
      <div id="folder-study-notes-view" className="animate-fadeIn">
        {/* Hidden File Input for Multiple Uploads */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.pptx,.docx,.txt"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <SubjectNotesReader
          folder={folder}
          documents={documents}
          reviewers={reviewers}
          onBack={() => setShowStudyNotes(false)}
          onOpenReviewerCards={onOpenReviewerCards}
          onOpenReviewerQuiz={onOpenReviewerQuiz}
          onOpenCombinedReview={() => setShowCombinedModal(true)}
          onUploadMoreFiles={handleTriggerUpload}
        />

        {/* Combined Reviewer Generator Modal accessible from Study Notes */}
        {showCombinedModal && (
          <CombinedReviewerModal
            folder={folder}
            selectedDocuments={
              selectedDocsList.length > 0 ? selectedDocsList : folderDocuments
            }
            onClose={() => setShowCombinedModal(false)}
            onReviewerCreated={(newRev) => {
              setShowCombinedModal(false);
              onReviewerCreated(newRev);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div id="folder-document-library" className="space-y-6 animate-fadeIn">
      {/* Hidden File Input for Multiple Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.pptx,.docx,.txt"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Top Header / Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <button
            id="btn-back-to-folders"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Subject Folders</span>
          </button>

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg border border-white/10"
              style={{ backgroundColor: folder.color || "#2563EB" }}
            >
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {folder.name}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                  {folderDocuments.length} {folderDocuments.length === 1 ? "file" : "files"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 line-clamp-1">
                {folder.description || "Document library & study materials."}
              </p>
            </div>
          </div>
        </div>

        {/* Top-Right Corner Actions: Permanent Study Notes Button & Upload Button */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* Permanent Study Notes Button */}
          <button
            id="btn-folder-study-notes"
            onClick={() => setShowStudyNotes(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 border border-blue-400/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Open Full-Page Study Notes Reader"
          >
            <BookOpen className="w-4 h-4 text-blue-200" />
            <span>Study Notes</span>
          </button>

          <button
            id="btn-folder-upload-files"
            onClick={handleTriggerUpload}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E1A38] hover:bg-blue-900/50 text-blue-200 hover:text-white font-semibold text-xs sm:text-sm border border-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Files</span>
              </>
            )}
          </button>

          {/* Quick Create Combined Reviewer if files are selected */}
          {selectedDocsList.length > 0 && (
            <button
              id="btn-create-combined-reviewer"
              onClick={() => setShowCombinedModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/40 border border-indigo-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Combine ({selectedDocsList.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs: Documents vs Existing Reviewers vs Study Notes */}
      <div className="flex items-center justify-between border-b border-blue-900/40 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "documents"
                ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Folder Documents ({folderDocuments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("reviewers")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "reviewers"
                ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Created Reviewers ({folderReviewers.length})</span>
          </button>

          <button
            id="tab-btn-open-study-notes"
            onClick={() => setShowStudyNotes(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-300 hover:text-white hover:bg-blue-600/20 border border-blue-500/20 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Study Notes Reader</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Accepts: <strong className="text-slate-300">PDF, PPTX, DOCX, TXT</strong>
        </span>
      </div>

      {/* Uploader Drop Zone banner */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleTriggerUpload}
        className="group relative rounded-2xl border-2 border-dashed border-blue-500/30 hover:border-blue-400/60 bg-[#0A1329]/50 hover:bg-[#0E1A38]/70 p-6 text-center cursor-pointer transition-all backdrop-blur-md"
      >
        <div className="max-w-md mx-auto flex flex-col items-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Drop files here or click to upload into{" "}
              <span className="text-blue-300 font-bold">{folder.name}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports <strong className="text-slate-300">PDF, PPTX, DOCX, and TXT</strong>. Upload multiple files at once to synthesize combined reviewers.
            </p>
          </div>
        </div>

        {isUploading && (
          <div className="absolute inset-0 bg-[#070D1E]/90 rounded-2xl flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
            <p className="text-xs font-semibold text-white">{uploadProgressText || "Extracting text..."}</p>
          </div>
        )}
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block text-white mb-0.5">Upload Notice</span>
            <span>{uploadError}</span>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-rose-400 hover:text-white text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === "documents" ? (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0A1329]/80 border border-blue-900/40 rounded-xl p-3 backdrop-blur-md">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files in this folder..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#060D1E] border border-blue-500/20 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {filteredDocs.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1A38] hover:bg-blue-900/40 border border-blue-500/20 text-xs text-slate-300 font-medium transition-colors"
                >
                  {selectedDocIds.size === filteredDocs.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                      <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      <span>Select All ({filteredDocs.length})</span>
                    </>
                  )}
                </button>
              )}

              {selectedDocsList.length > 0 && (
                <button
                  id="btn-floating-combine"
                  onClick={() => setShowCombinedModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 border border-blue-400/30 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Combine {selectedDocsList.length} Files</span>
                </button>
              )}
            </div>
          </div>

          {/* Documents Grid / Empty State */}
          {folderDocuments.length === 0 ? (
            <div className="rounded-2xl border border-blue-900/30 bg-[#0A1329]/40 p-12 text-center backdrop-blur-md">
              <FileText className="w-12 h-12 text-blue-400/40 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No documents in this folder yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                Upload your lecture notes, course slides, or readings in PDF, PPTX, DOCX, or TXT format.
              </p>
              <button
                onClick={handleTriggerUpload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Upload First File</span>
              </button>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="rounded-xl border border-blue-900/30 bg-[#0A1329]/40 p-8 text-center text-xs text-slate-400">
              No documents matched "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => {
                const isSelected = selectedDocIds.has(doc.id);
                const wordCount = doc.text.trim().split(/\s+/).filter(Boolean).length;

                return (
                  <div
                    key={doc.id}
                    id={`doc-card-${doc.id}`}
                    onClick={() => toggleSelectDoc(doc.id)}
                    className={`group relative rounded-2xl border p-4 transition-all cursor-pointer backdrop-blur-md flex flex-col justify-between ${
                      isSelected
                        ? "bg-[#0E1F47]/90 border-blue-400 shadow-lg shadow-blue-950/80 scale-[1.01]"
                        : "bg-[#0A1329]/70 hover:bg-[#0D1836]/90 border-blue-900/40 hover:border-blue-500/30"
                    }`}
                  >
                    {/* Top Row: Checkbox & File Type Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-blue-600 border-blue-400 text-white"
                              : "border-slate-500 bg-[#060D1E] text-transparent group-hover:border-blue-400"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        {/* Distinct File Type Badge with Icons */}
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
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, doc.name, e)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Middle: Document Title & Meta */}
                    <div className="space-y-2 mb-4">
                      <h4
                        className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug"
                        title={doc.name}
                      >
                        {doc.name}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3 text-blue-400" />
                          {formatFileSize(doc.sizeBytes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-cyan-400" />
                          ~{wordCount.toLocaleString()} words
                        </span>
                        {doc.pageOrSlideCount && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-purple-400" />
                            {doc.fileType === "pptx" ? `${doc.pageOrSlideCount} slides` : `${doc.pageOrSlideCount} pages`}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2.5 border-t border-blue-900/30 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewDoc(doc);
                        }}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-200 font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Text</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocIds(new Set([doc.id]));
                          setShowCombinedModal(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-medium transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-blue-400" />
                        <span>Make Reviewer</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Reviewers in this folder */
        <div className="space-y-4">
          {folderReviewers.length === 0 ? (
            <div className="rounded-2xl border border-blue-900/30 bg-[#0A1329]/40 p-10 text-center">
              <BookOpen className="w-10 h-10 text-blue-400/40 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-white mb-1">No Reviewers Generated in this folder yet</h4>
              <p className="text-xs text-slate-400 mb-4">
                Select one or more uploaded files above and click "Create Combined Reviewer".
              </p>
              {folderDocuments.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedDocIds(new Set(folderDocuments.map((d) => d.id)));
                    setShowCombinedModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Combine All {folderDocuments.length} Documents</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {folderReviewers.map((r) => (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl bg-[#0A1329]/80 border border-blue-900/40 hover:border-blue-500/30 transition-all backdrop-blur-md flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                        {r.sourceType.toUpperCase()} REVIEWER
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-white">{r.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{r.summary}</p>
                  </div>

                  <div className="pt-4 border-t border-blue-900/40 flex items-center justify-between gap-2 mt-4">
                    <div className="flex items-center gap-3 text-xs text-slate-300">
                      <span className="flex items-center gap-1 text-blue-300">
                        <Layers className="w-3.5 h-3.5" />
                        {r.flashcards.length} Cards
                      </span>
                      <span className="flex items-center gap-1 text-cyan-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {r.quizQuestions.length} Questions
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenReviewerCards(r.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all"
                      >
                        Study
                      </button>
                      <button
                        onClick={() => onOpenReviewerQuiz(r.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#0E1A38] hover:bg-blue-900/40 text-blue-300 hover:text-white border border-blue-500/20 text-xs font-medium transition-colors"
                      >
                        Quiz
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Document Text Preview Modal */}
      {previewDoc && (
        <DocumentTextPreviewModal
          document={previewDoc}
          folderName={folder.name}
          onClose={() => setPreviewDoc(null)}
          onCreateReviewer={(doc) => {
            setSelectedDocIds(new Set([doc.id]));
            setShowCombinedModal(true);
          }}
        />
      )}

      {/* Combined Reviewer Generator Modal */}
      {showCombinedModal && (
        <CombinedReviewerModal
          folder={folder}
          selectedDocuments={
            selectedDocsList.length > 0 ? selectedDocsList : folderDocuments.slice(0, 1)
          }
          onClose={() => setShowCombinedModal(false)}
          onReviewerCreated={(newRev) => {
            setShowCombinedModal(false);
            onReviewerCreated(newRev);
          }}
        />
      )}
    </div>
  );
};
