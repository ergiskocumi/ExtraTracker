/**
 * Quiz Mode view (multiple choice) - Refactored
 *
 * Componente principale che coordina i sotto-componenti specializzati.
 */

import { memo, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../../../lib/utils";

import type { QuizViewProps } from "./types";
import { buildOptions } from "./utils/buildOptions";
import { useQuizState } from "./hooks/useQuizState";
import { useQuizKeyboard } from "./hooks/useQuizKeyboard";

import { QuestionCard } from "./components/QuestionCard";
import { OptionsGrid } from "./components/OptionsGrid";
import { FeedbackPanel } from "./components/FeedbackPanel";
import { ExplanationCard } from "./components/ExplanationCard";
import { ContinueButton } from "./components/ContinueButton";
import { DontKnowButton } from "./components/DontKnowButton";

export const QuizView = memo<QuizViewProps>(({
  card,
  question,
  options,
  correctAnswer,
  distractorExplanations,
  isSubmitting,
  onSubmitReview,
  onNext,
  isTrueFalse = false,
  explanation,
  currentIndex,
  totalQuestions,
}) => {
  const showProgress = currentIndex !== undefined && totalQuestions !== undefined && totalQuestions > 0;
  const normalizedCorrect = correctAnswer.trim().toLowerCase();

  const {
    selectedOption,
    result,
    isShaking,
    isExiting,
    timeoutRef,
    handleSelect,
    handleDontKnow,
    handleContinue,
  } = useQuizState({
    normalizedCorrect,
    correctAnswer,
    isSubmitting,
    onSubmitReview,
    onNext,
  });

  const { optionsRef, dontKnowRef } = useQuizKeyboard({
    selectedOption,
    result,
    isSubmitting,
    isExiting,
    resolvedOptions: useMemo(
      () => buildOptions(options, correctAnswer, isTrueFalse),
      [options, correctAnswer, isTrueFalse],
    ),
    handleSelect,
    handleDontKnow,
    handleContinue,
    cardId: card.id,
  });

  const resolvedOptions = useMemo(
    () => buildOptions(options, correctAnswer, isTrueFalse),
    [options, correctAnswer, isTrueFalse],
  );

  // Avvisa se l'AI non ha generato abbastanza distractor (< 3 opzioni reali)
  const usedFallbackOptions =
    !isTrueFalse &&
    options.filter((o) => typeof o === "string" && o.trim()).length < 3;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [timeoutRef]);

  // Determina se mostrare il pulsante continua
  const canContinue = Boolean(selectedOption || result === "dontKnow");

  // Trova la spiegazione per l'opzione sbagliata selezionata
  const selectedExplanation = useMemo(() => {
    if (result !== "wrong" || !selectedOption || !distractorExplanations)
      return null;
    const idx = resolvedOptions.findIndex((o) => o === selectedOption);
    if (idx === -1) return null;
    return distractorExplanations[String(idx)] || null;
  }, [result, selectedOption, distractorExplanations, resolvedOptions]);

  return (
    <div className="flex flex-col w-full h-full max-w-6xl px-3 mx-auto sm:px-4 lg:px-6 gap-4 sm:gap-6 py-2 sm:py-4">
      {/* Progress bar: Domanda N di M */}
      {showProgress && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-theme-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex!) / totalQuestions!) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-theme-muted tabular-nums whitespace-nowrap">
            {currentIndex} / {totalQuestions}
          </span>
        </div>
      )}

      <motion.div
        layout
        transition={{
          layout: { type: "spring", stiffness: 200, damping: 30 },
        }}
        className={cn(
          "flex-1 flex flex-col min-h-0",
          !result ? "justify-center" : "justify-start pt-4",
        )}
      >
        {/* Area domanda */}
        <QuestionCard
          question={question}
          usedFallbackOptions={usedFallbackOptions}
          hasResult={!!result}
        />

        {/* Area Feedback e Opzioni */}
        <div className="flex flex-col min-h-0 gap-4 sm:gap-6">
          {/* Feedback esito */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <FeedbackPanel result={result} />
                <ExplanationCard
                  result={result}
                  explanation={explanation}
                  selectedExplanation={selectedExplanation}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Area Opzioni */}
          <OptionsGrid
            options={resolvedOptions}
            cardId={card.id}
            selectedOption={selectedOption}
            result={result}
            isTrueFalse={isTrueFalse}
            isShaking={isShaking}
            isSubmitting={isSubmitting}
            normalizedCorrect={normalizedCorrect}
            hasResult={!!result}
            onSelect={handleSelect}
            optionsRef={optionsRef}
          />
        </div>
      </motion.div>

      {/* Footer - Actions */}
      <div className="flex-none flex items-center justify-center gap-4 py-2">
        {!selectedOption && !result && (
          <DontKnowButton
            isSubmitting={isSubmitting}
            onClick={handleDontKnow}
            buttonRef={dontKnowRef}
          />
        )}

        <ContinueButton
          canContinue={canContinue}
          isExiting={isExiting}
          result={result}
          onContinue={handleContinue}
        />
      </div>
    </div>
  );
});

export default QuizView;
