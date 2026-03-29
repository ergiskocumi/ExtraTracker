import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StudyMode, SessionFocus, SessionLength, SessionDirection, StudySession, QuizType } from '../../services/studyService';
import { studyService } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import { getErrorMessage } from '../../../../utils/errorMessage';
import { buildFallbackCardModes } from './constants';
import type { StudyStats } from './useStudyStats';
import type { StudyAnswer } from './types';

interface UseExamStateParams {
    deckId: string | undefined;
    mode: StudyMode;
    focus: SessionFocus;
    length: SessionLength;
    limit: number;
    questionCount: number;
    timeLimitMinutes: number;
    direction: SessionDirection;
    examType: string | undefined;
    examDifficulty: string | undefined;
}

interface UseExamStateReturn {
    showResumeModal: boolean;
    setShowResumeModal: React.Dispatch<React.SetStateAction<boolean>>;
    savedProgress: any | null;
    setSavedProgress: React.Dispatch<React.SetStateAction<any | null>>;
    answersHistory: StudyAnswer[];
    setAnswersHistory: React.Dispatch<React.SetStateAction<StudyAnswer[]>>;
    hasStudiedRef: React.RefObject<boolean>;
    handleResumeExam: (
        savedProgress: any,
        setIsLoading: (v: boolean) => void,
        setError: (e: string | null) => void,
        setSession: (s: StudySession) => void,
        setCurrentCardIndex: (i: number) => void,
        setStats: (s: StudyStats) => void,
        setElapsedSeconds: (s: number) => void,
        hasLoadedRef: React.RefObject<boolean>
    ) => Promise<void>;
    handleStartFresh: (
        setIsLoading: (v: boolean) => void,
        setError: (e: string | null) => void,
        setSession: (s: StudySession) => void,
        resetStats: (total: number) => void,
        hasLoadedRef: React.RefObject<boolean>,
        quizType: QuizType,
        sourceCardIdsKey: string
    ) => Promise<void>;
    handlePauseExam: (
        session: StudySession | null,
        currentCardIndex: number,
        stats: StudyStats,
        elapsedSeconds: number
    ) => Promise<void>;
}

export const useExamState = ({
    deckId,
    mode,
    focus,
    length,
    limit,
    questionCount,
    timeLimitMinutes,
    direction,
    examType,
    examDifficulty,
}: UseExamStateParams): UseExamStateReturn => {
    const navigate = useNavigate();
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [savedProgress, setSavedProgress] = useState<any | null>(null);
    const [answersHistory, setAnswersHistory] = useState<StudyAnswer[]>([]);
    const hasStudiedRef = useRef(false);

    const handleResumeExam = useCallback(async (
        progress: any,
        setIsLoading: (v: boolean) => void,
        setError: (e: string | null) => void,
        setSession: (s: StudySession) => void,
        setCurrentCardIndex: (i: number) => void,
        setStats: (s: StudyStats) => void,
        setElapsedSeconds: (s: number) => void,
        hasLoadedRef: React.RefObject<boolean>
    ) => {
        if (!deckId) return;

        try {
            setIsLoading(true);

            const data = await studyService.getSession(deckId, progress.examConfig);

            if (data.cards.length === 0) {
                emitToast.error('Sessione non più valida');
                await studyService.clearExamProgress(deckId);
                navigate(`/study/deck/${deckId}`);
                return;
            }

            const orderedCards = data.cards;
            const cardModes = data.cardModes ?? buildFallbackCardModes(orderedCards, mode);

            setSession({ ...data, cards: orderedCards, cardModes });
            setCurrentCardIndex(progress.currentCardIndex || 0);
            setStats({
                total: orderedCards.length,
                hard: progress.stats?.hard || 0,
                good: progress.stats?.good || 0,
                easy: progress.stats?.easy || 0,
            });
            setElapsedSeconds(progress.elapsedSeconds || 0);
            setAnswersHistory(progress.answers || []);
            setShowResumeModal(false);
            setSavedProgress(null);
            hasLoadedRef.current = true;

            emitToast.success('Esame ripreso!');
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Errore nel ripristino');
            emitToast.error('Impossibile riprendere l\'esame');
        } finally {
            setIsLoading(false);
        }
    }, [deckId, mode, navigate]);

    const handleStartFresh = useCallback(async (
        setIsLoading: (v: boolean) => void,
        setError: (e: string | null) => void,
        setSession: (s: StudySession) => void,
        resetStats: (total: number) => void,
        hasLoadedRef: React.RefObject<boolean>,
        quizType: QuizType,
        sourceCardIdsKey: string
    ) => {
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
            resetStats(orderedCards.length);
            hasLoadedRef.current = true;

            emitToast.success('Nuovo esame iniziato!');
        } catch (err: unknown) {
            emitToast.error('Errore nell\'avvio del nuovo esame');
            setError(getErrorMessage(err) || 'Errore nel caricamento');
        } finally {
            setIsLoading(false);
        }
    }, [deckId, mode, focus, limit, timeLimitMinutes, questionCount, direction, examType, examDifficulty, navigate]);

    const handlePauseExam = useCallback(async (
        session: StudySession | null,
        currentCardIndex: number,
        stats: StudyStats,
        elapsedSeconds: number
    ) => {
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
    }, [deckId, mode, focus, length, timeLimitMinutes, questionCount, direction, examType, examDifficulty, answersHistory, navigate]);

    return {
        showResumeModal,
        setShowResumeModal,
        savedProgress,
        setSavedProgress,
        answersHistory,
        setAnswersHistory,
        hasStudiedRef,
        handleResumeExam,
        handleStartFresh,
        handlePauseExam,
    };
};
