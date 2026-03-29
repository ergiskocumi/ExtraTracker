import { useCallback } from 'react';

import type { StudySession, StudyMode } from '../../services/studyService';
import { studyService } from '../../services/studyService';
import { globalCompletedSessions } from './constants';
import type { StudyStats } from './useStudyStats';
import type { StudyAnswer, QuizAnswerDetail } from './types';

interface UseStudyCompletionParams {
    session: StudySession | null;
    deckId: string | undefined;
    mode: StudyMode;
    stats: StudyStats;
    elapsedSeconds: number;
    sessionKey: string | null;
    answersHistory: StudyAnswer[];
    quizAnswerDetails: QuizAnswerDetail[];
    savedQuizId: string | null;
    isComplete: boolean;
    setIsComplete: React.Dispatch<React.SetStateAction<boolean>>;
    isCompleteRef: React.RefObject<boolean>;
    wrongAnswersForReview: WrongAnswer[];
    setWrongAnswersForReview: React.Dispatch<React.SetStateAction<WrongAnswer[]>>;
}

interface WrongAnswer {
    cardId: string;
    front: string;
    userAnswer: string;
    back: string;
}

interface UseStudyCompletionReturn {
    isComplete: boolean;
    setIsComplete: React.Dispatch<React.SetStateAction<boolean>>;
    isCompleteRef: React.RefObject<boolean>;
    wrongAnswersForReview: WrongAnswer[];
    setWrongAnswersForReview: React.Dispatch<React.SetStateAction<WrongAnswer[]>>;
    completeSession: () => Promise<void>;
}

export const useStudyCompletion = ({
    session,
    deckId,
    mode,
    stats,
    elapsedSeconds,
    sessionKey,
    answersHistory,
    quizAnswerDetails,
    savedQuizId,
    isComplete,
    setIsComplete,
    isCompleteRef,
    wrongAnswersForReview,
    setWrongAnswersForReview,
}: UseStudyCompletionParams): UseStudyCompletionReturn => {
    const completeSession = useCallback(async () => {
        if (!session || !deckId || isCompleteRef.current) return;

        isCompleteRef.current = true;
        setIsComplete(true);
        if (sessionKey) {
            globalCompletedSessions.add(sessionKey);
        }

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
                    strategy: session.meta?.retakeStrategy,
                    results: quizAnswerDetails.map((answer, index) => ({
                        questionId: answer.cardId,
                        shownIndex: index,
                        selectedAnswer: answer.userAnswer,
                        correctAnswer: answer.correctAnswer,
                        isCorrect: answer.correct,
                    })),
                }).catch(err => {
                    console.error('Error recording quiz attempt:', err);
                });
            }
        } catch (err) {
            console.error('Error completing session:', err);
        }
    }, [session, deckId, mode, stats, elapsedSeconds, sessionKey, answersHistory, quizAnswerDetails, savedQuizId, isCompleteRef, setIsComplete, setWrongAnswersForReview]);

    return {
        isComplete,
        setIsComplete,
        isCompleteRef,
        wrongAnswersForReview,
        setWrongAnswersForReview,
        completeSession,
    };
};
