/**
 * SearchResults - Componente per mostrare i risultati della ricerca
 * 
 * Questo componente mostra sia gli esami che i mazzi trovati nella ricerca,
 * organizzandoli in sezioni separate per una migliore UX.
 * 
 * @component
 */

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Layers } from 'lucide-react';
import type { Exam } from '../../types/exam';
import type { Deck } from '../../services/studyService';
import type { Tag } from '../../services/tagsService';
import { ExamCard } from './ExamCard';
import { DeckCard } from '../DeckCard';
import { DeckGrid } from '../Deck/DeckGrid';

// ============================================
// TYPES
// ============================================

interface SearchResultsProps {
    /** Esami trovati nella ricerca */
    exams: Exam[];
    
    /** Mazzi trovati nella ricerca */
    decks: Deck[];
    
    /** Tag per i mazzi */
    tags: Tag[];
    
    /** Query di ricerca */
    searchQuery: string;
    
    /** Callback per click su esame */
    onExamClick: (examId: string) => void;
    
    /** Callback per aggiornare un mazzo */
    onDeckUpdate?: (deck: Deck) => void;
    
    /** Callback per visualizzare dettagli mazzo */
    onViewDetail?: (deckId: string) => void;
    
    /** Callback per studiare un mazzo */
    onStudy?: (deckId: string) => void;
    
    /** Callback per leggere un mazzo */
    onRead?: (deckId: string) => void;
    
    /** Callback per generare carte con AI */
    onMagicGenerate?: (deck: Deck) => void;
    
    /** Callback per aggiungere carta */
    onAddCard?: (deckId: string) => void;
    
    /** Callback per aprire Exam Solver per questo deck */
    onExamSolver?: (deckId: string) => void;
    
    /** Callback per eliminare mazzo */
    onDelete?: (deck: Deck) => void;
    
    /** Callback per toggle pin */
    onTogglePin?: (deck: Deck) => void;
    
    /** Funzione per calcolare statistiche esame */
    getExamStats: (examId: string) => {
        deckCount: number;
        totalCards: number;
        dueCards: number;
        masteryPercent: number;
    };
}

// ============================================
// COMPONENT
// ============================================

export const SearchResults: React.FC<SearchResultsProps> = ({
    exams,
    decks,
    tags,
    searchQuery,
    onExamClick,
    onDeckUpdate,
    onViewDetail,
    onStudy,
    onRead,
    onMagicGenerate,
    onAddCard,
    onDelete,
    onExamSolver,
    onTogglePin,
    getExamStats,
}) => {
    // Se non ci sono risultati, mostra messaggio
    if (exams.length === 0 && decks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <BookOpen className="w-10 h-10 text-white/40" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                    Nessun risultato trovato
                </h3>
                <p className="text-white/50 text-sm">
                    Nessun esame o mazzo corrisponde a "{searchQuery}"
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Sezione Esami Trovati */}
            {exams.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary-500/20 border border-primary-500/30">
                            <BookOpen className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">
                                Esami trovati ({exams.length})
                            </h3>
                            <p className="text-white/50 text-sm">
                                Risultati per "{searchQuery}"
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {exams.map((exam, index) => {
                            const stats = getExamStats(exam.id);
                            return (
                                <motion.div
                                    key={exam.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <ExamCard
                                        exam={exam}
                                        deckCount={stats.deckCount}
                                        totalCards={stats.totalCards}
                                        dueCards={stats.dueCards}
                                        masteryPercent={stats.masteryPercent}
                                        onClick={() => onExamClick(exam.id)}
                                    />
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* Sezione Mazzi Trovati */}
            {decks.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: exams.length > 0 ? 0.1 : 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/30">
                            <Layers className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">
                                Mazzi trovati ({decks.length})
                            </h3>
                            <p className="text-white/50 text-sm">
                                Risultati per "{searchQuery}"
                            </p>
                        </div>
                    </div>
                    <DeckGrid
                        decks={decks}
                        tags={tags}
                        DeckCardComponent={DeckCard}
                        onStudy={onStudy}
                        onRead={onRead}
                        onMagicGenerate={onMagicGenerate}
                        onAddCard={onAddCard}
                        onViewDetail={onViewDetail}
                        onDelete={onDelete}
                        onUpdate={onDeckUpdate}
                        onExamSolver={onExamSolver}
                        isFolderSelected={false}
                        onTogglePin={onTogglePin}
                    />
                </motion.div>
            )}
        </div>
    );
};
