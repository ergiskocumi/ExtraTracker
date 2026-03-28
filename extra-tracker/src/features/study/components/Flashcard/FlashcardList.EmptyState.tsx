/**
 * 🎴 FLASHCARD LIST - Empty State Component
 * =========================================
 * 
 * Displays empty state when no cards are present.
 */

import React from 'react';
import { EMPTY_STATE_STYLES } from './FlashcardList.constants';
import type { EmptyStateProps } from './FlashcardList.types';

// ============================================
// COMPONENT
// ============================================

/**
 * EmptyState Component
 * 
 * Displays message when no cards are available.
 * 
 * @param props - Component props
 * @returns EmptyState component
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ message }) => {
    return (
        <div 
            className={`${EMPTY_STATE_STYLES.container.borderRadius} ${EMPTY_STATE_STYLES.container.border} ${EMPTY_STATE_STYLES.container.backdrop} ${EMPTY_STATE_STYLES.container.padding} ${EMPTY_STATE_STYLES.container.alignment} ${EMPTY_STATE_STYLES.container.shadow}`}
            style={{ background: EMPTY_STATE_STYLES.container.background }}
        >
            <p className={`${EMPTY_STATE_STYLES.text.fontSize} ${EMPTY_STATE_STYLES.text.color}`}>
                {message}
            </p>
        </div>
    );
};
