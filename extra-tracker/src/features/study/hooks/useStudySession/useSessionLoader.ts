import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StudySession, StudyMode, SessionFocus, SessionLength, SessionDirection, QuizType } from '../../services/studyService';
import { studyService } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import { getErrorMessage } from '../../../../utils/errorMessage';
import { buildFallbackCardModes, globalCompletedSessions } from './constants';

interface UseSessionLoaderParams {
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
    quizType: QuizType;
    sourceCardIdsKey: string;
    runKey: string;
    preloadedSession: StudySession | undefined;
    sessionKey: string | null;
    isCompleteRef: React.RefObject<boolean>;
    onSessionLoaded: (session: StudySession, totalCards: number) => void;
    onShowResumeModal: (progress: any) => void;
}

interface UseSessionLoaderReturn {
    session: StudySession | null;
    setSession: React.Dispatch<React.SetStateAction<StudySession | null>>;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    error: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    hasLoadedRef: React.RefObject<boolean>;
    reload: () => void;
}

export const useSessionLoader = ({
    deckId,
    mode,
    focus,

    limit,
    questionCount,
    timeLimitMinutes,
    direction,
    examType,
    examDifficulty,
    quizType,
    sourceCardIdsKey,
    preloadedSession,
    sessionKey,
    isCompleteRef,
    onSessionLoaded,
    onShowResumeModal,
}: UseSessionLoaderParams): UseSessionLoaderReturn => {
    const navigate = useNavigate();
    const [session, setSession] = useState<StudySession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);

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
                    const loadedSession = { ...preloadedSession, cardModes };
                    setSession(loadedSession);
                    onSessionLoaded(loadedSession, preloadedSession.cards.length);
                    hasLoadedRef.current = true;
                    return;
                }

                if (mode === 'exam') {
                    try {
                        const progress = await studyService.getExamProgress(deckId);
                        if (progress) {
                            onShowResumeModal(progress);
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
                const loadedSession = { ...data, cards: orderedCards, cardModes };

                setSession(loadedSession);
                onSessionLoaded(loadedSession, orderedCards.length);
                hasLoadedRef.current = true;
            } catch (err: unknown) {
                setError(getErrorMessage(err) || 'Errore nel caricamento');
                emitToast.error('Impossibile caricare la sessione');
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
    }, [sessionKey, deckId, mode, focus, limit, questionCount, timeLimitMinutes, direction, examType, examDifficulty, quizType, sourceCardIdsKey, preloadedSession, navigate, isCompleteRef, onSessionLoaded, onShowResumeModal]);

    const reload = () => {
        hasLoadedRef.current = false;
        setError(null);
    };

    return {
        session,
        setSession,
        isLoading,
        setIsLoading,
        error,
        setError,
        hasLoadedRef,
        reload,
    };
};
