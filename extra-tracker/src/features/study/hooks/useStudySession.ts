import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StudySession, ReviewRating, StudyMode, Card, SessionFocus, SessionLength, SessionDirection, QuizType } from '../services/studyService';
import { studyService } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { getErrorMessage } from '../../../utils/errorMessage';

// ============================================
// CONSTANTS
// ============================================

export const STUDY_MODES: StudyMode[] = ['flashcard', 'quiz', 'typing', 'mix', 'sprint', 'focus', 'exam'];
export const FOCUS_OPTIONS: SessionFocus[] = ['smart', 'due', 'weak', 'all'];
export const LENGTH_OPTIONS: SessionLength[] = ['short', 'standard', 'deep'];
export const DIRECTION_OPTIONS: SessionDirection[] = ['front', 'back', 'mixed'];

export const LENGTH_TO_LIMIT: Record<SessionLength, number> = {
    short: 10,
    standard: 20,
    deep: 35,
};

export const MODE_LABELS: Record<StudyMode, string> = {
    flashcard: 'Flashcards',
    quiz: 'Quiz',
    typing: 'Typing',
    mix: 'Mix',
    sprint: 'Sprint',
    focus: 'Focus',
    exam: 'Esame',
};

export const hashString = (value: string): number => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
};

export const buildFallbackCardModes = (cards: Card[], mode: StudyMode): Record<string, StudyMode> | undefined => {
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
// HOOK PARAMS TYPE
// ============================================

export interface UseStudySessionParams {
    deckId: string | undefined;
    mode: StudyMode;
    focus: SessionFocus;
    length: SessionLength;
    direction: SessionDirection;
    limit: number;
    questionCount: number;
    timeLimitMinutes: number;
    timeLimitSeconds: number | null;
    examType: string | undefined;
    examDifficulty: string | undefined;
    quizType: QuizType;
    sourceCardIdsKey: string;
    runKey: string;
    savedQuizId: string | null;
    preloadedSession: StudySession | undefined;
}

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseStudySessionReturn {
    // Session state
    session: StudySession | null;
    isLoading: boolean;
    error: string | null;
    isComplete: boolean;

    // Card navigation
    currentCardIndex: number;
    currentCard: Card | null;
    cardMode: StudyMode;
    displayCard: Card | null;
    isFlashcardMode: boolean;
    shouldReverse: boolean;

    // UI state
    isFlipped: boolean;
    exitDirection: 'left' | 'right' | 'up' | null;
    isSubmitting: boolean;
    showExitConfirm: boolean;
    showResumeModal: boolean;
    savedProgress: any | null;

    // Stats & timer
    stats: { total: number; hard: number; good: number; easy: number };
    elapsedSeconds: number;
    timeLeft: number | null;
    timerWarning: boolean;

    // Wrong answers
    wrongAnswersForReview: Array<{
        cardId: string;
        front: string;
        userAnswer: string;
        back: string;
    }>;

    // Handlers
    handleFlip: () => void;
    handleRate: (
        rating: ReviewRating,
        details?: { userAnswer?: string; correctAnswer?: string; correct?: boolean }
    ) => Promise<void>;
    handleNext: () => void;
    handleBack: () => Promise<void>;
    handleComplete: () => Promise<void>;
    handleResumeExam: () => Promise<void>;
    handleStartFresh: () => Promise<void>;
    handlePauseExam: () => Promise<void>;
    handleRestart: () => void;
    handleStudyErrors: () => void;
    setShowExitConfirm: React.Dispatch<React.SetStateAction<boolean>>;
}

// ============================================
// HOOK
// ============================================

export const useStudySession = (params: UseStudySessionParams): UseStudySessionReturn => {
    const {
        deckId,
        mode,
        focus,
        length,
        direction,
        limit,
        questionCount,
        timeLimitMinutes,
        timeLimitSeconds,
        examType,
        examDifficulty,
        quizType,
        sourceCardIdsKey,
        runKey,
        savedQuizId,
        preloadedSession,
    } = params;

    const navigate = useNavigate();

    // ============================================
    // STATE
    // ============================================

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

    const [stats, setStats] = useState({
        total: 0,
        hard: 0,
        good: 0,
        easy: 0,
    });

    const [showExitConfirm, setShowExitConfirm] = useState(false);
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

    // ============================================
    // REFS
    // ============================================

    const isCompleteRef = useRef(false);
    const hasLoadedRef = useRef(false);
    const hasStudiedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const sessionKey = deckId
        ? `${deckId}-${mode}-${focus}-${length}-${questionCount}-${timeLimitMinutes}-${direction}-${examType}-${examDifficulty}-${quizType}-${sourceCardIdsKey}-${runKey}`
        : null;

    // Refs for stale closure avoidance in handleNext
    const sessionRef = useRef(session);
    const currentCardIndexRef = useRef(currentCardIndex);

    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    useEffect(() => {
        currentCardIndexRef.current = currentCardIndex;
    }, [currentCardIndex]);

    // ============================================
    // DERIVED VALUES
    // ============================================

    const currentCard = session?.cards[currentCardIndex] ?? null;
    const cardMode: StudyMode = currentCard
        ? (session?.cardModes?.[currentCard.id] ?? (mode === 'mix' || mode === 'exam' ? 'flashcard' : mode))
        : mode;
    const isFlashcardMode = cardMode === 'flashcard';
    const shouldReverse = direction === 'back' || (direction === 'mixed' && currentCard ? hashString(currentCard.id) % 2 === 1 : false);
    const displayCard = currentCard && shouldReverse && isFlashcardMode
        ? { ...currentCard, front: currentCard.back, back: currentCard.front }
        : currentCard;
    const timerWarning = timeLeft !== null && timeLeft <= 60;

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

                if (mode === 'exam') {
                    try {
                        const progress = await studyService.getExamProgress(deckId);
                        if (progress) {
                            setSavedProgress(progress);
                            setShowResumeModal(true);
                            setIsLoading(false);
                            return;
                        }
                    } catch {
                        // No saved progress (404), continue with new session
                    }
                }

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
            } catch (err: unknown) {
                setError(getErrorMessage(err) || 'Errore nel caricamento');
                emitToast.error('Impossibile caricare la sessione');
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
    }, [sessionKey, deckId, mode, focus, limit, questionCount, timeLimitMinutes, direction, examType, examDifficulty, quizType, sourceCardIdsKey, preloadedSession, navigate]);

    // ============================================
    // TIMER
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

            if (mode === 'exam') {
                await studyService.clearExamProgress(deckId).catch(err => {
                    console.error('Error clearing exam progress:', err);
                });
            }

            if (savedQuizId && mode === 'quiz') {
                const correctCount = stats.good + stats.easy;
                const totalAnswered = correctCount + stats.hard;
                const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
                const wrongIndices = quizAnswerDetails
                    .map((a, i) => (!a.correct ? i : -1))
                    .filter(i => i >= 0);

                studyService.recordQuizAttempt(deckId, savedQuizId, {
                    score: correctCount,
                    accuracy,
                    timeSeconds: elapsedSeconds,
                    wrongQuestionIndices: wrongIndices,
                }).catch(err => {
                    console.error('Error recording quiz attempt:', err);
                });
            }
        } catch (err) {
            console.error('Error completing session:', err);
        }
    }, [session, deckId, mode, stats, elapsedSeconds, sessionKey, answersHistory, quizAnswerDetails, savedQuizId]);

    // Time limit expiry
    useEffect(() => {
        if (timeLeft === 0 && !isCompleteRef.current) {
            handleComplete();
        }
    }, [timeLeft, handleComplete]);

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
        const dir = rating <= 2 ? 'left' : rating >= 4 ? 'right' : 'up';
        setExitDirection(dir);

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
                setExitDirection(null);
            }

        } catch {
            emitToast.error('Errore nel salvataggio');
            setExitDirection(null);
        } finally {
            setIsSubmitting(false);
        }
    }, [session, currentCard, isSubmitting, currentCardIndex, mode, cardMode, handleComplete]);

    const handleBack = useCallback(async () => {
        const totalAnswered = stats.total;
        if (mode !== 'exam' && totalAnswered > 0 && !showExitConfirm) {
            setShowExitConfirm(true);
            return;
        }
        setShowExitConfirm(false);

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
            }
        }

        navigate(deckId ? `/study/deck/${deckId}` : '/study');
    }, [navigate, deckId, mode, session, currentCardIndex, stats, elapsedSeconds, answersHistory, focus, length, timeLimitMinutes, questionCount, direction, examType, examDifficulty, showExitConfirm]);

    const handleResumeExam = useCallback(async () => {
        if (!savedProgress || !deckId) return;

        try {
            setIsLoading(true);

            const data = await studyService.getSession(deckId, savedProgress.examConfig);

            if (data.cards.length === 0) {
                emitToast.error('Sessione non più valida');
                await studyService.clearExamProgress(deckId);
                navigate(`/study/deck/${deckId}`);
                return;
            }

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
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Errore nel ripristino');
            emitToast.error('Impossibile riprendere l\'esame');
        } finally {
            setIsLoading(false);
        }
    }, [savedProgress, deckId, mode, navigate]);

    const handleStartFresh = useCallback(async () => {
        if (!deckId) return;

        try {
            setIsLoading(true);

            await studyService.clearExamProgress(deckId);
            setSavedProgress(null);
            setShowResumeModal(false);

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
        } catch (err: unknown) {
            emitToast.error('Errore nell\'avvio del nuovo esame');
            setError(getErrorMessage(err) || 'Errore nel caricamento');
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
        } catch {
            emitToast.error('Errore nel salvataggio del progresso');
        }
    }, [session, deckId, mode, focus, length, timeLimitMinutes, questionCount, direction, examType, examDifficulty, currentCardIndex, stats, elapsedSeconds, answersHistory, navigate]);

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

        const urlParams = new URLSearchParams();
        urlParams.set('mode', 'quiz');
        urlParams.set('focus', 'all');
        urlParams.set('questions', String(currentSessionCardIds.length));
        urlParams.set('quizType', quizType);
        urlParams.set('sourceCardIds', currentSessionCardIds.join(','));
        urlParams.set('quizSource', 'repeat');
        urlParams.set('run', String(Date.now()));

        resetForNewQuizRun();
        navigate(`/study/${deckId}/session?${urlParams.toString()}`);
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

        const urlParams = new URLSearchParams();
        urlParams.set('mode', 'quiz');
        urlParams.set('focus', 'all');
        urlParams.set('questions', String(wrongCardIds.length));
        urlParams.set('quizType', quizType);
        urlParams.set('sourceCardIds', wrongCardIds.join(','));
        urlParams.set('quizSource', 'errors');
        urlParams.set('run', String(Date.now()));

        resetForNewQuizRun();
        navigate(`/study/${deckId}/session?${urlParams.toString()}`);
    }, [mode, deckId, wrongAnswersForReview, quizType, resetForNewQuizRun, navigate]);

    // ============================================
    // RETURN
    // ============================================

    return {
        // Session state
        session,
        isLoading,
        error,
        isComplete,

        // Card navigation
        currentCardIndex,
        currentCard,
        cardMode,
        displayCard,
        isFlashcardMode,
        shouldReverse,

        // UI state
        isFlipped,
        exitDirection,
        isSubmitting,
        showExitConfirm,
        showResumeModal,
        savedProgress,

        // Stats & timer
        stats,
        elapsedSeconds,
        timeLeft,
        timerWarning,

        // Wrong answers
        wrongAnswersForReview,

        // Handlers
        handleFlip,
        handleRate,
        handleNext,
        handleBack,
        handleComplete,
        handleResumeExam,
        handleStartFresh,
        handlePauseExam,
        handleRestart,
        handleStudyErrors,
        setShowExitConfirm,
    };
};
