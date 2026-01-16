/**
 * 🎴 SORTABLE ITEM - dnd-kit Sortable Wrapper Component
 * ============================================================================
 * 
 * Wrapper component that uses dnd-kit's useSortable hook to make flashcard items
 * sortable. Handles the transform and transition styles automatically.
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '../../services/studyService';
import { FlashcardItem } from './FlashcardItem';

interface SortableItemProps {
    card: Card;
    index: number;
    totalCards: number;
    onUpdate: (cardId: string, front: string, back: string) => Promise<void>;
    onClick?: (card: Card) => void;
    onDelete?: (cardId: string) => void;
    viewMode?: 'list' | 'grid';
}

/**
 * Drag Handle Icon Component
 */
const DragHandleIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="9" cy="5" r="1" />
        <circle cx="9" cy="12" r="1" />
        <circle cx="9" cy="19" r="1" />
        <circle cx="15" cy="5" r="1" />
        <circle cx="15" cy="12" r="1" />
        <circle cx="15" cy="19" r="1" />
    </svg>
);

export const SortableItem: React.FC<SortableItemProps> = ({
    card,
    index,
    totalCards,
    onUpdate,
    onClick,
    onDelete,
    viewMode = 'list',
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: card.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'all 200ms ease-out' : transition,
    };

    // iOS-style ghost placeholder: fade out and scale down when dragging
    const ghostStyles = isDragging
        ? 'opacity-30 scale-95 transition-all duration-200 ease-out'
        : 'opacity-100 scale-100 transition-all duration-200 ease-out';

    // Grid View: Simple card layout
    if (viewMode === 'grid') {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`group relative cursor-grab active:cursor-grabbing ${ghostStyles}`}
                {...attributes}
                {...listeners}
            >
                {/* Numero card in modalità grid - discreto, in alto a sinistra, visibile solo su hover */}
                <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-xs font-medium text-white/30 bg-black/30 px-2 py-1 rounded-full select-none">
                        #{index + 1}
                    </span>
                </div>
                <FlashcardItem
                    card={card}
                    onUpdate={onUpdate}
                    onClick={onClick}
                    onDelete={onDelete}
                />
            </div>
        );
    }

    // List View: Card with drag handle and number
    // Make entire card draggable (iOS-style), but keep handle subtle for visual reference
    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group relative cursor-grab active:cursor-grabbing ${ghostStyles}`}
            {...attributes}
            {...listeners}
        >
            <div className="flex items-start gap-3">
                {/* Drag Handle and Number - More subtle, only visible on hover */}
                <div className="flex flex-col items-center gap-2 pt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <div className="p-1 text-white/20">
                        <DragHandleIcon className="w-4 h-4" />
                    </div>
                    {/* Numero card - discreto ma visibile */}
                    <span className="text-xs font-medium text-white/30 select-none">
                        #{index + 1}
                    </span>
                </div>

                {/* Card Content */}
                <div className="flex-1 min-w-0">
                    <FlashcardItem
                        card={card}
                        onUpdate={onUpdate}
                        onClick={onClick}
                        onDelete={onDelete}
                    />
                </div>
            </div>
        </div>
    );
};

export default SortableItem;
