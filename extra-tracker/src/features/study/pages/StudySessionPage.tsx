/**
 * 📚 STUDY SESSION PAGE - Focus Mode per studiare le flashcard
 * 
 * Features:
 * - Modalità focus: nasconde distrazioni, carta al centro
 * - Logica SM-2: Mostra fronte → Flip → Voto (1, 3, 5)
 * - Scorciatoie tastiera: Spazio (flip), 1/2/3 (voto)
 * - Animazioni swipe quando si vota
 * - Progress bar con carte rimanenti
 * - Schermata riepilogo a fine sessione
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiCheck, FiX, FiZap, FiAward, FiClock, FiTarget } from 'react-icons/fi';
import { Flashcard, FlashcardSkeleton } from '../components/Flashcard';
import { studyService, type StudySession, type ReviewRating } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';

// ============================================
// RATING BUTTON COMPONENT
// ============================================

interface RatingButtonProps {
    label: string;
    shortcut: string;
    color: 'red' | 'amber' | 'green';
    onClick: () => void;
    disabled?: boolean;
}

const RatingButton: React.FC<RatingButtonProps> = ({ 
    label, 
    shortcut, 
    color, 
    onClick,
    disabled 
}) => {
    const colorClasses = {
        red: 'from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-red-500/25',
        amber: 'from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-amber-500/25',
        green: 'from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/25',
    };

    const borderColors = {
        red: 'border-red-400/30',
        amber: 'border-amber-400/30',
        green: 'border-emerald-400/30',
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            disabled={disabled}
            className={`
                relative flex flex-col items-center gap-2 px-6 py-4 rounded-2xl
                bg-gradient-to-br ${colorClasses[color]}
                border ${borderColors[color]}
                shadow-lg
                text-white font-semibold
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                min-w-[100px]
            `}
        >
            <span className="text-lg">{label}</span>
            <kbd className="px-2 py-0.5 bg-black/20 rounded text-xs font-mono">
                {shortcut}
            </kbd>
        </motion.button>
    );
};

// ============================================
// SESSION COMPLETE SCREEN
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-[70vh] px-4"
        >
            {/* Celebrazione */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center mb-6"
            >
                <FiAward className="w-12 h-12 text-emerald-400" />
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-4xl font-bold text-white mb-2"
            >
                Sessione Completata! 🎉
            </motion.h1>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/60 mb-8"
            >
                {deckTitle}
            </motion.p>

            {/* Stats Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 w-full max-w-2xl"
            >
                <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <FiTarget className="w-4 h-4 text-primary-400" />
                        <span className="text-xs text-white/50 uppercase tracking-wider">Carte</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <FiClock className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-white/50 uppercase tracking-wider">Tempo</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatDuration(stats.duration)}</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <FiZap className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-white/50 uppercase tracking-wider">Precisione</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{accuracy}%</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <FiCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-emerald-400/70 uppercase tracking-wider">Facili</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">{stats.easy}</p>
                </div>
            </motion.div>

            {/* Breakdown visuale */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-1 h-3 w-full max-w-md rounded-full overflow-hidden mb-10"
            >
                {stats.hard > 0 && (
                    <div 
                        className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-l-full"
                        style={{ width: `${(stats.hard / stats.total) * 100}%` }}
                    />
                )}
                {stats.good > 0 && (
                    <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                        style={{ width: `${(stats.good / stats.total) * 100}%` }}
                    />
                )}
                {stats.easy > 0 && (
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-r-full"
                        style={{ width: `${(stats.easy / stats.total) * 100}%` }}
                    />
                )}
            </motion.div>

            {/* Azioni */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row items-center gap-4"
            >
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onStudyAgain}
                    className="px-6 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white/80 hover:bg-white/[0.1] transition-all"
                >
                    Studia di Nuovo
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onBackToDashboard}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold shadow-lg shadow-primary-500/25"
                >
                    Torna alla Dashboard
                </motion.button>
            </motion.div>
        </motion.div>
    );
};

// ============================================
// MAIN STUDY SESSION PAGE
// ============================================

export const StudySessionPage: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();

    // State
    const [session, setSession] = useState<StudySession | null>(null);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [startTime] = useState(Date.now());
    
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
                const data = await studyService.getSession(deckId);
                
                if (data.cards.length === 0) {
                    emitToast.info('Nessuna carta da studiare in questo mazzo!');
                    navigate('/study');
                    return;
                }

                setSession(data);
                setSessionStats(prev => ({ ...prev, total: data.cards.length }));
            } catch (err: any) {
                setError(err.message || 'Errore nel caricamento della sessione');
                emitToast.error('Impossibile caricare la sessione di studio');
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
    }, [deckId, navigate]);

    // Carta corrente
    const currentCard = session?.cards[currentCardIndex] ?? null;
    const remaining = session ? session.cards.length - currentCardIndex : 0;
    const progress = session ? ((currentCardIndex) / session.cards.length) * 100 : 0;

    // Handlers
    const handleFlip = useCallback(() => {
        if (!isFlipped && !isSubmitting) {
            setIsFlipped(true);
        }
    }, [isFlipped, isSubmitting]);

    const handleRating = useCallback(async (rating: ReviewRating) => {
        if (!session || !currentCard || isSubmitting) return;

        setIsSubmitting(true);

        // Determina direzione animazione
        const direction = rating === 1 ? 'left' : rating === 5 ? 'right' : 'up';
        setExitDirection(direction);

        // Aggiorna stats
        setSessionStats(prev => ({
            ...prev,
            hard: prev.hard + (rating === 1 ? 1 : 0),
            good: prev.good + (rating === 3 ? 1 : 0),
            easy: prev.easy + (rating === 5 ? 1 : 0),
        }));

        try {
            // Invia al backend
            await studyService.submitReview(session.deck.id, {
                cardId: currentCard.id,
                rating
            });

            // Attendi animazione uscita
            await new Promise(resolve => setTimeout(resolve, 350));

            // Prossima carta o fine
            if (currentCardIndex + 1 >= session.cards.length) {
                const duration = Math.floor((Date.now() - startTime) / 1000);
                setSessionStats(prev => ({ ...prev, duration }));
                setIsComplete(true);
            } else {
                setCurrentCardIndex(prev => prev + 1);
                setIsFlipped(false);
                setExitDirection(null);
            }
        } catch (err: any) {
            emitToast.error('Errore nel salvataggio della risposta');
            setExitDirection(null);
        } finally {
            setIsSubmitting(false);
        }
    }, [session, currentCard, currentCardIndex, isSubmitting, startTime]);

    // Keyboard shortcuts per rating
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isFlipped || isSubmitting) return;

            if (e.key === '1') handleRating(1);
            if (e.key === '2') handleRating(3);
            if (e.key === '3') handleRating(5);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFlipped, isSubmitting, handleRating]);

    // Handlers per schermata finale
    const handleBackToDashboard = () => navigate('/study');
    const handleStudyAgain = () => {
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setIsComplete(false);
        setSessionStats({ total: session?.cards.length || 0, hard: 0, good: 0, easy: 0, duration: 0 });
    };

    // ========== RENDER ==========

    // Loading
    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col">
                {/* Header skeleton */}
                <div className="px-6 py-4 border-b border-white/[0.08]">
                    <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse" />
                </div>
                
                {/* Progress skeleton */}
                <div className="px-6 py-2">
                    <div className="h-1.5 bg-white/5 rounded-full" />
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
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                        <FiX className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Errore</h2>
                    <p className="text-white/60 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/study')}
                        className="px-6 py-2 rounded-xl bg-white/[0.1] text-white hover:bg-white/[0.15] transition-all"
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

    // Main Study UI
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-dark-500 to-dark-400">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-white/[0.06]">
                <button
                    onClick={() => navigate('/study')}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                >
                    <FiArrowLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Esci</span>
                </button>

                <div className="text-center">
                    <h1 className="text-lg font-semibold text-white">
                        {session?.deck.title}
                    </h1>
                    <p className="text-xs text-white/40">
                        {remaining} carte rimanenti
                    </p>
                </div>

                <div className="w-16" /> {/* Spacer */}
            </header>

            {/* Progress Bar */}
            <div className="px-6 py-2">
                <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            </div>

            {/* Flashcard Area */}
            <div className="flex-1 flex items-center justify-center p-6">
                <AnimatePresence mode="wait">
                    {currentCard && (
                        <Flashcard
                            key={currentCard.id}
                            card={currentCard}
                            isFlipped={isFlipped}
                            onFlip={handleFlip}
                            exitDirection={exitDirection}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Rating Buttons */}
            <AnimatePresence>
                {isFlipped && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="px-6 py-8 border-t border-white/[0.06]"
                    >
                        <p className="text-center text-white/50 text-sm mb-4">
                            Quanto è stata difficile?
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <RatingButton
                                label="Difficile"
                                shortcut="1"
                                color="red"
                                onClick={() => handleRating(1)}
                                disabled={isSubmitting}
                            />
                            <RatingButton
                                label="Ok"
                                shortcut="2"
                                color="amber"
                                onClick={() => handleRating(3)}
                                disabled={isSubmitting}
                            />
                            <RatingButton
                                label="Facile"
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
