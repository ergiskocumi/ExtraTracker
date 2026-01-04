/**
 * 📚 STUDY SESSION PAGE - Refactored & Optimized
 * 
 * Features:
 * - Full-screen overlay "Zen Mode" che copre tutta l'UI
 * - Progress bar segmentata con pallini per ogni carta
 * - Bottoni rating grandi, thumb-friendly per mobile
 * - Scorciatoie tastiera (Spazio flip, 1/2/3 voto)
 * - Animazioni fluide e feedback tattile
 * - Schermata riepilogo celebrativa
 * 
 * REFACTOR: Risolto problema di ricaricamento sessione dopo completamento
 * - Usa useRef per tracciare completamento (non viene resettato da re-render)
 * - Separata logica di caricamento da completamento
 * - checkAuth chiamato in modo non bloccante
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiX } from 'react-icons/fi';
import { Flashcard, FlashcardSkeleton } from '../components/Flashcard';
import { QuizView } from '../components/QuizView';
import { TypingView } from '../components/TypingView';
import { studyService, type StudySession, type ReviewRating, type StudyMode, type Card } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { SessionSummaryModal, type SessionSummary } from '../../gamification/SessionSummaryModal';
import { useAuth } from '../../auth/context/AuthContext';

// ============================================
// RATING BUTTON COMPONENT
// ============================================

interface RatingButtonProps {
    label: string;
    emoji: string;
    shortcut: string;
    color: 'red' | 'amber' | 'green';
    onClick: () => void;
    disabled?: boolean;
}

const RatingButton: React.FC<RatingButtonProps> = ({ 
    label, 
    emoji,
    shortcut, 
    color, 
    onClick,
    disabled 
}) => {
    const colorConfig = {
        red: {
            bg: 'bg-red-500/15 hover:bg-red-500/25 active:bg-red-500/35',
            text: 'text-red-400',
            border: 'border-red-500/30 hover:border-red-500/50',
            ring: 'focus:ring-red-500/30'
        },
        amber: {
            bg: 'bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35',
            text: 'text-amber-400',
            border: 'border-amber-500/30 hover:border-amber-500/50',
            ring: 'focus:ring-amber-500/30'
        },
        green: {
            bg: 'bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35',
            text: 'text-emerald-400',
            border: 'border-emerald-500/30 hover:border-emerald-500/50',
            ring: 'focus:ring-emerald-500/30'
        },
    };

    const cfg = colorConfig[color];

    return (
        <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClick}
            disabled={disabled}
            className={`
                relative flex flex-col items-center justify-center gap-2
                w-full sm:w-32 h-24 sm:h-28 rounded-2xl
                ${cfg.bg} ${cfg.text} ${cfg.border}
                border transition-all duration-200
                focus:outline-none focus:ring-4 ${cfg.ring}
                disabled:opacity-40 disabled:cursor-not-allowed
            `}
        >
            <span className="text-3xl sm:text-4xl">{emoji}</span>
            <span className="text-sm font-semibold uppercase tracking-wide">{label}</span>
            <kbd className="absolute bottom-2 right-2.5 text-xs font-mono opacity-40 hidden sm:block">
                {shortcut}
            </kbd>
        </motion.button>
    );
};

// ============================================
// UTILITIES
// ============================================

const shuffleArray = <T,>(values: T[]): T[] => {
    const arr = [...values];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const normalizeAnswer = (value: string) => {
    return value
        .toLowerCase()
        .trim()
        .replace(/[\s.,!?;:]+$/g, '')
        .replace(/\s+/g, ' ');
};

const levenshteinDistance = (a: string, b: string) => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const prev = new Array(b.length + 1);
    const curr = new Array(b.length + 1);

    for (let j = 0; j <= b.length; j += 1) {
        prev[j] = j;
    }

    for (let i = 1; i <= a.length; i += 1) {
        curr[0] = i;
        const aChar = a[i - 1];

        for (let j = 1; j <= b.length; j += 1) {
            const cost = aChar === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + cost
            );
        }

        for (let j = 0; j <= b.length; j += 1) {
            prev[j] = curr[j];
        }
    }

    return prev[b.length];
};

const calculateSimilarity = (userAnswer: string, realAnswer: string) => {
    const normalizedUser = normalizeAnswer(userAnswer);
    const normalizedReal = normalizeAnswer(realAnswer);

    if (!normalizedUser || !normalizedReal) {
        return { correct: false, similarity: 0 };
    }

    if (normalizedUser === normalizedReal) {
        return { correct: true, similarity: 1 };
    }

    const maxLen = Math.max(normalizedUser.length, normalizedReal.length);
    if (!maxLen) {
        return { correct: true, similarity: 1 };
    }

    const distance = levenshteinDistance(normalizedUser, normalizedReal);
    const similarity = 1 - distance / maxLen;

    return { correct: similarity >= 0.85, similarity };
};

const SESSION_BASE_XP = 10;

const calculateSessionXpBreakdown = (
    correctCount: number,
    wrongCount: number,
    timeSpentSeconds: number
) => {
    const totalCards = correctCount + wrongCount;
    const timePerCard = totalCards > 0 ? timeSpentSeconds / totalCards : 0;
    const speedBonus = timePerCard > 0
        ? Math.max(0, Math.round(10 - timePerCard / 3))
        : 0;
    const correctXp = correctCount * 2;

    return {
        base: SESSION_BASE_XP,
        correct: correctXp,
        speedBonus,
        streakBonus: 0,
        total: SESSION_BASE_XP + correctXp + speedBonus,
    };
};

// ============================================
// GLOBAL SESSION STATE (persiste tra remount)
// ============================================

// Ref globale per tracciare sessioni completate (persiste anche se componente viene remontato)
const globalCompletedSessions = new Set<string>();

// ============================================
// MAIN STUDY SESSION PAGE
// ============================================

export const StudySessionPage: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();
    const { checkAuth } = useAuth();
    const [searchParams] = useSearchParams();
    const requestedMode = (searchParams.get('mode') || 'flashcard').toLowerCase();
    const mode: StudyMode = ['flashcard', 'quiz', 'typing'].includes(requestedMode)
        ? (requestedMode as StudyMode)
        : 'flashcard';
    const shuffle = searchParams.get('shuffle') === 'true';
    const reverse = searchParams.get('reverse') === 'true';
    const effectiveReverse = mode === 'quiz' ? false : reverse;

    // State
    const [session, setSession] = useState<StudySession | null>(null);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [startTime, setStartTime] = useState(Date.now());

    // Stats per la sessione
    const [sessionStats, setSessionStats] = useState({
        total: 0,
        hard: 0,
        good: 0,
        easy: 0,
        duration: 0
    });
    const sessionStatsRef = useRef(sessionStats);
    
    // Summary state
    const [summary, setSummary] = useState<SessionSummary | null>(null);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);

    // REFACTOR: Usa ref locale + globale per tracciare completamento
    const isSessionCompleteRef = useRef(false);
    const hasLoadedSessionRef = useRef(false);
    const sessionKey = deckId ? `${deckId}-${mode}` : null;

    const updateSessionStats = useCallback((updater: (prev: typeof sessionStats) => typeof sessionStats) => {
        const next = updater(sessionStatsRef.current);
        sessionStatsRef.current = next;
        setSessionStats(next);
    }, []);

    // REFACTOR: Carica sessione solo una volta all'inizio
    useEffect(() => {
        if (!sessionKey) return;

        // Se la sessione è già completa (globale o locale), non ricaricare MAI
        if (isSessionCompleteRef.current || globalCompletedSessions.has(sessionKey)) {
            // Se la sessione è completata ma non abbiamo summary, naviga via (evita loop)
            if (!summary) {
                setTimeout(() => navigate('/study'), 100);
            }
            return;
        }

        // Se abbiamo già caricato una sessione, non ricaricare
        if (hasLoadedSessionRef.current) {
            return;
        }

        const loadSession = async () => {
            if (!deckId) {
                setError('ID mazzo non valido');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                const data = await studyService.getSession(deckId, mode);

                if (data.cards.length === 0) {
                    emitToast.info('Nessuna carta da studiare in questo mazzo!');
                    navigate('/study');
                    return;
                }

                const orderedCards = shuffle ? shuffleArray(data.cards) : data.cards;
                setSession({ ...data, cards: orderedCards });
                setCurrentCardIndex(0);
                setIsFlipped(false);
                setExitDirection(null);
                setStartTime(Date.now());
                updateSessionStats(() => ({
                    total: orderedCards.length,
                    hard: 0,
                    good: 0,
                    easy: 0,
                    duration: 0,
                }));
                hasLoadedSessionRef.current = true;
            } catch (err: any) {
                setError(err.message || 'Errore nel caricamento della sessione');
                emitToast.error('Impossibile caricare la sessione di studio');
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
    }, [deckId, mode, shuffle, sessionKey]); // Rimosso navigate e updateSessionStats dalle dipendenze

    // Carta corrente
    const currentCard = session?.cards[currentCardIndex] ?? null;
    const displayCard: Card | null = currentCard && effectiveReverse
        ? { ...currentCard, front: currentCard.back, back: currentCard.front }
        : currentCard;
    const isFlashcardMode = mode === 'flashcard';
    const isQuizMode = mode === 'quiz';
    const isTypingMode = mode === 'typing';

    // REFACTOR: finalizeSession non chiama più checkAuth in modo sincrono
    const finalizeSession = useCallback(async (durationSeconds: number) => {
        if (!sessionKey) return;

        // Se già finalizzata, non rifare
        if (isSessionCompleteRef.current || globalCompletedSessions.has(sessionKey) || isFinalizing || !deckId || !session) {
            return;
        }

        const statsSnapshot = sessionStatsRef.current;
        const correctCount = statsSnapshot.good + statsSnapshot.easy;
        const wrongCount = statsSnapshot.hard;

        setIsFinalizing(true);
        isSessionCompleteRef.current = true; // Marca come completata IMMEDIATAMENTE (locale)
        globalCompletedSessions.add(sessionKey); // Marca come completata GLOBALMENTE (persiste tra remount)

        try {
            const result = await studyService.completeSession(deckId, {
                mode,
                stats: {
                    correct: correctCount,
                    wrong: wrongCount,
                    timeSeconds: durationSeconds,
                },
            });

            const fallbackBreakdown = calculateSessionXpBreakdown(
                correctCount,
                wrongCount,
                durationSeconds
            );
            const breakdown = result.xpBreakdown ?? fallbackBreakdown;
            const totalXp = Number.isFinite(result.xpEarned) ? result.xpEarned : breakdown.total;

            setSummary({
                correctCount,
                wrongCount,
                timeSpentSeconds: durationSeconds,
                xp: {
                    base: breakdown.base,
                    correct: breakdown.correct,
                    speedBonus: breakdown.speedBonus,
                    streakBonus: breakdown.streakBonus,
                    total: totalXp,
                },
                // Aggiungi statistiche dettagliate per il summary
                stats: {
                    hard: statsSnapshot.hard,
                    good: statsSnapshot.good,
                    easy: statsSnapshot.easy,
                    totalCards: statsSnapshot.total,
                },
            });
            setIsSummaryOpen(true);

            // REFACTOR: checkAuth chiamato in modo asincrono non bloccante
            // Non aspetta il risultato, così non causa re-render che triggerano useEffect
            checkAuth().catch(() => {
                // Silently fail - non bloccare la sessione
            });
        } catch (err: any) {
            console.error('Errore finalizzazione sessione:', err);
            emitToast.error(err.message || 'Errore nel completamento della sessione');
            // Se fallisce, resetta il flag per permettere retry
            isSessionCompleteRef.current = false;
        } finally {
            setIsFinalizing(false);
        }
    }, [deckId, session, isFinalizing, mode, checkAuth]);

    const advanceCard = useCallback(() => {
        if (!session || isSessionCompleteRef.current) return;

        // Controlla se abbiamo finito tutte le carte
        const nextIndex = currentCardIndex + 1;
        if (nextIndex >= session.cards.length) {
            // Sessione completata!
            const duration = Math.floor((Date.now() - startTime) / 1000);
            updateSessionStats(prev => ({ ...prev, duration }));
            // Chiama finalizeSession immediatamente
            finalizeSession(duration);
            return;
        }

        // Reset stato prima di avanzare per evitare bug visivi
        setIsFlipped(false);
        setExitDirection(null);
        
        // Piccolo delay per permettere all'animazione di exit di completarsi
        setTimeout(() => {
            setCurrentCardIndex(nextIndex);
        }, 50);
    }, [session, currentCardIndex, startTime, updateSessionStats, finalizeSession]);

    const submitReview = useCallback(async (rating: ReviewRating) => {
        if (!session || !currentCard || isSubmitting || isSessionCompleteRef.current) return false;

        setIsSubmitting(true);
        try {
            await studyService.submitReview(session.deck.id, {
                cardId: currentCard.id,
                rating,
            });

            updateSessionStats(prev => ({
                ...prev,
                hard: prev.hard + (rating === 1 ? 1 : 0),
                good: prev.good + (rating === 3 ? 1 : 0),
                easy: prev.easy + (rating === 5 ? 1 : 0),
            }));

            return true;
        } catch (err: any) {
            emitToast.error('Errore nel salvataggio della risposta');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    }, [session, currentCard, isSubmitting, updateSessionStats]);

    const handleFlip = useCallback(() => {
        if (!isFlashcardMode || isFlipped || isSubmitting || isSessionCompleteRef.current) return;
        setIsFlipped(true);
    }, [isFlashcardMode, isFlipped, isSubmitting]);

    const handleRating = useCallback(async (rating: ReviewRating) => {
        if (!currentCard || isSubmitting || isSessionCompleteRef.current) return;

        const direction = rating === 1 ? 'left' : rating === 5 ? 'right' : 'up';
        setExitDirection(direction);

        const saved = await submitReview(rating);
        if (!saved) {
            setExitDirection(null);
            return;
        }

        // Attendi che l'animazione di exit sia completata prima di avanzare
        await new Promise(resolve => setTimeout(resolve, 400));
        advanceCard();
    }, [currentCard, isSubmitting, submitReview, advanceCard]);

    const handleVerifyTyping = useCallback(async (userAnswer: string) => {
        if (!currentCard || !deckId) {
            return { correct: false, similarity: 0 };
        }

        const expected = effectiveReverse ? currentCard.front : currentCard.back;

        if (effectiveReverse) {
            return calculateSimilarity(userAnswer, expected);
        }

        try {
            const result = await studyService.verifyAnswer(deckId, currentCard.id, userAnswer);
            return { correct: result.correct, similarity: result.similarity };
        } catch {
            return calculateSimilarity(userAnswer, expected);
        }
    }, [currentCard, deckId, effectiveReverse]);

    // Keyboard shortcuts per rating
    useEffect(() => {
        if (!isFlashcardMode) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isFlipped || isSubmitting || isSessionCompleteRef.current) return;

            if (e.key === '1') handleRating(1);
            if (e.key === '2') handleRating(3);
            if (e.key === '3') handleRating(5);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFlashcardMode, isFlipped, isSubmitting, handleRating]);

    // Handler per uscire dalla sessione
    const handleBackToDashboard = useCallback(() => {
        setIsSummaryOpen(false);
        navigate('/study');
    }, [navigate]);

    // Varianti semplificate - le animazioni di exit sono gestite dal Flashcard stesso
    const viewVariants = {
        enter: { 
            opacity: 0,
        },
        center: {
            opacity: 1,
            transition: { 
                duration: 0.2,
            },
        },
        exit: { 
            opacity: 0,
            transition: { 
                duration: 0.15,
            } 
        },
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
                <FlashcardSkeleton />
            </div>
        );
    }

    // Error state
    if (error || !session) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error || 'Sessione non trovata'}</p>
                    <button
                        onClick={() => navigate('/study')}
                        className="px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors"
                    >
                        Torna alla Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const progressPercent = session.cards.length > 0
        ? ((currentCardIndex + 1) / session.cards.length) * 100
        : 0;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 overflow-hidden overflow-x-hidden">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl">
                <button
                    onClick={handleBackToDashboard}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                >
                    <FiArrowLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Esci</span>
                </button>

                <div className="flex-1 mx-4 sm:mx-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white/80">
                            {session.deck.title}
                        </span>
                        <span className="text-xs text-white/40">
                            {currentCardIndex + 1} / {session.cards.length}
                        </span>
                    </div>
                    <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                        />
                    </div>
                </div>

                <button
                    onClick={handleBackToDashboard}
                    className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Chiudi"
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>

            {/* Main Content */}
            <div className="pt-24 pb-32 sm:pb-40 h-full overflow-y-auto overflow-x-hidden">
                <AnimatePresence mode="wait" initial={false}>
                    {currentCard && isFlashcardMode && displayCard && (
                        <motion.div
                            key={currentCard.id}
                            variants={viewVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                        >
                            <Flashcard
                                card={displayCard}
                                isFlipped={isFlipped}
                                onFlip={handleFlip}
                                exitDirection={exitDirection}
                            />
                        </motion.div>
                    )}
                    {currentCard && isQuizMode && (
                        <motion.div
                            key={currentCard.id}
                            variants={viewVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                        >
                            <QuizView
                                card={currentCard}
                                question={currentCard.front}
                                options={currentCard.options ?? []}
                                correctAnswer={currentCard.back}
                                isSubmitting={isSubmitting || isSessionCompleteRef.current}
                                onSubmitReview={submitReview}
                                onNext={advanceCard}
                            />
                        </motion.div>
                    )}
                    {currentCard && isTypingMode && displayCard && (
                        <motion.div
                            key={currentCard.id}
                            variants={viewVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                        >
                            <TypingView
                                card={currentCard}
                                question={displayCard.front}
                                answer={displayCard.back}
                                isSubmitting={isSubmitting || isSessionCompleteRef.current}
                                onVerify={handleVerifyTyping}
                                onSubmitReview={submitReview}
                                onNext={advanceCard}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Rating Buttons */}
            <AnimatePresence>
                {isFlashcardMode && isFlipped && !isSessionCompleteRef.current && (
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 60 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 py-6 sm:py-8 border-t border-white/[0.06] bg-slate-950/80 backdrop-blur-xl"
                    >
                        <p className="text-center text-white/40 text-xs sm:text-sm mb-4">
                            Com'e andata?
                        </p>
                        <div className="flex items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
                            <RatingButton
                                label="Difficile"
                                emoji="😓"
                                shortcut="1"
                                color="red"
                                onClick={() => handleRating(1)}
                                disabled={isSubmitting}
                            />
                            <RatingButton
                                label="Ok"
                                emoji="🤔"
                                shortcut="2"
                                color="amber"
                                onClick={() => handleRating(3)}
                                disabled={isSubmitting}
                            />
                            <RatingButton
                                label="Facile"
                                emoji="😊"
                                shortcut="3"
                                color="green"
                                onClick={() => handleRating(5)}
                                disabled={isSubmitting}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Summary Modal */}
            {summary && (
                <SessionSummaryModal
                    isOpen={isSummaryOpen}
                    title={session?.deck.title ? `Sessione completata • ${session.deck.title}` : 'Sessione completata'}
                    summary={summary}
                    onClose={handleBackToDashboard}
                />
            )}
        </div>
    );
};

export default StudySessionPage;
