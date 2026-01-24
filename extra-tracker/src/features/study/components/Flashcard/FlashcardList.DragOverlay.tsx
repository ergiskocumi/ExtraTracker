/**
 * 🎴 FLASHCARD LIST - Drag Overlay Content Component
 * =================================================
 * 
 * Content displayed in DragOverlay during drag operation.
 */

import React from 'react';
import { FlashcardItem } from './FlashcardItem';
import { DRAG_OVERLAY_STYLES } from './FlashcardList.constants';
import type { DragOverlayContentProps } from './FlashcardList.types';

// ============================================
// COMPONENT
// ============================================

/**
 * DragOverlayContent Component
 * 
 * Renders the dragged card in the overlay with appropriate styling.
 * 
 * @param props - Component props
 * @returns DragOverlayContent component
 */
export const DragOverlayContent: React.FC<DragOverlayContentProps> = ({
    card,
    viewMode,
    items,
    onUpdate,
    onCardClick,
    onDelete,
    onShowSource,
    isSourceActive,
}) => {
    const cardIndex = items.findIndex(c => c.id === card.id);

    if (viewMode === 'grid') {
        return (
            <div
                className={`${DRAG_OVERLAY_STYLES.container.scale} ${DRAG_OVERLAY_STYLES.container.rotate} ${DRAG_OVERLAY_STYLES.container.shadow} ${DRAG_OVERLAY_STYLES.container.cursor} ${DRAG_OVERLAY_STYLES.container.transition}`}
                style={{
                    boxShadow: DRAG_OVERLAY_STYLES.container.boxShadow,
                    filter: DRAG_OVERLAY_STYLES.container.filter,
                }}
            >
                <FlashcardItem
                    card={card}
                    onUpdate={onUpdate}
                    onClick={onCardClick}
                    onDelete={onDelete}
                    onShowSource={onShowSource}
                    isSourceActive={isSourceActive}
                />
            </div>
        );
    }

    // List view with index indicator
    return (
        <div
            className={`${DRAG_OVERLAY_STYLES.container.scale} ${DRAG_OVERLAY_STYLES.container.rotate} ${DRAG_OVERLAY_STYLES.container.shadow} ${DRAG_OVERLAY_STYLES.container.cursor} ${DRAG_OVERLAY_STYLES.container.transition}`}
            style={{
                boxShadow: DRAG_OVERLAY_STYLES.container.boxShadow,
                filter: DRAG_OVERLAY_STYLES.container.filter,
            }}
        >
            <div className={DRAG_OVERLAY_STYLES.listView.layout}>
                <div className={`${DRAG_OVERLAY_STYLES.listView.indexContainer.layout} ${DRAG_OVERLAY_STYLES.listView.indexContainer.opacity}`}>
                    <div className={DRAG_OVERLAY_STYLES.listView.indexIcon.padding + ' ' + DRAG_OVERLAY_STYLES.listView.indexIcon.color}>
                        <svg
                            className="w-4 h-4"
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
                    </div>
                    <span className={`${DRAG_OVERLAY_STYLES.listView.indexText.fontSize} ${DRAG_OVERLAY_STYLES.listView.indexText.fontWeight} ${DRAG_OVERLAY_STYLES.listView.indexText.color} ${DRAG_OVERLAY_STYLES.listView.indexText.userSelect}`}>
                        #{cardIndex + 1}
                    </span>
                </div>
                <div className={`${DRAG_OVERLAY_STYLES.listView.cardContainer.flex} ${DRAG_OVERLAY_STYLES.listView.cardContainer.minWidth}`}>
                    <FlashcardItem
                        card={card}
                        onUpdate={onUpdate}
                        onClick={onCardClick}
                        onDelete={onDelete}
                        onShowSource={onShowSource}
                        isSourceActive={isSourceActive}
                    />
                </div>
            </div>
        </div>
    );
};
