import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, 
    Sparkles, 
    Plus, 
    MoreVertical, 
    Clock, 
    BookOpen,
    Monitor,
    Star,
    TrendingUp
} from 'lucide-react';
import type { Deck } from '../../services/studyService';
import type { Tag } from '../../services/tagsService';
import { getDeckTheme } from './utils/deckTheme';

// ============================================
// TYPES
// ============================================

export interface DeckCardListProps {
    deck: Deck;
    onStudy: (deckId: string) => void;
    onRead?: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
    onUpdate: (deck: Deck) => void;
    onExamSolver?: (deckId: string) => void;
    tags?: Tag[];
    onTogglePin?: (deck: Deck) => void;
}

// ============================================
// COMPONENT
// ============================================

export const DeckCardList: React.FC<DeckCardListProps> = ({
    deck,
    onStudy,
    onRead,
    onMagicGenerate,
    onAddCard,
    onViewDetail,
    onDelete,
    onUpdate,
    tags = [],
    onTogglePin,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    
    const hasDueCards = (deck.dueCount ?? 0) > 0;
    const totalCards = deck.totalCards ?? deck.cards?.length ?? 0;
    const masteredCards = deck.cards?.filter(c => c.status === 'mastered').length ?? 0;
    const masteryPercent = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;
    const hasPdf = !!deck.pdfUrl;
    
    const theme = getDeckTheme(deck);
    const ThemeIcon = theme.icon;

    const handleRowClick = () => {
        if (hasPdf && onRead) {
            onRead(deck.id);
        } else {
            onStudy(deck.id);
        }
    };

    return (
        <motion.div
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={handleRowClick}
            className={`
                relative rounded-xl border overflow-hidden cursor-pointer
                transition-all duration-200
                ${hasDueCards 
                    ? 'border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-transparent' 
                    : `${theme.borderColor} bg-gradient-to-r ${theme.gradient}`
                }
                hover:border-primary-500/50 hover:shadow-md hover:shadow-primary-500/10
            `}
        >
            <div className="flex items-center gap-4 p-4">
                {/* Icon */}
                <div className={`p-2.5 rounded-lg ${theme.bgColor} flex-shrink-0`}>
                    <ThemeIcon className={`w-5 h-5 ${theme.iconColor}`} />
                </div>

                {/* Title & Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate text-sm">{deck.title}</h3>
                        {deck.pinned && (
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-current flex-shrink-0" />
                        )}
                        {hasDueCards && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30">
                                <Clock className="w-3 h-3 text-orange-400" />
                                <span className="text-[10px] text-orange-400 font-bold">{deck.dueCount}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/50">
                        <span>{totalCards} carte</span>
                        {totalCards > 0 && (
                            <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    <span>{masteryPercent}% padronanza</span>
                                </div>
                            </>
                        )}
                        {hasPdf && (
                            <>
                                <span>•</span>
                                <div className="flex items-center gap-1 text-blue-400">
                                    <BookOpen className="w-3 h-3" />
                                    <span>PDF</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Progress Bar - Compact */}
                {totalCards > 0 && (
                    <div className="w-24 hidden sm:block">
                        <div className="h-1.5 bg-theme-surface rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${masteryPercent}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                className={`h-full rounded-full ${
                                    masteryPercent >= 80 ? 'bg-emerald-500' :
                                    masteryPercent >= 50 ? 'bg-blue-500' :
                                    'bg-primary-500'
                                }`}
                            />
                        </div>
                    </div>
                )}

                {/* Actions - Always visible in list view */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Primary Action */}
                    {hasPdf && onRead ? (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onRead(deck.id);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 
                                       text-white font-medium text-xs shadow-lg shadow-indigo-500/30
                                       hover:shadow-xl hover:shadow-indigo-500/40 transition-all"
                        >
                            <Monitor className="w-3.5 h-3.5 inline mr-1.5" />
                            Cinema
                        </motion.button>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onStudy(deck.id);
                            }}
                            className={`px-3 py-1.5 rounded-lg font-medium text-xs shadow-lg transition-all
                                ${hasDueCards
                                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/30 hover:shadow-orange-500/40'
                                    : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-primary-500/30 hover:shadow-primary-500/40'
                                }`}
                        >
                            <Play className="w-3.5 h-3.5 inline mr-1.5" />
                            {hasDueCards ? 'Ripassa' : 'Studia'}
                        </motion.button>
                    )}

                    {/* Secondary Actions - Show on hover */}
                    <AnimatePresence>
                        {isHovered && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="flex items-center gap-1 overflow-hidden"
                            >
                                {totalCards === 0 && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMagicGenerate(deck);
                                        }}
                                        className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 
                                                   text-amber-400 hover:bg-amber-500/30 transition-colors"
                                        title="Magic AI"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                    </motion.button>
                                )}
                                
                                {onTogglePin && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTogglePin(deck);
                                        }}
                                        className={`p-1.5 rounded-lg border transition-colors
                                            ${deck.pinned
                                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                                : 'bg-theme-surface text-theme-muted hover:bg-theme-elevated hover:text-theme-primary border-theme-default'
                                            }`}
                                        title={deck.pinned ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                                    >
                                        <Star className={`w-3.5 h-3.5 ${deck.pinned ? 'fill-current' : ''}`} />
                                    </motion.button>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewDetail(deck.id);
                                    }}
                                    className="p-1.5 rounded-lg bg-theme-surface border border-theme-default 
                                               text-theme-muted hover:bg-theme-elevated hover:text-theme-primary transition-colors"
                                    title="Dettagli"
                                >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};
