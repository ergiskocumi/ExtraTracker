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
import { Flashcard, FlashcardSkeleton } from '../components/Flashcard/Flashcard';
import { QuizView } from '../components/Study/QuizView';
import { TypingView } from '../components/Study/TypingView';
import { studyService, type StudySession, type ReviewRating, type StudyMode, type Card, type SessionFocus, type SessionLength, type SessionDirection } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
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

const STUDY_MODES: StudyMode[] = ['flashcard', 'quiz', 'typing', 'mix', 'sprint', 'focus', 'exam'];
const FOCUS_OPTIONS: SessionFocus[] = ['smart', 'due', 'weak', 'all'];
const LENGTH_OPTIONS: SessionLength[] = ['short', 'standard', 'deep'];
const DIRECTION_OPTIONS: SessionDirection[] = ['front', 'back', 'mixed'];

const LENGTH_TO_LIMIT: Record<SessionLength, number> = {
    short: 10,
    standard: 20,
    deep: 35,
};

const hashString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
};

const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const buildFallbackCardModes = (cards: Card[], mode: StudyMode): Record<string, StudyMode> | undefined => {
    if (mode !== 'mix' && mode !== 'exam') return undefined;
    const cycle: StudyMode[] = ['quiz', 'typing', 'flashcard'];
    return cards.reduce<Record<string, StudyMode>>((acc, card, index) => {
        acc[card.id] = cycle[index % cycle.length];
        return acc;
    }, {});
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
    const mode: StudyMode = STUDY_MODES.includes(requestedMode as StudyMode)
        ? (requestedMode as StudyMode)
        : 'flashcard';
    const focusParam = (searchParams.get('focus') || 'smart').toLowerCase();
    const baseFocus: SessionFocus = FOCUS_OPTIONS.includes(focusParam as SessionFocus)
        ? (focusParam as SessionFocus)
        : 'smart';
    const focus: SessionFocus = mode === 'exam'
        ? 'all'
        : mode === 'focus'
            ? 'weak'
            : baseFocus;
    const lengthParam = (searchParams.get('length') || 'standard').toLowerCase();
    const length: SessionLength = LENGTH_OPTIONS.includes(lengthParam as SessionLength)
        ? (lengthParam as SessionLength)
        : 'standard';
    const directionParam = (searchParams.get('direction') || 'front').toLowerCase();
    const direction: SessionDirection = DIRECTION_OPTIONS.includes(directionParam as SessionDirection)
        ? (directionParam as SessionDirection)
        : 'front';
    const questionCountParam = Number(searchParams.get('questions') ?? 0);
    const questionCount = Number.isFinite(questionCountParam) && questionCountParam > 0
        ? questionCountParam
        : mode === 'exam'
            ? 30
            : 0;
    const timeLimitMinutesParam = Number(searchParams.get('time') ?? 0);
    const timeLimitMinutes = Number.isFinite(timeLimitMinutesParam) && timeLimitMinutesParam > 0
        ? timeLimitMinutesParam
        : 0;
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
    const [startTime, setStartTime] = useState(Date.now());
    const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);

    // Stats per la sessione
    const [sessionStats, setSessionStats] = useState({
        total: 0,
        hard: 0,
        good: 0,
        easy: 0,
        duration: 0
    });
    const sessionStatsRef = useRef(sessionStats);
    
    const [isFinalizing, setIsFinalizing] = useState(false);

    // REFACTOR: Usa ref locale + globale per tracciare completamento
    const isSessionCompleteRef = useRef(false);
    const hasLoadedSessionRef = useRef(false);
    const hasStudiedAnyCardRef = useRef(false); // Traccia se l'utente ha studiato almeno una carta
    const sessionKey = deckId
        ? `${deckId}-${mode}-${focus}-${length}-${questionCount}-${timeLimitMinutes}-${direction}`
        : null;
    const startTimeRef = useRef(Date.now()); // Ref per startTime (non cambia durante la sessione)

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
                if (deckId) {
                    setTimeout(() => navigate(`/study/deck/${deckId}`), 100);
                } else {
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
                const data = await studyService.getSession(deckId, {
                    mode,
                    focus,
                    limit,
                    timeLimitMinutes: timeLimitMinutes || undefined,
                    questionCount: questionCount || undefined,
                    direction,
                });

                if (data.cards.length === 0) {
                    emitToast.info('Nessuna carta da studiare in questo mazzo!');
                    // Naviga al dettaglio del mazzo invece della dashboard
                    navigate(`/study/deck/${deckId}`);
                    return;
                }

                const orderedCards = data.cards;
                const cardModes = data.cardModes ?? buildFallbackCardModes(orderedCards, mode);
                setSession({ ...data, cards: orderedCards, cardModes });
                setCurrentCardIndex(0);
                setIsFlipped(false);
                setExitDirection(null);
                const now = Date.now();
                setStartTime(now);
                startTimeRef.current = now;
                setTimeLeftSeconds(timeLimitSeconds);
                hasStudiedAnyCardRef.current = false;
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
    }, [deckId, mode, focus, length, questionCount, timeLimitMinutes, direction, sessionKey]); // Rimosso navigate e updateSessionStats dalle dipendenze

    // Carta corrente
    const currentCard = session?.cards[currentCardIndex] ?? null;
    const baseMode: StudyMode = mode === 'sprint' || mode === 'focus' ? 'flashcard' : mode;
    const currentCardMode: StudyMode = currentCard
        ? (session?.cardModes?.[currentCard.id] ?? (mode === 'mix' || mode === 'exam' ? 'flashcard' : baseMode))
        : baseMode;
    const isFlashcardMode = currentCardMode === 'flashcard';
    const isQuizMode = currentCardMode === 'quiz';
    const isTypingMode = currentCardMode === 'typing';
    const isExamMode = mode === 'exam';
    const shouldReverse = direction === 'back'
        || (direction === 'mixed' && currentCard ? hashString(currentCard.id) % 2 === 1 : false);
    const effectiveReverse = (isFlashcardMode || isTypingMode) && shouldReverse;
    const displayCard: Card | null = currentCard && effectiveReverse
        ? { ...currentCard, front: currentCard.back, back: currentCard.front }
        : currentCard;

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
        const totalCards = statsSnapshot.total || session.cards.length;
        const unanswered = Math.max(0, totalCards - (correctCount + wrongCount));
        const finalWrongCount = isExamMode ? wrongCount + unanswered : wrongCount;

        setIsFinalizing(true);
        isSessionCompleteRef.current = true; // Marca come completata IMMEDIATAMENTE (locale)
        globalCompletedSessions.add(sessionKey); // Marca come completata GLOBALMENTE (persiste tra remount)

        try {
            await studyService.completeSession(deckId, {
                mode,
                stats: {
                    correct: correctCount,
                    wrong: finalWrongCount,
                    timeSeconds: durationSeconds,
                },
            });

            emitToast.success('Sessione completata');
            if (deckId) {
                navigate(`/study/deck/${deckId}`);
            } else {
                navigate('/study');
            }

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
            if (sessionKey) {
                globalCompletedSessions.delete(sessionKey);
            }
        } finally {
            setIsFinalizing(false);
        }
    }, [deckId, session, isFinalizing, mode, checkAuth, isExamMode, navigate]);

    useEffect(() => {
        if (!timeLimitSeconds || !session) {
            setTimeLeftSeconds(null);
            return;
        }

        let intervalId: number | null = null;
        const tick = () => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            const remaining = Math.max(0, timeLimitSeconds - elapsed);
            setTimeLeftSeconds(remaining);
            if (remaining === 0) {
                finalizeSession(elapsed);
                if (intervalId !== null) {
                    window.clearInterval(intervalId);
                }
            }
        };

        tick();
        intervalId = window.setInterval(tick, 1000);
        return () => {
            if (intervalId !== null) {
                window.clearInterval(intervalId);
            }
        };
    }, [timeLimitSeconds, session, finalizeSession]);

    // ============================================
    // EARLY EXIT HANDLER - Salva sessione quando utente esce
    // ============================================
    useEffect(() => {
        // Funzione per salvare la sessione quando l'utente esce
        const saveSessionOnExit = async () => {
            // Non salvare se:
            // - Sessione già completata
            // - Nessuna carta studiata
            // - Nessun deckId valido
            // - Sessione già marcata globalmente come completata
            if (
                isSessionCompleteRef.current ||
                !hasStudiedAnyCardRef.current ||
                !deckId ||
                (sessionKey && globalCompletedSessions.has(sessionKey))
            ) {
                return;
            }

            const statsSnapshot = sessionStatsRef.current;
            const cardsStudied = statsSnapshot.hard + statsSnapshot.good + statsSnapshot.easy;

            // Se non ha studiato nessuna carta, non salvare
            if (cardsStudied === 0) {
                return;
            }

            const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
            const correctCount = statsSnapshot.good + statsSnapshot.easy;
            const wrongCount = statsSnapshot.hard;

            // Marca come completata per evitare doppio salvataggio
            isSessionCompleteRef.current = true;
            if (sessionKey) {
                globalCompletedSessions.add(sessionKey);
            }

            try {
                // Usa sendBeacon per garantire che la richiesta venga completata anche se la pagina si chiude
                const payload = {
                    mode,
                    stats: {
                        correct: correctCount,
                        wrong: wrongCount,
                        timeSeconds: durationSeconds,
                    },
                };

                // Prova prima con fetch normale (più affidabile per dati di risposta)
                await studyService.completeSession(deckId, payload);
                console.log('[StudySession] Sessione parziale salvata con successo');
            } catch (err) {
                console.error('[StudySession] Errore nel salvataggio sessione parziale:', err);
                // Resetta i flag per permettere retry se l'utente torna
                isSessionCompleteRef.current = false;
                if (sessionKey) {
                    globalCompletedSessions.delete(sessionKey);
                }
            }
        };

        // Handler per beforeunload (chiusura tab/browser)
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (
                !isSessionCompleteRef.current &&
                hasStudiedAnyCardRef.current &&
                deckId
            ) {
                const statsSnapshot = sessionStatsRef.current;
                const cardsStudied = statsSnapshot.hard + statsSnapshot.good + statsSnapshot.easy;

                if (cardsStudied > 0) {
                    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
                    const correctCount = statsSnapshot.good + statsSnapshot.easy;
                    const wrongCount = statsSnapshot.hard;

                    // Usa sendBeacon per inviare dati anche quando la pagina si chiude
                    const payload = JSON.stringify({
                        mode,
                        stats: {
                            correct: correctCount,
                            wrong: wrongCount,
                            timeSeconds: durationSeconds,
                        },
                    });

                    navigator.sendBeacon(
                        `/api/study/${deckId}/session-complete`,
                        new Blob([payload], { type: 'application/json' })
                    );

                    // Mostra avviso (opzionale, alcuni browser lo ignorano)
                    e.preventDefault();
                    e.returnValue = 'Hai una sessione in corso. Sei sicuro di voler uscire?';
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup: salva sessione quando componente viene smontato (navigazione interna)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Salva sessione in modo asincrono quando si esce dalla pagina
            saveSessionOnExit();
        };
    }, [deckId, mode, sessionKey]);

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

            // Marca che l'utente ha studiato almeno una carta
            hasStudiedAnyCardRef.current = true;

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

    /**
     * Handler per tornare al dettaglio del mazzo corrente
     * 
     * Naviga al dettaglio del mazzo che si sta studiando invece della dashboard principale.
     * Questo permette all'utente di continuare a lavorare sul mazzo senza perdere il contesto.
     * 
     * @returns {void}
     */
    const handleBackToDeck = useCallback(() => {
        if (deckId) {
            // Naviga al dettaglio del mazzo corrente
            navigate(`/study/deck/${deckId}`);
        } else {
            // Fallback alla dashboard se deckId non è disponibile
            navigate('/study');
        }
    }, [navigate, deckId]);

    // Varianti per animazione card - su desktop parte invisibile e si centra
    const viewVariants = {
        enter: { 
            opacity: 0,
            scale: 0.9,
            y: 20,
        },
        center: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { 
                duration: 0.3
            },
        },
        exit: { 
            opacity: 0,
            scale: 0.9,
            y: -20,
            transition: { 
                duration: 0.2,
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
                        onClick={() => deckId ? navigate(`/study/deck/${deckId}`) : navigate('/study')}
                        className="px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors"
                    >
                        {deckId ? 'Torna al mazzo' : 'Torna alla Dashboard'}
                    </button>
                </div>
            </div>
        );
    }

    const progressPercent = session.cards.length > 0
        ? ((currentCardIndex + 1) / session.cards.length) * 100
        : 0;
    const modeLabel = MODE_LABELS[mode];
    const cardModeLabel = MODE_LABELS[currentCardMode];
    const showCardMode = (mode === 'mix' || mode === 'exam') && currentCardMode !== mode;
    const showTimer = timeLeftSeconds !== null;
    const timerWarning = timeLeftSeconds !== null && timeLeftSeconds <= 60;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 overflow-hidden overflow-x-hidden">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-xl">
                <button
                    onClick={handleBackToDeck}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    aria-label="Torna al mazzo"
                    title="Torna al dettaglio del mazzo"
                >
                    <FiArrowLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Torna al mazzo</span>
                </button>

                <div className="flex-1 mx-4 sm:mx-8">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-semibold text-white/80 truncate">
                                {session.deck.title}
                            </span>
                            <span className="hidden sm:inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
                                {modeLabel}
                            </span>
                            {showCardMode && (
                                <span className="hidden sm:inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
                                    {cardModeLabel}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/40">
                            {showTimer && (
                                <span
                                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                                        timerWarning
                                            ? 'border-rose-400/40 bg-rose-500/15 text-rose-200'
                                            : 'border-white/10 bg-white/5 text-white/70'
                                    }`}
                                >
                                    {formatTimer(timeLeftSeconds ?? 0)}
                                </span>
                            )}
                            <span>
                                {currentCardIndex + 1} / {session.cards.length}
                            </span>
                        </div>
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
                    onClick={handleBackToDeck}
                    className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Torna al mazzo"
                    title="Torna al dettaglio del mazzo"
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>

            {/* Main Content - Centrato su desktop, full-width su mobile */}
            <div className="pt-20 sm:pt-24 pb-32 sm:pb-40 md:pb-32 h-full overflow-y-auto overflow-x-hidden">
                <AnimatePresence mode="wait" initial={false}>
                    {currentCard && isFlashcardMode && displayCard && (
                        <motion.div
                            key={currentCard.id}
                            variants={viewVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="w-full h-full flex items-center justify-center px-2 sm:px-4"
                        >
                            <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl mx-auto">
                                <Flashcard
                                    card={displayCard}
                                    isFlipped={isFlipped}
                                    onFlip={handleFlip}
                                    exitDirection={exitDirection}
                                />
                            </div>
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

            {/* Rating Buttons - Posizionati per evitare sovrapposizioni */}
            <AnimatePresence>
                {isFlashcardMode && isFlipped && !isSessionCompleteRef.current && (
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 60 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed md:absolute bottom-0 left-0 right-0 px-4 sm:px-6 py-4 sm:py-6 md:py-8 border-t border-white/[0.06] bg-slate-950/95 md:bg-slate-950/80 backdrop-blur-xl z-20"
                        style={{
                            // Su desktop: assicura che non sovrapponga la card centrata
                            marginTop: 'auto'
                        }}
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
