/**
 * UnassignedDecksSection - Sezione per mazzi senza esame associato
 * 
 * Questo componente mostra tutti i mazzi che non hanno un esame (goalId) associato,
 * permettendo all'utente di visualizzarli e associarli a un esame esistente.
 * 
 * FUNZIONALITÀ:
 * - Mostra tutti i mazzi senza goalId
 * - Permette di associare un esame a ciascun mazzo
 * - Mostra statistiche dei mazzi non associati
 * - Integra ChangeExamModal per l'associazione
 * 
 * @component
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, BookOpen, Plus } from 'lucide-react';
import type { Deck } from '../../services/studyService';
import type { Goal } from '../../../goals/types';
import { DeckCard } from '../DeckCard';
import { DeckGrid } from '../Deck/DeckGrid';
import { ChangeExamModal } from '../Deck/ChangeExamModal';
import type { Tag } from '../../services/tagsService';

// ============================================
// TYPES
// ============================================

interface UnassignedDecksSectionProps {
    /** Lista di tutti i mazzi */
    decks: Deck[];
    
    /** Lista di tutti gli esami disponibili */
    exams: Goal[];
    
    /** Lista di tutti i tag */
    tags: Tag[];
    
    /** Callback chiamato quando un mazzo viene aggiornato */
    onDeckUpdate: (updatedDeck: Deck) => void;
    
    /** Callback per visualizzare i dettagli di un mazzo */
    onViewDetail: (deckId: string) => void;
    
    /** Callback per avviare lo studio di un mazzo */
    onStudy: (deckId: string) => void;
    
    /** Callback per leggere un mazzo */
    onRead?: (deckId: string) => void;
    
    /** Callback per generare carte con AI */
    onMagicGenerate: (deck: Deck) => void;
    
    /** Callback per aggiungere una carta */
    onAddCard: (deckId: string) => void;
    
    /** Callback per eliminare un mazzo */
    onDelete: (deck: Deck) => void;
    
    /** Callback per toggle pin di un mazzo */
    onTogglePin?: (deck: Deck) => void;
    
    /** Modalità di visualizzazione */
    viewMode?: 'grid' | 'list' | 'compact';
}

// ============================================
// COMPONENT
// ============================================

export const UnassignedDecksSection: React.FC<UnassignedDecksSectionProps> = ({
    decks,
    exams,
    tags,
    onDeckUpdate,
    onViewDetail,
    onStudy,
    onRead,
    onMagicGenerate,
    onAddCard,
    onDelete,
    onTogglePin,
    viewMode = 'grid',
}) => {
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    
    /**
     * ID del mazzo per cui è aperto il modal di cambio esame.
     * Null se nessun modal è aperto.
     */
    const [changeExamModalDeckId, setChangeExamModalDeckId] = useState<string | null>(null);
    
    /**
     * Indica se la sezione è espansa o collassata.
     * Default: true (mostra sempre i mazzi non associati)
     */
    const [isExpanded, setIsExpanded] = useState(true);

    // ============================================
    // COMPUTED VALUES
    // ============================================
    
    /**
     * Filtra i mazzi che non hanno un esame associato.
     * Un mazzo è considerato "non associato" se goalId è null, undefined, o stringa vuota.
     */
    const unassignedDecks = useMemo(() => {
        return decks.filter(deck => !deck.goalId || deck.goalId.trim() === '');
    }, [decks]);

    /**
     * Calcola le statistiche dei mazzi non associati.
     * Include conteggio totale, carte totali, e carte da ripassare.
     */
    const stats = useMemo(() => {
        const totalCards = unassignedDecks.reduce(
            (sum, deck) => sum + (deck.totalCards ?? deck.cards?.length ?? 0),
            0
        );
        const dueCards = unassignedDecks.reduce(
            (sum, deck) => sum + (deck.dueCount ?? 0),
            0
        );
        
        return {
            deckCount: unassignedDecks.length,
            totalCards,
            dueCards,
        };
    }, [unassignedDecks]);

    /**
     * Trova il mazzo per cui è aperto il modal di cambio esame.
     */
    const changeExamModalDeck = useMemo(() => {
        if (!changeExamModalDeckId) return null;
        return unassignedDecks.find(deck => deck.id === changeExamModalDeckId) || null;
    }, [changeExamModalDeckId, unassignedDecks]);

    // ============================================
    // EVENT HANDLERS
    // ============================================
    
    /**
     * Gestisce l'apertura del modal per associare un esame a un mazzo.
     * 
     * @param deckId - ID del mazzo per cui aprire il modal
     */
    const handleOpenChangeExamModal = (deckId: string) => {
        setChangeExamModalDeckId(deckId);
    };

    /**
     * Gestisce la chiusura del modal di cambio esame.
     */
    const handleCloseChangeExamModal = () => {
        setChangeExamModalDeckId(null);
    };

    /**
     * Gestisce il completamento dell'associazione di un esame a un mazzo.
     * 
     * @param updatedDeck - Il mazzo aggiornato con il nuovo goalId
     */
    const handleExamChanged = (updatedDeck: Deck) => {
        onDeckUpdate(updatedDeck);
        handleCloseChangeExamModal();
    };

    // ============================================
    // RENDER
    // ============================================
    
    // Se non ci sono mazzi non associati, non mostrare la sezione
    if (unassignedDecks.length === 0) {
        return null;
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm p-6 space-y-4"
            >
                {/* Header della sezione */}
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-white mb-1">
                                Mazzi senza esame associato
                            </h3>
                            <p className="text-white/70 text-sm mb-3">
                                Ci sono <span className="font-semibold text-amber-300">{stats.deckCount}</span> mazzi
                                che non sono associati a nessun esame. Associa un esame per organizzarli meglio.
                            </p>
                            <div className="flex items-center gap-4 text-sm text-white/60">
                                <span>
                                    <span className="font-semibold text-white">{stats.totalCards}</span> carte totali
                                </span>
                                {stats.dueCards > 0 && (
                                    <span>
                                        <span className="font-semibold text-amber-300">{stats.dueCards}</span> da ripassare
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        aria-label={isExpanded ? 'Collassa' : 'Espandi'}
                    >
                        <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </motion.div>
                    </motion.button>
                </div>

                {/* Lista dei mazzi non associati */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4"
                        >
                            <DeckGrid
                                decks={unassignedDecks}
                                tags={tags}
                                DeckCardComponent={({ deck, ...props }) => (
                                    <DeckCard
                                        deck={deck}
                                        {...props}
                                        onUpdate={(updatedDeck) => {
                                            // Permetti l'aggiornamento del mazzo
                                            onDeckUpdate(updatedDeck);
                                        }}
                                        onViewDetail={onViewDetail}
                                        onStudy={onStudy}
                                        onRead={onRead}
                                        onMagicGenerate={onMagicGenerate}
                                        onAddCard={onAddCard}
                                        onDelete={onDelete}
                                        onTogglePin={onTogglePin}
                                    />
                                )}
                                onStudy={onStudy}
                                onRead={onRead}
                                onMagicGenerate={onMagicGenerate}
                                onAddCard={onAddCard}
                                onViewDetail={onViewDetail}
                                onDelete={onDelete}
                                onUpdate={onDeckUpdate}
                                isFolderSelected={false}
                                onTogglePin={onTogglePin}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Modal per associare un esame a un mazzo */}
            {changeExamModalDeck && (
                <ChangeExamModal
                    isOpen={!!changeExamModalDeck}
                    deck={changeExamModalDeck}
                    onExamChanged={handleExamChanged}
                    onClose={handleCloseChangeExamModal}
                />
            )}
        </>
    );
};
