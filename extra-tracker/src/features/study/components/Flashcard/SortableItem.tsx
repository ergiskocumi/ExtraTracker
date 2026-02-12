/**
 * 🎴 SORTABLE ITEM - dnd-kit Sortable Wrapper Component
 * ============================================================================
 * 
 * Wrapper component that uses dnd-kit's useSortable hook to make flashcard items
 * sortable. Handles the transform and transition styles automatically.
 */

import React, { useState, useCallback, memo } from 'react';
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
    onShowSource?: (card: Card) => void;
    isSourceActive?: boolean;
    compactMode?: boolean;
}

/**
 * Drag Handle Icon Component
 * HOISTED: Definito fuori dal componente per evitare ri-creazione ad ogni render
 * @see rendering-hoist-jsx
 */
const DragHandleIcon = memo<{ className?: string }>(({ className = "w-4 h-4" }) => (
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
));

DragHandleIcon.displayName = 'DragHandleIcon';

/**
 * SortableItem Component
 * MEMOIZED: Previene re-render non necessari durante il drag
 * @see rerender-memo
 */
const SortableItemComponent: React.FC<SortableItemProps> = ({
    card,
    index,
    totalCards,
    onUpdate,
    onClick,
    onDelete,
    viewMode = 'list',
    onShowSource,
    isSourceActive = false,
    compactMode = false,
}) => {
    // Track editing state to disable drag during editing
    const [isEditing, setIsEditing] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ 
        id: card.id,
        disabled: isEditing, // Disable drag when editing
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'transform 120ms linear' : transition,
    };

    // iOS-style ghost placeholder: fade out and scale down when dragging
    const ghostStyles = isDragging
        ? 'opacity-50 scale-[0.98] transition-transform duration-100 ease-linear'
        : 'opacity-100 scale-100 transition-transform duration-100 ease-linear';

    // Disable drag cursor and interactions when editing
    const containerClasses = isEditing
        ? `${ghostStyles}` // No cursor-grab when editing
        : `group relative cursor-grab active:cursor-grabbing ${ghostStyles} ${isDragging ? 'will-change-transform' : ''}`;

    // Conditionally apply drag listeners only when not editing
    const dragProps = isEditing
        ? {} // No drag attributes/listeners when editing
        : {
            ...attributes,
            ...listeners,
        };

    // Callback to handle editing state changes
    const handleEditingChange = useCallback((editing: boolean) => {
        setIsEditing(editing);
    }, []);

    // Grid View: Simple card layout
    if (viewMode === 'grid') {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className={containerClasses}
                {...dragProps}
            >
                {/* Numero card in modalità grid - discreto, in alto a sinistra, visibile solo su hover */}
                {!isEditing && (
                    <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <span className="text-xs font-medium text-theme-muted bg-theme-surface border border-theme-default px-2 py-1 rounded-full select-none">
                            #{index + 1}
                        </span>
                    </div>
                )}
                <FlashcardItem
                    card={card}
                    onUpdate={onUpdate}
                    onClick={onClick}
                    onDelete={onDelete}
                    onShowSource={onShowSource}
                    isSourceActive={isSourceActive}
                    onEditingChange={handleEditingChange}
                    compactMode={compactMode}
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
            className={containerClasses}
            {...dragProps}
        >
            <div className="flex items-start gap-3">
                {/* Drag Handle and Number - More subtle, only visible on hover */}
                {!isEditing && (
                    <div className="flex flex-col items-center gap-2 pt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="p-1 text-theme-muted">
                            <DragHandleIcon className="w-4 h-4" />
                        </div>
                        {/* Numero card - discreto ma visibile */}
                        <span className="text-xs font-medium text-theme-muted select-none">
                            #{index + 1}
                        </span>
                    </div>
                )}

                {/* Card Content */}
                <div className="flex-1 min-w-0">
                    <FlashcardItem
                        card={card}
                        onUpdate={onUpdate}
                        onClick={onClick}
                        onDelete={onDelete}
                        onShowSource={onShowSource}
                        isSourceActive={isSourceActive}
                        onEditingChange={handleEditingChange}
                        compactMode={compactMode}
                    />
                </div>
            </div>
        </div>
    );
};

/**
 * Memoized export - previene re-render quando le props non cambiano
 * @see rerender-memo
 */
export const SortableItem = memo(SortableItemComponent);
SortableItem.displayName = 'SortableItem';

export default SortableItem;
