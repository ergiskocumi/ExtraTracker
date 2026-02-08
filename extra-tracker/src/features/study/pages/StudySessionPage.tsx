/**
 * 📚 STUDY SESSION PAGE - Nuovo Design Riscritto
 * 
 * Features:
 * - Card 3D con flip fluido
 * - Progress bar segmentata
 * - Controlli di valutazione migliorati
 * - Schermata completamento celebrativa
 * - Keyboard shortcuts
 * - Animazioni fluide
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Loader2 } from 'lucide-react';
import { StudyCard } from '../components/Study/StudyCard';
import { StudyProgress } from '../components/Study/StudyProgress';
import { StudyControls } from '../components/Study/StudyControls';
import { SessionComplete } from '../components/Study/SessionComplete';
import { QuizView } from '../components/Study/QuizView';
import { TypingView } from '../components/Study/TypingView';
import { studyService, type StudySession, type ReviewRating, type StudyMode, type Card, type SessionFocus, type SessionLength, type SessionDirection } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { selectCardsForQuiz } from '../utils/adaptiveGapFiller';

// ============================================
// CONSTANTS
// ============================================

const STUDY_MODES: StudyMode[] = ['flashcard', 'quiz', 'typing', 'mix', 'sprint', 'focus', 'exam'];
const FOCUS_OPTIONS: SessionFocus[] = ['smart', 'due', 'weak', 'all'];
const LENGTH_OPTIONS: SessionLength[] = ['short', 'standard', 'deep'];
const DIRECTION_OPTIONS: SessionDirection[] = ['front', 'back', 'mixed'];

const LENGTH_TO_LIMIT: Record<SessionLength, number> = {
    short: 10,
    standard: 20,
    deep: 35,
};

const MODE_LABELS: Record<StudyMode, string> = {
    flashcard: 'Flashcards',
    quiz: 'Quiz',
    typing: 'Typing',
    mix: 'Mix',
    sprint: 'Sprint',
    focus: 'Focus',
    exam: 'Esame',
};

const hashString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
};

const buildFallbackCardModes = (cards: Card[], mode: StudyMode): Record<string, StudyMode> | undefined => {
    if (mode !== 'mix' && mode !== 'exam') return undefined;
    const cycle: StudyMode[] = ['quiz', 'typing', 'flashcard'];
    return cards.reduce<Record<string, StudyMode>>((acc, card, index) => {
        acc[card.id] = cycle[index % cycle.length];
        return acc;
    }, {});
};

// Global session tracking
const globalCompletedSessions = new Set<string>();

// ============================================
// MAIN COMPONENT
// ============================================

export const StudySessionPage: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Parse URL params
    const requestedMode = (searchParams.get('mode') || 'flashcard').toLowerCase();
    const mode: StudyMode = STUDY_MODES.includes(requestedMode as StudyMode) ? (requestedMode as StudyMode) : 'flashcard';
    const focusParam = (searchParams.get('focus') || 'smart').toLowerCase();
    const baseFocus: SessionFocus = FOCUS_OPTIONS.includes(focusParam as SessionFocus) ? (focusParam as SessionFocus) : 'smart';
    const focus: SessionFocus = mode === 'exam' ? 'all' : mode === 'focus' ? 'weak' : baseFocus;
    const lengthParam = (searchParams.get('length') || 'standard').toLowerCase();
    const length: SessionLength = LENGTH_OPTIONS.includes(lengthParam as SessionLength) ? (lengthParam as SessionLength) : 'standard';
    const directionParam = (searchParams.get('direction') || 'front').toLowerCase();
    const direction: SessionDirection = DIRECTION_OPTIONS.includes(directionParam as SessionDirection) ? (directionParam as SessionDirection) : 'front';
    const questionCount = Number(searchParams.get('questions')) || (mode === 'exam' ? 30 : 0);
    const timeLimitMinutes = Number(searchParams.get('time')) || 0;
    const limit = mode === 'exam' ? questionCount : LENGTH_TO_LIMIT[length];
    const timeLimitSeconds = timeLimitMinutes > 0 ? timeLimitMinutes * 60 : null;

    // State
    const [session, setSession] = useState<StudySession | null>(null);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number | null>(timeLimitSeconds);

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        hard: 0,
        good: 0,
        easy: 0,
    });

    // Refs
    const isCompleteRef = useRef(false);
    const hasLoadedRef = useRef(false);
    const hasStudiedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof intervalId> | null>(null);
    const sessionKey = deckId ? `${deckId}-${mode}-${focus}-${length}-${questionCount}-${timeLimitMinutes}-${direction}` : null;

    // ============================================
    // SESSION LOADING
    // ============================================

    useEffect(() => {
        if (!sessionKey || hasLoadedRef.current) return;

        // Check if already completed
        if (isCompleteRef.current || globalCompletedSessions.has(sessionKey)) {
            navigate(deckId ? `/study/deck/${deckId}` : '/study');
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
                const data = await studyService.getSession(deckId, {
                    mode, focus, limit,
                    timeLimitMinutes: timeLimitMinutes || undefined,
                    questionCount: questionCount || undefined,
                    direction,
                });

                if (data.cards.length === 0) {
                    emitToast.info('Nessuna carta da studiare!');
                    navigate(`/study/deck/${deckId}`);
                    return;
                }

                // Apply adaptive ordering for quiz mode
                const orderedCards = mode === 'quiz' 
                    ? selectCardsForQuiz(data.cards, limit).cards 
                    : data.cards;
                const cardModes = data.cardModes ?? buildFallbackCardModes(orderedCards, mode);

                setSession({ ...data, cards: orderedCards, cardModes });
                setStats({ total: orderedCards.length, hard: 0, good: 0, easy: 0 });
                hasLoadedRef.current = true;
            } catch (err: any) {
                setError(err.message || 'Errore nel caricamento');
                emitToast.error('Impossibile caricare la sessione');
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
    }, [sessionKey, deckId, mode, focus, length, questionCount, timeLimitMinutes, direction, navigate]);

    // ============================================
    // TIMER
    // ============================================

    useEffect(() => {
        if (!session) return;

        timerRef.current = window.setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
            if (timeLimitSeconds) {
                setTimeLeft(prev => {
                    if (prev === null || prev <= 0) return prev;
                    return prev - 1;
                });
            }
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [session, timeLimitSeconds]);

    // Time limit warning
    useEffect(() => {
        if (timeLeft === 0 && !isCompleteRef.current) {
            handleComplete();
        }
    }, [timeLeft]);

    // ============================================
    // HANDLERS
    // ============================================

    const currentCard = session?.cards[currentCardIndex] ?? null;
    const cardMode = currentCard
        ? (session?.cardModes?.[currentCard.id] ?? (mode === 'mix' || mode === 'exam' ? 'flashcard' : mode))
        : mode;
    const isFlashcardMode = cardMode === 'flashcard';
    const shouldReverse = direction === 'back' || (direction === 'mixed' && currentCard ? hashString(currentCard.id) % 2 === 1 : false);
    const displayCard = currentCard && shouldReverse && isFlashcardMode
        ? { ...currentCard, front: currentCard.back, back: currentCard.front }
        : currentCard;

    const handleFlip = useCallback(() => {
        if (!isFlashcardMode || isFlipped || isSubmitting || isCompleteRef.current) return;
        setIsFlipped(true);
    }, [isFlashcardMode, isFlipped, isSubmitting]);

    const handleRate = useCallback(async (rating: ReviewRating) => {
        if (!session || !currentCard || isSubmitting || isCompleteRef.current) return;

        setIsSubmitting(true);
        const direction = rating <= 2 ? 'left' : rating >= 4 ? 'right' : 'up';
        setExitDirection(direction);

        try {
            await studyService.submitReview(session.deck.id, {
                cardId: currentCard.id,
                rating,
            });

            setStats(prev => ({
                ...prev,
                hard: prev.hard + (rating <= 2 ? 1 : 0),
                good: prev.good + (rating === 3 ? 1 : 0),
                easy: prev.easy + (rating >= 4 ? 1 : 0),
            }));
            hasStudiedRef.current = true;

            // Wait for exit animation
            await new Promise(resolve => setTimeout(resolve, 400));

            // Advance or complete
            const nextIndex = currentCardIndex + 1;
            if (nextIndex >= session.cards.length) {
                handleComplete();
            } else {
                setIsFlipped(false);
                setExitDirection(null);
                setCurrentCardIndex(nextIndex);
            }
        } catch (err) {
            emitToast.error('Errore nel salvataggio');
            setExitDirection(null);
        } finally {
            setIsSubmitting(false);
        }
    }, [session, currentCard, isSubmitting, currentCardIndex]);

    const handleComplete = useCallback(async () => {
        if (!session || !deckId || isCompleteRef.current) return;

        isCompleteRef.current = true;
        setIsComplete(true);
        globalCompletedSessions.add(sessionKey!);

        try {
            await studyService.completeSession(deckId, {
                mode,
                stats: {
                    correct: stats.good + stats.easy,
                    wrong: stats.hard,
                    timeSeconds: elapsedSeconds,
                },
            });
        } catch (err) {
            console.error('Error completing session:', err);
        }
    }, [session, deckId, mode, stats, elapsedSeconds, sessionKey]);

    const handleBack = useCallback(() => {
        navigate(deckId ? `/study/deck/${deckId}` : '/study');
    }, [navigate, deckId]);

    const handleRestart = useCallback(() => {
        window.location.reload();
    }, []);

    // ============================================
    // RENDER
    // ============================================

    if (isLoading) {
        return (
            <div className="fixed inset-0 top-16 z-50 flex flex-col items-center justify-center bg-slate-950 gap-4">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                <p className="text-white/50 text-sm">Caricamento sessione...</p>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="fixed inset-0 top-16 z-50 flex flex-col items-center justify-center bg-slate-950 gap-4 p-4">
                <p className="text-red-400 text-lg">{error || 'Sessione non trovata'}</p>
                <button
                    onClick={handleBack}
                    className="px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold"
                >
                    Torna al mazzo
                </button>
            </div>
        );
    }

    // Session complete screen
    if (isComplete) {
        return (
            <div className="fixed inset-0 top-16 z-50 bg-slate-950">
                <SessionComplete
                    totalCards={stats.total}
                    correctCount={stats.good + stats.easy}
                    wrongCount={stats.hard}
                    durationSeconds={elapsedSeconds}
                    onRestart={handleRestart}
                    onBack={handleBack}
                />
            </div>
        );
    }

    const timerWarning = timeLeft !== null && timeLeft <= 60;

    return (
        <div className="fixed inset-0 top-16 z-50 bg-slate-950 flex flex-col">
            {/* Header */}
            <header className="flex-none px-4 sm:px-6 py-3 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors p-2 -ml-2 rounded-lg hover:bg-white/5"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline text-sm font-medium">Esci</span>
                    </button>

                    <div className="flex-1">
                        <StudyProgress
                            currentIndex={currentCardIndex}
                            totalCards={session.cards.length}
                            correctCount={stats.good + stats.easy}
                            wrongCount={stats.hard}
                            elapsedSeconds={elapsedSeconds}
                            deckTitle={session.deck.title}
                            mode={MODE_LABELS[mode]}
                        />
                    </div>

                    {timeLeft !== null && (
                        <div className={`px-3 py-1.5 rounded-full border text-sm font-mono ${
                            timerWarning
                                ? 'border-rose-500/40 bg-rose-500/15 text-rose-400 animate-pulse'
                                : 'border-white/10 bg-white/5 text-white/70'
                        }`}>
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>
                    )}

                    <button
                        onClick={handleBack}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {isFlashcardMode && displayCard && (
                        <motion.div
                            key={currentCard?.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
                        >
                            <StudyCard
                                card={displayCard}
                                isFlipped={isFlipped}
                                onFlip={handleFlip}
                                cardNumber={currentCardIndex + 1}
                                totalCards={session.cards.length}
                                exitDirection={exitDirection}
                            />
                        </motion.div>
                    )}

                    {cardMode === 'quiz' && currentCard && (
                        <motion.div
                            key={currentCard.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 overflow-auto p-4 sm:p-8"
                        >
                            <QuizView
                                card={currentCard}
                                question={currentCard.front}
                                options={currentCard.options ?? []}
                                correctAnswer={currentCard.back}
                                isSubmitting={isSubmitting}
                                onSubmitReview={handleRate}
                                onNext={() => {
                                    const nextIndex = currentCardIndex + 1;
                                    if (nextIndex >= session.cards.length) {
                                        handleComplete();
                                    } else {
                                        setCurrentCardIndex(nextIndex);
                                    }
                                }}
                            />
                        </motion.div>
                    )}

                    {cardMode === 'typing' && displayCard && (
                        <motion.div
                            key={currentCard?.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 overflow-auto p-4 sm:p-8"
                        >
                            <TypingView
                                card={currentCard!}
                                question={displayCard.front}
                                answer={displayCard.back}
                                isSubmitting={isSubmitting}
                                onVerify={async (answer) => {
                                    const expected = shouldReverse ? currentCard!.front : currentCard!.back;
                                    return { correct: answer.toLowerCase().trim() === expected.toLowerCase().trim(), similarity: 1 };
                                }}
                                onSubmitReview={handleRate}
                                onNext={() => {
                                    const nextIndex = currentCardIndex + 1;
                                    if (nextIndex >= session.cards.length) {
                                        handleComplete();
                                    } else {
                                        setCurrentCardIndex(nextIndex);
                                    }
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Controls */}
            {isFlashcardMode && (
                <footer className="flex-none px-4 sm:px-6 py-4 sm:py-6 border-t border-white/[0.06] bg-slate-950/80 backdrop-blur-xl">
                    <StudyControls
                        onRate={handleRate}
                        disabled={isSubmitting}
                        visible={isFlipped}
                    />
                </footer>
            )}
        </div>
    );
};

export default StudySessionPage;
