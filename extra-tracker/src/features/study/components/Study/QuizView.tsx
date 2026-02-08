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

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card, ReviewRating } from '../../services/studyService';

interface QuizViewProps {
    card: Card;
    question: string;
    options: string[];
    correctAnswer: string;
    isSubmitting: boolean;
    onSubmitReview: (rating: ReviewRating) => Promise<boolean | void>;
    onNext: () => void;
    isTrueFalse?: boolean; // Modalità Vero/Falso
}

const fallbackOptions = [
    'Nessuna delle precedenti',
    'Altro',
    'Non specificato',
    'Informazione non presente',
];

const buildOptions = (options: string[], correctAnswer: string) => {
    const cleaned = options.filter((value) => typeof value === 'string' && value.trim());
    const normalizedCorrect = correctAnswer.trim().toLowerCase();
    const hasCorrect = cleaned.some(value => value.trim().toLowerCase() === normalizedCorrect);
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
        filled.push('Nessuna delle precedenti');
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
    const [result, setResult] = useState<'correct' | 'wrong' | 'dontKnow' | null>(null);
    const [isShaking, setIsShaking] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const timeoutRef = useRef<number | null>(null);
    const optionsRef = useRef<(HTMLButtonElement | null)[]>([]);
    const dontKnowRef = useRef<HTMLButtonElement | null>(null);

    const resolvedOptions = useMemo(
        () => buildOptions(options, correctAnswer),
        [options, correctAnswer]
    );

    // Reset state quando cambia la card
    useEffect(() => {
        setSelectedOption(null);
        setResult(null);
        setIsShaking(false);
        setIsExiting(false);
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, [card.id]);

    const handleSelect = useCallback(async (option: string, index: number) => {
        if (selectedOption || isSubmitting || isExiting) return;

        const isCorrect = option.trim().toLowerCase() === normalizedCorrect;
        setSelectedOption(option);
        setResult(isCorrect ? 'correct' : 'wrong');

        if (!isCorrect) {
            // Haptic feedback
            if ('vibrate' in navigator) {
                navigator.vibrate(80);
            }
            // Shake animation trigger
            setIsShaking(true);
            timeoutRef.current = window.setTimeout(() => setIsShaking(false), 350);
        }

        const rating: ReviewRating = isCorrect ? 5 : 1;
        await onSubmitReview(rating);
    }, [selectedOption, isSubmitting, isExiting, normalizedCorrect, onSubmitReview]);

    /**
     * Gestisce il click sul pulsante "Non lo so"
     * - Mostra la risposta corretta
     * - Registra rating 1 (urgenza massima di ripasso, stesso di "sbagliato")
     * - Non applica shake animation (non è un errore, è ammissione di incertezza)
     * NOTA: Il backend accetta solo rating 1-5, quindi "Non lo so" = 1
     */
    const handleDontKnow = useCallback(async () => {
        if (selectedOption || isSubmitting || isExiting) return;

        setResult('dontKnow');
        
        // Haptic feedback più lungo per indicare stato speciale
        if ('vibrate' in navigator) {
            navigator.vibrate([50, 100, 50]);
        }

        // Rating 1 = "Non so/Sbagliato" - urgenza massima di ripasso
        // Il backend non accetta 0, quindi usiamo 1 che ha lo stesso effetto pratico
        const rating: ReviewRating = 1;
        await onSubmitReview(rating);
    }, [selectedOption, isSubmitting, isExiting, onSubmitReview]);

    const handleContinue = useCallback(() => {
        if (isExiting) return;
        
        // Per "Non lo so" non serve selectedOption, solo result
        if (!selectedOption && result !== 'dontKnow') return;
        
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
            if ((selectedOption || result === 'dontKnow') && !isExiting && event.key === 'Enter') {
                event.preventDefault();
                handleContinue();
                return;
            }

            // Altrimenti, se non abbiamo risposto, i numeri selezionano
            if (selectedOption || isSubmitting || isExiting || result === 'dontKnow') return;

            const key = event.key;
            if (['1', '2', '3', '4'].includes(key)) {
                event.preventDefault();
                const index = parseInt(key) - 1;
                if (resolvedOptions[index]) {
                    handleSelect(resolvedOptions[index], index);
                    // Focus sul bottone selezionato per accessibility
                    optionsRef.current[index]?.focus();
                }
            }
            // Tasto 0 per "Non lo so"
            if (key === '0') {
                event.preventDefault();
                handleDontKnow();
                dontKnowRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, [selectedOption, result, isSubmitting, isExiting, resolvedOptions, handleSelect, handleDontKnow, handleContinue]);

    // Auto-focus sul primo elemento quando la card cambia
    useEffect(() => {
        optionsRef.current[0]?.focus();
    }, [card.id]);

    const getOptionStyles = (option: string) => {
        const baseStyles = 'border rounded-2xl transition-all duration-200 text-left group relative overflow-hidden';
        
        if (!selectedOption && !result) {
            return `${baseStyles} border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:border-white/20 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-black/20`;
        }

        const isCorrectOption = option.trim().toLowerCase() === normalizedCorrect;
        const isSelectedOption = option === selectedOption;

        // Se è "Non lo so", evidenzia comunque la risposta corretta
        if (result === 'dontKnow' && isCorrectOption) {
            return `${baseStyles} border-amber-500/50 bg-amber-500/15 text-amber-100 scale-[1.02] ring-2 ring-amber-500/30`;
        }

        if (isCorrectOption) {
            return `${baseStyles} border-emerald-500/50 bg-emerald-500/15 text-emerald-100 scale-[1.02]`;
        }

        if (isSelectedOption) {
            return `${baseStyles} border-rose-500/50 bg-rose-500/15 text-rose-100`;
        }

        return `${baseStyles} border-white/5 bg-white/[0.02] text-white/30 scale-[0.98]`;
    };

    const getLabelStyles = (option: string) => {
        if (!selectedOption && !result) {
            return 'bg-white/10 text-white/60 group-hover:bg-white/15 group-hover:text-white/80';
        }

        const isCorrectOption = option.trim().toLowerCase() === normalizedCorrect;
        const isSelectedOption = option === selectedOption;

        // Se è "Non lo so", la risposta corretta usa stile amber
        if (result === 'dontKnow' && isCorrectOption) {
            return 'bg-amber-500/30 text-amber-200';
        }

        if (isCorrectOption) {
            return 'bg-emerald-500/30 text-emerald-200';
        }

        if (isSelectedOption) {
            return 'bg-rose-500/30 text-rose-200';
        }

        return 'bg-white/5 text-white/30';
    };

    // Determina se mostrare il pulsante continua
    const canContinue = selectedOption || result === 'dontKnow';
    
    // Testo del pulsante continua
    const continueButtonText = result === 'dontKnow' ? 'Ho capito' : 'Continua';

    return (
        <div className="w-full max-w-4xl mx-auto px-4 h-full flex flex-col">
            {/* Card Container - Flex grow per occupare spazio disponibile */}
            <div className="flex-1 min-h-0 flex flex-col rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
                
                {/* Header - Fixed height */}
                <div className="flex-none px-6 sm:px-8 py-5 border-b border-white/[0.06]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center ring-1 ring-indigo-500/30">
                                <span className="text-lg">{isTrueFalse ? '✓✗' : '📝'}</span>
                            </div>
                            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
                                {isTrueFalse ? 'Vero/Falso' : 'Quiz Mode'}
                            </span>
                        </div>
                        
                        <AnimatePresence mode="wait">
                            {result === 'correct' && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center gap-2 text-sm font-semibold text-emerald-300 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Corretto
                                </motion.span>
                            )}
                            {result === 'wrong' && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center gap-2 text-sm font-semibold text-rose-300 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Sbagliato
                                </motion.span>
                            )}
                            {result === 'dontKnow' && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center gap-2 text-sm font-semibold text-amber-300 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Non lo so
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="px-6 sm:px-8 py-6 space-y-6">
                        
                        {/* Question - Con scroll interno se troppo lunga */}
                        <div className="space-y-3">
                            <h2 
                                className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white leading-relaxed whitespace-pre-wrap break-words"
                            >
                                {question}
                            </h2>
                            
                            {/* Hint per shortcuts - mostrato solo prima della risposta */}
                            {!selectedOption && !result && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm text-white/40 flex items-center gap-2 flex-wrap"
                                >
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Usa i tasti</span>
                                    <span className="flex items-center gap-1">
                                        {(isTrueFalse ? [1, 2] : [1, 2, 3, 4]).map(num => (
                                            <kbd
                                                key={num}
                                                className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-xs font-mono border border-white/5"
                                            >
                                                {num}
                                            </kbd>
                                        ))}
                                    </span>
                                    <span>per rispondere</span>
                                    {!isTrueFalse && (
                                        <>
                                            <span>,</span>
                                            <kbd className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-mono border border-amber-500/30">
                                                0
                                            </kbd>
                                            <span>se non sai</span>
                                        </>
                                    )}
                                </motion.p>
                            )}
                        </div>

                        {/* Options Grid */}
                        <motion.div
                            animate={isShaking ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            className={isTrueFalse ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-3"}
                        >
                            {resolvedOptions.map((option, index) => {
                                const label = String.fromCharCode(65 + index); // A, B, C, D

                                // Icone/emoji per Vero/Falso
                                const trueFalseIcon = option.toLowerCase().includes('vero') || option.toLowerCase().includes('true')
                                    ? '✓'
                                    : '✗';
                                const trueFalseColor = option.toLowerCase().includes('vero') || option.toLowerCase().includes('true')
                                    ? 'text-emerald-400'
                                    : 'text-rose-400';

                                return (
                                    <button
                                        key={`${card.id}-${index}`}
                                        ref={el => { optionsRef.current[index] = el; }}
                                        onClick={() => handleSelect(option, index)}
                                        disabled={!!selectedOption || isSubmitting || !!result}
                                        className={isTrueFalse
                                            ? `min-h-[120px] sm:min-h-[140px] ${getOptionStyles(option)}`
                                            : `min-h-[72px] sm:min-h-[80px] ${getOptionStyles(option)}`
                                        }
                                    >
                                        {isTrueFalse ? (
                                            // Layout Vero/Falso: centrato verticalmente con icona grande
                                            <div className="flex flex-col items-center justify-center gap-3 px-5 py-6">
                                                <div className={`text-5xl font-bold ${trueFalseColor}`}>
                                                    {trueFalseIcon}
                                                </div>
                                                <div className="text-xl sm:text-2xl font-bold">
                                                    {option}
                                                </div>

                                                {/* Check/X Icon for answered state - inline */}
                                                {(selectedOption || result === 'dontKnow') && option.trim().toLowerCase() === normalizedCorrect && (
                                                    <div className="absolute top-3 right-3">
                                                        <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                )}
                                                {option === selectedOption && option.trim().toLowerCase() !== normalizedCorrect && (
                                                    <div className="absolute top-3 right-3">
                                                        <svg className="w-7 h-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            // Layout standard: orizzontale con label A-D
                                            <div className="flex items-start gap-4 px-5 py-4">
                                                {/* Label A, B, C, D */}
                                                <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-200 ${getLabelStyles(option)}`}>
                                                    {label}
                                                </div>

                                                {/* Option Text */}
                                                <div className="flex-1 text-left text-base sm:text-lg font-medium leading-relaxed py-0.5">
                                                    {option}
                                                </div>

                                                {/* Keyboard Shortcut Indicator */}
                                                {!selectedOption && !result && (
                                                    <kbd className="hidden sm:flex flex-shrink-0 items-center justify-center w-7 h-7 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-white/40">
                                                        {index + 1}
                                                    </kbd>
                                                )}

                                                {/* Check/X Icon for answered state */}
                                                {(selectedOption || result === 'dontKnow') && (
                                                    <div className="flex-shrink-0">
                                                        {option.trim().toLowerCase() === normalizedCorrect ? (
                                                            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        ) : option === selectedOption ? (
                                                            <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                        {/* Pulsante "Non lo so" - mostrato solo se non si è ancora risposto e non in modalità Vero/Falso */}
                        {!selectedOption && !result && !isTrueFalse && (
                            <div className="flex justify-center pt-2">
                                <button
                                    ref={dontKnowRef}
                                    onClick={handleDontKnow}
                                    disabled={isSubmitting}
                                    className="group flex items-center gap-3 px-6 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300/80 font-medium transition-all duration-200 hover:bg-amber-500/15 hover:border-amber-500/50 hover:text-amber-200 hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span>🤔</span>
                                    <span>Non lo so</span>
                                    <kbd className="hidden sm:inline-flex px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-mono border border-amber-500/30">
                                        0
                                    </kbd>
                                </button>
                            </div>
                        )}

                        {/* Messaggio esplicativo quando si seleziona "Non lo so" */}
                        {result === 'dontKnow' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25 }}
                                className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-amber-200 font-medium mb-1">
                                            La risposta corretta è evidenziata sopra
                                        </p>
                                        <p className="text-amber-200/60 text-sm">
                                            Leggi attentamente e premi "Ho capito" quando sei pronto per continuare.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Continue Button - Fixed at bottom */}
                <AnimatePresence>
                    {canContinue && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="flex-none px-6 sm:px-8 py-5 border-t border-white/[0.06] bg-white/[0.02]"
                        >
                            <button
                                onClick={handleContinue}
                                disabled={isExiting}
                                className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold shadow-lg transition-all duration-200 hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed ${
                                    result === 'dontKnow'
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-500/25 hover:shadow-amber-500/35'
                                        : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/35'
                                }`}
                            >
                                <span>{continueButtonText}</span>
                                <div className="flex items-center gap-1.5 text-sm opacity-80">
                                    <span>o premi</span>
                                    <kbd className="px-2 py-1 rounded bg-white/20 text-xs font-mono">Enter</kbd>
                                </div>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default QuizView;
