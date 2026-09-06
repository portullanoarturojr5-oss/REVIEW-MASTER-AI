import React, { useState, useEffect } from "react";
import {
  Layers,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Quote,
  Sparkles,
  BookOpen,
  Filter,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Reviewer, FlashcardItem, MasteryLevel } from "../types";
import { updateFlashcardMastery } from "../utils/storage";

interface FlashcardModeProps {
  reviewers: Reviewer[];
  activeReviewerId: string | null;
  onSelectReviewer: (id: string) => void;
  onViewSourceNotes: (reviewer: Reviewer) => void;
  onOpenGenerateMaterials?: (reviewer: Reviewer) => void;
  onReviewerUpdated: () => void;
}

export const FlashcardMode: React.FC<FlashcardModeProps> = ({
  reviewers,
  activeReviewerId,
  onSelectReviewer,
  onViewSourceNotes,
  onOpenGenerateMaterials,
  onReviewerUpdated,
}) => {
  const currentReviewer =
    reviewers.find((r) => r.id === activeReviewerId) || reviewers[0] || null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterMastery, setFilterMastery] = useState<"all" | "unmastered" | "mastered">("all");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Cards filtered by user preference
  const rawCards = currentReviewer?.flashcards || [];
  const cards = rawCards.filter((card) => {
    if (filterMastery === "unmastered") return card.mastery !== "mastered";
    if (filterMastery === "mastered") return card.mastery === "mastered";
    return true;
  });

  const activeCard: FlashcardItem | null = cards[currentIndex] || null;

  // Reset index when reviewer or filter changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [currentReviewer?.id, filterMastery]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when user is typing in an input
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "1" && activeCard && currentReviewer) {
        handleRate("learning");
      } else if (e.key === "2" && activeCard && currentReviewer) {
        handleRate("mastered");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, cards.length, isFlipped, activeCard]);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed deck!
      triggerCompletionConfetti();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleShuffle = () => {
    if (!currentReviewer) return;
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    // Replace in memory by adjusting index
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleRate = (mastery: MasteryLevel) => {
    if (!currentReviewer || !activeCard) return;

    updateFlashcardMastery(currentReviewer.id, activeCard.id, mastery);
    activeCard.mastery = mastery;
    onReviewerUpdated();

    // Advance automatically
    handleNext();
  };

  const triggerCompletionConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#2563EB", "#60A5FA", "#38BDF8", "#F59E0B"],
      });
    } catch {
      // ignore
    }
  };

  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!currentReviewer) {
    return (
      <div className="rounded-2xl border border-blue-500/20 bg-[#0E1A38]/50 p-8 sm:p-12 text-center text-slate-400">
        <Layers className="w-12 h-12 mx-auto mb-3 text-blue-400" />
        <h3 className="text-lg font-bold text-white mb-1">No Reviewers Available</h3>
        <p className="text-xs sm:text-sm text-slate-300">
          Create a reviewer first by uploading notes or documents to start Flashcard Mode.
        </p>
      </div>
    );
  }

  const masteredCount = rawCards.filter((c) => c.mastery === "mastered").length;
  const masteryPercentage = rawCards.length > 0 ? Math.round((masteredCount / rawCards.length) * 100) : 0;

  return (
    <div id="flashcard-mode-view" className="space-y-6 max-w-4xl mx-auto">
      {/* Top Controls: Reviewer Selector, Mastery Badge, Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-400" />
              Flashcard Mode
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60">
              {cards.length} cards
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <select
              id="select-flashcard-reviewer"
              value={currentReviewer.id}
              onChange={(e) => onSelectReviewer(e.target.value)}
              className="bg-[#0C1733] border border-blue-500/30 rounded-lg px-2.5 py-1 text-xs text-white font-medium focus:outline-none cursor-pointer"
            >
              {reviewers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>

            <button
              id="btn-view-notes-from-cards"
              onClick={() => onViewSourceNotes(currentReviewer)}
              className="text-[11px] text-blue-300 hover:text-white flex items-center gap-1 font-medium underline"
            >
              <BookOpen className="w-3 h-3" />
              <span>Inspect Source Text</span>
            </button>
          </div>
        </div>

        {/* Filter & Progress Stats & Generate Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1 bg-[#0C1733] border border-blue-500/20 rounded-xl p-1 text-xs">
            <button
              onClick={() => setFilterMastery("all")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterMastery === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All ({rawCards.length})
            </button>
            <button
              onClick={() => setFilterMastery("unmastered")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterMastery === "unmastered"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Learning ({rawCards.length - masteredCount})
            </button>
            <button
              onClick={() => setFilterMastery("mastered")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterMastery === "mastered"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Mastered ({masteredCount})
            </button>
          </div>

          {onOpenGenerateMaterials && (
            <button
              id="btn-flashcards-generate-study-materials"
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

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-blue-500/20 bg-[#0E1A38]/50 p-8 text-center text-slate-300 space-y-3">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-1 text-emerald-400" />
          <h3 className="font-bold text-white text-base">
            {rawCards.length === 0 ? "No Flashcards Generated Yet" : "All Filtered Cards Mastered!"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {rawCards.length === 0
              ? "Generate flashcards strictly derived from this reviewer's notes."
              : "You have mastered every card matching this filter."}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {rawCards.length > 0 && (
              <button
                onClick={() => setFilterMastery("all")}
                className="px-4 py-2 rounded-xl bg-[#0C1733] hover:bg-blue-900/40 text-white text-xs font-semibold border border-blue-500/30"
              >
                Review All Cards
              </button>
            )}
            {onOpenGenerateMaterials && (
              <button
                onClick={() => onOpenGenerateMaterials(currentReviewer)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Generate Study Materials</span>
              </button>
            )}
          </div>
        </div>
      ) : activeCard ? (
        <div className="space-y-4">
          {/* Progress Bar & Counter */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">
              Card <strong className="text-blue-400">{currentIndex + 1}</strong> of{" "}
              {cards.length}
            </span>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">
                Deck Mastery: <strong className="text-emerald-400">{masteryPercentage}%</strong>
              </span>

              <button
                onClick={handleShuffle}
                title="Shuffle deck"
                className="p-1 rounded-lg hover:bg-blue-900/40 text-blue-300 hover:text-white transition-colors"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-full h-1.5 rounded-full bg-blue-950 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / cards.length) * 100}%`,
              }}
            />
          </div>

          {/* Interactive 3D Flashcard */}
          <div
            id="flashcard-3d-container"
            onClick={() => setIsFlipped(!isFlipped)}
            className="perspective-1000 w-full min-h-[320px] sm:min-h-[360px] cursor-pointer select-none"
          >
            <div
              className={`transform-style-3d relative w-full h-full min-h-[320px] sm:min-h-[360px] transition-transform duration-500 rounded-3xl ${
                isFlipped ? "rotate-y-180" : ""
              }`}
            >
              {/* FRONT OF CARD */}
              <div className="backface-hidden absolute inset-0 rounded-3xl bg-gradient-to-b from-[#0E1A38] to-[#0A1229] border-2 border-blue-500/30 hover:border-blue-400/60 p-6 sm:p-8 flex flex-col justify-between shadow-2xl shadow-blue-950/80 transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30">
                      {activeCard.category || "Concept"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        activeCard.mastery === "mastered"
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                          : activeCard.mastery === "learning"
                          ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                          : "bg-blue-950/60 text-slate-300 border border-blue-800/40"
                      }`}
                    >
                      {activeCard.mastery}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(activeCard.front);
                    }}
                    title="Read front aloud"
                    className="p-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-blue-300 hover:text-white transition-colors border border-blue-800/40"
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4 text-blue-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                <div className="my-auto py-6 text-center">
                  <h3 className="text-lg sm:text-2xl font-bold text-white leading-relaxed tracking-tight px-2">
                    {activeCard.front}
                  </h3>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-blue-900/30 pt-3">
                  <span className="text-[11px] text-slate-400">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800 font-mono text-[10px]">Space</kbd> or click to flip
                  </span>
                  <span className="flex items-center gap-1 text-blue-400 font-medium">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Flip Card</span>
                  </span>
                </div>
              </div>

              {/* BACK OF CARD */}
              <div className="backface-hidden rotate-y-180 absolute inset-0 rounded-3xl bg-gradient-to-b from-[#102047] to-[#0C1733] border-2 border-blue-400/50 p-6 sm:p-8 flex flex-col justify-between shadow-2xl shadow-blue-950/90">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Grounded Answer</span>
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(activeCard.back);
                    }}
                    title="Read answer aloud"
                    className="p-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-blue-300 hover:text-white transition-colors border border-blue-800/40"
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4 text-blue-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                <div className="my-auto py-4 space-y-4">
                  <p className="text-base sm:text-xl font-medium text-white leading-relaxed text-center px-2">
                    {activeCard.back}
                  </p>

                  {/* Grounding Source Excerpt Box */}
                  {activeCard.sourceExcerpt && (
                    <div className="rounded-xl bg-[#060B19]/80 border border-blue-500/20 p-3.5 text-left space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-blue-300 uppercase tracking-wider">
                        <Quote className="w-3 h-3" />
                        <span>Verbatim Grounding Source:</span>
                      </div>
                      <p className="text-xs text-slate-300 font-serif italic leading-relaxed">
                        "{activeCard.sourceExcerpt}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-blue-900/30 pt-3">
                  <span className="text-[11px] text-slate-400">
                    Click to flip back
                  </span>
                  <span className="flex items-center gap-1 text-blue-400 font-medium">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Return to Front</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card Navigation & Mastery Rating Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            {/* Prev / Next Arrows */}
            <div className="flex items-center gap-2">
              <button
                id="btn-prev-card"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="p-2.5 rounded-xl bg-[#0C1733] hover:bg-blue-900/50 disabled:opacity-40 disabled:cursor-not-allowed text-white border border-blue-500/30 transition-colors"
                title="Previous card (Arrow Left)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                id="btn-flip-card-bar"
                onClick={() => setIsFlipped(!isFlipped)}
                className="px-4 py-2.5 rounded-xl bg-[#0C1733] hover:bg-blue-900/50 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCw className="w-4 h-4" />
                <span>{isFlipped ? "Show Question" : "Reveal Answer"}</span>
              </button>

              <button
                id="btn-next-card"
                onClick={handleNext}
                disabled={currentIndex === cards.length - 1}
                className="p-2.5 rounded-xl bg-[#0C1733] hover:bg-blue-900/50 disabled:opacity-40 disabled:cursor-not-allowed text-white border border-blue-500/30 transition-colors"
                title="Next card (Arrow Right)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Mastery Rating Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="btn-rate-learning"
                onClick={() => handleRate("learning")}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-950/70 hover:bg-amber-900/80 text-amber-200 border border-amber-500/30 text-xs font-semibold shadow-md transition-all active:scale-95"
              >
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Still Learning (1)</span>
              </button>

              <button
                id="btn-rate-mastered"
                onClick={() => handleRate("mastered")}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-100 border border-emerald-500/30 text-xs font-semibold shadow-md transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Mastered (2)</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
