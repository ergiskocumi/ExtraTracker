import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReviewRating, Card } from '../../services/studyService';
import { studyService } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import { globalCompletedSessions } from './constants';
import type { UseStudySessionParams, UseStudySessionReturn, QuizAnswerDetail } from './types';
import { useStudyTimer } from './useStudyTimer';
import { useStudyStats } from './useStudyStats';
import { useStudyNavigation } from './useStudyNavigation';
import { useSessionLoader } from './useSessionLoader';
import { useStudyCompletion } from './useStudyCompletion';
import { useExamState } from './useExamState';

export const useStudySession = (params: UseStudySessionParams): UseStudySessionReturn => {
    const {
        deckId, mode, focus, length, direction, limit,
        questionCount, timeLimitMinutes, timeLimitSeconds,
        examType, examDifficulty, quizType,
        sourceCardIdsKey, runKey, quizId, savedQuizId, preloadedSession,
    } = params;

    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [quizAnswerDetails, setQuizAnswerDetails] = useState<QuizAnswerDetail[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const isCompleteRef = useRef(false);
    const [wrongAnswersForReview, setWrongAnswersForReview] = useState<Array<{
        cardId: string;
        front: string;
        userAnswer: string;
        back: string;
    }>>([]);

    const sessionKey = deckId
        ? `${deckId}-${mode}-${focus}-${length}-${questionCount}-${timeLimitMinutes}-${direction}-${examType}-${examDifficulty}-${quizType}-${quizId}-${sourceCardIdsKey}-${runKey}`
        : null;

    // Track if this instance added to globalCompletedSessions for cleanup on unmount
    const addedToGlobalRef = useRef(false);

    // Cleanup on unmount: rimuovi il tracking globale per evitare StrictMode leak
    useEffect(() => {
        return () => {
            if (sessionKey) {
                globalCompletedSessions.delete(sessionKey);
                addedToGlobalRef.current = false;
            }
        };
    }, [sessionKey]);

    // Sub-hooks
    const { stats, setStats, updateStats, resetStats } = useStudyStats(0);

    const { showResumeModal, setShowResumeModal, savedProgress, setSavedProgress, answersHistory, setAnswersHistory, hasStudiedRef, handleResumeExam: baseHandleResumeExam, handleStartFresh: baseHandleStartFresh, handlePauseExam } = useExamState({
        deckId, mode, focus, length, limit, questionCount, timeLimitMinutes, direction, examType, examDifficulty,
    });

    const handleSessionLoaded = useCallback((_loadedSession: unknown, totalCards: number) => resetStats(totalCards), [resetStats]);
    const handleShowResumeModal = useCallback((progress: any) => { setSavedProgress(progress); setShowResumeModal(true); }, [setSavedProgress, setShowResumeModal]);

    const { session, setSession, isLoading, setIsLoading, error, setError, hasLoadedRef } = useSessionLoader({
        deckId, mode, focus, length, limit, questionCount, timeLimitMinutes, direction, examType, examDifficulty,
        quizType, sourceCardIdsKey, quizId, runKey, preloadedSession, sessionKey, isCompleteRef,
        onSessionLoaded: handleSessionLoaded, onShowResumeModal: handleShowResumeModal,
    });

    // Update timer with session
    const timerResult = useStudyTimer({ session, timeLimitSeconds, isComplete });
    const effectiveElapsedSeconds = timerResult.elapsedSeconds;
    const effectiveTimeLeft = timerResult.timeLeft;
    const effectiveTimerWarning = timerResult.timerWarning;
    const setElapsedSeconds = timerResult.setElapsedSeconds;
    const setTimeLeft = timerResult.setTimeLeft;

    // Update completion hook with current session
    const completionResult = useStudyCompletion({
        session, deckId, mode, stats, elapsedSeconds: effectiveElapsedSeconds, sessionKey,
        answersHistory, quizAnswerDetails, savedQuizId,
        isComplete, setIsComplete, isCompleteRef, wrongAnswersForReview, setWrongAnswersForReview,
    });
    const effectiveCompleteSession = completionResult.completeSession;

    const { currentCardIndex, setCurrentCardIndex, isFlipped, setIsFlipped, exitDirection, setExitDirection, currentCard, cardMode, isFlashcardMode, shouldReverse, displayCard, resetNavigation } = useStudyNavigation({
        session, mode, direction, isComplete, onComplete: effectiveCompleteSession,
    });

    // Time limit expiry
    useEffect(() => {
        if (effectiveTimeLeft === 0 && !isCompleteRef.current) {
            effectiveCompleteSession();
        }
    }, [effectiveTimeLeft, effectiveCompleteSession, isCompleteRef]);

    // Handlers
    const handleFlip = useCallback(() => {
        if (!isFlashcardMode || isFlipped || isSubmitting || isCompleteRef.current) return;
        setIsFlipped(true);
    }, [isFlashcardMode, isFlipped, isSubmitting]);

    const handleNext = useCallback(() => {
        if (isCompleteRef.current || !session) return;
        const nextIndex = currentCardIndex + 1;
        if (nextIndex >= session.cards.length) {
            effectiveCompleteSession();
        } else {
            setCurrentCardIndex(nextIndex);
        }
    }, [currentCardIndex, session, effectiveCompleteSession, setCurrentCardIndex]);

    // Ref per evitare stale closure nel setTimeout di handleRate
    const currentCardIndexRef = useRef(currentCardIndex);
    currentCardIndexRef.current = currentCardIndex;

    const handleRate = useCallback(async (rating: ReviewRating, details?: { userAnswer?: string; correctAnswer?: string; correct?: boolean }) => {
        if (!session || !currentCard || isSubmitting || isCompleteRef.current) return;

        setIsSubmitting(true);
        setExitDirection(rating <= 2 ? 'left' : rating >= 4 ? 'right' : 'up');

        try {
            if (cardMode !== 'quiz') {
                await studyService.submitReview(session.deck.id, { cardId: currentCard.id, rating });
            }
            updateStats(rating);
            hasStudiedRef.current = true;

            if (mode === 'exam') {
                setAnswersHistory(prev => [...prev, { cardId: currentCard.id, rating, timestamp: new Date() }]);
            }

            if (cardMode === 'quiz' && details) {
                setQuizAnswerDetails(prev => [...prev, {
                    cardId: currentCard.id, question: currentCard.front,
                    userAnswer: details.userAnswer || 'Non lo so',
                    correctAnswer: details.correctAnswer || currentCard.back, correct: Boolean(details.correct),
                }]);
            }

            if (cardMode !== 'quiz') {
                setTimeout(() => {
                    const nextIndex = currentCardIndexRef.current + 1;
                    if (nextIndex >= session.cards.length) {
                        effectiveCompleteSession();
                    } else {
                        setCurrentCardIndex(nextIndex);
                        setIsFlipped(false);
                        setExitDirection(null);
                    }
                    setIsSubmitting(false);
                }, 250);
            } else {
                setIsSubmitting(false);
                setExitDirection(null);
            }
        } catch {
            emitToast.error('Errore nel salvataggio');
            setExitDirection(null);
            setIsSubmitting(false);
        }
    }, [session, currentCard, isSubmitting, mode, cardMode, updateStats, hasStudiedRef, setAnswersHistory, setCurrentCardIndex, setIsFlipped, setExitDirection, effectiveCompleteSession]);

    const handleBack = useCallback(async () => {
        if (mode !== 'exam' && stats.total > 0 && !showExitConfirm) {
            setShowExitConfirm(true);
            return;
        }
        setShowExitConfirm(false);

        if (mode === 'exam' && session && deckId && currentCardIndex > 0) {
            try {
                await studyService.saveExamProgress(deckId, {
                    examConfig: { mode, focus, length, timeLimitMinutes, questionCount, direction, examType, examDifficulty },
                    currentCardIndex, stats, elapsedSeconds: effectiveElapsedSeconds, answers: answersHistory,
                    sessionCardIds: session.cards.map((c: Card) => c.id), pausedAt: new Date().toISOString(),
                });
                emitToast.success('Progresso salvato! Puoi riprendere l\'esame quando vuoi.');
            } catch (err) {
                console.error('[StudySessionPage] Error saving progress on exit:', err);
            }
        }
        navigate(deckId ? `/study/deck/${deckId}` : '/study');
    }, [navigate, deckId, mode, session, currentCardIndex, stats, effectiveElapsedSeconds, answersHistory, focus, length, timeLimitMinutes, questionCount, direction, examType, examDifficulty, showExitConfirm]);

    const handleResumeExam = useCallback(async () => {
        await baseHandleResumeExam(savedProgress, setIsLoading, setError, setSession, setCurrentCardIndex, setStats, setElapsedSeconds, hasLoadedRef);
    }, [savedProgress, baseHandleResumeExam, setIsLoading, setError, setSession, setCurrentCardIndex, setStats, setElapsedSeconds, hasLoadedRef]);

    const handleStartFresh = useCallback(async () => {
        await baseHandleStartFresh(setIsLoading, setError, setSession, resetStats, hasLoadedRef, quizType, sourceCardIdsKey, quizId);
        setElapsedSeconds(0); setAnswersHistory([]); setQuizAnswerDetails([]);
    }, [baseHandleStartFresh, setIsLoading, setError, setSession, resetStats, hasLoadedRef, quizType, sourceCardIdsKey, quizId, setElapsedSeconds, setAnswersHistory]);

    const handlePauseExamWrapper = useCallback(async () => {
        await handlePauseExam(session, currentCardIndex, stats, effectiveElapsedSeconds);
    }, [handlePauseExam, session, currentCardIndex, stats, effectiveElapsedSeconds]);

    const resetForNewQuizRun = useCallback(() => {
        if (sessionKey) globalCompletedSessions.delete(sessionKey);
        hasLoadedRef.current = false;
        isCompleteRef.current = false;
        setSession(null);
        resetNavigation();
        setIsSubmitting(false);
        setIsComplete(false);
        resetStats(0);
        setElapsedSeconds(0);
        setTimeLeft(timeLimitSeconds);
        setAnswersHistory([]);
        setWrongAnswersForReview([]);
        setQuizAnswerDetails([]);
    }, [sessionKey, hasLoadedRef, isCompleteRef, setSession, resetNavigation, setIsComplete, resetStats, setElapsedSeconds, setTimeLeft, timeLimitSeconds, setAnswersHistory, setWrongAnswersForReview]);

    const handleRestart = useCallback(() => {
        if (mode !== 'quiz' || !deckId || !session) { window.location.reload(); return; }
        const cardIds = session.cards.map((c: Card) => c.id).filter(Boolean);
        if (cardIds.length === 0) { window.location.reload(); return; }

        if (!savedQuizId) {
            studyService.saveQuizSnapshot(deckId, {
                quizType, questionCount: cardIds.length, sourceCardIds: cardIds, source: 'repeat',
                name: `Ripeti quiz ${cardIds.length} domande`,
            }).catch(e => console.warn('[StudySessionPage] save repeat quiz snapshot failed:', e));
        }

        const params = new URLSearchParams();
        params.set('mode', 'quiz'); params.set('focus', 'all');
        params.set('questions', String(cardIds.length)); params.set('quizType', quizType);
        params.set('sourceCardIds', cardIds.join(',')); params.set('quizSource', 'repeat');
        if (savedQuizId) {
            params.set('savedQuizId', savedQuizId);
            params.set('quizId', savedQuizId);
        }
        params.set('run', String(Date.now()));

        resetForNewQuizRun();
        navigate(`/study/${deckId}/session?${params.toString()}`);
    }, [mode, deckId, session, quizType, savedQuizId, resetForNewQuizRun, navigate]);

    const handleStudyErrors = useCallback(() => {
        if (mode !== 'quiz' || !deckId) return;
        const wrongCardIds = Array.from(new Set(wrongAnswersForReview.map(a => a.cardId).filter(Boolean)));
        if (wrongCardIds.length === 0) { emitToast.info('Nessun errore da ripassare'); return; }

        if (!savedQuizId) {
            studyService.saveQuizSnapshot(deckId, {
                quizType, questionCount: wrongCardIds.length, sourceCardIds: wrongCardIds, source: 'errors',
                name: `Quiz errori ${wrongCardIds.length} domande`,
            }).catch(e => console.warn('[StudySessionPage] save errors quiz snapshot failed:', e));
        }

        const params = new URLSearchParams();
        params.set('mode', 'quiz'); params.set('focus', 'all');
        params.set('questions', String(wrongCardIds.length)); params.set('quizType', quizType);
        params.set('sourceCardIds', wrongCardIds.join(',')); params.set('quizSource', 'errors');
        if (savedQuizId) {
            params.set('savedQuizId', savedQuizId);
            params.set('quizId', savedQuizId);
        }
        params.set('run', String(Date.now()));

        resetForNewQuizRun();
        navigate(`/study/${deckId}/session?${params.toString()}`);
    }, [mode, deckId, wrongAnswersForReview, quizType, savedQuizId, resetForNewQuizRun, navigate]);

    return {
        session, isLoading, error, isComplete,
        currentCardIndex, currentCard, cardMode, displayCard, isFlashcardMode, shouldReverse,
        isFlipped, exitDirection, isSubmitting, showExitConfirm, showResumeModal, savedProgress,
        stats, elapsedSeconds: effectiveElapsedSeconds, timeLeft: effectiveTimeLeft, timerWarning: effectiveTimerWarning,
        wrongAnswersForReview,
        handleFlip, handleRate, handleNext, handleBack,
        handleComplete: effectiveCompleteSession, handleResumeExam, handleStartFresh,
        handlePauseExam: handlePauseExamWrapper, handleRestart, handleStudyErrors, setShowExitConfirm,
    };
};
