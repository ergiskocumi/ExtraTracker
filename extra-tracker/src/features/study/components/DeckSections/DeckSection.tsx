import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Deck } from '../../services/studyService';
import type { Tag } from '../../services/tagsService';
import { DeckCard } from '../DeckCard';
import { DeckCardCompact } from '../DeckCard/DeckCardCompact';
import { DeckCardList } from '../DeckCard/DeckCardList';
import { FolderSectionHeader } from './FolderSectionHeader';
import type { FolderSection } from '../../hooks/useOrganizedDecks';

// ============================================
// TYPES
// ============================================

export type DeckSectionLayout = 'horizontal' | 'grid' | 'compact' | 'list';

interface DeckSectionProps {
    title: string;
    subtitle?: string;
    decks: Deck[];
    layout?: DeckSectionLayout;
    maxVisible?: number;
    highlight?: 'orange' | 'violet' | 'blue' | 'emerald';
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    tags?: Tag[];
    folderSection?: FolderSection; // Per sezioni di cartelle
    onStudy: (deckId: string) => void;
    onRead?: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
    onUpdate: (deck: Deck) => void;
    onViewFolder?: (folderId: string) => void;
    onTogglePin?: (deck: Deck) => void;
}

// ============================================
// COMPONENT
// ============================================

export const DeckSection: React.FC<DeckSectionProps> = ({
    title,
    subtitle,
    decks,
    layout = 'grid',
    maxVisible,
    highlight,
    collapsible = false,
    defaultCollapsed = false,
    tags = [],
    folderSection,
    onStudy,
    onRead,
    onMagicGenerate,
    onAddCard,
    onViewDetail,
    onDelete,
    onUpdate,
    onViewFolder,
    onTogglePin,
}) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    if (decks.length === 0) {
        return null;
    }

    const visibleDecks = maxVisible ? decks.slice(0, maxVisible) : decks;
    const hasMore = maxVisible ? decks.length > maxVisible : false;

    const highlightColors = {
        orange: 'border-orange-500/30 bg-orange-500/5',
        violet: 'border-primary-500/30 bg-primary-500/5',
        blue: 'border-blue-500/30 bg-blue-500/5',
        emerald: 'border-emerald-500/30 bg-emerald-500/5',
    };

    const highlightClass = highlight ? highlightColors[highlight] : '';

    return (
        <div className={`space-y-4 ${highlightClass} rounded-2xl p-4 border`}>
            {/* Header */}
            {folderSection ? (
                <FolderSectionHeader
                    folderSection={folderSection}
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                    onViewFolder={onViewFolder}
                />
            ) : (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {collapsible && (
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                {isCollapsed ? (
                                    <ChevronRight className="w-5 h-5 text-white/60" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-white/60" />
                                )}
                            </button>
                        )}
                        <div>
                            <h2 className="text-lg font-semibold text-white">{title}</h2>
                            {subtitle && (
                                <p className="text-sm text-white/50 mt-0.5">{subtitle}</p>
                            )}
                        </div>
                    </div>
                    {hasMore && (
                        <span className="text-xs text-white/40">
                            +{decks.length - (maxVisible || 0)} altri
                        </span>
                    )}
                </div>
            )}

            {/* Content */}
            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {layout === 'horizontal' ? (
                            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                                {visibleDecks.map((deck, index) => (
                                    <motion.div
                                        key={deck.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex-shrink-0 w-[280px] sm:w-[300px]"
                                    >
                                        <DeckCardCompact
                                            deck={deck}
                                            onStudy={onStudy}
                                            onRead={onRead}
                                            onMagicGenerate={onMagicGenerate}
                                            onAddCard={onAddCard}
                                            onViewDetail={onViewDetail}
                                            onDelete={onDelete}
                                            onUpdate={onUpdate}
                                            tags={tags}
                                            onTogglePin={onTogglePin}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        ) : layout === 'compact' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {visibleDecks.map((deck, index) => (
                                    <motion.div
                                        key={deck.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <DeckCardCompact
                                            deck={deck}
                                            onStudy={onStudy}
                                            onRead={onRead}
                                            onMagicGenerate={onMagicGenerate}
                                            onAddCard={onAddCard}
                                            onViewDetail={onViewDetail}
                                            onDelete={onDelete}
                                            onUpdate={onUpdate}
                                            tags={tags}
                                            onTogglePin={onTogglePin}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        ) : layout === 'list' ? (
                            <div className="space-y-2">
                                {visibleDecks.map((deck, index) => (
                                    <motion.div
                                        key={deck.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                    >
                                        <DeckCardList
                                            deck={deck}
                                            onStudy={onStudy}
                                            onRead={onRead}
                                            onMagicGenerate={onMagicGenerate}
                                            onAddCard={onAddCard}
                                            onViewDetail={onViewDetail}
                                            onDelete={onDelete}
                                            onUpdate={onUpdate}
                                            tags={tags}
                                            onTogglePin={onTogglePin}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                                {visibleDecks.map((deck, index) => (
                                    <motion.div
                                        key={deck.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <DeckCard
                                            deck={deck}
                                            onStudy={onStudy}
                                            onRead={onRead}
                                            onMagicGenerate={onMagicGenerate}
                                            onAddCard={onAddCard}
                                            onViewDetail={onViewDetail}
                                            onDelete={onDelete}
                                            onUpdate={onUpdate}
                                            tags={tags}
                                            onTogglePin={onTogglePin}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
