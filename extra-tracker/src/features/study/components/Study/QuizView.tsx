/**
 * Quiz Mode view (multiple choice) - Ottimizzato per UX e performance
 *
 * Miglioramenti:
 * - Layout flessibile che si adatta allo schermo
 * - Scroll interno per domande lunghe
 * - Animazioni CSS-based per performance
 * - Focus management e accessibility
 * - Transizioni fluide tra domande
 * - Pulsante "Non lo so" per gestire l'incertezza
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Card, ReviewRating } from "../../services/studyService";

interface QuizReviewDetails {
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
}

interface QuizViewProps {
  card: Card;
  question: string;
  options: string[];
  correctAnswer: string;
  isSubmitting: boolean;
  onSubmitReview: (
    rating: ReviewRating,
    details?: QuizReviewDetails,
  ) => Promise<boolean | void>;
  onNext: () => void;
  isTrueFalse?: boolean; // Modalità Vero/Falso
}

const fallbackOptions = [
  "Nessuna delle precedenti",
  "Altro",
  "Non specificato",
  "Informazione non presente",
];

const buildOptions = (options: string[], correctAnswer: string) => {
  const cleaned = options.filter(
    (value) => typeof value === "string" && value.trim(),
  );
  const normalizedCorrect = correctAnswer.trim().toLowerCase();
  const hasCorrect = cleaned.some(
    (value) => value.trim().toLowerCase() === normalizedCorrect,
  );
  const pool = hasCorrect ? cleaned : [correctAnswer, ...cleaned];

  const filled: string[] = [];
  const seen = new Set<string>();

  for (const value of pool) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    filled.push(value.trim());
    if (filled.length >= 4) break;
  }

  for (const fallback of fallbackOptions) {
    if (filled.length >= 4) break;
    if (!filled.includes(fallback)) {
      filled.push(fallback);
    }
  }

  while (filled.length < 4) {
    filled.push("Nessuna delle precedenti");
  }

  return filled.slice(0, 4);
};

// ============================================================
// COMPONENT
// ============================================================

export const QuizView: React.FC<QuizViewProps> = ({
  card,
  question,
  options,
  correctAnswer,
  isSubmitting,
  onSubmitReview,
  onNext,
  isTrueFalse = false,
}) => {
  const normalizedCorrect = correctAnswer.trim().toLowerCase();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | "dontKnow" | null>(
    null,
  );
  const [isShaking, setIsShaking] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const optionsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const dontKnowRef = useRef<HTMLButtonElement | null>(null);

  const resolvedOptions = useMemo(
    () => buildOptions(options, correctAnswer),
    [options, correctAnswer],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

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

  /**
   * Gestisce il click sul pulsante "Non lo so"
   * - Mostra la risposta corretta
   * - Registra rating 1 (urgenza massima di ripasso, stesso di "sbagliato")
   * - Non applica shake animation (non è un errore, è ammissione di incertezza)
   * NOTA: Il backend accetta solo rating 1-5, quindi "Non lo so" = 1
   */
  const handleDontKnow = useCallback(async () => {
    if (selectedOption || isSubmitting || isExiting) return;

    setResult("dontKnow");

    // Haptic feedback più lungo per indicare stato speciale
    if ("vibrate" in navigator) {
      navigator.vibrate([50, 100, 50]);
    }

    // Rating 1 = "Non so/Sbagliato" - urgenza massima di ripasso
    // Il backend non accetta 0, quindi usiamo 1 che ha lo stesso effetto pratico
    const rating: ReviewRating = 1;
    await onSubmitReview(rating, {
      userAnswer: "Non lo so",
      correctAnswer,
      correct: false,
    });
  }, [selectedOption, isSubmitting, isExiting, onSubmitReview, correctAnswer]);

  const handleContinue = useCallback(() => {
    if (isExiting) return;

    // Per "Non lo so" non serve selectedOption, solo result
    if (!selectedOption && result !== "dontKnow") return;

    setIsExiting(true);
    // Piccolo delay per l'animazione di uscita
    timeoutRef.current = window.setTimeout(() => {
      onNext();
    }, 150);
  }, [selectedOption, result, isExiting, onNext]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Se abbiamo già risposto, Enter fa continuare
      if (
        (selectedOption || result === "dontKnow") &&
        !isExiting &&
        event.key === "Enter"
      ) {
        event.preventDefault();
        handleContinue();
        return;
      }

      // Altrimenti, se non abbiamo risposto, i numeri selezionano
      if (selectedOption || isSubmitting || isExiting || result === "dontKnow")
        return;

      const key = event.key;
      if (["1", "2", "3", "4"].includes(key)) {
        event.preventDefault();
        const index = parseInt(key) - 1;
        if (resolvedOptions[index]) {
          handleSelect(resolvedOptions[index]);
          // Focus sul bottone selezionato per accessibility
          optionsRef.current[index]?.focus();
        }
      }
      // Tasto 0 per "Non lo so"
      if (key === "0") {
        event.preventDefault();
        handleDontKnow();
        dontKnowRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
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
  }, [card.id]);

  const getOptionStyles = (option: string) => {
    const baseStyles =
      "border rounded-2xl transition-all duration-200 text-left group relative overflow-hidden";

    if (!selectedOption && !result) {
      return `${baseStyles} border-theme-default bg-theme-surface hover:bg-theme-surface-hover hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-500/5`;
    }

    const isCorrectOption = option.trim().toLowerCase() === normalizedCorrect;
    const isSelectedOption = option === selectedOption;

    // Se è "Non lo so", evidenzia comunque la risposta corretta
    if (result === "dontKnow" && isCorrectOption) {
      return `${baseStyles} border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-100 scale-[1.02] ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10`;
    }

    if (isCorrectOption) {
      return `${baseStyles} border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100 scale-[1.02] shadow-lg shadow-emerald-500/10`;
    }

    if (isSelectedOption) {
      return `${baseStyles} border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-100 shadow-lg shadow-rose-500/10`;
    }

    return `${baseStyles} border-theme-subtle bg-theme-surface/30 text-theme-disabled scale-[0.98] opacity-60`;
  };

  const getLabelStyles = (option: string) => {
    const baseStyles =
      "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-200";

    if (!selectedOption && !result) {
      return `${baseStyles} bg-theme-elevated text-theme-secondary border border-theme-default group-hover:border-primary-500/30 group-hover:text-primary-600 dark:group-hover:text-primary-400`;
    }

    const isCorrectOption = option.trim().toLowerCase() === normalizedCorrect;
    const isSelectedOption = option === selectedOption;

    // Se è "Non lo so", la risposta corretta usa stile amber
    if (result === "dontKnow" && isCorrectOption) {
      return `${baseStyles} bg-amber-500 text-white border border-amber-600`;
    }

    if (isCorrectOption) {
      return `${baseStyles} bg-emerald-500 text-white border border-emerald-600`;
    }

    if (isSelectedOption) {
      return `${baseStyles} bg-rose-500 text-white border border-rose-600`;
    }

    return `${baseStyles} bg-theme-surface text-theme-disabled border border-theme-subtle`;
  };

  // Determina se mostrare il pulsante continua
  const canContinue = selectedOption || result === "dontKnow";

  // Testo del pulsante continua
  const continueButtonText = result === "dontKnow" ? "Ho capito" : "Continua";

  return (
    <div className="w-full max-w-[1320px] mx-auto px-2 sm:px-4 md:px-5 lg:px-6 h-full flex flex-col">
      {/* Card Container - Flex grow per occupare spazio disponibile */}
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl sm:rounded-3xl border border-theme-default bg-theme-elevated shadow-theme-lg overflow-hidden">
        {/* Contenitore unico con scroll per Domanda + Opzioni per un'esperienza mobile/iPad fluida */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-theme-elevated flex flex-col">
          {/* Area Domanda (ora scorre con le opzioni) */}
          <div className="flex-none px-4 sm:px-6 md:px-8 lg:px-10 py-5 sm:py-6 md:py-8 lg:py-10 border-b border-theme-subtle bg-theme-elevated">
            <div className="space-y-4">
              <h2 className="text-[18px] sm:text-xl md:text-2xl lg:text-3xl font-semibold text-theme-primary leading-snug whitespace-pre-wrap break-words">
                {question}
              </h2>

              {/* Hint shortcuts - prima della risposta */}
              {!selectedOption && !result && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hidden lg:flex text-sm text-theme-muted items-center gap-2 flex-wrap"
                >
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Usa i tasti</span>
                  <span className="flex items-center gap-1">
                    {(isTrueFalse ? [1, 2] : [1, 2, 3, 4]).map((num) => (
                      <kbd
                        key={num}
                        className="px-2 py-0.5 rounded bg-theme-surface text-theme-secondary text-xs font-mono border border-theme-default"
                      >
                        {num}
                      </kbd>
                    ))}
                  </span>
                  <span>per rispondere</span>
                  {!isTrueFalse && (
                    <>
                      <span>,</span>
                      <kbd className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono border border-amber-500/20">
                        0
                      </kbd>
                      <span>se non sai</span>
                    </>
                  )}
                </motion.p>
              )}

              {/* Esito risposta - sotto la domanda, sempre visibile */}
              <AnimatePresence mode="wait">
                {result === "correct" && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center gap-2 text-sm md:text-base font-semibold text-emerald-600 dark:text-emerald-400"
                  >
                    <svg
                      className="w-5 h-5 md:w-6 md:h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Corretto
                  </motion.span>
                )}
                {result === "wrong" && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center gap-2 text-sm md:text-base font-semibold text-rose-600 dark:text-rose-400"
                  >
                    <svg
                      className="w-5 h-5 md:w-6 md:h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Sbagliato
                  </motion.span>
                )}
                {result === "dontKnow" && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center gap-2 text-sm md:text-base font-semibold text-amber-600 dark:text-amber-400"
                  >
                    <svg
                      className="w-5 h-5 md:w-6 md:h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Non lo so
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Area Opzioni */}
          <div className="flex-1 px-4 sm:px-6 md:px-8 lg:px-10 py-5 sm:py-6 md:py-8 lg:py-10 flex flex-col gap-4 sm:gap-5">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm md:text-base font-medium text-theme-muted">
                Seleziona una risposta
              </p>
              {!selectedOption && !result && (
                <p className="hidden lg:block text-xs md:text-sm text-theme-muted">
                  Scorciatoie: {isTrueFalse ? "1-2" : "1-4"}{" "}
                  {isTrueFalse ? "" : "· 0 = Non lo so"}
                </p>
              )}
            </div>

            {/* Options Grid */}
            <motion.div
              animate={isShaking ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={
                isTrueFalse
                  ? "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
                  : "grid grid-cols-1 gap-3 sm:gap-3.5 md:gap-4"
              }
            >
              {resolvedOptions.map((option, index) => {
                const label = String.fromCharCode(65 + index); // A, B, C, D

                // Icone/emoji per Vero/Falso
                const trueFalseIcon =
                  option.toLowerCase().includes("vero") ||
                  option.toLowerCase().includes("true")
                    ? "✓"
                    : "✗";
                const trueFalseColor =
                  option.toLowerCase().includes("vero") ||
                  option.toLowerCase().includes("true")
                    ? "text-emerald-400"
                    : "text-rose-400";

                return (
                  <button
                    key={`${card.id}-${index}`}
                    ref={(el) => {
                      optionsRef.current[index] = el;
                    }}
                    onClick={() => handleSelect(option)}
                    disabled={!!selectedOption || isSubmitting || !!result}
                    className={
                      isTrueFalse
                        ? `min-h-[100px] sm:min-h-[120px] md:min-h-[140px] ${getOptionStyles(option)}`
                        : `min-h-[72px] sm:min-h-[84px] md:min-h-[100px] lg:min-h-[88px] ${getOptionStyles(option)}`
                    }
                  >
                    {isTrueFalse ? (
                      // Layout Vero/Falso: centrato verticalmente con icona grande
                      <div className="flex flex-col items-center justify-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-4 sm:py-6">
                        <div
                          className={`text-4xl sm:text-5xl font-bold ${trueFalseColor}`}
                        >
                          {trueFalseIcon}
                        </div>
                        <div className="text-lg sm:text-xl md:text-2xl font-bold">
                          {option}
                        </div>

                        {/* Check/X Icon for answered state - inline */}
                        {(selectedOption || result === "dontKnow") &&
                          option.trim().toLowerCase() === normalizedCorrect && (
                            <div className="absolute top-3 right-3">
                              <svg
                                className="w-7 h-7 text-emerald-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          )}
                        {option === selectedOption &&
                          option.trim().toLowerCase() !== normalizedCorrect && (
                            <div className="absolute top-3 right-3">
                              <svg
                                className="w-7 h-7 text-rose-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </div>
                          )}
                      </div>
                    ) : (
                      // Layout standard: orizzontale con label A-D
                      <div className="flex items-start gap-3 sm:gap-4 px-3.5 sm:px-4 lg:px-5 py-3 sm:py-3.5 md:py-4">
                        {/* Label A, B, C, D */}
                        <div className={getLabelStyles(option)}>{label}</div>

                        {/* Option Text */}
                        <div
                          className={`flex-1 text-left text-[16px] sm:text-[18px] md:text-[20px] lg:text-[18px] xl:text-[20px] font-medium leading-relaxed py-1 max-h-none overflow-visible pr-0 ${
                            selectedOption || result
                              ? option.trim().toLowerCase() ===
                                normalizedCorrect
                                ? "text-emerald-700 dark:text-emerald-100"
                                : option === selectedOption
                                  ? "text-rose-700 dark:text-rose-100"
                                  : "text-theme-disabled"
                              : "text-theme-primary"
                          }`}
                        >
                          {option}
                        </div>

                        {/* Keyboard Shortcut Indicator */}
                        {!selectedOption && !result && (
                          <kbd className="hidden lg:flex flex-shrink-0 items-center justify-center w-7 h-7 rounded-md bg-theme-surface border border-theme-default text-xs font-mono text-theme-muted">
                            {index + 1}
                          </kbd>
                        )}

                        {/* Check/X Icon for answered state */}
                        {(selectedOption || result === "dontKnow") && (
                          <div className="flex-shrink-0">
                            {option.trim().toLowerCase() ===
                            normalizedCorrect ? (
                              <svg
                                className="w-6 h-6 text-emerald-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : option === selectedOption ? (
                              <svg
                                className="w-6 h-6 text-rose-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </motion.div>

            {/* Pulsante "Non lo so" - mostrato solo se non si è ancora risposto e non in modalità Vero/Falso */}
            {!selectedOption && !result && !isTrueFalse && (
              <div className="mt-auto sticky bottom-0 z-10 flex justify-center pt-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] bg-gradient-to-t from-theme-elevated via-theme-elevated/95 to-transparent">
                <button
                  ref={dontKnowRef}
                  onClick={handleDontKnow}
                  disabled={isSubmitting}
                  className="w-full group flex items-center justify-center gap-3 px-5 lg:px-6 py-2.5 lg:py-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300 font-medium transition-all duration-200 hover:bg-amber-500/15 hover:border-amber-500/50 hover:text-amber-700 dark:hover:text-amber-200 hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>🤔</span>
                  <span>Non lo so</span>
                  <kbd className="hidden sm:inline-flex px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono border border-amber-500/30">
                    0
                  </kbd>
                </button>
              </div>
            )}

            {/* Messaggio esplicativo quando si seleziona "Non lo so" */}
            {result === "dontKnow" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-amber-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-amber-700 dark:text-amber-200 font-medium mb-1">
                      La risposta corretta è evidenziata sopra
                    </p>
                    <p className="text-amber-600/80 dark:text-amber-200/60 text-sm">
                      Leggi attentamente e premi "Ho capito" quando sei pronto
                      per continuare.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Continue Button - Sempre visibile per stabilizzare il layout */}
        <div className="flex-none px-4 sm:px-6 md:px-7 lg:px-8 py-3.5 sm:py-4 lg:py-5 border-t border-theme-subtle bg-theme-surface/70 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-4 lg:pb-5">
          <button
            onClick={canContinue ? handleContinue : undefined}
            disabled={!canContinue || isExiting}
            className={`w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-semibold shadow-lg transition-all duration-200 ${
              canContinue
                ? result === "dontKnow"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-500/25 hover:shadow-amber-500/35 hover:translate-y-[-1px] active:translate-y-[1px]"
                  : "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-primary-500/25 hover:shadow-primary-500/35 hover:translate-y-[-1px] active:translate-y-[1px]"
                : "bg-theme-surface border border-theme-default text-theme-muted cursor-not-allowed"
            } disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            <span>
              {canContinue
                ? continueButtonText
                : "Seleziona una risposta per continuare"}
            </span>
            {canContinue && (
              <div className="hidden lg:flex items-center gap-1.5 text-sm opacity-80">
                <span>o premi</span>
                <kbd className="px-2 py-1 rounded bg-white/20 text-xs font-mono">
                  Enter
                </kbd>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizView;
