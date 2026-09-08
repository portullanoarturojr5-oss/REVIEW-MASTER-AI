import React, { useState, useEffect } from "react";
import { ActiveTab, SubjectFolder, Reviewer, FolderDocument } from "./types";
import { getFolders, getReviewers, getFolderDocuments } from "./utils/storage";
import { Navbar } from "./components/Navbar";
import { ReviewLibrary } from "./components/ReviewLibrary";
import { SubjectFolders } from "./components/SubjectFolders";
import { FlashcardMode } from "./components/FlashcardMode";
import { QuizMode } from "./components/QuizMode";
import { CreateReviewerModal } from "./components/CreateReviewerModal";
import { SourceViewerModal } from "./components/SourceViewerModal";
import { GenerateStudyMaterialsModal } from "./components/GenerateStudyMaterialsModal";
import { DocumentTextPreviewModal } from "./components/DocumentTextPreviewModal";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  const [folders, setFolders] = useState<SubjectFolder[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [documents, setDocuments] = useState<FolderDocument[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("library");

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [activeReviewerId, setActiveReviewerId] = useState<string | null>(null);
  const [viewingSourceReviewer, setViewingSourceReviewer] = useState<Reviewer | null>(null);
  const [generatingMaterialsReviewer, setGeneratingMaterialsReviewer] = useState<Reviewer | null>(null);
  const [previewingDoc, setPreviewingDoc] = useState<FolderDocument | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  const [folderToCreateIn, setFolderToCreateIn] = useState<string | null>(null);

  // Initialize data from local storage
  const reloadData = () => {
    const f = getFolders();
    const r = getReviewers();
    const d = getFolderDocuments();
    setFolders(f);
    setReviewers(r);
    setDocuments(d);
    if (!activeReviewerId && r.length > 0) {
      setActiveReviewerId(r[0].id);
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleOpenReviewerCards = (reviewerId: string) => {
    setActiveReviewerId(reviewerId);
    setActiveTab("flashcards");
  };

  const handleOpenReviewerQuiz = (reviewerId: string) => {
    setActiveReviewerId(reviewerId);
    setActiveTab("quiz");
  };

  const handleCreateNewReviewer = (folderId?: string) => {
    setFolderToCreateIn(folderId || selectedFolderId || (folders[0]?.id ?? null));
    setActiveTab("create");
  };

  const handleReviewerCreated = (newReviewer: Reviewer) => {
    reloadData();
    setActiveReviewerId(newReviewer.id);
    // Take user directly to their new flashcard deck!
    setActiveTab("flashcards");
  };

  const handleMaterialsGenerated = (updatedReviewer: Reviewer, targetTab: "flashcards" | "quiz") => {
    reloadData();
    setActiveReviewerId(updatedReviewer.id);
    setActiveTab(targetTab);
    setGeneratingMaterialsReviewer(null);
  };

  return (
    <div className="min-h-screen bg-[#060B19] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.2),rgba(6,11,25,0))] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header & Mobile/Desktop Navbars */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        folders={folders}
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={setSelectedFolderId}
        reviewers={reviewers}
        documents={documents}
        onOpenReviewerCards={handleOpenReviewerCards}
        onOpenReviewerQuiz={handleOpenReviewerQuiz}
        onOpenFolder={(fId) => {
          setSelectedFolderId(fId);
          setActiveTab("folders");
        }}
        onOpenDocument={(doc) => {
          setPreviewingDoc(doc);
        }}
        onDataRefreshed={reloadData}
        globalSearchQuery={globalSearchQuery}
        setGlobalSearchQuery={setGlobalSearchQuery}
      />

      {/* Main Study Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-12">
        <ErrorBoundary
          fallbackTitle="Workspace View Issue"
          fallbackMessage="This study view encountered an unexpected issue. You can return to the dashboard or try refreshing."
          onReset={() => setActiveTab("library")}
        >
          {activeTab === "library" && (
            <ReviewLibrary
              reviewers={reviewers}
              folders={folders}
              documents={documents}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onOpenFolderDocuments={(fId) => {
                setSelectedFolderId(fId);
                setActiveTab("folders");
              }}
              onOpenReviewerCards={handleOpenReviewerCards}
              onOpenReviewerQuiz={handleOpenReviewerQuiz}
              onOpenGenerateMaterials={(r) => setGeneratingMaterialsReviewer(r)}
              onViewSourceNotes={(r) => setViewingSourceReviewer(r)}
              onCreateNewReviewer={handleCreateNewReviewer}
              onReviewersUpdated={reloadData}
              globalSearchQuery={globalSearchQuery}
              onGlobalSearchQueryChange={setGlobalSearchQuery}
            />
          )}

          {activeTab === "folders" && (
            <SubjectFolders
              folders={folders}
              reviewers={reviewers}
              documents={documents}
              onSelectFolder={(fId) => {
                setSelectedFolderId(fId);
              }}
              onCreateReviewerInFolder={(fId) => {
                setFolderToCreateIn(fId);
                setActiveTab("create");
              }}
              onFoldersUpdated={(updated) => setFolders(updated)}
              onDocumentsUpdated={reloadData}
              onReviewerCreated={handleReviewerCreated}
              onOpenReviewerCards={handleOpenReviewerCards}
              onOpenReviewerQuiz={handleOpenReviewerQuiz}
              initialOpenFolderId={selectedFolderId}
            />
          )}

          {activeTab === "flashcards" && (
            <FlashcardMode
              reviewers={reviewers}
              activeReviewerId={activeReviewerId}
              onSelectReviewer={(id) => setActiveReviewerId(id)}
              onViewSourceNotes={(r) => setViewingSourceReviewer(r)}
              onOpenGenerateMaterials={(r) => setGeneratingMaterialsReviewer(r)}
              onReviewerUpdated={reloadData}
            />
          )}

          {activeTab === "quiz" && (
            <QuizMode
              reviewers={reviewers}
              activeReviewerId={activeReviewerId}
              onSelectReviewer={(id) => setActiveReviewerId(id)}
              onSwitchToFlashcards={(id) => {
                setActiveReviewerId(id);
                setActiveTab("flashcards");
              }}
              onViewSourceNotes={(r) => setViewingSourceReviewer(r)}
              onOpenGenerateMaterials={(r) => setGeneratingMaterialsReviewer(r)}
              onQuizCompleted={reloadData}
            />
          )}

          {activeTab === "create" && (
            <CreateReviewerModal
              folders={folders}
              defaultFolderId={folderToCreateIn}
              onReviewerCreated={handleReviewerCreated}
              onCancel={() => setActiveTab("library")}
              onOpenCreateFolder={() => setActiveTab("folders")}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Source Text Modal (inspect ground text from anywhere) */}
      {viewingSourceReviewer && (
        <SourceViewerModal
          reviewer={viewingSourceReviewer}
          folders={folders}
          onClose={() => setViewingSourceReviewer(null)}
          onStartFlashcards={() => {
            setActiveReviewerId(viewingSourceReviewer.id);
            setActiveTab("flashcards");
          }}
          onStartQuiz={() => {
            setActiveReviewerId(viewingSourceReviewer.id);
            setActiveTab("quiz");
          }}
          onOpenGenerateMaterials={(r) => setGeneratingMaterialsReviewer(r)}
        />
      )}

      {/* Generate Study Materials Modal */}
      {generatingMaterialsReviewer && (
        <GenerateStudyMaterialsModal
          reviewer={generatingMaterialsReviewer}
          onClose={() => setGeneratingMaterialsReviewer(null)}
          onGenerated={handleMaterialsGenerated}
        />
      )}

      {/* Document Text Preview Modal (e.g. from Global Search) */}
      {previewingDoc && (
        <DocumentTextPreviewModal
          document={previewingDoc}
          folderName={folders.find((f) => f.id === previewingDoc.folderId)?.name || "Subject"}
          onClose={() => setPreviewingDoc(null)}
          onCreateReviewer={() => {
            setFolderToCreateIn(previewingDoc.folderId);
            setPreviewingDoc(null);
            setActiveTab("create");
          }}
        />
      )}
    </div>
  );
}
