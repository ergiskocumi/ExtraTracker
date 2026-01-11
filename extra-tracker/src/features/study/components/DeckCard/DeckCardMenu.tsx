import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Eye, Sparkles, BarChart2, Trash2, Star } from 'lucide-react';
import type { Deck } from '../../services/studyService';

interface DeckCardMenuProps {
    deck: Deck;
    totalCards: number;
    showMenu: boolean;
    onToggleMenu: () => void;
    onViewDetail: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onDelete: (deck: Deck) => void;
    onTogglePin?: (deck: Deck) => void;
}

export const DeckCardMenu: React.FC<DeckCardMenuProps> = ({
    deck,
    totalCards,
    showMenu,
    onToggleMenu,
    onViewDetail,
    onMagicGenerate,
    onDelete,
    onTogglePin,
}) => {
    const isPinned = deck.pinned === true;
    return (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleMenu();
                }}
                className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-black/20 backdrop-blur-sm text-white/60 hover:text-white hover:bg-black/40 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Menu opzioni"
            >
                <MoreHorizontal className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {showMenu && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={onToggleMenu}
                        />
                        {/* Menu */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className="absolute left-0 top-full mt-2 z-50 w-52 sm:w-56 py-2 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl"
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewDetail(deck.id);
                                    onToggleMenu();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-white/80 hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation min-h-[44px]"
                            >
                                <Eye className="w-4 h-4 flex-shrink-0" />
                                Visualizza Dettagli
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMagicGenerate(deck);
                                    onToggleMenu();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 active:bg-amber-500/15 transition-colors touch-manipulation min-h-[44px]"
                            >
                                <Sparkles className="w-4 h-4 flex-shrink-0" />
                                {totalCards === 0 ? 'Magic Generate' : 'Add Chapter via AI'}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewDetail(deck.id);
                                    onToggleMenu();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 active:bg-blue-500/15 transition-colors touch-manipulation min-h-[44px]"
                            >
                                <BarChart2 className="w-4 h-4 flex-shrink-0" />
                                Statistiche
                            </button>
                            {onTogglePin && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTogglePin(deck);
                                        onToggleMenu();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 active:bg-amber-500/15 transition-colors touch-manipulation min-h-[44px]"
                                >
                                    <Star className={`w-4 h-4 flex-shrink-0 ${isPinned ? 'fill-current' : ''}`} />
                                    {isPinned ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                                </button>
                            )}
                            <div className="my-2 border-t border-white/10" />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(deck);
                                    onToggleMenu();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-red-400 hover:bg-red-500/10 active:bg-red-500/15 transition-colors touch-manipulation min-h-[44px]"
                            >
                                <Trash2 className="w-4 h-4 flex-shrink-0" />
                                Elimina Mazzo
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
