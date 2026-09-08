import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  BookOpen,
  ArrowRight,
  Quote,
  Layers,
  Award,
  ShieldCheck,
  Check,
  X,
  Zap,
  FileText,
  AlertCircle,
  Plus,
  Play,
  Trophy,
  Workflow,
  Table as TableIcon,
  Maximize2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Reviewer, QuizQuestionItem, ProgressiveSetScore, IdentificationGradingResult } from "../types";
import { recordQuizResult, recordProgressiveQuizResult, getSetScores, resetSetScores } from "../utils/storage";
import {
  gradeIdentificationAnswer,
  gradeIdentificationAnswerLocally,
} from "../utils/identificationEvaluator";

interface QuizModeProps {
  reviewers: Reviewer[];
  activeReviewerId: string | null;
  onSelectReviewer: (id: string) => void;
  onSwitchToFlashcards: (reviewerId: string) => void;
  onViewSourceNotes: (reviewer: Reviewer) => void;
  onOpenGenerateMaterials?: (reviewer: Reviewer) => void;
  onQuizCompleted: () => void;
}

export const QuizMode: React.FC<QuizModeProps> = ({
  reviewers,
  activeReviewerId,
  onSelectReviewer,
  onSwitchToFlashcards,
  onViewSourceNotes,
  onOpenGenerateMaterials,
  onQuizCompleted,
}) => {
  const currentReviewer =
    reviewers.find((r) => r.id === activeReviewerId) || reviewers[0] || null;

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [identificationInput, setIdentificationInput] = useState("");
  const [identificationGrades, setIdentificationGrades] = useState<Record<number, IdentificationGradingResult>>({});
  const [isGradingIdentification, setIsGradingIdentification] = useState(false);
  const [shortAnswerInput, setShortAnswerInput] = useState("");
  const [selfGradedOverrides, setSelfGradedOverrides] = useState<Record<number, boolean>>({});
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState<"instant" | "exam">("instant");
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [filterReview, setFilterReview] = useState<"all" | "incorrect">("all");
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // Progressive Quiz Sets (10 questions per set, unique questions without repetition)
  const SET_SIZE = 10;
  const [activeSetNumber, setActiveSetNumber] = useState<number>(1);
  const [setScores, setSetScores] = useState<Record<number, ProgressiveSetScore>>({});
  const [allQuestionsMode, setAllQuestionsMode] = useState<boolean>(false);

  // Load saved set scores whenever reviewer changes
  useEffect(() => {
    if (currentReviewer) {
      const scores = getSetScores(currentReviewer.id);
      setSetScores(scores);
      const totalS = Math.max(1, Math.ceil((currentReviewer.quizQuestions || []).length / SET_SIZE));
      let firstUncompleted = 1;
      for (let i = 1; i <= totalS; i++) {
        if (!scores[i]) {
          firstUncompleted = i;
          break;
        }
      }
      setActiveSetNumber(firstUncompleted);
      setAllQuestionsMode(false);
      resetQuiz();
    }
  }, [currentReviewer?.id]);

  const rawQuestions: QuizQuestionItem[] = currentReviewer?.quizQuestions || [];
  const totalSets = Math.max(1, Math.ceil(rawQuestions.length / SET_SIZE));
  const safeActiveSet = Math.min(Math.max(1, activeSetNumber), totalSets);
  const completedSetsCount = Object.keys(setScores).filter(
    (k) => Number(k) <= totalSets
  ).length;

  // Divide question bank into unique sets of 10 questions without repetition:
  const startIndex = (safeActiveSet - 1) * SET_SIZE;
  const endIndex = Math.min(startIndex + SET_SIZE, rawQuestions.length);
  const questions: QuizQuestionItem[] = allQuestionsMode
    ? rawQuestions
    : rawQuestions.slice(startIndex, endIndex);

  const currentQuestion: QuizQuestionItem | null =
    questions[currentQuestionIdx] || questions[0] || null;

  const handleSelectSet = (setNum: number) => {
    setAllQuestionsMode(false);
    setActiveSetNumber(setNum);
    resetQuiz();
  };

  const handleStartNextSet = (nextSetNumber: number) => {
    setAllQuestionsMode(false);
    setActiveSetNumber(nextSetNumber);
    resetQuiz();
  };

  const handleRestartAllSets = () => {
    if (currentReviewer) {
      resetSetScores(currentReviewer.id);
      setSetScores({});
    }
    setAllQuestionsMode(false);
    setActiveSetNumber(1);
    resetQuiz();
  };

  const handleToggleAllMode = (enableAll: boolean) => {
    setAllQuestionsMode(enableAll);
    resetQuiz();
  };

  const resetQuiz = () => {
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setIdentificationInput("");
    setIdentificationGrades({});
    setIsGradingIdentification(false);
    setShortAnswerInput("");
    setSelfGradedOverrides({});
    setIsAnswerSubmitted(false);
    setQuizCompleted(false);
  };

  const getIdentificationGrade = (
    question: QuizQuestionItem,
    userAnswer?: string,
    questionIdx?: number
  ): IdentificationGradingResult => {
    if (questionIdx !== undefined && identificationGrades[questionIdx]) {
      return identificationGrades[questionIdx];
    }
    return gradeIdentificationAnswerLocally(
      question.correctAnswer,
      userAnswer || "",
      question.question,
      question.sourceExcerpt
    );
  };

  const isAnswerPartiallyCorrect = (
    question: QuizQuestionItem,
    userAnswer?: string,
    questionIdx?: number
  ): boolean => {
    if (question.type !== "identification") return false;
    if (questionIdx !== undefined && selfGradedOverrides[questionIdx] !== undefined) {
      return false;
    }
    if (!userAnswer || !userAnswer.trim()) return false;
    const grade = getIdentificationGrade(question, userAnswer.trim(), questionIdx);
    return grade.scorePercent >= 60 && grade.scorePercent < 75;
  };

  const calculateScores = () => {
    let earnedPoints = 0;
    let fullyCorrectCount = 0;
    let partiallyCorrectCount = 0;

    questions.forEach((q, idx) => {
      const userAns = selectedAnswers[idx];
      if (selfGradedOverrides[idx] !== undefined) {
        if (selfGradedOverrides[idx]) {
          earnedPoints += 1;
          fullyCorrectCount += 1;
        }
        return;
      }

      if (q.type === "identification") {
        const grade = getIdentificationGrade(q, userAns, idx);
        if (grade.scorePercent >= 75) {
          earnedPoints += 1;
          fullyCorrectCount += 1;
        } else if (grade.scorePercent >= 60) {
          earnedPoints += 0.5;
          partiallyCorrectCount += 1;
        }
      } else {
        if (isAnswerCorrect(q, userAns, idx)) {
          earnedPoints += 1;
          fullyCorrectCount += 1;
        }
      }
    });

    const scorePercent =
      questions.length > 0
        ? Math.min(100, Math.round((earnedPoints / questions.length) * 100))
        : 0;

    return {
      earnedPoints,
      fullyCorrectCount,
      partiallyCorrectCount,
      scorePercent,
    };
  };

  const handleSelectOption = (option: string) => {
    if (isAnswerSubmitted && feedbackMode === "instant") return;

    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIdx]: option,
    }));

    setIsAnswerSubmitted(true);
  };

  const handleIdentificationSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identificationInput.trim()) return;

    const trimmed = identificationInput.trim();
    const qIdx = currentQuestionIdx;
    const currentQ = currentQuestion;

    setSelectedAnswers((prev) => ({
      ...prev,
      [qIdx]: trimmed,
    }));

    // Immediate local evaluation for zero lag
    const localGrade = gradeIdentificationAnswerLocally(
      currentQ.correctAnswer,
      trimmed,
      currentQ.question,
      currentQ.sourceExcerpt
    );

    setIdentificationGrades((prev) => ({
      ...prev,
      [qIdx]: localGrade,
    }));

    setIsAnswerSubmitted(true);

    if (localGrade.scorePercent >= 98 || localGrade.scorePercent <= 20 || feedbackMode === "exam") {
      return;
    }

    setIsGradingIdentification(true);
    try {
      const aiGrade = await gradeIdentificationAnswer({
        question: currentQ.question,
        groundedAnswer: currentQ.correctAnswer,
        studentAnswer: trimmed,
        sourceExcerpt: currentQ.sourceExcerpt,
      });

      setIdentificationGrades((prev) => ({
        ...prev,
        [qIdx]: aiGrade,
      }));
    } catch (_err) {
      // Local grade is already safely preserved
    } finally {
      setIsGradingIdentification(false);
    }
  };

  const handleShortAnswerSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!shortAnswerInput.trim()) return;

    const trimmed = shortAnswerInput.trim();
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIdx]: trimmed,
    }));

    setIsAnswerSubmitted(true);
  };

  const handleNextQuestion = () => {
    // Save any typed answer before advancing
    if (currentQuestion?.type === "identification" && identificationInput.trim()) {
      const trimmed = identificationInput.trim();
      setSelectedAnswers((prev) => ({
        ...prev,
        [currentQuestionIdx]: trimmed,
      }));
      if (!identificationGrades[currentQuestionIdx]) {
        const localGrade = gradeIdentificationAnswerLocally(
          currentQuestion.correctAnswer,
          trimmed,
          currentQuestion.question,
          currentQuestion.sourceExcerpt
        );
        setIdentificationGrades((prev) => ({
          ...prev,
          [currentQuestionIdx]: localGrade,
        }));
      }
    } else if (currentQuestion?.type === "short_answer" && shortAnswerInput.trim()) {
      setSelectedAnswers((prev) => ({
        ...prev,
        [currentQuestionIdx]: shortAnswerInput.trim(),
      }));
    }

    if (currentQuestionIdx < questions.length - 1) {
      const nextIdx = currentQuestionIdx + 1;
      setCurrentQuestionIdx(nextIdx);
      const nextAns = selectedAnswers[nextIdx];
      setIsAnswerSubmitted(Boolean(nextAns && nextAns.trim().length > 0));
      setIdentificationInput(nextAns || "");
      setShortAnswerInput(nextAns || "");
    } else {
      finishQuiz();
    }
  };

  const isAnswerCorrect = (
    question: QuizQuestionItem,
    userAnswer?: string,
    questionIdx?: number
  ): boolean => {
    if (questionIdx !== undefined && selfGradedOverrides[questionIdx] !== undefined) {
      return selfGradedOverrides[questionIdx];
    }

    if (!userAnswer || !userAnswer.trim()) return false;
    const cleanUser = userAnswer.trim();
    const cleanCorrect = question.correctAnswer.trim();

    // Intelligent Identification Grading based on meaning
    if (question.type === "identification") {
      const grade = getIdentificationGrade(question, cleanUser, questionIdx);
      // 90–100% -> Correct, 75–89% -> Correct (same meaning)
      return grade.scorePercent >= 75;
    }

    const cleanUserLower = cleanUser.toLowerCase();
    const cleanCorrectLower = cleanCorrect.toLowerCase();

    if (cleanUserLower === cleanCorrectLower) return true;

    // Fuzzy check for minor punctuation or pluralization
    const stripPunct = (s: string) => s.replace(/[^a-z0-9]/g, "");
    if (stripPunct(cleanUserLower) === stripPunct(cleanCorrectLower)) return true;

    // True/False normalized check
    if (question.type === "true_false") {
      const isUserTrue = cleanUserLower.startsWith("t");
      const isCorrectTrue = cleanCorrectLower.startsWith("t");
      return isUserTrue === isCorrectTrue;
    }

    // Short answer evaluation
    if (question.type === "short_answer") {
      // Check rubric keywords if present
      if (question.rubricKeywords && question.rubricKeywords.length > 0) {
        let matchedKeywords = 0;
        question.rubricKeywords.forEach((kw) => {
          if (cleanUserLower.includes(kw.toLowerCase().trim())) {
            matchedKeywords++;
          }
        });
        if (matchedKeywords >= Math.ceil(question.rubricKeywords.length * 0.5)) {
          return true;
        }
      }

      // Check overlap of significant words with the model answer
      const modelWords = cleanCorrectLower
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .map(stripPunct);
      let overlap = 0;
      modelWords.forEach((w) => {
        if (cleanUserLower.includes(w)) overlap++;
      });
      if (modelWords.length > 0 && overlap / modelWords.length >= 0.4) {
        return true;
      }
    }

    return false;
  };

  const finishQuiz = () => {
    setQuizCompleted(true);

    const { scorePercent, earnedPoints } = calculateScores();

    if (currentReviewer) {
      if (!allQuestionsMode) {
        recordProgressiveQuizResult(
          currentReviewer.id,
          safeActiveSet,
          scorePercent,
          Math.round(earnedPoints),
          questions.length
        );
        const updatedScores = getSetScores(currentReviewer.id);
        setSetScores(updatedScores);
      } else {
        recordQuizResult(currentReviewer.id, scorePercent);
      }
      onQuizCompleted();
    }

    if (scorePercent >= 75) {
      try {
        confetti({
          particleCount: 75,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#2563EB", "#60A5FA", "#10B981", "#F59E0B"],
        });
      } catch {
        // ignore
      }
    }
  };

  if (!currentReviewer) {
    return (
      <div className="rounded-3xl border border-blue-500/20 bg-[#0E1A38]/50 p-8 sm:p-12 text-center text-slate-400">
        <HelpCircle className="w-12 h-12 mx-auto mb-3 text-blue-400" />
        <h3 className="text-lg font-bold text-white mb-1">No Reviewers Available</h3>
        <p className="text-xs sm:text-sm text-slate-300">
          Upload documents or paste notes to generate grounded quizzes.
        </p>
      </div>
    );
  }

  if (rawQuestions.length === 0) {
    return (
      <div className="rounded-3xl border border-blue-500/20 bg-[#0E1A38]/50 p-8 sm:p-12 text-center text-slate-400 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-900/40 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
          <HelpCircle className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-1">No Practice Quiz Generated Yet</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
            Generate your grounded practice quiz directly from this reviewer's notes (Multiple Choice, True/False, Identification, and Short Answer).
          </p>
        </div>
        {onOpenGenerateMaterials && (
          <button
            onClick={() => onOpenGenerateMaterials(currentReviewer)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 border border-blue-400/40 transition-all"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Generate Study Materials</span>
          </button>
        )}
      </div>
    );
  }

  // Final Results Screen
  if (quizCompleted) {
    const { earnedPoints, fullyCorrectCount, partiallyCorrectCount, scorePercent } = calculateScores();

    const questionsToDisplay = questions.filter((q, idx) => {
      if (filterReview === "incorrect") {
        return !isAnswerCorrect(q, selectedAnswers[idx], idx);
      }
      return true;
    });

    const hasNextSet = !allQuestionsMode && safeActiveSet < totalSets;
    const isBankExhausted = !allQuestionsMode && safeActiveSet >= totalSets;

    return (
      <div id="quiz-results-screen" className="max-w-3xl mx-auto space-y-6">
        {/* Progressive Sets Track & Progress Indicator */}
        <div className="rounded-3xl bg-[#091228] border border-blue-500/25 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/25 border border-blue-400/40 flex items-center justify-center text-blue-300">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Progressive Sets Progress</span>
                  <span className="text-xs font-semibold text-blue-400 normal-case bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-800/40">
                    {completedSetsCount} of {totalSets} Sets Completed
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Unique 10-question sets without repetition until question bank is exhausted
                </p>
              </div>
            </div>

            {/* Overall Bank Progress Bar */}
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <div className="w-28 sm:w-36 h-2 rounded-full bg-blue-950 border border-blue-900/50 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((completedSetsCount / totalSets) * 100))}%` }}
                />
              </div>
              <span className="font-bold text-emerald-400">
                {Math.round((completedSetsCount / totalSets) * 100)}%
              </span>
            </div>
          </div>

          {/* Set Scores Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {Array.from({ length: totalSets }).map((_, i) => {
              const setNum = i + 1;
              const setScore = setScores[setNum];
              const isCurrent = !allQuestionsMode && safeActiveSet === setNum;
              const isDone = Boolean(setScore);

              return (
                <button
                  key={setNum}
                  type="button"
                  onClick={() => handleSelectSet(setNum)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-blue-600/30 border-blue-400 ring-1 ring-blue-400"
                      : isDone
                      ? "bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-400"
                      : "bg-[#060D1E] border-blue-900/30 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Set {setNum}</span>
                    {isDone ? (
                      <span className="text-[11px] font-extrabold text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        {setScore.scorePercent}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Pending</span>
                    )}
                  </div>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    Questions {(setNum - 1) * SET_SIZE + 1}–{Math.min(setNum * SET_SIZE, rawQuestions.length)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Up Next: Offer Next Progressive Set Card */}
        {hasNextSet && (
          <div
            id="card-next-progressive-set"
            className="rounded-3xl bg-gradient-to-r from-blue-950/90 via-[#0E204A] to-blue-950/90 border-2 border-emerald-500/50 p-6 sm:p-7 shadow-2xl shadow-emerald-950/40 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Up Next
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    Set {safeActiveSet} Complete ({scorePercent}%)
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  Ready for Set {safeActiveSet + 1}?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                  Set {safeActiveSet + 1} contains <strong>10 unique questions</strong> (Questions {safeActiveSet * SET_SIZE + 1} to {Math.min((safeActiveSet + 1) * SET_SIZE, rawQuestions.length)}) directly grounded in your notes with <strong>zero repetition</strong>.
                </p>
              </div>

              <button
                id="btn-start-next-set"
                onClick={() => handleStartNextSet(safeActiveSet + 1)}
                className="shrink-0 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 border border-emerald-400/50 transition-all cursor-pointer"
              >
                <span>Start Set {safeActiveSet + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Bank Exhausted Celebration Card */}
        {isBankExhausted && (
          <div
            id="card-bank-exhausted"
            className="rounded-3xl bg-gradient-to-r from-amber-950/60 via-[#1F1E38] to-emerald-950/60 border-2 border-amber-400/40 p-6 sm:p-7 text-center shadow-2xl space-y-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto text-amber-300">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/40">
                🎉 Question Bank Exhausted
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-2 mb-1">
                All {totalSets} Progressive Sets Completed!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
                You have completed every available question in the question bank without repeating questions across sets.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              <button
                id="btn-restart-progressive-sets"
                onClick={handleRestartAllSets}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart from Set 1</span>
              </button>

              {onOpenGenerateMaterials && (
                <button
                  id="btn-expand-bank"
                  onClick={() => onOpenGenerateMaterials(currentReviewer)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white font-bold text-xs shadow-md border border-emerald-400/40 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate More Sets (+10 / +20 Questions)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Score Summary Card */}
        <div className="rounded-3xl bg-gradient-to-b from-[#0E1A38] to-[#0A1229] border-2 border-blue-500/30 p-6 sm:p-8 text-center shadow-2xl shadow-blue-950/80">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center mx-auto mb-4 text-blue-400">
            {scorePercent >= 80 ? (
              <Award className="w-8 h-8 text-emerald-400" />
            ) : scorePercent >= 60 ? (
              <Sparkles className="w-8 h-8 text-blue-400" />
            ) : (
              <HelpCircle className="w-8 h-8 text-amber-400" />
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">
            {allQuestionsMode ? "Full Bank Exam Completed!" : `Set ${safeActiveSet} Completed!`}
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            {currentReviewer.title} • {allQuestionsMode ? `All ${questions.length} Questions` : `Set ${safeActiveSet} of ${totalSets} (Questions ${startIndex + 1} to ${endIndex})`}
          </p>

          <div className="flex items-center justify-center gap-8 mb-6">
            <div>
              <span className="text-4xl sm:text-5xl font-extrabold text-blue-400">
                {scorePercent}%
              </span>
              <p className="text-xs text-slate-400 mt-1">
                {allQuestionsMode ? "Exam Score" : `Set ${safeActiveSet} Score`}
              </p>
            </div>

            <div className="w-px h-12 bg-blue-900/40" />

            <div>
              <span className="text-4xl sm:text-5xl font-extrabold text-white">
                {partiallyCorrectCount > 0 ? `${earnedPoints}` : `${fullyCorrectCount}`}/{questions.length}
              </span>
              <p className="text-xs text-slate-400 mt-1">
                {partiallyCorrectCount > 0
                  ? `${fullyCorrectCount} Correct • ${partiallyCorrectCount} Partial`
                  : "Correct Answers"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={resetQuiz}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake {allQuestionsMode ? "Exam" : `Set ${safeActiveSet}`}</span>
            </button>

            <button
              onClick={() => onSwitchToFlashcards(currentReviewer.id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#070D1E] hover:bg-blue-900/30 text-blue-300 hover:text-white border border-blue-500/30 font-semibold text-xs transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>Study Flashcards</span>
            </button>

            {onOpenGenerateMaterials && (
              <button
                onClick={() => onOpenGenerateMaterials(currentReviewer)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs shadow-md border border-blue-400/40 transition-all"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Generate Study Materials</span>
              </button>
            )}
          </div>
        </div>

        {/* Detailed Grounded Explanations Review */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Quote className="w-4 h-4 text-blue-400" />
              <span>Grounded Explanations & Citations ({questionsToDisplay.length})</span>
            </h3>

            <div className="flex items-center gap-1 bg-[#0C1733] border border-blue-500/20 rounded-xl p-1 text-xs">
              <button
                onClick={() => setFilterReview("all")}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterReview === "all"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All ({questions.length})
              </button>
              <button
                onClick={() => setFilterReview("incorrect")}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterReview === "incorrect"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Incorrect ({questions.length - correctCount})
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {questionsToDisplay.map((q, idx) => {
              const actualIdx = questions.indexOf(q);
              const userAns = selectedAnswers[actualIdx];
              const isCorrect = isAnswerCorrect(q, userAns, actualIdx);

              return (
                <div
                  key={q.id || idx}
                  className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                    isCorrect
                      ? "bg-[#0B1736]/70 border-emerald-500/30"
                      : "bg-[#1A0E1C]/70 border-red-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isCorrect
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {actualIdx + 1}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/40">
                        {q.type === "true_false" ? "True / False" : q.type.replace("_", " ")}
                      </span>
                      {(q.isVisual || q.visualReference || q.questionCategory === "visual") && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 flex items-center gap-1">
                          <Workflow className="w-3 h-3 text-cyan-400" />
                          <span>Visual Learning</span>
                        </span>
                      )}
                      {(q.tableContext || q.questionCategory === "table_comparison") && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 flex items-center gap-1">
                          <TableIcon className="w-3 h-3 text-indigo-400" />
                          <span>Table Comparison</span>
                        </span>
                      )}
                      {q.pageOrSlide && (
                        <span className="text-[10px] text-slate-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/40">
                          P.{q.pageOrSlide}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-xs font-bold flex items-center gap-1 ${
                        isCorrect ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Correct</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5" />
                          <span>Incorrect</span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-white mb-3">{q.question}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                    <div className="p-2.5 rounded-xl bg-[#060B19]/80 border border-blue-900/40">
                      <span className="text-slate-400 block mb-0.5 font-medium">Your Answer:</span>
                      <span className={isCorrect ? "text-emerald-300 font-semibold" : "text-red-300 font-semibold"}>
                        {userAns || <em className="text-slate-500">No answer provided</em>}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#060B19]/80 border border-emerald-900/40">
                      <span className="text-slate-400 block mb-0.5 font-medium">Correct Grounded Answer:</span>
                      <span className="text-emerald-300 font-semibold">{q.correctAnswer}</span>
                    </div>
                  </div>

                  {/* Visual Reference and Thumbnail if available */}
                  {q.visualReference && (
                    <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-800/50 text-xs text-cyan-300 font-medium">
                      <Workflow className="w-3.5 h-3.5" />
                      <span>Reference: {q.visualReference}</span>
                    </div>
                  )}

                  {q.visualDataUrl && (
                    <div className="mb-3 p-2.5 rounded-xl bg-black/40 border border-cyan-500/30 max-w-sm">
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-cyan-900/40 text-[11px] text-cyan-300 font-semibold">
                        <span>Diagram Visual</span>
                        <button
                          type="button"
                          onClick={() =>
                            setZoomedImage({
                              url: q.visualDataUrl!,
                              title: q.visualReference || q.question,
                            })
                          }
                          className="px-2 py-0.5 rounded bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 flex items-center gap-1 text-[10px]"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Zoom</span>
                        </button>
                      </div>
                      <img
                        src={q.visualDataUrl}
                        alt={q.visualReference || "Question Diagram"}
                        className="max-h-36 w-auto mx-auto object-contain rounded cursor-pointer"
                        onClick={() =>
                          setZoomedImage({
                            url: q.visualDataUrl!,
                            title: q.visualReference || q.question,
                          })
                        }
                      />
                    </div>
                  )}

                  {/* Table Context if available */}
                  {q.tableContext && (
                    <div className="mb-3 p-3 rounded-xl bg-[#08122B] border border-indigo-500/30 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                        <TableIcon className="w-3 h-3" />
                        <span>
                          {typeof q.tableContext === "object" ? q.tableContext.title || "Reference Table" : "Reference Table"}
                        </span>
                      </div>
                      {typeof q.tableContext === "string" ? (
                        <p className="text-xs text-slate-300 whitespace-pre-line font-mono bg-black/30 p-2 rounded-lg border border-blue-900/30">
                          {q.tableContext}
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-blue-900/40">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-blue-950/80 text-blue-300 border-b border-blue-900/50">
                                {q.tableContext.headers?.map((h, i) => (
                                  <th key={i} className="p-2 font-bold whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-900/30 text-slate-200">
                              {q.tableContext.rows?.map((row, rIdx) => (
                                <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-black/20" : "bg-transparent"}>
                                  {row.map((c, cIdx) => (
                                    <td key={cIdx} className="p-2">{c}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Verbatim Source Evidence Citation & Explanation */}
                  {q.sourceExcerpt && (
                    <div className="p-3.5 rounded-xl bg-[#060B19] border border-blue-500/25 text-xs space-y-1.5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-blue-300 uppercase tracking-wider">
                        <Quote className="w-3 h-3" />
                        <span>Verbatim Source Evidence:</span>
                      </div>
                      <p className="text-slate-300 font-serif italic leading-relaxed">
                        "{q.sourceExcerpt}"
                      </p>
                      {q.explanation && (
                        <p className="text-[11px] text-slate-400 pt-1.5 border-t border-blue-900/30">
                          <strong className="text-slate-300 font-semibold">Explanation: </strong>
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Active Question In-Progress Screen
  const currentUserAnswer = selectedAnswers[currentQuestionIdx];
  const isCurrentCorrect = isAnswerCorrect(
    currentQuestion,
    currentUserAnswer,
    currentQuestionIdx
  );

  // Calculate live score
  let answeredCount = 0;
  let liveCorrectCount = 0;
  questions.forEach((q, idx) => {
    if (selectedAnswers[idx] !== undefined) {
      answeredCount++;
      if (isAnswerCorrect(q, selectedAnswers[idx], idx)) {
        liveCorrectCount++;
      }
    }
  });

  return (
    <div id="active-quiz-view" className="max-w-3xl mx-auto space-y-5">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Practice Quiz
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">
                Live Score: <strong className="text-blue-400">{liveCorrectCount}</strong> / {answeredCount} answered
              </span>
              {answeredCount > 0 && (
                <span className="text-[11px] font-bold text-emerald-400">
                  ({Math.round((liveCorrectCount / answeredCount) * 100)}%)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Progressive Set Selector Bar */}
          <div className="flex items-center gap-1 bg-[#0C1733] border border-blue-500/20 rounded-xl p-1 text-xs">
            <span className="text-[10px] text-slate-400 px-1 font-semibold uppercase">Sets:</span>
            {Array.from({ length: totalSets }).map((_, i) => {
              const setNum = i + 1;
              const isCurrent = !allQuestionsMode && safeActiveSet === setNum;
              const isDone = Boolean(setScores[setNum]);
              return (
                <button
                  key={setNum}
                  type="button"
                  onClick={() => handleSelectSet(setNum)}
                  className={`px-2 py-0.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                    isCurrent
                      ? "bg-blue-600 text-white font-bold shadow-sm"
                      : isDone
                      ? "text-emerald-400 hover:text-emerald-300 bg-emerald-950/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title={isDone ? `Set ${setNum}: ${setScores[setNum]?.scorePercent}% scored` : `Set ${setNum}`}
                >
                  <span>S{setNum}</span>
                  {isDone && <span className="text-[9px] font-bold">✓</span>}
                </button>
              );
            })}
            {rawQuestions.length > 10 && (
              <button
                type="button"
                onClick={() => handleToggleAllMode(!allQuestionsMode)}
                className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                  allQuestionsMode
                    ? "bg-indigo-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Full bank exam mode"
              >
                All
              </button>
            )}
          </div>

          {/* Feedback Mode: Instant Score vs Exam Mode */}
          <div className="flex items-center gap-1 bg-[#0C1733] border border-blue-500/20 rounded-xl p-1 text-xs">
            <button
              onClick={() => setFeedbackMode("instant")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                feedbackMode === "instant"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Instant Score
            </button>
            <button
              onClick={() => setFeedbackMode("exam")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                feedbackMode === "exam"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Exam Mode
            </button>
          </div>

          {/* Button called Generate Study Materials */}
          {onOpenGenerateMaterials && (
            <button
              id="btn-quiz-generate-study-materials"
              onClick={() => onOpenGenerateMaterials(currentReviewer)}
              title="Generate Study Materials for this reviewer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white border border-blue-400/40 text-xs font-bold transition-all"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Generate Study Materials</span>
            </button>
          )}
        </div>
      </div>

      {/* Progressive Sets Status Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-[#0C1733] via-[#0E1F46] to-[#0C1733] border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {allQuestionsMode ? "Full Bank Review Mode" : `Progressive Set ${safeActiveSet} of ${totalSets}`}
              </span>
              {!allQuestionsMode && (
                <span className="text-[10px] text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-800/50 font-semibold">
                  Questions {startIndex + 1}–{endIndex} of {rawQuestions.length} in Bank
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {completedSetsCount === 0
                ? "Complete each 10-question set to unlock the next set with non-repeating questions."
                : `${completedSetsCount} of ${totalSets} Sets Completed (${Math.round((completedSetsCount / totalSets) * 100)}% of Bank Mastered) • Zero questions repeated.`}
            </p>
          </div>
        </div>

        {/* Set Switcher & Progress Bar */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from({ length: totalSets }).map((_, i) => {
              const setNum = i + 1;
              const isCurrent = !allQuestionsMode && safeActiveSet === setNum;
              const setScore = setScores[setNum];
              const isDone = Boolean(setScore);

              return (
                <button
                  key={setNum}
                  type="button"
                  onClick={() => handleSelectSet(setNum)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    isCurrent
                      ? "bg-blue-600 text-white ring-1 ring-blue-400 shadow-sm"
                      : isDone
                      ? "bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 hover:border-emerald-400"
                      : "bg-[#070D1E] border border-blue-900/40 text-slate-400 hover:text-white hover:border-blue-700"
                  }`}
                  title={isDone ? `Set ${setNum}: ${setScore.scorePercent}% completed` : `Set ${setNum}`}
                >
                  <span>Set {setNum}</span>
                  {isDone && (
                    <span className="text-[10px] text-emerald-400 font-bold">
                      {setScore.scorePercent}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>
            {allQuestionsMode ? "Question" : `Set ${safeActiveSet} • Question`}{" "}
            <strong className="text-blue-400">{currentQuestionIdx + 1}</strong> of{" "}
            {questions.length}
            {!allQuestionsMode && (
              <span className="text-slate-400 ml-1.5 font-normal text-[11px]">
                (Bank #{startIndex + currentQuestionIdx + 1} of {rawQuestions.length})
              </span>
            )}
          </span>
          <span className="capitalize text-slate-300 font-semibold px-2 py-0.5 rounded bg-blue-950/70 border border-blue-800/40 text-[11px]">
            {currentQuestion.type === "true_false" ? "True / False" : currentQuestion.type.replace("_", " ")}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-blue-950 overflow-hidden border border-blue-900/40">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
            style={{
              width: `${((currentQuestionIdx + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Main Question Card */}
      <div className="rounded-3xl bg-[#0D1836]/85 border-2 border-blue-500/30 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-blue-950/80 space-y-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800/40">
              Grounded Assessment
            </span>
            {(currentQuestion.isVisual || currentQuestion.visualReference || currentQuestion.questionCategory === "visual") && (
              <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/50 flex items-center gap-1">
                <Workflow className="w-3 h-3 text-cyan-400" />
                <span>Visual Learning</span>
              </span>
            )}
            {(currentQuestion.tableContext || currentQuestion.questionCategory === "table_comparison") && (
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 flex items-center gap-1">
                <TableIcon className="w-3 h-3 text-indigo-400" />
                <span>Table Comparison</span>
              </span>
            )}
            {currentQuestion.pageOrSlide && (
              <span className="text-[10px] text-slate-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/40">
                Page/Slide {currentQuestion.pageOrSlide}
              </span>
            )}
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Strict Source Mode</span>
            </span>
          </div>

          <h3 className="text-base sm:text-xl font-bold text-white mt-2 leading-relaxed">
            {currentQuestion.question}
          </h3>

          {/* Visual Reference indicator */}
          {currentQuestion.visualReference && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/70 border border-cyan-800/50 text-xs text-cyan-300 font-medium">
              <Workflow className="w-3.5 h-3.5" />
              <span>Reference: {currentQuestion.visualReference}</span>
            </div>
          )}

          {/* Diagram Preview image if available */}
          {currentQuestion.visualDataUrl && (
            <div className="mt-4 p-3 rounded-2xl bg-black/40 border border-cyan-500/35 max-w-lg">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-900/40 text-xs text-cyan-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Workflow className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Referenced Visual / Diagram</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setZoomedImage({
                      url: currentQuestion.visualDataUrl!,
                      title: currentQuestion.visualReference || currentQuestion.question,
                    })
                  }
                  className="px-2.5 py-1 rounded bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 flex items-center gap-1 text-[11px] transition-colors"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Zoom Visual</span>
                </button>
              </div>
              <img
                src={currentQuestion.visualDataUrl}
                alt={currentQuestion.visualReference || "Question Diagram"}
                className="max-h-52 w-auto mx-auto object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() =>
                  setZoomedImage({
                    url: currentQuestion.visualDataUrl!,
                    title: currentQuestion.visualReference || currentQuestion.question,
                  })
                }
              />
            </div>
          )}

          {/* Table Context if available */}
          {currentQuestion.tableContext && (
            <div className="mt-4 p-4 rounded-2xl bg-[#08122B] border border-indigo-500/35 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                <TableIcon className="w-3.5 h-3.5" />
                <span>
                  {typeof currentQuestion.tableContext === "object"
                    ? currentQuestion.tableContext.title || "Reference Table"
                    : "Reference Table"}
                </span>
              </div>
              {typeof currentQuestion.tableContext === "string" ? (
                <p className="text-xs text-slate-300 whitespace-pre-line font-mono bg-black/30 p-2.5 rounded-xl border border-blue-900/30">
                  {currentQuestion.tableContext}
                </p>
              ) : (
                <>
                  {currentQuestion.tableContext.summary && (
                    <p className="text-xs text-slate-300 italic">{currentQuestion.tableContext.summary}</p>
                  )}
                  <div className="overflow-x-auto rounded-xl border border-blue-900/40">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-blue-950/80 text-blue-300 border-b border-blue-900/50">
                          {currentQuestion.tableContext.headers?.map((h, i) => (
                            <th key={i} className="p-2.5 font-bold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-900/30 text-slate-200">
                        {currentQuestion.tableContext.rows?.map((row, rIdx) => (
                          <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-black/20" : "bg-transparent"}>
                            {row.map((c, cIdx) => (
                              <td key={cIdx} className="p-2.5">{c}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Question Options / Inputs based on format */}
        {currentQuestion.type === "identification" ? (
          /* Identification Format */
          <form onSubmit={handleIdentificationSubmit} className="space-y-3">
            <input
              id="input-identification-answer"
              type="text"
              disabled={isAnswerSubmitted && feedbackMode === "instant"}
              placeholder="Type the exact term or concept from your notes..."
              value={feedbackMode === "instant" && isAnswerSubmitted ? (currentUserAnswer || "") : identificationInput}
              onChange={(e) => {
                setIdentificationInput(e.target.value);
                if (feedbackMode === "exam" && isAnswerSubmitted && e.target.value.trim() !== currentUserAnswer) {
                  setIsAnswerSubmitted(false);
                }
              }}
              className="w-full px-4 py-3.5 rounded-2xl bg-[#070D1E] border border-blue-500/30 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-400 transition-all"
            />
            <div className="flex items-center gap-3 flex-wrap">
              {(!isAnswerSubmitted || feedbackMode === "exam") && (
                <button
                  id="btn-submit-identification"
                  type="submit"
                  disabled={!identificationInput.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  <span>Submit Answer</span>
                </button>
              )}

              {feedbackMode === "exam" && isAnswerSubmitted && currentUserAnswer && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Answer saved: "{currentUserAnswer}"</span>
                </span>
              )}
            </div>
          </form>
        ) : currentQuestion.type === "short_answer" ? (
          /* Short Answer Format */
          <form onSubmit={handleShortAnswerSubmit} className="space-y-3">
            <textarea
              id="input-short-answer"
              rows={3}
              disabled={isAnswerSubmitted && feedbackMode === "instant"}
              placeholder="Explain concisely in 1-3 sentences based directly on your notes..."
              value={feedbackMode === "instant" && isAnswerSubmitted ? (currentUserAnswer || "") : shortAnswerInput}
              onChange={(e) => {
                setShortAnswerInput(e.target.value);
                if (feedbackMode === "exam" && isAnswerSubmitted && e.target.value.trim() !== currentUserAnswer) {
                  setIsAnswerSubmitted(false);
                }
              }}
              className="w-full p-4 rounded-2xl bg-[#070D1E] border border-blue-500/30 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-400 resize-none leading-relaxed transition-all"
            />
            <div className="flex items-center gap-3 flex-wrap">
              {(!isAnswerSubmitted || feedbackMode === "exam") && (
                <button
                  id="btn-submit-short-answer"
                  type="submit"
                  disabled={!shortAnswerInput.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  <span>Submit Answer</span>
                </button>
              )}

              {feedbackMode === "exam" && isAnswerSubmitted && currentUserAnswer && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Answer saved</span>
                </span>
              )}
            </div>
          </form>
        ) : currentQuestion.type === "true_false" ? (
          /* True / False Format: Two Large Buttons */
          <div id="true-false-options" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["True", "False"] as const).map((option) => {
              const isSelected = currentUserAnswer?.toLowerCase() === option.toLowerCase();
              const isCorrectOpt = isAnswerCorrect(currentQuestion, option, currentQuestionIdx);

              let btnClass =
                "bg-[#070D1E]/90 hover:bg-[#101F47] border-blue-900/50 hover:border-blue-500/40 text-slate-200 hover:text-white";

              if (feedbackMode === "instant" && isAnswerSubmitted) {
                if (isCorrectOpt) {
                  btnClass =
                    "bg-emerald-950/85 border-emerald-400 text-emerald-100 font-bold shadow-xl shadow-emerald-950/60";
                } else if (isSelected && !isCorrectOpt) {
                  btnClass =
                    "bg-red-950/85 border-red-500 text-red-100 font-bold shadow-xl shadow-red-950/60";
                } else {
                  btnClass = "bg-[#070D1E]/40 border-slate-800/80 text-slate-500 opacity-50";
                }
              } else if (isSelected) {
                btnClass =
                  "bg-blue-600/35 border-blue-400 text-white font-bold shadow-xl shadow-blue-600/25 ring-2 ring-blue-400/50 scale-[1.01]";
              }

              return (
                <button
                  key={option}
                  id={`btn-tf-${option.toLowerCase()}`}
                  type="button"
                  onClick={() => handleSelectOption(option)}
                  disabled={isAnswerSubmitted && feedbackMode === "instant"}
                  className={`w-full min-h-[76px] sm:min-h-[88px] flex items-center justify-between px-6 py-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${btnClass} disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl sm:text-3xl select-none" role="img" aria-label={option}>
                      {option === "True" ? "✅" : "❌"}
                    </span>
                    <span className="text-lg sm:text-xl font-bold tracking-wide">
                      {option}
                    </span>
                  </div>

                  {/* Feedback or Selection Indicator */}
                  {feedbackMode === "instant" && isAnswerSubmitted ? (
                    <div>
                      {isCorrectOpt && <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />}
                      {isSelected && !isCorrectOpt && <XCircle className="w-6 h-6 text-red-400 shrink-0" />}
                    </div>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? "border-blue-400 bg-blue-500 text-white shadow-md shadow-blue-500/50"
                          : "border-slate-600 bg-transparent text-transparent"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Multiple Choice Options */
          <div className="grid grid-cols-1 gap-2.5">
            {(currentQuestion.options || []).map((option, idx) => {
              const isSelected = currentUserAnswer === option;
              const isCorrectOpt =
                option.toLowerCase() === currentQuestion.correctAnswer.toLowerCase();

              let btnClass = "bg-[#070D1E]/90 hover:bg-[#101F47] border-blue-900/40 text-slate-200";

              if (feedbackMode === "instant" && isAnswerSubmitted) {
                if (isCorrectOpt) {
                  btnClass = "bg-emerald-950/80 border-emerald-500 text-emerald-200 font-semibold";
                } else if (isSelected && !isCorrectOpt) {
                  btnClass = "bg-red-950/80 border-red-500 text-red-200 font-semibold";
                } else {
                  btnClass = "bg-[#070D1E]/50 border-slate-800 text-slate-500 opacity-60";
                }
              } else if (isSelected) {
                btnClass =
                  "bg-blue-600/40 border-blue-400 text-white font-semibold shadow-md shadow-blue-600/20";
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectOption(option)}
                  disabled={isAnswerSubmitted && feedbackMode === "instant"}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left text-sm transition-all duration-150 ${btnClass}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-[#0C1733] border border-blue-500/20 flex items-center justify-center text-xs font-bold text-slate-300">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{option}</span>
                  </div>

                  {feedbackMode === "instant" && isAnswerSubmitted && (
                    <div>
                      {isCorrectOpt && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                      {isSelected && !isCorrectOpt && <XCircle className="w-5 h-5 text-red-400" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Instant Feedback & Explanations Block */}
        {feedbackMode === "instant" && isAnswerSubmitted && (
          <div
            className={`rounded-2xl p-4 sm:p-5 border space-y-3 transition-all ${
              isCurrentCorrect
                ? "bg-emerald-950/40 border-emerald-500/35 text-emerald-200"
                : "bg-red-950/40 border-red-500/35 text-red-200"
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                {isCurrentCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Correct! Strictly grounded in your notes.</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <span>Incorrect. Grounded model answer:</span>
                  </>
                )}
              </div>

              {/* Self-evaluation override for short answer */}
              {currentQuestion.type === "short_answer" && (
                <button
                  type="button"
                  onClick={() =>
                    setSelfGradedOverrides((prev) => ({
                      ...prev,
                      [currentQuestionIdx]: !isCurrentCorrect,
                    }))
                  }
                  className="text-[11px] underline text-blue-300 hover:text-white"
                >
                  {isCurrentCorrect ? "Mark as Incorrect" : "Override: Accept My Answer"}
                </button>
              )}
            </div>

            {/* Model Answer for Identification / Short Answer */}
            {(!isCurrentCorrect || currentQuestion.type === "short_answer") && (
              <div className="p-3 rounded-xl bg-[#060B19]/80 border border-blue-900/40 text-xs space-y-1">
                <span className="text-slate-400 block font-semibold">Model Grounded Answer:</span>
                <p className="text-emerald-300 font-semibold leading-relaxed">
                  {currentQuestion.correctAnswer}
                </p>
              </div>
            )}

            {/* Verbatim Source Evidence Citation & Explanation */}
            {currentQuestion.sourceExcerpt && (
              <div className="p-3.5 rounded-xl bg-[#060B19] border border-blue-500/25 text-xs space-y-1.5 text-slate-300">
                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                  <Quote className="w-3 h-3" />
                  <span>Verbatim Source Evidence:</span>
                </div>
                <p className="font-serif italic text-slate-200 leading-relaxed">
                  "{currentQuestion.sourceExcerpt}"
                </p>
                {currentQuestion.explanation && (
                  <p className="text-[11px] text-slate-400 pt-1.5 border-t border-blue-900/30">
                    <strong className="text-slate-300 font-semibold">Explanation: </strong>
                    {currentQuestion.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-blue-900/30">
          <button
            type="button"
            onClick={() => onViewSourceNotes(currentReviewer)}
            className="text-xs text-blue-300 hover:text-white flex items-center gap-1 font-medium underline"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Check Source Material</span>
          </button>

          <button
            id="btn-next-question"
            type="button"
            onClick={handleNextQuestion}
            disabled={!isAnswerSubmitted}
            title={!isAnswerSubmitted ? "Please submit an answer before proceeding" : undefined}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all ${
              isAnswerSubmitted
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 cursor-pointer"
                : "bg-slate-800/70 text-slate-500 border border-slate-700/40 cursor-not-allowed opacity-50"
            }`}
          >
            <span>{currentQuestionIdx < questions.length - 1 ? "Next Question" : "Finish Quiz"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Zoomed Diagram Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#0E1A38] border border-cyan-500/40 rounded-3xl p-4 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-blue-900/40">
              <span className="text-sm font-bold text-white truncate">
                {zoomedImage.title}
              </span>
              <button
                onClick={() => setZoomedImage(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[80vh] flex items-center justify-center">
              <img
                src={zoomedImage.url}
                alt={zoomedImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
