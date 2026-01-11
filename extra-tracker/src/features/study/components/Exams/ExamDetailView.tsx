import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen } from 'lucide-react';
import type { Goal } from '../../../goals/types';
import type { Deck } from '../../services/studyService';
import { DeckSections } from '../DeckSections/DeckSections';
import { useOrganizedDecks } from '../../hooks/useOrganizedDecks';
import type { Tag } from '../../services/tagsService';

// ============================================
// TYPES
// ============================================

interface ExamDetailViewProps {
    exam: Goal;
    decks: Deck[];
    folders: any[];
    tags: Tag[];
    onBack: () => void;
    onStudy: (deckId: string) => void;
    onRead?: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
    onUpdate: (deck: Deck) => void;
    onViewFolder?: (folderId: string) => void;
    onTogglePin?: (deck: Deck) => void;
    viewMode?: 'grid' | 'horizontal' | 'compact';
}

// ============================================
// COMPONENT
// ============================================

export const ExamDetailView: React.FC<ExamDetailViewProps> = ({
    exam,
    decks,
    folders,
    tags,
    onBack,
    onStudy,
    onRead,
    onMagicGenerate,
    onAddCard,
    onViewDetail,
    onDelete,
    onUpdate,
    onViewFolder,
    onTogglePin,
    viewMode = 'grid',
}) => {
    // Filtra solo i mazzi associati a questo esame
    const examDecks = decks.filter(d => d.goalId === exam.id);
    
    // Organizza i mazzi
    const organizedDecks = useOrganizedDecks(examDecks, folders);

    // Calcola statistiche
    const totalCards = examDecks.reduce((sum, deck) => sum + (deck.totalCards ?? deck.cards?.length ?? 0), 0);
    const dueCards = examDecks.reduce((sum, deck) => sum + (deck.dueCount ?? 0), 0);
    let masteredCards = 0;
    examDecks.forEach(deck => {
        masteredCards += deck.cards?.filter(c => c.status === 'mastered').length ?? 0;
    });
    const masteryPercent = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

    const deadlineDate = new Date(exam.deadline);
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isUrgent = daysUntilDeadline <= 7 && daysUntilDeadline >= 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onBack}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </motion.button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white mb-1">{exam.title}</h1>
                    {exam.description && (
                        <p className="text-white/50 text-sm">{exam.description}</p>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-white/50" />
                        <span className="text-xs text-white/50">Mazzi</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{examDecks.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-white/50" />
                        <span className="text-xs text-white/50">Carte</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{totalCards}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-white/50">Padronanza</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{masteryPercent}%</p>
                </div>
                <div className={`p-4 rounded-xl border ${
                    isUrgent ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-white/10'
                }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs ${isUrgent ? 'text-orange-400' : 'text-white/50'}`}>
                            Scadenza
                        </span>
                    </div>
                    <p className={`text-2xl font-bold ${isUrgent ? 'text-orange-400' : 'text-white'}`}>
                        {daysUntilDeadline >= 0 ? `${daysUntilDeadline}d` : 'Scaduto'}
                    </p>
                </div>
            </div>

            {/* Decks */}
            {examDecks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                        <BookOpen className="w-10 h-10 text-white/40" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                        Nessun mazzo per questo esame
                    </h3>
                    <p className="text-white/50 text-sm mb-6">
                        Crea il primo mazzo per iniziare a studiare
                    </p>
                </div>
            ) : (
                <DeckSections
                    organizedDecks={organizedDecks}
                    tags={tags}
                    viewMode={viewMode}
                    onStudy={onStudy}
                    onRead={onRead}
                    onMagicGenerate={onMagicGenerate}
                    onAddCard={onAddCard}
                    onViewDetail={onViewDetail}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    onViewFolder={onViewFolder}
                    onTogglePin={onTogglePin}
                />
            )}
        </div>
    );
};
