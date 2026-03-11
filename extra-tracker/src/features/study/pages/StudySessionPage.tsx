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
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Loader2, Clock } from 'lucide-react';
import { StudyCard } from '../components/Study/StudyCard';
import { StudyProgress } from '../components/Study/StudyProgress';
import { StudyControls } from '../components/Study/StudyControls';
import { SessionComplete } from '../components/Study/SessionComplete';
import { QuizView } from '../components/Study/QuizView';
import { TypingView } from '../components/Study/TypingView';
import { studyService, type StudySession, type ReviewRating, type StudyMode, type Card, type SessionFocus, type SessionLength, type SessionDirection, type QuizType } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';

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
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const locationState = location.state as { preparedSession?: StudySession; preparedAt?: number } | null;
    const preloadedSession = locationState?.preparedSession;

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
    const limit = mode === 'exam'
        ? questionCount
        : mode === 'quiz' && questionCount > 0
            ? questionCount
            : LENGTH_TO_LIMIT[length];
    const timeLimitSeconds = timeLimitMinutes > 0 ? timeLimitMinutes * 60 : null;

    // Exam-specific params (examType e examDifficulty)
    const examType = searchParams.get('examType') || undefined;
    const examDifficulty = searchParams.get('examDifficulty') || undefined;
    const quizTypeParam = (searchParams.get('quizType') || 'multiple_choice').toLowerCase();
    const quizType: QuizType = quizTypeParam === 'true_false' ? 'true_false' : 'multiple_choice';
    const sourceCardIds = (searchParams.get('sourceCardIds') || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    const sourceCardIdsKey = sourceCardIds.join('|');
    const runKey = searchParams.get('run') || 'default';

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

    // Pausa/Resume state (solo per mode='exam')
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [savedProgress, setSavedProgress] = useState<any | null>(null);
    const [answersHistory, setAnswersHistory] = useState<Array<{ cardId: string; rating: number; timestamp: Date }>>([]);
    const [wrongAnswersForReview, setWrongAnswersForReview] = useState<Array<{
        cardId: string;
        front: string;
        userAnswer: string;
        back: string;
    }>>([]);
    const [quizAnswerDetails, setQuizAnswerDetails] = useState<Array<{
        cardId: string;
        question: string;
        userAnswer: string;
        correctAnswer: string;
        correct: boolean;
    }>>([]);

    // Refs
    const isCompleteRef = useRef(false);
    const hasLoadedRef = useRef(false);
    const hasStudiedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionKey = deckId
        ? `${deckId}-${mode}-${focus}-${length}-${questionCount}-${timeLimitMinutes}-${direction}-${examType}-${examDifficulty}-${quizType}-${sourceCardIdsKey}-${runKey}`
        : null;

    // ============================================
    // SESSION LOADING
    // ============================================

    useEffect(() => {
        if (!deckId) {
            setError('ID mazzo non valido');
            setIsLoading(false);
            return;
        }

        if (!sessionKey || hasLoadedRef.current) return;

        // Check if already completed
        if (isCompleteRef.current || globalCompletedSessions.has(sessionKey)) {
            navigate(deckId ? `/study/deck/${deckId}` : '/study');
            return;
        }

        const loadSession = async () => {
            try {
                setIsLoading(true);

                if (
                    mode === 'quiz' &&
                    preloadedSession &&
                    preloadedSession.deck?.id === deckId &&
                    Array.isArray(preloadedSession.cards) &&
                    preloadedSession.cards.length > 0
                ) {
                    const cardModes = preloadedSession.cardModes ?? buildFallbackCardModes(preloadedSession.cards, mode);
                    setSession({ ...preloadedSession, cardModes });
                    setStats({ total: preloadedSession.cards.length, hard: 0, good: 0, easy: 0 });
                    hasLoadedRef.current = true;
                    return;
                }

                // Se mode='exam', controlla se esiste progresso salvato
                if (mode === 'exam') {
                    try {
                        const progress = await studyService.getExamProgress(deckId);
                        if (progress) {
                            setSavedProgress(progress);
                            setShowResumeModal(true);
                            setIsLoading(false);
                            return; // Aspetta che l'utente scelga se riprendere o ricominciare
                        }
                    } catch {
                        // Se non c'è progresso salvato (404), continua con nuova sessione
                    }
                }

                // Carica nuova sessione
                const data = await studyService.getSession(deckId, {
                    mode, focus, limit,
                    timeLimitMinutes: timeLimitMinutes || undefined,
                    questionCount: questionCount || undefined,
                    direction,
                    examType,
                    examDifficulty,
                    quizType,
                    sourceCardIds: sourceCardIdsKey ? sourceCardIdsKey.split('|') : undefined,
                });

                if (data.cards.length === 0) {
                    emitToast.info('Nessuna carta da studiare!');
                    navigate(`/study/deck/${deckId}`);
                    return;
                }

                const orderedCards = data.cards;
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
    }, [sessionKey, deckId, mode, focus, length, limit, questionCount, timeLimitMinutes, direction, examType, examDifficulty, quizType, sourceCardIdsKey, preloadedSession, navigate]);

    // ============================================
    // PAUSA/RESUME HANDLERS (solo per mode='exam')
    // ============================================

    const handleResumeExam = useCallback(async () => {
        if (!savedProgress || !deckId) return;

        try {
            setIsLoading(true);

            // Ricarica la sessione completa dal backend
            const data = await studyService.getSession(deckId, savedProgress.examConfig);

            if (data.cards.length === 0) {
                emitToast.error('Sessione non più valida');
                await studyService.clearExamProgress(deckId);
                navigate(`/study/deck/${deckId}`);
                return;
            }

            // Ricostruisci lo stato dall'ultimo checkpoint
            const orderedCards = data.cards;
            const cardModes = data.cardModes ?? buildFallbackCardModes(orderedCards, mode);

            setSession({ ...data, cards: orderedCards, cardModes });
            setCurrentCardIndex(savedProgress.currentCardIndex || 0);
            setStats({
                total: orderedCards.length,
                hard: savedProgress.stats?.hard || 0,
                good: savedProgress.stats?.good || 0,
                easy: savedProgress.stats?.easy || 0,
            });
            setElapsedSeconds(savedProgress.elapsedSeconds || 0);
            setAnswersHistory(savedProgress.answers || []);
            setShowResumeModal(false);
            hasLoadedRef.current = true;

            emitToast.success('Esame ripreso!');
        } catch (err: any) {
            setError(err.message || 'Errore nel ripristino');
            emitToast.error('Impossibile riprendere l\'esame');
        } finally {
            setIsLoading(false);
        }
    }, [savedProgress, deckId, mode, navigate]);

    const handleStartFresh = useCallback(async () => {
        if (!deckId) return;

        try {
            setIsLoading(true);

            // Cancella il progresso salvato
            await studyService.clearExamProgress(deckId);
            setSavedProgress(null);
            setShowResumeModal(false);

            // Carica nuova sessione con i parametri CORRENTI (dalla URL)
            const data = await studyService.getSession(deckId, {
                mode, focus, limit,
                timeLimitMinutes: timeLimitMinutes || undefined,
                questionCount: questionCount || undefined,
                direction,
                examType,
                examDifficulty,
                quizType,
                sourceCardIds: sourceCardIdsKey ? sourceCardIdsKey.split('|') : undefined,
            });

            if (data.cards.length === 0) {
                emitToast.info('Nessuna carta da studiare!');
                navigate(`/study/deck/${deckId}`);
                return;
            }

            const orderedCards = data.cards;
            const cardModes = data.cardModes ?? buildFallbackCardModes(orderedCards, mode);

            setSession({ ...data, cards: orderedCards, cardModes });
            setStats({ total: orderedCards.length, hard: 0, good: 0, easy: 0 });
            hasLoadedRef.current = true;

            emitToast.success('Nuovo esame iniziato!');
        } catch (err: any) {
            emitToast.error('Errore nell\'avvio del nuovo esame');
            setError(err.message || 'Errore nel caricamento');
        } finally {
            setIsLoading(false);
        }
    }, [deckId, mode, focus, limit, timeLimitMinutes, questionCount, direction, examType, examDifficulty, quizType, sourceCardIdsKey, navigate]);

    const handlePauseExam = useCallback(async () => {
        if (!session || !deckId || mode !== 'exam') return;

        try {
            const sessionCardIds = session.cards.map(card => card.id);

            await studyService.saveExamProgress(deckId, {
                examConfig: {
                    mode, focus, length,
                    timeLimitMinutes: timeLimitMinutes || undefined,
                    questionCount: questionCount || undefined,
                    direction,
                    examType,
                    examDifficulty,
                },
                currentCardIndex,
                stats: { hard: stats.hard, good: stats.good, easy: stats.easy },
                elapsedSeconds,
                answers: answersHistory,
                sessionCardIds,
            });

            emitToast.success('Progresso salvato!');
            navigate(`/study/deck/${deckId}`);
        } catch (err: any) {
            emitToast.error('Errore nel salvataggio del progresso');
        }
    }, [session, deckId, mode, focus, length, timeLimitMinutes, questionCount, direction, examType, examDifficulty, currentCardIndex, stats, elapsedSeconds, answersHistory, navigate]);

    // ============================================
    // TIMER (si ferma quando la sessione è completata)
    // ============================================

    useEffect(() => {
        if (!session || isComplete) return;

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
    }, [session, timeLimitSeconds, isComplete]);

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

    const handleComplete = useCallback(async () => {
        if (!session || !deckId || isCompleteRef.current) return;

        isCompleteRef.current = true;
        setIsComplete(true);
        globalCompletedSessions.add(sessionKey!);

        try {
            // Prepara dettagli risposte sbagliate (rating <= 2) per il riepilogo
            const answersDetails = answersHistory
                .map(answer => {
                    const card = session.cards.find(c => c.id === answer.cardId);
                    if (!card) return null;
                    return {
                        cardId: answer.cardId,
                        front: card.front,
                        back: card.back,
                        rating: answer.rating,
                        correct: answer.rating > 2,
                    };
                })
                .filter(Boolean) as any[];

            // Priorità al dettaglio quiz (include risposta utente), fallback al dettaglio esame legacy.
            const wrongAnswers = quizAnswerDetails.length > 0
                ? quizAnswerDetails
                    .filter(answer => !answer.correct)
                    .map(answer => ({
                        cardId: answer.cardId,
                        front: answer.question,
                        userAnswer: answer.userAnswer,
                        back: answer.correctAnswer,
                    }))
                : answersDetails
                    .filter(a => !a.correct)
                    .map(a => ({
                        cardId: a.cardId,
                        front: a.front,
                        userAnswer: 'Risposta errata',
                        back: a.back,
                    }));

            setWrongAnswersForReview(wrongAnswers);

            await studyService.completeSession(deckId, {
                mode,
                stats: {
                    correct: stats.good + stats.easy,
                    wrong: stats.hard,
                    timeSeconds: elapsedSeconds,
                },
                answersDetails: mode === 'exam' ? answersDetails : undefined,
            });

            // Cancella il progresso salvato se è un esame
            if (mode === 'exam') {
                await studyService.clearExamProgress(deckId).catch(err => {
                    console.error('Error clearing exam progress:', err);
                });
            }
        } catch (err) {
            console.error('Error completing session:', err);
        }
    }, [session, deckId, mode, stats, elapsedSeconds, sessionKey, answersHistory, quizAnswerDetails, setWrongAnswersForReview]);

    // Time limit warning
    useEffect(() => {
        if (timeLeft === 0 && !isCompleteRef.current) {
            handleComplete();
        }
    }, [timeLeft, handleComplete]);

    // Refs per evitare stale closure in handleNext
    const sessionRef = useRef(session);
    const currentCardIndexRef = useRef(currentCardIndex);
    
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);
    
    useEffect(() => {
        currentCardIndexRef.current = currentCardIndex;
    }, [currentCardIndex]);

    // Funzione per avanzare alla prossima carta o completare la sessione
    // Usata da QuizView e TypingView per gestire manualmente l'avanzamento
    const handleNext = useCallback(() => {
        if (isCompleteRef.current || !sessionRef.current) return;

        const nextIndex = currentCardIndexRef.current + 1;
        if (nextIndex >= sessionRef.current.cards.length) {
            handleComplete();
        } else {
            setCurrentCardIndex(nextIndex);
        }
    }, [handleComplete]);

    const handleRate = useCallback(async (
        rating: ReviewRating,
        details?: {
            userAnswer?: string;
            correctAnswer?: string;
            correct?: boolean;
        }
    ) => {
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

            // Salva risposta nell'history (per pausa/resume esame)
            if (mode === 'exam') {
                setAnswersHistory(prev => [
                    ...prev,
                    { cardId: currentCard.id, rating, timestamp: new Date() }
                ]);
            }

            if (cardMode === 'quiz' && details) {
                setQuizAnswerDetails(prev => [
                    ...prev,
                    {
                        cardId: currentCard.id,
                        question: currentCard.front,
                        userAnswer: details.userAnswer || 'Non lo so',
                        correctAnswer: details.correctAnswer || currentCard.back,
                        correct: Boolean(details.correct),
                    },
                ]);
            }

            // Quiz mode: l'utente deve premere "Avanti" manualmente (QuizView gestisce onNext)
            // Flashcard/Typing: auto-advance dopo animazione
            if (cardMode !== 'quiz') {
                setTimeout(() => {
                    const nextIndex = currentCardIndex + 1;
                    if (nextIndex >= session.cards.length) {
                        handleComplete();
                    } else {
                        setCurrentCardIndex(nextIndex);
                        setIsFlipped(false);
                        setExitDirection(null);
                    }
                }, 800);
            } else {
                // Reset animazione per quiz mode (l'advance è manuale)
                setExitDirection(null);
            }

        } catch (err) {
            emitToast.error('Errore nel salvataggio');
            setExitDirection(null);
        } finally {
            setIsSubmitting(false);
        }
    }, [session, currentCard, isSubmitting, currentCardIndex, mode, cardMode, handleComplete]);

    const handleBack = useCallback(async () => {
        // Se è un esame e ci sono progressi, salva prima di uscire
        if (mode === 'exam' && session && deckId && currentCardIndex > 0) {
            try {
                const sessionCardIds = session.cards.map(card => card.id);

                await studyService.saveExamProgress(deckId, {
                    examConfig: {
                        mode, focus, length, timeLimitMinutes, questionCount, direction,
                        examType, examDifficulty,
                    },
                    currentCardIndex,
                    stats,
                    elapsedSeconds,
                    answers: answersHistory,
                    sessionCardIds,
                    pausedAt: new Date().toISOString(),
                });

                emitToast.success('Progresso salvato! Puoi riprendere l\'esame quando vuoi.');
            } catch (err) {
                console.error('[StudySessionPage] Error saving progress on exit:', err);
                // Continua comunque con l'uscita
            }
        }

        navigate(deckId ? `/study/deck/${deckId}` : '/study');
    }, [navigate, deckId, mode, session, currentCardIndex, stats, elapsedSeconds, answersHistory, focus, length, timeLimitMinutes, questionCount, direction, examType, examDifficulty]);

    const resetForNewQuizRun = useCallback(() => {
        if (sessionKey) {
            globalCompletedSessions.delete(sessionKey);
        }
        hasLoadedRef.current = false;
        isCompleteRef.current = false;
        setSession(null);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setExitDirection(null);
        setIsSubmitting(false);
        setIsComplete(false);
        setStats({ total: 0, hard: 0, good: 0, easy: 0 });
        setElapsedSeconds(0);
        setTimeLeft(timeLimitSeconds);
        setAnswersHistory([]);
        setWrongAnswersForReview([]);
        setQuizAnswerDetails([]);
    }, [sessionKey, timeLimitSeconds]);

    const handleRestart = useCallback(() => {
        if (mode !== 'quiz' || !deckId || !session) {
            window.location.reload();
            return;
        }

        const currentSessionCardIds = session.cards.map(card => card.id).filter(Boolean);
        if (currentSessionCardIds.length === 0) {
            window.location.reload();
            return;
        }

        void studyService.saveQuizSnapshot(deckId, {
            quizType,
            questionCount: currentSessionCardIds.length,
            sourceCardIds: currentSessionCardIds,
            source: 'repeat',
            name: `Ripeti quiz ${currentSessionCardIds.length} domande`,
        }).catch((error) => {
            console.warn('[StudySessionPage] save repeat quiz snapshot failed:', error);
        });

        const params = new URLSearchParams();
        params.set('mode', 'quiz');
        params.set('focus', 'all');
        params.set('questions', String(currentSessionCardIds.length));
        params.set('quizType', quizType);
        params.set('sourceCardIds', currentSessionCardIds.join(','));
        params.set('quizSource', 'repeat');
        params.set('run', String(Date.now()));

        resetForNewQuizRun();
        navigate(`/study/${deckId}/session?${params.toString()}`);
    }, [mode, deckId, session, quizType, resetForNewQuizRun, navigate]);

    const handleStudyErrors = useCallback(() => {
        if (mode !== 'quiz' || !deckId) return;

        const wrongCardIds = Array.from(
            new Set(
                wrongAnswersForReview
                    .map(answer => answer.cardId)
                    .filter(Boolean)
            )
        );

        if (wrongCardIds.length === 0) {
            emitToast.info('Nessun errore da ripassare');
            return;
        }

        void studyService.saveQuizSnapshot(deckId, {
            quizType,
            questionCount: wrongCardIds.length,
            sourceCardIds: wrongCardIds,
            source: 'errors',
            name: `Quiz errori ${wrongCardIds.length} domande`,
        }).catch((error) => {
            console.warn('[StudySessionPage] save errors quiz snapshot failed:', error);
        });

        const params = new URLSearchParams();
        params.set('mode', 'quiz');
        params.set('focus', 'all');
        params.set('questions', String(wrongCardIds.length));
        params.set('quizType', quizType);
        params.set('sourceCardIds', wrongCardIds.join(','));
        params.set('quizSource', 'errors');
        params.set('run', String(Date.now()));

        resetForNewQuizRun();
        navigate(`/study/${deckId}/session?${params.toString()}`);
    }, [mode, deckId, wrongAnswersForReview, quizType, resetForNewQuizRun, navigate]);

    // ============================================
    // RENDER
    // ============================================

    if (isLoading) {
        return (
            <div className="study-session-overlay fixed inset-0 top-16 z-50 flex flex-col items-center justify-center bg-theme-base gap-4">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                <p className="text-theme-muted text-sm">
                    {mode === 'quiz' ? 'Preparazione quiz con AI in corso...' : 'Caricamento sessione...'}
                </p>
            </div>
        );
    }

    // Non mostrare errore se il modal di resume è aperto (session può essere null in quel caso)
    if ((error || !session) && !showResumeModal) {
        return (
            <div className="study-session-overlay fixed inset-0 top-16 z-50 flex flex-col items-center justify-center bg-theme-base gap-4 p-4">
                <p className="text-red-400 text-lg">{error || 'Sessione non trovata'}</p>
                <button
                    onClick={handleBack}
                    className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold transition-colors"
                >
                    Torna al mazzo
                </button>
            </div>
        );
    }

    // Session complete screen
    if (isComplete) {
        return (
            <div className="study-session-overlay fixed inset-0 top-16 z-50 bg-theme-base">
                <SessionComplete
                    totalCards={stats.total}
                    correctCount={stats.good + stats.easy}
                    wrongCount={stats.hard}
                    durationSeconds={elapsedSeconds}
                    onRestart={handleRestart}
                    onBack={handleBack}
                    wrongAnswers={wrongAnswersForReview}
                    isExamMode={mode === 'exam'}
                    isQuizMode={mode === 'quiz'}
                    onStudyErrors={mode === 'quiz' ? handleStudyErrors : undefined}
                />
            </div>
        );
    }

    // Resume Modal (modale per riprendere esame)
    if (showResumeModal && savedProgress) {
        return (
            <div className="study-resume-overlay fixed inset-0 top-16 z-50 flex items-center justify-center backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="study-resume-panel max-w-lg w-full mx-4 bg-theme-elevated backdrop-blur-xl border border-theme-default rounded-3xl p-8 shadow-theme-lg"
                >
                    <h2 className="text-2xl font-bold text-theme-primary mb-4">Esame in pausa</h2>
                    <p className="text-theme-secondary mb-6 leading-relaxed">
                        Hai un esame in pausa su questo mazzo. Vuoi riprendere da dove avevi lasciato o ricominciare da capo?
                    </p>

                    <div className="study-resume-stats bg-theme-surface rounded-xl p-4 mb-6 space-y-2 text-sm border border-theme-default">
                        <div className="flex justify-between text-theme-muted">
                            <span>Progresso:</span>
                            <span className="text-theme-primary font-medium">
                                {savedProgress.currentCardIndex + 1} / {savedProgress.sessionCardIds?.length || 0}
                            </span>
                        </div>
                        <div className="flex justify-between text-theme-muted">
                            <span>Tempo trascorso:</span>
                            <span className="text-theme-primary font-medium">
                                {Math.floor(savedProgress.elapsedSeconds / 60)}:{(savedProgress.elapsedSeconds % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                        <div className="flex justify-between text-theme-muted">
                            <span>In pausa dal:</span>
                            <span className="text-theme-primary font-medium">
                                {new Date(savedProgress.pausedAt).toLocaleString('it-IT', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleStartFresh}
                            className="flex-1 px-6 py-3 rounded-xl font-semibold
                                bg-theme-surface text-theme-secondary hover:bg-theme-card
                                border border-theme-default hover:border-theme-strong
                                transition-all"
                        >
                            Ricomincia
                        </button>
                        <button
                            onClick={handleResumeExam}
                            className="flex-1 px-6 py-3 rounded-xl font-semibold
                                bg-gradient-to-r from-indigo-500 to-indigo-600 text-white
                                hover:from-indigo-600 hover:to-indigo-700
                                shadow-lg shadow-indigo-500/25
                                transition-all"
                        >
                            Riprendi
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const timerWarning = timeLeft !== null && timeLeft <= 60;

    return (
        <div className="study-session-root fixed inset-0 top-16 z-50 bg-theme-base flex flex-col">
            {/* Header */}
            <header className="study-session-header flex-none px-4 sm:px-6 py-3 border-b border-theme-default bg-theme-base/80 backdrop-blur-xl z-50">
                <div className="w-full flex items-center gap-3 sm:gap-6">
                    {/* Left: Exit Button */}
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 px-3 py-2 -ml-2 rounded-xl text-theme-secondary hover:text-theme-primary hover:bg-theme-surface transition-all group"
                        title="Esci dalla sessione"
                    >
                        <div className="p-1.5 rounded-lg bg-theme-surface border border-theme-default group-hover:border-theme-strong transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="hidden sm:inline text-sm font-medium">Esci</span>
                    </button>

                    {/* Center: Progress & Stats */}
                    <div className="flex-1 min-w-0">
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

                    {/* Right: Timer & Actions */}
                    <div className="flex items-center gap-3">
                        {/* Countdown Timer (if limit set) */}
                        {timeLeft !== null && (
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-mono tabular-nums ${
                                timerWarning
                                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse'
                                    : 'border-theme-default bg-theme-surface text-theme-secondary'
                            }`}>
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        )}

                        {/* Pause Button (Exam Mode) */}
                        {mode === 'exam' && (
                            <button
                                onClick={handlePauseExam}
                                className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 transition-all"
                            >
                                Pausa
                            </button>
                        )}
                    </div>
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
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="absolute inset-0 flex flex-col p-2 sm:p-4 md:p-6 lg:p-8"
                        >
                            <QuizView
                                card={currentCard}
                                question={currentCard.front}
                                options={currentCard.options ?? []}
                                correctAnswer={currentCard.back}
                                distractorExplanations={currentCard.distractorExplanations}
                                isSubmitting={isSubmitting}
                                onSubmitReview={handleRate}
                                onNext={handleNext}
                                isTrueFalse={(currentCard as any).isTrueFalse ?? false}
                            />
                        </motion.div>
                    )}

                    {cardMode === 'typing' && displayCard && (
                        <motion.div
                            key={currentCard?.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="absolute inset-0 flex flex-col p-3 sm:p-6 lg:p-8"
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
                                onNext={handleNext}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Controls */}
            {isFlashcardMode && (
                <footer className="study-session-footer flex-none px-4 sm:px-6 py-4 sm:py-6 border-t border-theme-default bg-theme-base backdrop-blur-xl">
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
