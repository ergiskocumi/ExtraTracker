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
import { Check, X, HelpCircle, Lightbulb, AlertCircle, Quote } from "lucide-react";
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
    const isVero = option.toLowerCase().includes("vero") || option.toLowerCase().includes("true");
    const isFalso = option.toLowerCase().includes("falso") || option.toLowerCase().includes("false");
    
    const baseStyles =
      "border-2 rounded-3xl transition-all duration-300 text-left group relative overflow-hidden flex flex-col items-center justify-center p-6 min-h-[180px] sm:min-h-[220px] shadow-sm";

    if (!selectedOption && !result) {
      if (isTrueFalse) {
        if (isVero) return cn(baseStyles, "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:shadow-emerald-500/10");
        if (isFalso) return cn(baseStyles, "border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/40 hover:shadow-rose-500/10");
      }
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
        "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-100 scale-[1.02] ring-4 ring-amber-500/20 shadow-xl shadow-amber-500/20"
      );
    }

    if (isCorrectOption) {
      return cn(
        baseStyles,
        "border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-100 scale-[1.02] shadow-xl shadow-emerald-500/20"
      );
    }

    if (isSelectedOption) {
      return cn(
        baseStyles,
        "border-rose-500 bg-rose-500/20 text-rose-700 dark:text-rose-100 shadow-xl shadow-rose-500/20"
      );
    }

    return cn(
      baseStyles,
      "border-theme-subtle bg-theme-surface/30 text-theme-disabled scale-[0.98] opacity-40 grayscale"
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
    <div className="flex flex-col w-full h-full max-w-6xl px-3 mx-auto sm:px-4 lg:px-6 gap-4 sm:gap-6 py-2 sm:py-4">
      <motion.div 
        layout
        transition={{
          layout: { type: "spring", stiffness: 200, damping: 30 },
        }}
        className={cn(
          "flex-1 flex flex-col min-h-0",
          !result ? "justify-center" : "justify-start pt-4"
        )}
      >
        {/* area domanda - Dimensioni ottimizzate per visibilità immediata */}
        <motion.div 
          layout
          transition={{
            layout: { type: "spring", stiffness: 200, damping: 30 },
          }}
          className={cn(
            "flex-none relative overflow-hidden border rounded-[2rem] border-theme-default bg-theme-elevated shadow-theme-lg p-6 sm:p-10 lg:p-12",
            !result ? "mb-6 sm:mb-10" : "mb-4 sm:mb-6"
          )}
        >
          {/* Decorazione Quote - Più elegante e viola */}
          <div className="absolute top-4 left-6 text-purple-500/10">
            <Quote className="w-8 h-8 sm:w-12 sm:h-12 fill-current" />
          </div>

          <motion.h2 
            layout="position"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-relaxed text-center break-words whitespace-pre-wrap text-theme-primary tracking-tight max-w-3xl mx-auto"
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
          >
            {question}
          </motion.h2>

          {/* Badge AI distractor fallback - Più compatto */}
          {usedFallbackOptions && (
            <motion.div layout="position" className="flex justify-center mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                <AlertCircle className="w-3 h-3" />
                AI Generated
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Area Feedback e Opzioni - Ottimizzata per evitare scroll */}
        <div className="flex flex-col min-h-0 gap-4 sm:gap-6">
          {/* Feedback esito - Più compatto */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 25,
                  opacity: { duration: 0.2 }
                }}
                className="w-full max-w-4xl mx-auto mb-4 sm:mb-6"
              >
                {result === "correct" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-[2rem] bg-emerald-500/10 border-2 border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                      <div className="p-2 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                        <Check className="w-6 h-6" strokeWidth={4} />
                      </div>
                      <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight uppercase italic">Ottimo lavoro!</span>
                    </div>
                    {explanation && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="px-8 py-6 border-2 rounded-[2rem] border-emerald-500/10 bg-emerald-500/5 shadow-inner"
                      >
                        <p className="text-base sm:text-lg md:text-xl leading-relaxed text-theme-primary text-center font-medium italic">
                          <Quote className="w-4 h-4 inline-block -mt-2 mr-2 opacity-20 rotate-180" />
                          {explanation}
                          <Quote className="w-4 h-4 inline-block -mt-2 ml-2 opacity-20" />
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}

                {result === "wrong" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-[2rem] bg-rose-500/10 border-2 border-rose-500/20 shadow-lg shadow-rose-500/5">
                      <div className="p-2 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/20">
                        <X className="w-6 h-6" strokeWidth={4} />
                      </div>
                      <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight uppercase italic">Non proprio...</span>
                    </div>
                    {(selectedExplanation || explanation) && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="px-8 py-6 border-2 rounded-[2rem] border-rose-500/10 bg-rose-500/5 shadow-inner"
                      >
                        <div className="space-y-3 text-center">
                          {selectedExplanation && (
                            <p className="text-base sm:text-lg md:text-xl leading-relaxed text-theme-primary font-medium italic">
                              {selectedExplanation}
                            </p>
                          )}
                          {explanation && (
                            <p className="text-base sm:text-lg md:text-xl leading-relaxed text-theme-secondary font-medium italic opacity-80">
                              {explanation}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {result === "dontKnow" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/20 shadow-lg shadow-amber-500/5">
                      <div className="p-2 rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                        <HelpCircle className="w-6 h-6" strokeWidth={4} />
                      </div>
                      <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight uppercase italic">Ecco la soluzione</span>
                    </div>
                    {explanation && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="px-8 py-6 border-2 rounded-[2rem] border-amber-500/10 bg-amber-500/5 shadow-inner"
                      >
                        <p className="text-base sm:text-lg md:text-xl leading-relaxed text-theme-primary text-center font-medium italic">
                          {explanation}
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Area Opzioni - Grid ottimizzata */}
          <motion.div 
            layout
            transition={{
              layout: { type: "spring", stiffness: 200, damping: 30 },
            }}
            className={cn(
              "flex items-center justify-center",
              !result ? "flex-1" : "flex-none"
            )}
          >
            <motion.div
              layout
              animate={isShaking ? { x: [-6, 6, -5, 5, -3, 3, 0] } : {}}
              transition={{ 
                x: { duration: 0.35, ease: "easeOut" },
                layout: { type: "spring", stiffness: 200, damping: 30 }
              }}
              className={cn(
                "grid gap-4 sm:gap-6 w-full max-w-5xl mx-auto",
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
                    className={cn(
                      getOptionStyles(option),
                      "min-h-[140px] sm:min-h-[180px]" // Altezza ridotta per visibilità
                    )}
                  >
                    {!isTrueFalse && <div className={getLabelStyles(option)}>{String.fromCharCode(65 + index)}</div>}
                    
                    <div className="flex flex-col items-center gap-4">
                      {isTrueFalse && (
                        <div className={cn(
                          "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-inner",
                          isVero ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500",
                          (selectedOption || result) && !isCorrectOption && !isSelectedOption && "opacity-20 grayscale"
                        )}>
                          {isVero ? <Check className="w-8 h-8" strokeWidth={4} /> : <X className="w-8 h-8" strokeWidth={4} />}
                        </div>
                      )}
                      
                      <span className={cn(
                        "text-xl font-black text-center sm:text-2xl tracking-tight transition-colors duration-300",
                        (selectedOption || result) && !isCorrectOption && !isSelectedOption && "text-theme-disabled"
                      )}>
                        {option}
                      </span>
                    </div>

                    {/* Feedback Icon Overlay */}
                    <AnimatePresence>
                      {(selectedOption || result === "dontKnow") && isCorrectOption && (
                        <motion.div 
                          initial={{ scale: 0, opacity: 0, rotate: -20 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/40 border-2 border-white dark:border-emerald-400"
                        >
                          <Check className="w-5 h-5 text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                      {isSelectedOption && !isCorrectOption && (
                        <motion.div 
                          initial={{ scale: 0, opacity: 0, rotate: 20 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center shadow-xl shadow-rose-500/40 border-2 border-white dark:border-rose-400"
                        >
                          <X className="w-5 h-5 text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Footer - Actions compatte */}
      <div className="flex-none flex items-center justify-center gap-4 py-2">
        {!selectedOption && !result && (
          <button
            ref={dontKnowRef}
            onClick={handleDontKnow}
            disabled={isSubmitting}
            className="group flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 font-black transition-all hover:bg-amber-500/10 active:scale-95 disabled:opacity-50"
          >
            <HelpCircle className="w-5 h-5 transition-transform group-hover:rotate-12" />
            <span className="text-sm">Non lo so</span>
            <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 font-mono text-[10px] border border-amber-500/20">0</kbd>
          </button>
        )}

        <button
          onClick={canContinue ? handleContinue : undefined}
          disabled={!canContinue || isExiting}
          className={cn(
            "min-w-[200px] flex items-center justify-center gap-2 px-8 py-4 rounded-[1.5rem] font-black text-lg transition-all duration-300 shadow-xl",
            canContinue
              ? "bg-primary-500 text-white shadow-primary-500/30 hover:bg-primary-400 hover:-translate-y-0.5 active:translate-y-0"
              : "bg-theme-surface border-2 border-theme-default text-theme-muted cursor-not-allowed opacity-50"
          )}
        >
          <span className="text-base text-white">{canContinue ? continueButtonText : "Seleziona una risposta"}</span>
          {canContinue && <motion.div animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}><Check className="w-5 h-5 text-white" strokeWidth={3} /></motion.div>}
        </button>
      </div>
    </div>
  );
};

export default QuizView;
