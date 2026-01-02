/**
 * 📚 DECKS DASHBOARD PAGE - Griglia dei mazzi di flashcard
 * 
 * Features:
 * - Griglia mazzi con card moderne
 * - Badge "Da ripassare" per carte scadute
 * - Creazione nuovo mazzo con modal
 * - Aggiunta carte rapida
 * - Stati loading/empty/error
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiPlus,
    FiPlay,
    FiLayers,
    FiClock,
    FiX,
    FiBookOpen,
    FiTag,
    FiChevronRight,
    FiAlertCircle
} from 'react-icons/fi';
import { studyService, type Deck, type CreateDeckPayload, type AddCardPayload } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { CreateDeckModal } from '../components/CreateDeckModal';

// ============================================
// DECK CARD COMPONENT
// ============================================

interface DeckCardProps {
    deck: Deck;
    onStudy: (deckId: string) => void;
    onAddCard: (deckId: string) => void;
}

const DeckCard: React.FC<DeckCardProps> = ({ deck, onStudy, onAddCard }) => {
    const hasDueCards = (deck.dueCount ?? 0) > 0;
    const totalCards = deck.totalCards ?? deck.cards?.length ?? 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-2xl backdrop-blur-xl border border-white/[0.08] transition-all duration-300 hover:border-white/[0.15]"
            style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
            }}
        >
            {/* Badge Due Cards */}
            {hasDueCards && (
                <div className="absolute top-4 right-4 z-10">
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold"
                    >
                        <FiClock className="w-3 h-3" />
                        {deck.dueCount} da ripassare
                    </motion.span>
                </div>
            )}

            {/* Decorazione */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-primary-500/10 to-transparent rounded-tl-2xl pointer-events-none" />

            <div className="p-6">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-primary-500/15 border border-primary-500/20">
                        <FiLayers className="w-6 h-6 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
                            {deck.title}
                        </h3>
                        {deck.description && (
                            <p className="text-sm text-white/50 mt-1 line-clamp-2">
                                {deck.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-5">
                    <div className="flex items-center gap-2 text-white/50">
                        <FiBookOpen className="w-4 h-4" />
                        <span className="text-sm">{totalCards} carte</span>
                    </div>
                    {deck.tags && deck.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                            <FiTag className="w-3 h-3 text-white/40" />
                            <span className="text-xs text-white/40">
                                {deck.tags.slice(0, 2).join(', ')}
                                {deck.tags.length > 2 && ` +${deck.tags.length - 2}`}
                            </span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onStudy(deck.id)}
                        disabled={totalCards === 0}
                        className={`
                            flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all
                            ${hasDueCards
                                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                                : totalCards > 0
                                    ? 'bg-white/[0.08] text-white/80 hover:bg-white/[0.12]'
                                    : 'bg-white/[0.03] text-white/30 cursor-not-allowed'
                            }
                        `}
                    >
                        <FiPlay className="w-4 h-4" />
                        {hasDueCards ? 'Studia Ora' : 'Inizia'}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onAddCard(deck.id)}
                        className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.1] transition-all"
                        title="Aggiungi Carta"
                    >
                        <FiPlus className="w-5 h-5" />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// ADD CARD MODAL
// ============================================

interface AddCardModalProps {
    isOpen: boolean;
    deckId: string | null;
    deckTitle: string;
    onClose: () => void;
    onSubmit: (deckId: string, data: AddCardPayload) => Promise<void>;
}

const AddCardModal: React.FC<AddCardModalProps> = ({ 
    isOpen, 
    deckId, 
    deckTitle, 
    onClose, 
    onSubmit 
}) => {
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!front.trim() || !back.trim() || !deckId) return;

        setIsSubmitting(true);
        try {
            await onSubmit(deckId, { front: front.trim(), back: back.trim() });
            setFront('');
            setBack('');
            // Non chiudiamo il modal per permettere di aggiungere più carte
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFront('');
        setBack('');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && deckId && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-lg rounded-2xl border border-white/[0.1] overflow-hidden"
                        style={{
                            background: 'linear-gradient(145deg, rgba(30, 27, 45, 0.98) 0%, rgba(20, 18, 35, 0.98) 100%)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Nuova Carta</h2>
                                <p className="text-sm text-white/50">{deckTitle}</p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-lg hover:bg-white/[0.1] transition-colors"
                            >
                                <FiX className="w-5 h-5 text-white/60" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Fronte (Domanda) <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    value={front}
                                    onChange={e => setFront(e.target.value)}
                                    placeholder="Cosa vuoi memorizzare?"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Retro (Risposta) <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    value={back}
                                    onChange={e => setBack(e.target.value)}
                                    placeholder="La risposta..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-4 py-3 rounded-xl bg-white/[0.05] text-white/70 hover:bg-white/[0.1] transition-all"
                                >
                                    Chiudi
                                </button>
                                <button
                                    type="submit"
                                    disabled={!front.trim() || !back.trim() || isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <FiPlus className="w-4 h-4" />
                                    {isSubmitting ? 'Aggiungendo...' : 'Aggiungi Carta'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ============================================
// EMPTY STATE
// ============================================

const EmptyState: React.FC<{ onCreateDeck: () => void }> = ({ onCreateDeck }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 px-6"
    >
        <div className="w-20 h-20 rounded-2xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center mb-6">
            <FiLayers className="w-10 h-10 text-primary-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
            Nessun Mazzo
        </h3>
        <p className="text-white/50 text-center max-w-sm mb-8">
            Crea il tuo primo mazzo di flashcard per iniziare a studiare con la ripetizione spaziata.
        </p>
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCreateDeck}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium shadow-lg shadow-primary-500/25"
        >
            <FiPlus className="w-5 h-5" />
            Crea Primo Mazzo
        </motion.button>
    </motion.div>
);

// ============================================
// SKELETON LOADER
// ============================================

const DeckSkeleton: React.FC = () => (
    <div 
        className="rounded-2xl border border-white/[0.08] p-6 animate-pulse"
        style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}
    >
        <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/10" />
            <div className="flex-1 space-y-2">
                <div className="w-3/4 h-5 bg-white/10 rounded-lg" />
                <div className="w-1/2 h-4 bg-white/5 rounded-lg" />
            </div>
        </div>
        <div className="flex items-center gap-4 mb-5">
            <div className="w-20 h-4 bg-white/5 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
            <div className="flex-1 h-10 bg-white/5 rounded-xl" />
            <div className="w-10 h-10 bg-white/5 rounded-xl" />
        </div>
    </div>
);

// ============================================
// MAIN DASHBOARD PAGE
// ============================================

export const DecksDashboardPage: React.FC = () => {
    const navigate = useNavigate();

    // State
    const [decks, setDecks] = useState<Deck[]>([]);
    const [dueCardCount, setDueCardCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
    const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);

    // Carica mazzi
    const loadDecks = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const dashboardData = await studyService.getDashboard();
            setDecks(dashboardData.decks);
            setDueCardCount(dashboardData.dueCardCount);
        } catch (err: any) {
            setError(err.message || 'Errore nel caricamento dei mazzi');
            emitToast.error('Impossibile caricare i mazzi');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDecks();
    }, [loadDecks]);

    // Handlers
    const handleStudy = (deckId: string) => {
        navigate(`/study/${deckId}`);
    };

    const handleAddCard = (deckId: string) => {
        const deck = decks.find(d => d.id === deckId);
        if (deck) {
            setSelectedDeck(deck);
            setIsAddCardModalOpen(true);
        }
    };

    const handleCreateDeck = async (data: CreateDeckPayload) => {
        const newDeck = await studyService.createDeck(data);
        setDecks(prev => [...prev, newDeck]);
        emitToast.success('Mazzo creato con successo!', { title: 'Nuovo Mazzo 📚' });
    };

    const handleSubmitCard = async (deckId: string, data: AddCardPayload) => {
        try {
            const updatedDeck = await studyService.addCard(deckId, data);
            setDecks(prev => prev.map(d => d.id === deckId ? updatedDeck : d));
            emitToast.success('Carta aggiunta!', { duration: 2000 });
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'aggiunta della carta');
            throw err;
        }
    };

    // ========== RENDER ==========

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <p className="text-xs font-semibold text-primary-400 uppercase tracking-[0.2em] mb-1">
                            Learning
                        </p>
                        <h1 className="text-3xl font-bold text-white">
                            Flashcards
                        </h1>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium shadow-lg shadow-primary-500/25"
                    >
                        <FiPlus className="w-5 h-5" />
                        <span className="hidden sm:inline">Nuovo Mazzo</span>
                    </motion.button>
                </div>

                {/* Global Stats */}
                {!isLoading && decks.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 mt-4"
                    >
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                            <FiLayers className="w-4 h-4 text-white/50" />
                            <span className="text-sm text-white/70">{decks.length} mazzi</span>
                        </div>
                        {dueCardCount > 0 && (
                            <motion.div
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/15 border border-orange-500/20"
                            >
                                <FiClock className="w-4 h-4 text-orange-400" />
                                <span className="text-sm font-medium text-orange-400">
                                    {dueCardCount} carte da ripassare
                                </span>
                                <FiChevronRight className="w-4 h-4 text-orange-400" />
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </header>

            {/* Content */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <DeckSkeleton key={i} />
                    ))}
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                        <FiAlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-white/60 mb-4">{error}</p>
                    <button
                        onClick={loadDecks}
                        className="px-4 py-2 rounded-xl bg-white/[0.1] text-white hover:bg-white/[0.15] transition-all"
                    >
                        Riprova
                    </button>
                </div>
            ) : decks.length === 0 ? (
                <EmptyState onCreateDeck={() => setIsCreateModalOpen(true)} />
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {decks.map((deck, index) => (
                        <motion.div
                            key={deck.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <DeckCard
                                deck={deck}
                                onStudy={handleStudy}
                                onAddCard={handleAddCard}
                            />
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Modals */}
            <CreateDeckModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateDeck}
            />

            <AddCardModal
                isOpen={isAddCardModalOpen}
                deckId={selectedDeck?.id ?? null}
                deckTitle={selectedDeck?.title ?? ''}
                onClose={() => {
                    setIsAddCardModalOpen(false);
                    setSelectedDeck(null);
                }}
                onSubmit={handleSubmitCard}
            />
        </div>
    );
};

export default DecksDashboardPage;
