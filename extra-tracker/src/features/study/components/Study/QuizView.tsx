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
import { Check, X, HelpCircle, Lightbulb, AlertCircle } from "lucide-react";
import type { Card, ReviewRating } from "../../services/studyService";
import { cn } from "../../../../lib/utils";

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

const buildOptions = (options: string[], correctAnswer: string, isTrueFalse: boolean) => {
  if (isTrueFalse) {
    // Per Vero/Falso, vogliamo solo 2 opzioni
    const pool = options.filter(o => typeof o === 'string' && o.trim());
    const hasTrue = pool.some(o => o.toLowerCase().includes('vero') || o.toLowerCase().includes('true'));
    const hasFalse = pool.some(o => o.toLowerCase().includes('falso') || o.toLowerCase().includes('false'));
    
    if (hasTrue && hasFalse) {
      // Ordina in modo che Vero sia sempre a sinistra/sopra
      return pool
        .filter(o => 
          o.toLowerCase().includes('vero') || o.toLowerCase().includes('true') ||
          o.toLowerCase().includes('falso') || o.toLowerCase().includes('false')
        )
        .sort((a, b) => {
          const aIsTrue = a.toLowerCase().includes('vero') || a.toLowerCase().includes('true');
          return aIsTrue ? -1 : 1;
        })
        .slice(0, 2);
    }
    
    // Fallback se non ci sono entrambi
    return ["Vero", "Falso"];
  }

  const cleaned = options.filter(
    (value) => typeof value === "string" && value.trim() && 
    !["nessuna delle precedenti", "altro", "non specificato", "informazione non presente"].includes(value.trim().toLowerCase())
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

  return filled;
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
    () => buildOptions(options, correctAnswer, isTrueFalse),
    [options, correctAnswer, isTrueFalse],
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
   */
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

      if (selectedOption || isSubmitting || isExiting || result === "dontKnow")
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
  }, [card.id]);

  const getOptionStyles = (option: string) => {
    const baseStyles =
      "border rounded-2xl transition-all duration-200 text-left group relative overflow-hidden flex flex-col items-center justify-center p-4 min-h-[120px] sm:min-h-[160px]";

    if (!selectedOption && !result) {
      return cn(
        baseStyles,
        "border-theme-default bg-theme-surface hover:bg-theme-surface-hover hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-500/5"
      );
    }

    const isCorrectOption = option.trim().toLowerCase() === normalizedCorrect;
    const isSelectedOption = option === selectedOption;

    if (result === "dontKnow" && isCorrectOption) {
      return cn(
        baseStyles,
        "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-100 scale-[1.02] ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10"
      );
    }

    if (isCorrectOption) {
      return cn(
        baseStyles,
        "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100 scale-[1.02] shadow-lg shadow-emerald-500/10"
      );
    }

    if (isSelectedOption) {
      return cn(
        baseStyles,
        "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-100 shadow-lg shadow-rose-500/10"
      );
    }

    return cn(
      baseStyles,
      "border-theme-subtle bg-theme-surface/30 text-theme-disabled scale-[0.98] opacity-60"
    );
  };

  const getLabelStyles = (option: string) => {
    const baseStyles =
      "absolute top-3 left-3 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200";

    if (!selectedOption && !result) {
      return cn(
        baseStyles,
        "bg-theme-elevated text-theme-secondary border border-theme-default group-hover:border-primary-500/30 group-hover:text-primary-600 dark:group-hover:text-primary-400"
      );
    }

    const isCorrectOption = option.trim().toLowerCase() === normalizedCorrect;
    const isSelectedOption = option === selectedOption;

    if (result === "dontKnow" && isCorrectOption) {
      return cn(baseStyles, "bg-amber-500 text-white border border-amber-600");
    }

    if (isCorrectOption) {
      return cn(baseStyles, "bg-emerald-500 text-white border border-emerald-600");
    }

    if (isSelectedOption) {
      return cn(baseStyles, "bg-rose-500 text-white border border-rose-600");
    }

    return cn(baseStyles, "bg-theme-surface text-theme-disabled border border-theme-subtle");
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
    <div className="flex flex-col w-full h-full max-w-6xl px-3 mx-auto sm:px-4 lg:px-6">
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden border rounded-2xl border-theme-default bg-theme-elevated shadow-theme-lg">
        
        {/* area domanda */}
        <div className="flex-none px-6 py-8 sm:px-10 sm:py-12 border-b border-theme-subtle bg-theme-surface/30">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-bold leading-tight text-center break-words whitespace-pre-wrap sm:text-2xl md:text-3xl lg:text-4xl text-theme-primary"
          >
            {question}
          </motion.h2>

          {/* Badge AI distractor fallback */}
          {usedFallbackOptions && (
            <div className="flex justify-center mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                Opzioni generate automaticamente
              </span>
            </div>
          )}
        </div>

        {/* area feedback e opzioni */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {/* Feedback esito */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-6 py-4 border-b border-theme-subtle"
              >
                {result === "correct" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Check className="w-5 h-5 text-white" strokeWidth={3} />
                      </div>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Ottimo! Risposta corretta.</span>
                    </div>
                    {explanation && (
                      <div className="flex items-start gap-3 px-4 py-3 border rounded-xl border-emerald-500/10 bg-emerald-500/5">
                        <Lightbulb className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm leading-relaxed text-theme-secondary">{explanation}</p>
                      </div>
                    )}
                  </div>
                )}

                {result === "wrong" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                        <X className="w-5 h-5 text-white" strokeWidth={3} />
                      </div>
                      <span className="text-lg font-bold text-rose-600 dark:text-rose-400">Quasi! La risposta corretta era un'altra.</span>
                    </div>
                    {(selectedExplanation || explanation) && (
                      <div className="flex items-start gap-3 px-4 py-3 border rounded-xl border-rose-500/10 bg-rose-500/5">
                        <HelpCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-2">
                          {selectedExplanation && <p className="text-sm leading-relaxed text-theme-secondary">{selectedExplanation}</p>}
                          {explanation && <p className="text-sm leading-relaxed text-theme-secondary">{explanation}</p>}
                        </div>
                      </div>
                    )}
                    {isTrueFalse && correctStatement && (
                      <div className="flex items-start gap-3 px-4 py-3 border rounded-xl border-emerald-500/10 bg-emerald-500/5">
                        <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm leading-relaxed text-theme-secondary">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">Versione corretta:</span> {correctStatement}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {result === "dontKnow" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <HelpCircle className="w-5 h-5 text-white" strokeWidth={3} />
                      </div>
                      <span className="text-lg font-bold text-amber-600 dark:text-amber-400">Nessun problema, ecco la soluzione.</span>
                    </div>
                    {explanation && (
                      <div className="flex items-start gap-3 px-4 py-3 border rounded-xl border-amber-500/10 bg-amber-500/5">
                        <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm leading-relaxed text-theme-secondary">{explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Area Opzioni */}
          <div className="p-6 sm:p-8 lg:p-10">
            <motion.div
              animate={isShaking ? { x: [-6, 6, -5, 5, -3, 3, 0] } : {}}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={cn(
                "grid gap-4 sm:gap-6",
                isTrueFalse ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 md:grid-cols-2"
              )}
            >
              {resolvedOptions.map((option, index) => {
                const isCorrectOption = option.trim().toLowerCase() === normalizedCorrect;
                const isSelectedOption = option === selectedOption;
                const isVero = option.toLowerCase().includes("vero") || option.toLowerCase().includes("true");
                const isFalso = option.toLowerCase().includes("falso") || option.toLowerCase().includes("false");

                return (
                  <button
                    key={`${card.id}-${index}`}
                    ref={(el) => { optionsRef.current[index] = el; }}
                    onClick={() => handleSelect(option)}
                    disabled={!!selectedOption || isSubmitting || !!result}
                    className={getOptionStyles(option)}
                  >
                    {!isTrueFalse && <div className={getLabelStyles(option)}>{String.fromCharCode(65 + index)}</div>}
                    
                    <div className="flex flex-col items-center gap-4">
                      {isTrueFalse && (
                        <div className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
                          isVero ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500",
                          (selectedOption || result) && !isCorrectOption && !isSelectedOption && "opacity-40 grayscale"
                        )}>
                          {isVero ? <Check className="w-8 h-8" strokeWidth={3} /> : <X className="w-8 h-8" strokeWidth={3} />}
                        </div>
                      )}
                      
                      <span className={cn(
                        "text-lg font-bold text-center sm:text-xl",
                        (selectedOption || result) && !isCorrectOption && !isSelectedOption && "text-theme-disabled"
                      )}>
                        {option}
                      </span>
                    </div>

                    {/* Feedback Icon */}
                    <AnimatePresence>
                      {(selectedOption || result === "dontKnow") && isCorrectOption && (
                        <motion.div 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                        >
                          <Check className="w-5 h-5 text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                      {isSelectedOption && !isCorrectOption && (
                        <motion.div 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30"
                        >
                          <X className="w-5 h-5 text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Shortcut key */}
                    {!selectedOption && !result && !isTrueFalse && (
                      <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-theme-elevated border border-theme-default text-[10px] font-mono text-theme-muted opacity-0 group-hover:opacity-100 transition-opacity">
                        {index + 1}
                      </div>
                    )}
                  </button>
                );
              })}
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none border-t border-theme-subtle bg-theme-surface/50 px-6 py-4 flex items-center gap-4">
          {!selectedOption && !result && (
            <button
              ref={dontKnowRef}
              onClick={handleDontKnow}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 font-bold transition-all hover:bg-amber-500/10 active:scale-95 disabled:opacity-50"
            >
              <HelpCircle className="w-5 h-5" />
              <span>Non lo so</span>
              <kbd className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 rounded bg-amber-500/10 font-mono text-[10px]">0</kbd>
            </button>
          )}

          <button
            onClick={canContinue ? handleContinue : undefined}
            disabled={!canContinue || isExiting}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200",
              canContinue
                ? "bg-primary-500 text-white shadow-xl shadow-primary-500/20 hover:bg-primary-400 hover:-translate-y-0.5 active:translate-y-0"
                : "bg-theme-surface border border-theme-default text-theme-muted cursor-not-allowed"
            )}
          >
            <span>{canContinue ? continueButtonText : "Seleziona una risposta"}</span>
            {canContinue && <Check className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizView;
