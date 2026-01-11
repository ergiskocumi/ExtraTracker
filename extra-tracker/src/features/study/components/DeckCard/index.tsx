import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import type { Deck, Tag } from '../../services/studyService';
import { getDeckTheme } from './utils/deckTheme';
import { DeckCardMenu } from './DeckCardMenu';
import { DeckCardHeader } from './DeckCardHeader';
import { DeckCardProgress } from './DeckCardProgress';
import { DeckCardActions } from './DeckCardActions';

export interface DeckCardProps {
    deck: Deck;
    onStudy: (deckId: string) => void;
    onRead?: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
    onUpdate: (deck: Deck) => void;
    tags?: Tag[];
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

export const DeckCard: React.FC<DeckCardProps> = ({ 
    deck, 
    onStudy, 
    onRead,
    onMagicGenerate, 
    onAddCard,
    onViewDetail, 
    onDelete,
    onUpdate,
    tags = [],
    onDragStart: onDragStartProp,
    onDragEnd: onDragEndProp,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    const hasDueCards = (deck.dueCount ?? 0) > 0;
    const totalCards = deck.totalCards ?? deck.cards?.length ?? 0;
    const masteredCards = deck.cards?.filter(c => c.status === 'mastered').length ?? 0;
    const masteryPercent = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;
    const hasPdf = !!deck.pdfUrl;
    
    const theme = useMemo(() => getDeckTheme(deck), [deck.title]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('deckId', deck.id);
        e.dataTransfer.setData('text/plain', deck.id);
        
        const dragPreview = document.createElement('div');
        dragPreview.style.position = 'absolute';
        dragPreview.style.top = '-1000px';
        dragPreview.style.width = '200px';
        dragPreview.style.padding = '12px';
        dragPreview.style.background = 'rgba(139, 92, 246, 0.95)';
        dragPreview.style.borderRadius = '12px';
        dragPreview.style.border = '2px solid rgba(167, 139, 250, 0.8)';
        dragPreview.style.boxShadow = '0 10px 40px rgba(139, 92, 246, 0.4)';
        dragPreview.style.backdropFilter = 'blur(10px)';
        dragPreview.style.color = 'white';
        dragPreview.style.fontSize = '14px';
        dragPreview.style.fontWeight = '600';
        dragPreview.style.textAlign = 'center';
        dragPreview.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
                <span>📚</span>
                <span>${deck.title}</span>
            </div>
            <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">
                Rilascia nella cartella
            </div>
        `;
        document.body.appendChild(dragPreview);
        e.dataTransfer.setDragImage(dragPreview, 100, 40);
        setIsDragging(true);
        onDragStartProp?.();
        setTimeout(() => {
            if (document.body.contains(dragPreview)) {
                document.body.removeChild(dragPreview);
            }
        }, 0);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        onDragEndProp?.();
    };

    return (
        <motion.div
            animate={{
                scale: isDragging ? 0.95 : 1,
                opacity: isDragging ? 0.6 : 1,
                rotateZ: isDragging ? 2 : 0,
            }}
            transition={{
                duration: 0.2,
                ease: 'easeOut',
            }}
            className={`
                relative rounded-xl sm:rounded-2xl md:rounded-3xl border overflow-hidden
                transition-all duration-300 hover:shadow-xl
                flex flex-col
                min-h-[280px] sm:min-h-[320px] md:min-h-[340px]
                cursor-move
                ${hasDueCards 
                    ? 'border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent shadow-lg shadow-orange-500/10' 
                    : `${theme.borderColor} bg-gradient-to-br ${theme.gradient} hover:shadow-lg`
                }
            `}
            draggable
            onDragStart={handleDragStart as any}
            onDragEnd={handleDragEnd}
        >
            {/* Badge - Due Cards */}
            {hasDueCards && (
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-orange-500 text-white text-[10px] sm:text-xs font-bold shadow-lg"
                    >
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="hidden xs:inline">{deck.dueCount} da ripassare</span>
                        <span className="xs:hidden">{deck.dueCount}</span>
                    </motion.div>
                </div>
            )}

            {/* More Menu Button */}
            <DeckCardMenu
                deck={deck}
                totalCards={totalCards}
                showMenu={showMenu}
                onToggleMenu={() => setShowMenu(!showMenu)}
                onViewDetail={onViewDetail}
                onMagicGenerate={onMagicGenerate}
                onDelete={onDelete}
            />

            {/* Main Content - Clickable */}
            <div 
                className="p-4 sm:p-5 md:p-6 cursor-pointer flex-1 flex flex-col touch-manipulation"
                onClick={() => onViewDetail(deck.id)}
            >
                <DeckCardHeader
                    deck={deck}
                    theme={theme}
                    hasDueCards={hasDueCards}
                    totalCards={totalCards}
                    hasPdf={hasPdf}
                    tags={tags}
                    onUpdate={onUpdate}
                />

                <DeckCardProgress masteryPercent={masteryPercent} />

                <DeckCardActions
                    deck={deck}
                    totalCards={totalCards}
                    hasDueCards={hasDueCards}
                    hasPdf={hasPdf}
                    onStudy={onStudy}
                    onRead={onRead}
                    onMagicGenerate={onMagicGenerate}
                    onAddCard={onAddCard}
                />
            </div>
        </motion.div>
    );
};
