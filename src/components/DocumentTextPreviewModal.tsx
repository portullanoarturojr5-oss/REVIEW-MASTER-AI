import React from "react";
import { X, FileText, Calendar, HardDrive, Copy, Check, BookOpen } from "lucide-react";
import { FolderDocument } from "../types";

interface DocumentTextPreviewModalProps {
  document: FolderDocument;
  folderName: string;
  onClose: () => void;
  onCreateReviewer?: (doc: FolderDocument) => void;
}

export const DocumentTextPreviewModal: React.FC<DocumentTextPreviewModalProps> = ({
  document,
  folderName,
  onClose,
  onCreateReviewer,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(document.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const wordCount = document.text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div
      id="doc-preview-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="doc-preview-modal-container"
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-[#091124] border border-blue-500/30 shadow-2xl shadow-blue-950/90 overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-blue-900/40 flex items-center justify-between gap-4 bg-[#0A1329]/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  {document.fileType.toUpperCase()}
                </span>
                <h3 className="font-bold text-base text-white truncate" title={document.name}>
                  {document.name}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Folder: <span className="text-blue-300 font-medium">{folderName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-[#0E1A38] hover:bg-blue-900/40 border border-blue-500/20 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Copy extracted text"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="px-5 py-2.5 bg-[#060D1E] border-b border-blue-900/30 flex items-center justify-between flex-wrap gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              Size: <strong className="text-slate-200">{formatFileSize(document.sizeBytes)}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Words: <strong className="text-slate-200">{wordCount.toLocaleString()}</strong> ({document.text.length.toLocaleString()} chars)
            </span>
            {document.pageOrSlideCount && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                {document.fileType === "pptx" ? "Slides" : "Pages"}:{" "}
                <strong className="text-slate-200">{document.pageOrSlideCount}</strong>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Uploaded: <strong className="text-slate-200">{new Date(document.uploadedAt).toLocaleDateString()}</strong>
            </span>
          </div>

          <span className="text-[11px] text-emerald-400 font-medium">
            ✓ Ready for 100% Grounded AI Synthesis
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 font-mono text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#050B18]">
          <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-200 selection:bg-blue-600 selection:text-white">
            {document.text || "(No text content extracted)"}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-blue-900/40 bg-[#0A1329]/80 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            AI uses strictly this text without external internet data.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
            >
              Close
            </button>
            {onCreateReviewer && (
              <button
                onClick={() => {
                  onClose();
                  onCreateReviewer(document);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all"
              >
                Create Reviewer From This File
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
