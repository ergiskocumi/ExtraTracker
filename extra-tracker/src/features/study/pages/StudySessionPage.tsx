/**
 * 📚 STUDY SESSION PAGE - "Zen Mode" Full-Screen Focus
 * 
 * Ispirazione: Flashka.ai - Immersivo, distrazioni zero, tipografia hero
 * 
 * Features:
 * - Full-screen overlay "Zen Mode" che copre tutta l'UI
 * - Progress bar segmentata con pallini per ogni carta
 * - Bottoni rating grandi, thumb-friendly per mobile
 * - Scorciatoie tastiera (Spazio flip, 1/2/3 voto)
 * - Animazioni fluide e feedback tattile
 * - Schermata riepilogo celebrativa
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiCheck, FiX, FiZap, FiAward, FiClock, FiTarget } from 'react-icons/fi';
import { Flashcard, FlashcardSkeleton } from '../components/Flashcard';
import { QuizView } from '../components/QuizView';
import { TypingView } from '../components/TypingView';
import { studyService, type StudySession, type ReviewRating, type StudyMode, type Card } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';

// ============================================
// RATING BUTTON COMPONENT - Large Touch-Friendly
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
                relative flex flex-col items-center justify-center gap-1
                w-full sm:w-28 h-20 sm:h-24 rounded-2xl
                ${cfg.bg} ${cfg.text} ${cfg.border}
                border transition-all duration-200
                focus:outline-none focus:ring-4 ${cfg.ring}
                disabled:opacity-40 disabled:cursor-not-allowed
            `}
        >
            <span className="text-2xl sm:text-3xl">{emoji}</span>
            <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            <kbd className="absolute bottom-1.5 right-2 text-[10px] font-mono opacity-40 hidden sm:block">
                {shortcut}
            </kbd>
        </motion.button>
    );
};

// ============================================
// SESSION COMPLETE SCREEN - Celebrativo e pulito
// ============================================

interface SessionCompleteProps {
    stats: {
        total: number;
        hard: number;
        good: number;
        easy: number;
        duration: number;
    };
    deckTitle: string;
    onBackToDashboard: () => void;
    onStudyAgain: () => void;
}

const SessionComplete: React.FC<SessionCompleteProps> = ({ 
    stats, 
    deckTitle,
    onBackToDashboard,
    onStudyAgain 
}) => {
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const accuracy = stats.total > 0 
        ? Math.round(((stats.good + stats.easy) / stats.total) * 100)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-gradient-to-br from-dark-500 to-dark-400 flex flex-col items-center justify-center px-6"
        >
            {/* Celebrazione confetti-like */}
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.15, stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10"
            >
                <FiAward className="w-10 h-10 text-emerald-400" />
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-2xl sm:text-3xl font-bold text-white mb-1 text-center"
            >
                Ottimo lavoro! 🎉
            </motion.h1>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-white/50 mb-8 text-center"
            >
                Hai completato <span className="font-medium text-white/80">{deckTitle}</span>
            </motion.p>

            {/* Stats Grid - Clean cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8 w-full max-w-xl"
            >
                <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-center">
                    <FiTarget className="w-5 h-5 text-primary-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                    <span className="text-xs text-white/50 uppercase tracking-wide">Carte</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-center">
                    <FiClock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{formatDuration(stats.duration)}</p>
                    <span className="text-xs text-white/50 uppercase tracking-wide">Tempo</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-center">
                    <FiZap className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{accuracy}%</p>
                    <span className="text-xs text-white/50 uppercase tracking-wide">Precisione</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <FiCheck className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-emerald-400">{stats.easy}</p>
                    <span className="text-xs text-emerald-400/70 uppercase tracking-wide">Facili</span>
                </div>
            </motion.div>

            {/* Breakdown visuale minimalista */}
            <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.55 }}
                className="flex items-center gap-0.5 h-2 w-full max-w-md rounded-full overflow-hidden mb-10"
            >
                {stats.hard > 0 && (
                    <div 
                        className="h-full bg-red-500 first:rounded-l-full last:rounded-r-full"
                        style={{ width: `${(stats.hard / stats.total) * 100}%` }}
                    />
                )}
                {stats.good > 0 && (
                    <div 
                        className="h-full bg-amber-500 first:rounded-l-full last:rounded-r-full"
                        style={{ width: `${(stats.good / stats.total) * 100}%` }}
                    />
                )}
                {stats.easy > 0 && (
                    <div 
                        className="h-full bg-emerald-500 first:rounded-l-full last:rounded-r-full"
                        style={{ width: `${(stats.easy / stats.total) * 100}%` }}
                    />
                )}
            </motion.div>

            {/* Azioni */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm"
            >
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onStudyAgain}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white/80 font-medium hover:bg-white/[0.1] transition-all"
                >
                    Studia di Nuovo
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onBackToDashboard}
                    className="w-full sm:flex-1 px-8 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-400 hover:to-primary-500 transition-all shadow-lg shadow-primary-500/25"
                >
                    Torna ai Mazzi
                </motion.button>
            </motion.div>
        </motion.div>
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

// ============================================
// MAIN STUDY SESSION PAGE
// ============================================

export const StudySessionPage: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();
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
    const [isComplete, setIsComplete] = useState(false);
    const [startTime, setStartTime] = useState(Date.now());
    
    // Stats per la sessione
    const [sessionStats, setSessionStats] = useState({
        total: 0,
        hard: 0,
        good: 0,
        easy: 0,
        duration: 0
    });

    // Carica sessione
    useEffect(() => {
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
                setIsComplete(false);
                setStartTime(Date.now());
                setSessionStats({
                    total: orderedCards.length,
                    hard: 0,
                    good: 0,
                    easy: 0,
                    duration: 0,
                });
            } catch (err: any) {
                setError(err.message || 'Errore nel caricamento della sessione');
                emitToast.error('Impossibile caricare la sessione di studio');
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
    }, [deckId, navigate, mode, shuffle]);

    // Carta corrente
    const currentCard = session?.cards[currentCardIndex] ?? null;
    const displayCard: Card | null = currentCard && effectiveReverse
        ? { ...currentCard, front: currentCard.back, back: currentCard.front }
        : currentCard;
    const isFlashcardMode = mode === 'flashcard';
    const isQuizMode = mode === 'quiz';
    const isTypingMode = mode === 'typing';

    const advanceCard = useCallback(() => {
        if (!session) return;

        if (currentCardIndex + 1 >= session.cards.length) {
            const duration = Math.floor((Date.now() - startTime) / 1000);
            setSessionStats(prev => ({ ...prev, duration }));
            setIsComplete(true);
            return;
        }

        setCurrentCardIndex(prev => prev + 1);
        setIsFlipped(false);
        setExitDirection(null);
    }, [session, currentCardIndex, startTime]);

    const submitReview = useCallback(async (rating: ReviewRating) => {
        if (!session || !currentCard || isSubmitting) return false;

        setIsSubmitting(true);
        try {
            await studyService.submitReview(session.deck.id, {
                cardId: currentCard.id,
                rating,
            });

            setSessionStats(prev => ({
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
    }, [session, currentCard, isSubmitting]);

    const handleFlip = useCallback(() => {
        if (!isFlashcardMode || isFlipped || isSubmitting) return;
        setIsFlipped(true);
    }, [isFlashcardMode, isFlipped, isSubmitting]);

    const handleRating = useCallback(async (rating: ReviewRating) => {
        if (!currentCard || isSubmitting) return;

        const direction = rating === 1 ? 'left' : rating === 5 ? 'right' : 'up';
        setExitDirection(direction);

        const saved = await submitReview(rating);
        if (!saved) {
            setExitDirection(null);
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 350));
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
            if (!isFlipped || isSubmitting) return;

            if (e.key === '1') handleRating(1);
            if (e.key === '2') handleRating(3);
            if (e.key === '3') handleRating(5);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFlashcardMode, isFlipped, isSubmitting, handleRating]);

    // Handlers per schermata finale
    const handleBackToDashboard = () => navigate('/study');
    const handleStudyAgain = () => {
        if (!session) return;
        const reshuffled = shuffle ? shuffleArray(session.cards) : session.cards;
        setSession({ ...session, cards: reshuffled });
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setExitDirection(null);
        setIsComplete(false);
        setStartTime(Date.now());
        setSessionStats({
            total: reshuffled.length,
            hard: 0,
            good: 0,
            easy: 0,
            duration: 0,
        });
    };

    const viewVariants = {
        enter: { x: 40, opacity: 0 },
        center: {
            x: 0,
            opacity: 1,
            transition: { type: 'spring', stiffness: 220, damping: 24 },
        },
        exit: { x: -40, opacity: 0, transition: { duration: 0.2 } },
    };
    const totalSessionCards = session?.cards.length || 0;

    // ========== RENDER ==========

    // Loading - Zen Mode skeleton
    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 bg-gradient-to-br from-dark-500 to-dark-400 flex flex-col">
                {/* Header skeleton */}
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="h-8 w-20 bg-white/10 rounded-lg animate-pulse" />
                    <div className="h-5 w-32 bg-white/10 rounded-lg animate-pulse" />
                    <div className="w-20" />
                </div>
                
                {/* Progress skeleton */}
                <div className="px-6 py-3">
                    <div className="flex items-center justify-center gap-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="w-3 h-3 rounded-full bg-white/10 animate-pulse" />
                        ))}
                    </div>
                </div>

                {/* Card skeleton */}
                <div className="flex-1 flex items-center justify-center p-6">
                    <FlashcardSkeleton />
                </div>
            </div>
        );
    }

    // Error
    if (error) {
        return (
            <div className="fixed inset-0 z-50 bg-gradient-to-br from-dark-500 to-dark-400 flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                        <FiX className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Oops!</h2>
                    <p className="text-white/60 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/study')}
                        className="px-6 py-2.5 rounded-xl bg-white/[0.1] text-white hover:bg-white/[0.15] transition-all"
                    >
                        Torna ai Mazzi
                    </button>
                </div>
            </div>
        );
    }

    // Session Complete
    if (isComplete && session) {
        return (
            <SessionComplete
                stats={sessionStats}
                deckTitle={session.deck.title}
                onBackToDashboard={handleBackToDashboard}
                onStudyAgain={handleStudyAgain}
            />
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // MAIN ZEN MODE UI - Full screen, distraction-free
    // ═══════════════════════════════════════════════════════════════════
    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-dark-500 to-dark-400 flex flex-col">
            {/* ═══ HEADER - Minimal ═══ */}
            <header className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-white/[0.06]">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/study')}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.1] transition-all"
                >
                    <FiArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium hidden sm:inline">Esci</span>
                </motion.button>

                <div className="text-center">
                    <h1 className="text-sm sm:text-base font-medium text-white">
                        {session?.deck.title}
                    </h1>
                </div>

                {/* Counter */}
                <div className="text-sm font-medium text-white/50 min-w-[5rem] text-right">
                    {currentCardIndex + 1} / {session?.cards.length || 0}
                </div>
            </header>

            {/* ═══ PROGRESS BAR - Segmented dots ═══ */}
            <div className="px-6 py-2">
                <div className="flex items-center justify-center gap-1.5 max-w-xs mx-auto">
                    {session?.cards.map((_, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: idx * 0.02 }}
                            className={`
                                h-2 rounded-full transition-all duration-300
                                ${totalSessionCards <= 10 ? 'w-6' : 'w-2'}
                                ${idx < currentCardIndex 
                                    ? 'bg-emerald-500' 
                                    : idx === currentCardIndex 
                                        ? 'bg-primary-500 scale-110' 
                                        : 'bg-white/20'
                                }
                            `}
                        />
                    ))}
                </div>
            </div>

            {/* ═══ STUDY AREA - Centered ═══ */}
            <div className="flex-1 flex items-center justify-center px-4 py-6 overflow-hidden">
                <AnimatePresence mode="wait">
                    {currentCard && isFlashcardMode && displayCard && (
                        <Flashcard
                            key={currentCard.id}
                            card={displayCard}
                            isFlipped={isFlipped}
                            onFlip={handleFlip}
                            exitDirection={exitDirection}
                        />
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
                                isSubmitting={isSubmitting}
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
                                isSubmitting={isSubmitting}
                                onVerify={handleVerifyTyping}
                                onSubmitReview={submitReview}
                                onNext={advanceCard}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ═══ RATING BUTTONS - Large & Touch-Friendly ═══ */}
            <AnimatePresence>
                {isFlashcardMode && isFlipped && (
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 60 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="px-4 sm:px-6 py-6 sm:py-8 border-t border-white/[0.06]"
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
        </div>
    );
};

export default StudySessionPage;
