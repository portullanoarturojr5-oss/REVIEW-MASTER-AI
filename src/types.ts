export interface SubjectFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export type MasteryLevel = "new" | "learning" | "mastered";

export interface ExtractedVisual {
  id: string;
  title: string;
  type: "diagram" | "flowchart" | "table" | "illustration" | "figure" | "concept_map";
  pageOrSlide?: number;
  dataUrl?: string; // Base64 data URL for display
  description?: string;
  sourceExcerpt?: string;
  sourceDoc?: string;
}

export interface ComparisonTable {
  title?: string;
  headers: string[];
  rows: string[][];
  summary?: string;
  pageOrSlide?: number;
}

export interface StudyNoteSection {
  id: string;
  heading: string;
  definition: string;
  explanation: string;
  diagramSummary?: string; // Describe what the diagram shows using only visible information
  visualReference?: string;
  visualDataUrl?: string;
  pageOrSlide?: number;
  sourceExcerpt?: string;
  comparisonTable?: ComparisonTable;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  sourceExcerpt: string;
  category?: string;
  mastery: MasteryLevel;
  lastReviewed?: string;
  // Version 1.1 Visual Learning enhancements
  isVisual?: boolean;
  visualReference?: string;
  visualDataUrl?: string;
  pageOrSlide?: number;
  sourceDoc?: string;
}

export type QuizQuestionType =
  | "multiple_choice"
  | "true_false"
  | "identification"
  | "short_answer";

export type QuestionCategory =
  | "standard"
  | "visual"
  | "table_comparison"
  | "classification";

export interface QuizQuestionItem {
  id: string;
  type: QuizQuestionType;
  question: string;
  options: string[]; // Options for multiple choice; ['True', 'False'] for true/false; empty for identification/short_answer
  correctAnswer: string;
  sourceExcerpt: string;
  explanation: string;
  rubricKeywords?: string[]; // Key concepts for short answer grading
  userAnswer?: string;
  isCorrect?: boolean;
  // Version 1.1 Visual Learning & Table Understanding enhancements
  isVisual?: boolean;
  visualReference?: string;
  visualDataUrl?: string;
  pageOrSlide?: number;
  sourceDoc?: string;
  tableContext?: string | ComparisonTable;
  questionCategory?: QuestionCategory;
}

export interface ProgressiveSetScore {
  setNumber: number;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;
}

export interface QuizStats {
  totalAttempts: number;
  bestScore: number;
  lastScore: number;
  lastTakenAt?: string;
  setScores?: Record<number, ProgressiveSetScore>;
}

export interface Reviewer {
  id: string;
  folderId: string;
  title: string;
  summary: string;
  sourceType: "notes" | "pdf" | "pptx" | "docx";
  sourceFileName?: string;
  rawContent: string;
  keyConcepts: string[];
  studyNotes?: StudyNoteSection[];
  extractedVisuals?: ExtractedVisual[];
  flashcards: FlashcardItem[];
  quizQuestions: QuizQuestionItem[];
  quizStats: QuizStats;
  createdAt: string;
  updatedAt: string;
}

export type ActiveTab = "library" | "folders" | "flashcards" | "quiz" | "create";

export type DocumentFileType = "pdf" | "pptx" | "docx" | "txt";

export interface FolderDocument {
  id: string;
  folderId: string;
  name: string;
  fileType: DocumentFileType;
  sizeBytes: number;
  text: string;
  pageOrSlideCount?: number;
  uploadedAt: string;
  pdfBase64?: string;
  extractedVisuals?: ExtractedVisual[];
}

export interface GenerationOptions {
  flashcardCount: number;
  quizCount: number;
  quizTypes: QuizQuestionType[];
}
