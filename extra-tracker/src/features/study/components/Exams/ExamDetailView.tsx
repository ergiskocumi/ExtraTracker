import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import type { Goal } from '../../../goals/types';
import type { Deck } from '../../services/studyService';
import { DeckGrid } from '../Deck/DeckGrid';
import { DeckCard } from '../DeckCard';
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
    onExamSolver?: (deckId: string) => void;
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
    onExamSolver,
    onViewFolder,
    onTogglePin,
    viewMode = 'grid',
}) => {
    // Filtra solo i mazzi associati a questo esame
    const examDecks = decks.filter(d => d.goalId === exam.id);

    return (
        <div>
            {/* Vista normale senza sezioni - solo griglia di mazzi */}
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
                <DeckGrid
                    decks={examDecks}
                    tags={tags}
                    DeckCardComponent={DeckCard}
                    onStudy={onStudy}
                    onRead={onRead}
                    onMagicGenerate={onMagicGenerate}
                    onAddCard={onAddCard}
                    onViewDetail={onViewDetail}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    onExamSolver={onExamSolver}
                    isFolderSelected={false}
                    onTogglePin={onTogglePin}
                />
            )}
        </div>
    );
};
