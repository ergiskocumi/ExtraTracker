/**
 * 🎴 FLASHCARD LIST - Insert Button Component
 * ============================================
 * 
 * Button for inserting a card at a specific position.
 * Appears between cards when hovering or during drag.
 */

import React from 'react';
import { Plus } from 'lucide-react';
import { INSERT_BUTTON_STYLES, DRAG_AND_DROP, TEXT_CONTENT } from './FlashcardList.constants';
import type { InsertButtonProps } from './FlashcardList.types';

// ============================================
// COMPONENT
// ============================================

/**
 * InsertButton Component
 *
 * Sempre nel DOM (layout fisso), visibilità tramite opacity per evitare sfarfallii.
 */
export const InsertButton: React.FC<InsertButtonProps> = ({
    position,
    onInsert,
    isVisible,
}) => {
    const handleClick = React.useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onInsert(position);
    }, [position, onInsert]);

    return (
        <div
            className={`${INSERT_BUTTON_STYLES.container.layout} ${INSERT_BUTTON_STYLES.container.padding} transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ minHeight: `${DRAG_AND_DROP.insertButtonHeight}px` }}
        >
            <div className={`${INSERT_BUTTON_STYLES.line.flex} ${INSERT_BUTTON_STYLES.line.height} ${INSERT_BUTTON_STYLES.line.background}`} />
            <button
                type="button"
                onClick={handleClick}
                className={`${INSERT_BUTTON_STYLES.button.margin} ${INSERT_BUTTON_STYLES.button.layout} ${INSERT_BUTTON_STYLES.button.size} ${INSERT_BUTTON_STYLES.button.borderRadius} ${INSERT_BUTTON_STYLES.button.background} ${INSERT_BUTTON_STYLES.button.text} ${INSERT_BUTTON_STYLES.button.shadow} ${INSERT_BUTTON_STYLES.button.hover.shadow} ${INSERT_BUTTON_STYLES.button.hover.scale} ${INSERT_BUTTON_STYLES.button.active} ${INSERT_BUTTON_STYLES.button.transition}`}
                aria-label={TEXT_CONTENT.ariaLabels.insertCard(position)}
                title={TEXT_CONTENT.buttons.insertCard(position)}
            >
                <Plus className={INSERT_BUTTON_STYLES.icon.size} />
            </button>
            <div className={`${INSERT_BUTTON_STYLES.line.flex} ${INSERT_BUTTON_STYLES.line.height} ${INSERT_BUTTON_STYLES.line.background}`} />
        </div>
    );
};
