/**
 * Hook for managing quiz state
 */

import { useState, useCallback, useRef } from "react";
import type { ReviewRating } from "../../../../services/studyService";
import type { QuizReviewDetails, QuizResult } from "../types";

interface UseQuizStateProps {
  normalizedCorrect: string;
  correctAnswer: string;
  isSubmitting: boolean;
  onSubmitReview: (
    rating: ReviewRating,
    details?: QuizReviewDetails,
  ) => Promise<boolean | void>;
  onNext: () => void;
}

interface UseQuizStateReturn {
  selectedOption: string | null;
  result: QuizResult;
  isShaking: boolean;
  isExiting: boolean;
  timeoutRef: React.RefObject<number | null>;
  handleSelect: (option: string) => Promise<void>;
  handleDontKnow: () => Promise<void>;
  handleContinue: () => void;
  reset: () => void;
  setIsShaking: (value: boolean) => void;
}

export const useQuizState = ({
  normalizedCorrect,
  correctAnswer,
  isSubmitting,
  onSubmitReview,
  onNext,
}: UseQuizStateProps): UseQuizStateReturn => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleSelect = useCallback(
    async (option: string) => {
      if (selectedOption || isSubmitting || isExiting) return;

      const isCorrect = option.trim().toLowerCase() === normalizedCorrect;
      setSelectedOption(option);
      setResult(isCorrect ? "correct" : "wrong");

      if (!isCorrect) {
        // Haptic feedback
        if ("vibrate" in navigator) {
          navigator.vibrate(80);
        }
        // Shake animation trigger
        setIsShaking(true);
        timeoutRef.current = window.setTimeout(() => setIsShaking(false), 350);
      }

      const rating: ReviewRating = isCorrect ? 5 : 1;
      await onSubmitReview(rating, {
        userAnswer: option,
        correctAnswer,
        correct: isCorrect,
      });
    },
    [
      selectedOption,
      isSubmitting,
      isExiting,
      normalizedCorrect,
      onSubmitReview,
      correctAnswer,
    ],
  );

  const handleDontKnow = useCallback(async () => {
    if (selectedOption || isSubmitting || isExiting) return;

    setResult("dontKnow");

    if ("vibrate" in navigator) {
      navigator.vibrate([50, 100, 50]);
    }

    const rating: ReviewRating = 1;
    await onSubmitReview(rating, {
      userAnswer: "Non lo so",
      correctAnswer,
      correct: false,
    });
  }, [selectedOption, isSubmitting, isExiting, onSubmitReview, correctAnswer]);

  const handleContinue = useCallback(() => {
    if (isExiting) return;
    if (!selectedOption && result !== "dontKnow") return;

    setIsExiting(true);
    onNext();
  }, [selectedOption, result, isExiting, onNext]);

  const reset = useCallback(() => {
    setSelectedOption(null);
    setResult(null);
    setIsShaking(false);
    setIsExiting(false);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    selectedOption,
    result,
    isShaking,
    isExiting,
    timeoutRef,
    handleSelect,
    handleDontKnow,
    handleContinue,
    reset,
    setIsShaking,
  };
};
