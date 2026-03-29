/**
 * Hook for managing quiz keyboard shortcuts
 */

import { useEffect, useRef } from "react";
import type { QuizResult } from "../types";

interface UseQuizKeyboardProps {
  selectedOption: string | null;
  result: QuizResult;
  isSubmitting: boolean;
  isExiting: boolean;
  resolvedOptions: string[];
  handleSelect: (option: string) => void;
  handleDontKnow: () => void;
  handleContinue: () => void;
  cardId: string;
}

export const useQuizKeyboard = ({
  selectedOption,
  result,
  isSubmitting,
  isExiting,
  resolvedOptions,
  handleSelect,
  handleDontKnow,
  handleContinue,
  cardId,
}: UseQuizKeyboardProps) => {
  const optionsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const dontKnowRef = useRef<HTMLButtonElement | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (
        (selectedOption || result === "dontKnow") &&
        !isExiting &&
        event.key === "Enter"
      ) {
        event.preventDefault();
        handleContinue();
        return;
      }

      if (
        selectedOption ||
        isSubmitting ||
        isExiting ||
        result === "dontKnow"
      )
        return;

      const key = event.key;
      if (["1", "2", "3", "4"].includes(key)) {
        event.preventDefault();
        const index = parseInt(key) - 1;
        if (resolvedOptions[index]) {
          handleSelect(resolvedOptions[index]);
          optionsRef.current[index]?.focus();
        }
      }
      if (key === "0") {
        event.preventDefault();
        handleDontKnow();
        dontKnowRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [
    selectedOption,
    result,
    isSubmitting,
    isExiting,
    resolvedOptions,
    handleSelect,
    handleDontKnow,
    handleContinue,
  ]);

  // Auto-focus sul primo elemento quando la card cambia
  useEffect(() => {
    optionsRef.current[0]?.focus();
  }, [cardId]);

  return { optionsRef, dontKnowRef };
};
