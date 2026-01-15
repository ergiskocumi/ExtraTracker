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
    Star
} from 'lucide-react';
import type { Deck } from '../../services/studyService';
import type { Tag } from '../../services/tagsService';
import { getDeckTheme } from './utils/deckTheme';

// ============================================
// TYPES
// ============================================

export interface DeckCardCompactProps {
    deck: Deck;
    onStudy: (deckId: string) => void;
    onRead?: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onDelete?: (deck: Deck) => void;
    onUpdate?: (deck: Deck) => void;
    tags?: Tag[];
    onTogglePin?: (deck: Deck) => void;
}

// ============================================
// COMPONENT
// ============================================

export const DeckCardCompact: React.FC<DeckCardCompactProps> = ({
    deck,
    onStudy,
    onRead,
    onMagicGenerate,
    onAddCard,
    onViewDetail,
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

    const handleCardClick = () => {
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
            onClick={handleCardClick}
            className={`
                relative rounded-xl border overflow-hidden cursor-pointer
                transition-all duration-300
                ${hasDueCards 
                    ? 'border-orange-500/40 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent' 
                    : `${theme.borderColor} bg-gradient-to-br ${theme.gradient}`
                }
                hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10
            `}
        >
            {/* Badges - Due Cards & Pinned */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                {deck.pinned && (
                    <div className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                        ⭐
                    </div>
                )}
                {hasDueCards && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold shadow-lg">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{deck.dueCount}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Header: Icona + Titolo */}
                <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${theme.gradient} border ${theme.borderColor} flex-shrink-0`}>
                        <ThemeIcon className={`w-5 h-5 ${theme.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate text-sm">{deck.title}</h3>
                        <p className="text-xs text-white/50 mt-0.5">
                            {totalCards} carte {hasDueCards && `• ${deck.dueCount} da ripassare`}
                        </p>
                    </div>
                </div>

                {/* Progress Bar - Sempre visibile */}
                {totalCards > 0 && (
                    <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-white/50">Padronanza</span>
                            <span className="text-white/70 font-medium">{masteryPercent}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
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

                {/* PDF Badge */}
                {hasPdf && (
                    <div className="mb-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-500/20 border border-primary-500/30 text-xs text-primary-300">
                            <BookOpen className="w-3 h-3" />
                            PDF disponibile
                        </span>
                    </div>
                )}
            </div>

            {/* Azioni - Solo su Hover */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-zinc-900/95 backdrop-blur-sm rounded-xl
                                   flex items-center justify-center gap-2 p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2">
                            {/* Primary Action */}
                            {hasPdf && onRead ? (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onRead(deck.id)}
                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 
                                               text-white font-medium text-sm shadow-lg shadow-indigo-500/30
                                               hover:shadow-xl hover:shadow-indigo-500/40 transition-all"
                                >
                                    <Monitor className="w-4 h-4 inline mr-2" />
                                    Cinema Mode
                                </motion.button>
                            ) : (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onStudy(deck.id)}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm shadow-lg transition-all
                                        ${hasDueCards
                                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/30 hover:shadow-orange-500/40'
                                            : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-primary-500/30 hover:shadow-primary-500/40'
                                        }`}
                                >
                                    <Play className="w-4 h-4 inline mr-2" />
                                    {hasDueCards ? 'Ripassa' : 'Studia'}
                                </motion.button>
                            )}

                            {/* Secondary Actions */}
                            <div className="flex items-center gap-1.5">
                                {totalCards === 0 && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => onMagicGenerate(deck)}
                                        className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 
                                                   text-amber-400 hover:bg-amber-500/30 transition-colors"
                                        title="Magic AI"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </motion.button>
                                )}
                                
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onAddCard(deck.id)}
                                    className="p-2 rounded-lg bg-white/5 border border-white/10 
                                               text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                                    title="Aggiungi carta"
                                >
                                    <Plus className="w-4 h-4" />
                                </motion.button>

                                {onTogglePin && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => onTogglePin(deck)}
                                        className={`p-2 rounded-lg border transition-colors
                                            ${deck.pinned
                                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border-white/10'
                                            }`}
                                        title={deck.pinned ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                                    >
                                        <Star className={`w-4 h-4 ${deck.pinned ? 'fill-current' : ''}`} />
                                    </motion.button>
                                )}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onViewDetail(deck.id)}
                                    className="p-2 rounded-lg bg-white/5 border border-white/10 
                                               text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                                    title="Dettagli"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
