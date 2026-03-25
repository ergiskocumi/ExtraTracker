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
  distractorExplanations?: Record<string, string>;
  isSubmitting: boolean;
  onSubmitReview: (
    rating: ReviewRating,
    details?: QuizReviewDetails,
  ) => Promise<boolean | void>;
  onNext: () => void;
  isTrueFalse?: boolean; // Modalita Vero/Falso
  correctStatement?: string | null; // Per V/F AI: la versione corretta dello statement falso
  explanation?: string; // Spiegazione AI per la risposta (V/F e MCQ)
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
  distractorExplanations,
  isSubmitting,
  onSubmitReview,
  onNext,
  isTrueFalse = false,
  correctStatement,
  explanation,
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

  // Avvisa se l'AI non ha generato abbastanza distractor (< 3 opzioni reali)
  const usedFallbackOptions = !isTrueFalse && options.filter(o => typeof o === 'string' && o.trim()).length < 3;

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
   * - Non applica shake animation (non Ã¨ un errore, Ã¨ ammissione di incertezza)
   * NOTA: Il backend accetta solo rating 1-5, quindi "Non lo so" = 1
   */
  const handleDontKnow = useCallback(async () => {
    if (selectedOption || isSubmitting || isExiting) return;

    setResult("dontKnow");

    // Haptic feedback piÃ¹ lungo per indicare stato speciale
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
    // Avanza subito - AnimatePresence gestisce l'animazione di uscita/entrata
    onNext();
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

    // Se Ã¨ "Non lo so", evidenzia comunque la risposta corretta
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
      "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200";

    if (!selectedOption && !result) {
      return `${baseStyles} bg-theme-elevated text-theme-secondary border border-theme-default group-hover:border-primary-500/30 group-hover:text-primary-600 dark:group-hover:text-primary-400`;
    }

    const isCorrectOption = option.trim().toLowerCase() === normalizedCorrect;
    const isSelectedOption = option === selectedOption;

    // Se Ã¨ "Non lo so", la risposta corretta usa stile amber
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

  // Trova la spiegazione per l'opzione sbagliata selezionata
  const selectedExplanation = useMemo(() => {
    if (result !== 'wrong' || !selectedOption || !distractorExplanations) return null;
    const idx = resolvedOptions.findIndex(o => o === selectedOption);
    if (idx === -1) return null;
    return distractorExplanations[String(idx)] || null;
  }, [result, selectedOption, distractorExplanations, resolvedOptions]);

  // Testo del pulsante continua
  const continueButtonText = result === "dontKnow" ? "Ho capito" : "Avanti";

  return (
    <div
      className="flex flex-col w-full h-full max-w-6xl px-3 mx-auto sm:px-4 lg:px-6"
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden border rounded-2xl border-theme-default bg-theme-elevated shadow-theme-lg">

        {/* â”€â”€ Scrollable body â”€â”€ */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">

          {/* Area Domanda + feedback */}
          <div className="flex-none px-4 pt-4 pb-3 space-y-2 border-b sm:px-6 lg:px-8 sm:pt-5 sm:pb-4 border-theme-subtle">
            <h2 className="text-base font-semibold leading-relaxed break-words whitespace-pre-wrap sm:text-lg md:text-xl lg:text-2xl text-theme-primary">
              {question}
            </h2>

            {/* Badge AI distractor fallback */}
            {usedFallbackOptions && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Opzioni generate automaticamente
              </span>
            )}

            {/* Feedback esito — barra prominente: icona + colore (mai solo colore) */}
            <AnimatePresence mode="wait">
              {result === "correct" && (
                <motion.div key="correct"
                  initial={{ opacity: 0, scale: 0.92, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-300">Corretto!</span>
                  </div>
                  {isTrueFalse && explanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: 0.08 }}
                      className="flex items-start gap-2 px-3 py-2 border rounded-lg border-emerald-500/20 bg-emerald-500/5"
                    >
                      <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="text-xs leading-relaxed text-emerald-600/90 dark:text-emerald-200/80">{explanation}</span>
                    </motion.div>
                  )}
                </motion.div>
              )}
              {result === "wrong" && (
                <motion.div key="wrong"
                  initial={{ opacity: 0, scale: 0.92, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-300">Sbagliato</span>
                  </div>
                  {selectedExplanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: 0.08 }}
                      className="flex items-start gap-2 px-3 py-2 border rounded-lg border-rose-500/20 bg-rose-500/5"
                    >
                      <svg className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="text-xs leading-relaxed text-rose-600/90 dark:text-rose-200/80">{selectedExplanation}</span>
                    </motion.div>
                  )}
                  {isTrueFalse && explanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: 0.12 }}
                      className="flex items-start gap-2 px-3 py-2 border rounded-lg border-rose-500/20 bg-rose-500/5"
                    >
                      <svg className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="text-xs leading-relaxed text-rose-600/90 dark:text-rose-200/80">{explanation}</span>
                    </motion.div>
                  )}
                  {isTrueFalse && correctStatement && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: 0.18 }}
                      className="flex items-start gap-2 px-3 py-2 border rounded-lg border-emerald-500/20 bg-emerald-500/5"
                    >
                      <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs leading-relaxed text-emerald-600/90 dark:text-emerald-200/80">
                        <span className="font-semibold">Versione corretta:</span> {correctStatement}
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              )}
              {result === "dontKnow" && (
                <motion.div key="dontknow"
                  initial={{ opacity: 0, scale: 0.92, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300">La risposta è evidenziata</span>
                  </div>
                  {isTrueFalse && explanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: 0.08 }}
                      className="flex items-start gap-2 px-3 py-2 border rounded-lg border-amber-500/20 bg-amber-500/5"
                    >
                      <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="text-xs leading-relaxed text-amber-600/90 dark:text-amber-200/80">{explanation}</span>
                    </motion.div>
                  )}
                  {isTrueFalse && correctStatement && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: 0.14 }}
                      className="flex items-start gap-2 px-3 py-2 border rounded-lg border-emerald-500/20 bg-emerald-500/5"
                    >
                      <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs leading-relaxed text-emerald-600/90 dark:text-emerald-200/80">
                        <span className="font-semibold">Versione corretta:</span> {correctStatement}
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Area Opzioni â€” flex-1 per riempire tutto lo spazio restante */}
          <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-4 lg:p-5">
            <motion.div
              animate={isShaking ? { x: [-6, 6, -5, 5, -3, 3, 0] } : {}}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`flex-1 min-h-0 ${
                isTrueFalse
                  ? "grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3"
                  : "grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5"
              } ${isTrueFalse ? "grid-rows-2 sm:grid-rows-1" : "grid-rows-4 md:grid-rows-2"}`}
            >
              {resolvedOptions.map((option, index) => {
                const label = String.fromCharCode(65 + index);
                const trueFalseIcon =
                  option.toLowerCase().includes("vero") || option.toLowerCase().includes("true") ? "âœ“" : "âœ—";
                const trueFalseColor =
                  option.toLowerCase().includes("vero") || option.toLowerCase().includes("true")
                    ? "text-emerald-400" : "text-rose-400";

                return (
                  <button
                    key={`${card.id}-${index}`}
                    ref={(el) => { optionsRef.current[index] = el; }}
                    onClick={() => handleSelect(option)}
                    disabled={!!selectedOption || isSubmitting || !!result}
                    className={`w-full h-full ${getOptionStyles(option)}`}
                  >
                    {isTrueFalse ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2 px-4 py-3">
                        <div className={`text-3xl font-bold ${trueFalseColor}`}>{trueFalseIcon}</div>
                        <div className="text-base font-bold sm:text-lg">{option}</div>
                        {(selectedOption || result === "dontKnow") && option.trim().toLowerCase() === normalizedCorrect && (
                          <div className="absolute top-2 right-2">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        {option === selectedOption && option.trim().toLowerCase() !== normalizedCorrect && (
                          <div className="absolute top-2 right-2">
                            <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 px-3 sm:px-3.5 py-2.5 h-full">
                        {/* Badge lettera */}
                        <div className={`${getLabelStyles(option)} flex-shrink-0`}>{label}</div>

                        {/* Testo opzione */}
                        <div className={`flex-1 text-left text-sm sm:text-base font-medium leading-relaxed ${
                          selectedOption || result
                            ? option.trim().toLowerCase() === normalizedCorrect
                              ? "text-emerald-700 dark:text-emerald-100"
                              : option === selectedOption
                                ? "text-rose-700 dark:text-rose-100"
                                : "text-theme-disabled"
                            : "text-theme-primary"
                        }`}>
                          {option}
                        </div>

                        {/* Scorciatoia (solo prima di rispondere) */}
                        {!selectedOption && !result && (
                          <kbd className="hidden lg:flex flex-shrink-0 items-center justify-center w-5 h-5 rounded bg-theme-surface border border-theme-default text-[10px] font-mono text-theme-muted">
                            {index + 1}
                          </kbd>
                        )}

                        {/* Check / X */}
                        {(selectedOption || result === "dontKnow") && (
                          <div className="flex-shrink-0 w-4 h-4">
                            {option.trim().toLowerCase() === normalizedCorrect ? (
                              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : option === selectedOption ? (
                              <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
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
          </div>
        </div>

        {/* â”€â”€ Footer: Non lo so (sx) + Avanti (dx) â”€â”€ */}
        <div className="flex-none border-t border-theme-subtle bg-theme-surface/70 px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:pb-3 flex items-center gap-2 sm:gap-3">
          {!selectedOption && !result && !isTrueFalse ? (
            <button
              ref={dontKnowRef}
              onClick={handleDontKnow}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/8 text-amber-600 dark:text-amber-300 text-xs sm:text-sm font-medium transition-all duration-150 hover:bg-amber-500/15 hover:border-amber-500/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
            >
              <span>ðŸ¤”</span>
              <span className="hidden sm:inline">Non lo so</span>
              <kbd className="hidden lg:inline-flex px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-mono border border-amber-500/30">0</kbd>
            </button>
          ) : (
            <div className="flex-shrink-0 w-0" />
          )}

          <button
            onClick={canContinue ? handleContinue : undefined}
            disabled={!canContinue || isExiting}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-150 ${
              canContinue
                ? result === "dontKnow"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-px active:translate-y-0"
                  : "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm shadow-primary-500/20 hover:shadow-primary-500/30 hover:-translate-y-px active:translate-y-0"
                : "bg-theme-surface border border-theme-default text-theme-muted cursor-not-allowed"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <span>{canContinue ? continueButtonText : "Seleziona una risposta"}</span>
            {canContinue && (
              <div className="hidden lg:flex items-center gap-1 text-[10px] opacity-75">
                <span>o</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/20 font-mono">Enter</kbd>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizView;
