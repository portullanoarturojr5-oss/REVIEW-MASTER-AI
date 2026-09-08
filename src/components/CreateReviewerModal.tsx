import React, { useState } from "react";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  Sliders,
  Eye,
  Loader2,
  Layers,
  HelpCircle,
  X,
  FilePlus,
} from "lucide-react";
import { SubjectFolder, Reviewer, QuizQuestionType, FolderDocument } from "../types";
import { parseUploadedFile, ParsedDocument } from "../utils/fileParser";
import { saveNewReviewer, addFolderDocument } from "../utils/storage";
import {
  requestStudyMaterialsGeneration,
  formatUserFriendlyGenerationError,
} from "../utils/apiClient";

interface CreateReviewerModalProps {
  folders: SubjectFolder[];
  defaultFolderId: string | null;
  onReviewerCreated: (reviewer: Reviewer) => void;
  onCancel: () => void;
  onOpenCreateFolder: () => void;
}

export const CreateReviewerModal: React.FC<CreateReviewerModalProps> = ({
  folders,
  defaultFolderId,
  onReviewerCreated,
  onCancel,
  onOpenCreateFolder,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    defaultFolderId || (folders.length > 0 ? folders[0].id : "")
  );

  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [pastedNotes, setPastedNotes] = useState("");
  const [titleHint, setTitleHint] = useState("");

  // Uploaded file state
  const [parsedDoc, setParsedDoc] = useState<ParsedDocument | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showExtractedPreview, setShowExtractedPreview] = useState(false);

  // Generation options
  const [flashcardCount, setFlashcardCount] = useState(10);
  const [quizCount, setQuizCount] = useState(20);
  const [selectedQuizTypes, setSelectedQuizTypes] = useState<QuizQuestionType[]>([
    "multiple_choice",
    "true_false",
    "identification",
  ]);

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setParseError(null);

    try {
      const parsed = await parseUploadedFile(file);
      setParsedDoc(parsed);
      if (!titleHint) {
        // Auto-fill title hint based on filename
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setTitleHint(cleanName);
      }
    } catch (err: any) {
      console.error("File parse error:", err);
      setParseError(err.message || "Failed to parse the selected file.");
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setParseError(null);

    try {
      const parsed = await parseUploadedFile(file);
      setParsedDoc(parsed);
      if (!titleHint) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setTitleHint(cleanName);
      }
    } catch (err: any) {
      console.error("Drop parse error:", err);
      setParseError(err.message || "Failed to parse the dropped file.");
    } finally {
      setIsParsingFile(false);
    }
  };

  const toggleQuizType = (type: QuizQuestionType) => {
    if (selectedQuizTypes.includes(type)) {
      if (selectedQuizTypes.length > 1) {
        setSelectedQuizTypes(selectedQuizTypes.filter((t) => t !== type));
      }
    } else {
      setSelectedQuizTypes([...selectedQuizTypes, type]);
    }
  };

  // Sample notes loader for quick testing
  const loadSampleNotes = () => {
    setInputMode("paste");
    setTitleHint("Cellular Respiration & ATP Synthesis");
    setPastedNotes(`Biochemistry: Cellular Respiration & Bioenergetics

Overview:
Cellular respiration is the metabolic pathway through which organisms break down glucose to generate adenosine triphosphate (ATP). The overall chemical equation is:
C6H12O6 + 6O2 -> 6CO2 + 6H2O + approx 30-32 ATP.

Stage 1: Glycolysis
- Occurs in the cytoplasm.
- Anaerobic process (does not require O2).
- One 6-carbon glucose molecule is broken down into two 3-carbon pyruvate molecules.
- Net yield per glucose: 2 ATP (via substrate-level phosphorylation) and 2 NADH.
- Phosphofructokinase-1 (PFK-1) is the rate-limiting enzyme, allosterically inhibited by high ATP and citrate.

Stage 2: Pyruvate Oxidation (Link Reaction)
- Takes place in the mitochondrial matrix.
- Pyruvate is converted to acetyl-CoA by the pyruvate dehydrogenase complex.
- Produces 1 NADH and releases 1 CO2 per pyruvate (2 NADH and 2 CO2 per glucose).

Stage 3: The Citric Acid Cycle (Krebs Cycle)
- Occurs in the mitochondrial matrix.
- Acetyl-CoA combines with oxaloacetate (4C) to form citrate (6C).
- Per glucose (two turns of cycle), the yield is: 6 NADH, 2 FADH2, 2 GTP (converted to ATP), and 4 CO2.
- Isocitrate dehydrogenase serves as the major rate-limiting control point.

Stage 4: Oxidative Phosphorylation & Electron Transport Chain (ETC)
- Located across the inner mitochondrial membrane.
- Electrons from NADH and FADH2 are transferred through Complexes I, II, III, and IV.
- Molecular oxygen (O2) serves as the terminal electron acceptor, reducing to form H2O.
- Proton pumping creates an electrochemical proton gradient across the inner membrane.
- ATP synthase utilizes proton motive force through chemiosmosis to synthesize ATP from ADP and inorganic phosphate.
- Cyanide and carbon monoxide inhibit Complex IV (cytochrome c oxidase), halting cellular respiration.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolderId) {
      alert("Please select or create a subject folder first.");
      return;
    }

    const contentText = inputMode === "upload" ? parsedDoc?.text || "" : pastedNotes.trim();

    if (!contentText) {
      alert("Please provide study content by uploading a file or pasting notes.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep("Analyzing uploaded source content...");

    try {
      setTimeout(() => setGenerationStep("Enforcing strict zero-hallucination grounding..."), 1200);
      setTimeout(() => setGenerationStep("Extracting flashcards with exact source citations..."), 2600);
      setTimeout(() => setGenerationStep("Generating validated quiz questions..."), 4200);

      const generatedData = await requestStudyMaterialsGeneration({
        title: titleHint.trim() || "Study Reviewer",
        titleHint: titleHint.trim(),
        content: contentText,
        flashcardCount,
        quizCount,
        quizTypes: selectedQuizTypes,
        extractedVisuals: parsedDoc?.extractedVisuals || [],
        fileName: inputMode === "upload" ? parsedDoc?.fileName : "Pasted Notes",
        documentId: inputMode === "upload" ? `doc-${Date.now()}` : "doc-notes",
      });

      // Construct formatted Reviewer object
      const newReviewer: Reviewer = {
        id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        folderId: selectedFolderId,
        title: generatedData.title || titleHint || "Study Reviewer",
        summary: generatedData.summary || "Comprehensive grounded study guide.",
        sourceType: inputMode === "upload" ? parsedDoc?.sourceType || "notes" : "notes",
        sourceFileName: inputMode === "upload" ? parsedDoc?.fileName : "Pasted Notes",
        rawContent: contentText,
        keyConcepts: generatedData.keyConcepts || [],
        extractedVisuals: generatedData.extractedVisuals || parsedDoc?.extractedVisuals || [],
        studyNotes: generatedData.studyNotes || [],
        flashcards: (generatedData.flashcards || []).map((fc: any, idx: number) => ({
          id: `fc-${Date.now()}-${idx}`,
          front: fc.front,
          back: fc.back,
          sourceExcerpt: fc.sourceExcerpt,
          category: fc.category || "General",
          mastery: "new" as const,
          isVisual: fc.isVisual,
          visualReference: fc.visualReference,
          visualDataUrl: fc.visualDataUrl,
          pageOrSlide: fc.pageOrSlide,
          sourceDoc: fc.sourceDoc,
        })),
        quizQuestions: (generatedData.quizQuestions || []).map((q: any, idx: number) => ({
          id: `qz-${Date.now()}-${idx}`,
          type: q.type as QuizQuestionType,
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          sourceExcerpt: q.sourceExcerpt,
          explanation: q.explanation,
          rubricKeywords: q.rubricKeywords || [],
          isVisual: q.isVisual,
          visualReference: q.visualReference,
          visualDataUrl: q.visualDataUrl,
          pageOrSlide: q.pageOrSlide,
          sourceDoc: q.sourceDoc,
          tableContext: q.tableContext,
          questionCategory: q.questionCategory,
        })),
        quizStats: {
          totalAttempts: 0,
          bestScore: 0,
          lastScore: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveNewReviewer(newReviewer);

      // Also persist the uploaded file into the folder's document library
      if (inputMode === "upload" && parsedDoc) {
        const folderDoc: FolderDocument = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          folderId: selectedFolderId,
          name: parsedDoc.fileName,
          fileType: parsedDoc.fileType,
          sizeBytes: parsedDoc.sizeBytes || contentText.length,
          text: contentText,
          pageOrSlideCount: parsedDoc.pageOrSlideCount,
          pdfBase64: parsedDoc.pdfBase64,
          extractedVisuals: parsedDoc.extractedVisuals,
          uploadedAt: new Date().toISOString(),
        };
        addFolderDocument(folderDoc);
      }

      onReviewerCreated(newReviewer);
    } catch (err: any) {
      const friendlyMsg = formatUserFriendlyGenerationError(
        err,
        "Create Reviewer Generation"
      );
      setGenerationError(friendlyMsg);
      setIsGenerating(false);
    }
  };

  const activeContentLength = inputMode === "upload" ? parsedDoc?.text?.length || 0 : pastedNotes.length;
  const wordCount = activeContentLength > 0 ? (inputMode === "upload" ? parsedDoc?.text : pastedNotes)?.split(/\s+/).filter(Boolean).length || 0 : 0;

  return (
    <div
      id="create-reviewer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto"
    >
      <div
        id="create-reviewer-card"
        className="relative w-full max-w-2xl my-auto rounded-2xl bg-[#0B152E] border border-blue-500/30 p-5 sm:p-7 shadow-2xl shadow-blue-950 text-white"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5 border-b border-blue-900/40 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Create Grounded Reviewer
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Upload documents or paste notes. Flashcards and quizzes are generated{" "}
              <strong className="text-blue-300">ONLY from your content</strong>.
            </p>
          </div>

          <button
            id="btn-close-create-reviewer"
            onClick={onCancel}
            disabled={isGenerating}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isGenerating ? (
          /* Animated Generating View */
          <div
            id="reviewer-generating-view"
            className="py-12 px-4 text-center space-y-5"
          >
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
              <div className="w-20 h-20 rounded-full bg-blue-600/20 border-2 border-blue-400 flex items-center justify-center animate-spin">
                <Sparkles className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                Synthesizing Grounded Reviewer
              </h3>
              <p className="text-sm text-blue-300 font-medium animate-pulse">
                {generationStep}
              </p>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-xl bg-[#070D1E]/80 border border-blue-500/20 text-xs text-slate-300 text-left space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Grounding Verification in Progress</span>
              </div>
              <p className="text-[11px] text-slate-400">
                • Verifying zero hallucinations and zero external trivia.
                <br />
                • Pairing every flashcard & quiz question with verbatim source citations.
              </p>
            </div>
          </div>
        ) : (
          /* Main Create Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Step 1: Subject Folder Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
                  Target Subject Folder <span className="text-blue-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={onOpenCreateFolder}
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                >
                  + New Folder
                </button>
              </div>

              {folders.length === 0 ? (
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
                  <span className="text-xs text-slate-300">
                    No folders created yet. Please create a subject folder first.
                  </span>
                  <button
                    type="button"
                    onClick={onOpenCreateFolder}
                    className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                  >
                    Create Subject
                  </button>
                </div>
              ) : (
                <select
                  id="select-reviewer-folder"
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1E] border border-blue-500/30 text-white focus:outline-none focus:border-blue-400 text-sm cursor-pointer"
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Step 2: Content Source Tabs (Upload vs Paste) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInputMode("upload")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      inputMode === "upload"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                        : "bg-[#070D1E] text-slate-400 hover:text-white border border-blue-900/30"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File (PDF, PPTX, DOCX)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputMode("paste")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      inputMode === "paste"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                        : "bg-[#070D1E] text-slate-400 hover:text-white border border-blue-900/30"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Paste Notes</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={loadSampleNotes}
                  className="text-[11px] text-blue-400 hover:text-blue-300 underline font-medium"
                >
                  Load Sample Notes
                </button>
              </div>

              {inputMode === "upload" ? (
                /* File Upload Zone */
                <div className="space-y-3">
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="relative border-2 border-dashed border-blue-500/30 hover:border-blue-400/60 rounded-2xl p-6 text-center bg-[#070D1E]/60 transition-colors"
                  >
                    <input
                      id="input-file-uploader"
                      type="file"
                      accept=".pdf,.docx,.pptx,.txt,.md"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    {isParsingFile ? (
                      <div className="flex flex-col items-center gap-2 py-4">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        <p className="text-xs text-slate-300">Extracting content from document...</p>
                      </div>
                    ) : parsedDoc ? (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white line-clamp-1">{parsedDoc.fileName}</p>
                          <p className="text-xs text-emerald-400 font-medium mt-0.5">
                            Ready • {parsedDoc.sourceType.toUpperCase()} • ~{wordCount.toLocaleString()} words
                            {parsedDoc.pageOrSlideCount
                              ? ` • ${parsedDoc.pageOrSlideCount} ${
                                  parsedDoc.sourceType === "pptx" ? "slides" : "pages"
                                }`
                              : ""}
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-400 underline cursor-pointer mt-1">
                          Click or drag another file to replace
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Drag & drop your study document here
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Supports <strong className="text-blue-300">PDF, PPTX (PowerPoint), DOCX (Word), TXT</strong>
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold mt-1">
                          Browse Files
                        </span>
                      </div>
                    )}
                  </div>

                  {parseError && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                      <span>{parseError}</span>
                    </div>
                  )}

                  {parsedDoc && (
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span>Extracted: {parsedDoc.text.length.toLocaleString()} characters</span>
                      <button
                        type="button"
                        onClick={() => setShowExtractedPreview(!showExtractedPreview)}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{showExtractedPreview ? "Hide Preview" : "Preview Extracted Text"}</span>
                      </button>
                    </div>
                  )}

                  {showExtractedPreview && parsedDoc && (
                    <div className="p-3 rounded-xl bg-[#070D1E] border border-blue-900/40 max-h-40 overflow-y-auto text-xs font-mono text-slate-300 whitespace-pre-wrap">
                      {parsedDoc.text.slice(0, 2000)}
                      {parsedDoc.text.length > 2000 && "\n... [Content truncated for preview]"}
                    </div>
                  )}
                </div>
              ) : (
                /* Pasted Notes Textarea */
                <div>
                  <textarea
                    id="textarea-pasted-notes"
                    rows={6}
                    placeholder="Paste your lecture notes, textbook chapters, summaries, or bullet points here..."
                    value={pastedNotes}
                    onChange={(e) => setPastedNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070D1E] border border-blue-500/30 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400 text-xs sm:text-sm leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-1 px-1">
                    <span>
                      {wordCount.toLocaleString()} words ({pastedNotes.length.toLocaleString()} characters)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Recommendation: 150+ words for optimal reviewers
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Title Hint */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reviewer Title (Optional)
              </label>
              <input
                id="input-reviewer-title"
                type="text"
                placeholder="e.g. Synaptic Transmission, Microeconomics Chapter 3"
                value={titleHint}
                onChange={(e) => setTitleHint(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#070D1E] border border-blue-500/30 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400 text-xs sm:text-sm"
              />
            </div>

            {/* Step 3: Generation Options (Flashcards, Quizzes) */}
            <div className="p-4 rounded-xl bg-[#070D1E]/70 border border-blue-500/20 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300 uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5" />
                <span>Grounded Generation Settings</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Flashcard count */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                    <span className="font-medium flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      Flashcard Count
                    </span>
                    <strong className="text-white bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                      {flashcardCount} cards
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step={1}
                    value={flashcardCount}
                    onChange={(e) => setFlashcardCount(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>5</span>
                    <span>10</span>
                    <span>15</span>
                    <span>20</span>
                  </div>
                </div>

                {/* Quiz questions count - Progressive Question Bank */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                    <span className="font-medium flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                      Progressive Question Bank
                    </span>
                    <strong className="text-white bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                      {quizCount} questions ({Math.max(1, Math.ceil(quizCount / 10))} Sets of 10)
                    </strong>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[10, 20, 30, 40].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setQuizCount(count)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                          quizCount === count
                            ? "bg-blue-600 text-white border-blue-400 shadow-sm"
                            : "bg-[#070D1E] text-slate-400 border-blue-900/40 hover:text-white"
                        }`}
                      >
                        {count} Qs ({count / 10} {count / 10 === 1 ? "Set" : "Sets"})
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={50}
                    step={10}
                    value={quizCount}
                    onChange={(e) => setQuizCount(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>10 (Set 1)</span>
                    <span>20 (Sets 1-2)</span>
                    <span>30 (Sets 1-3)</span>
                    <span>50 (Sets 1-5)</span>
                  </div>
                </div>
              </div>

              {/* Question Types */}
              <div>
                <span className="block text-xs text-slate-300 font-medium mb-1.5">
                  Question Formats to Include:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: "multiple_choice", label: "Multiple Choice" },
                    { id: "true_false", label: "True / False" },
                    { id: "identification", label: "Identification" },
                  ].map((item) => {
                    const active = selectedQuizTypes.includes(item.id as QuizQuestionType);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleQuizType(item.id as QuizQuestionType)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          active
                            ? "bg-blue-600/40 text-blue-200 border-blue-400"
                            : "bg-[#070D1E] text-slate-500 border-blue-900/30 hover:text-slate-300"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Strict Grounding Guarantee Box */}
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-300 leading-relaxed">
                <strong className="text-white block font-semibold">Strict Grounding Guarantee:</strong>
                All flashcards and quiz questions will be derived solely from your uploaded text.
                No outside knowledge or invented facts will be added, and every item includes a
                verbatim quotation from your source.
              </div>
            </div>

            {generationError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>
                  {typeof generationError === "string" && generationError !== "[object Object]"
                    ? generationError
                    : "The AI service is experiencing a temporary issue. Please click Generate again in a few moments."}
                </span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-slate-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>

              <button
                id="btn-submit-generate-reviewer"
                type="submit"
                disabled={activeContentLength === 0 || !selectedFolderId}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Grounded Reviewer</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
