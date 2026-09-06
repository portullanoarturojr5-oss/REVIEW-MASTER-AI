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

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  sourceExcerpt: string;
  category?: string;
  mastery: MasteryLevel;
  lastReviewed?: string;
}

export type QuizQuestionType =
  | "multiple_choice"
  | "true_false"
  | "identification"
  | "short_answer";

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
}

export interface GenerationOptions {
  flashcardCount: number;
  quizCount: number;
  quizTypes: QuizQuestionType[];
}
