import React, { useState, useRef, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import type { Deck, Tag } from '../../services/studyService';
import { studyService } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import type { DeckTheme } from './utils/deckTheme';

interface DeckCardHeaderProps {
    deck: Deck;
    theme: DeckTheme;
    hasDueCards: boolean;
    totalCards: number;
    hasPdf: boolean;
    tags?: Tag[];
    onUpdate: (deck: Deck) => void;
}

export const DeckCardHeader: React.FC<DeckCardHeaderProps> = ({
    deck,
    theme,
    hasDueCards,
    totalCards,
    hasPdf,
    tags = [],
    onUpdate,
}) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(deck.title);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ThemeIcon = theme.icon;

    useEffect(() => {
        if (!isEditingTitle) {
            setEditedTitle(deck.title);
        }
    }, [deck.title, isEditingTitle]);

    const handleTitleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            setIsEditingTitle(true);
            setEditedTitle(deck.title);
            setTimeout(() => {
                titleInputRef.current?.focus();
                titleInputRef.current?.select();
            }, 0);
        } else {
            clickTimeoutRef.current = setTimeout(() => {
                clickTimeoutRef.current = null;
            }, 300);
        }
    };

    const handleTitleSave = async () => {
        const trimmed = editedTitle.trim();
        if (trimmed && trimmed !== deck.title && trimmed.length > 0) {
            try {
                const updated = await studyService.updateDeckTitle(deck.id, trimmed);
                onUpdate(updated);
                emitToast.success('Titolo aggiornato');
                setIsEditingTitle(false);
            } catch (err: any) {
                emitToast.error(err.message || 'Errore nell\'aggiornamento');
                setEditedTitle(deck.title);
                setIsEditingTitle(false);
            }
        } else {
            setEditedTitle(deck.title);
            setIsEditingTitle(false);
        }
    };

    const handleTitleCancel = () => {
        setEditedTitle(deck.title);
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleTitleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleTitleCancel();
        }
    };

    return (
        <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4 mt-6 sm:mt-8 md:mt-6">
            <div className={`
                p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl flex-shrink-0
                ${hasDueCards 
                    ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30' 
                    : `bg-gradient-to-br ${theme.gradient} border ${theme.borderColor}`
                }
            `}>
                <ThemeIcon className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 ${hasDueCards ? 'text-orange-400' : theme.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
                {isEditingTitle ? (
                    <input
                        ref={titleInputRef}
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onBlur={handleTitleSave}
                        onKeyDown={handleTitleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-base sm:text-lg md:text-xl font-bold text-white bg-white/10 border border-white/20 rounded-lg px-2 py-1 mb-1 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                        maxLength={120}
                    />
                ) : (
                    <h3 
                        className="text-base sm:text-lg md:text-xl font-bold text-white truncate mb-1 cursor-text hover:text-white/80 transition-colors"
                        onClick={handleTitleClick}
                        title="Doppio click per rinominare"
                    >
                        {deck.title}
                    </h3>
                )}
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-white/50 flex-wrap">
                    <span className="flex items-center gap-1 sm:gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {totalCards} carte
                    </span>
                    {hasPdf && (
                        <span className="flex items-center gap-1 text-blue-400">
                            <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            PDF
                        </span>
                    )}
                    {/* Tag badges */}
                    {deck.tags && deck.tags.length > 0 && tags && tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                            {deck.tags.slice(0, 3).map((tagName, idx) => {
                                const tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
                                return (
                                    <span
                                        key={idx}
                                        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                        style={{
                                            backgroundColor: tag?.color ? `${tag.color}20` : 'rgba(255,255,255,0.1)',
                                            color: tag?.color || '#fff',
                                            border: `1px solid ${tag?.color ? `${tag.color}40` : 'rgba(255,255,255,0.2)'}`,
                                        }}
                                    >
                                        {tagName}
                                    </span>
                                );
                            })}
                            {deck.tags.length > 3 && (
                                <span className="text-[10px] text-white/40">
                                    +{deck.tags.length - 3}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
