/**
 * 🎴 FLASHCARD LIST - Header Component
 * ====================================
 * 
 * Header component displaying card count and action buttons.
 */

import React from 'react';
import { FiPlus, FiArrowLeft } from 'react-icons/fi';
import { HEADER_STYLES, TEXT_CONTENT, ICON_SIZES } from './FlashcardList.constants';
import type { HeaderProps } from './FlashcardList.types';

// ============================================
// COMPONENT
// ============================================

/**
 * Header Component
 * 
 * Displays header with card count and action buttons.
 * 
 * @param props - Component props
 * @returns Header component
 */
export const Header: React.FC<HeaderProps> = ({
    cardCount,
    showBackButton,
    showAddButton,
    onNavigateBack,
    onAddCard,
}) => {
    const backButtonClasses = `${HEADER_STYLES.backButton.layout} ${HEADER_STYLES.backButton.padding} ${HEADER_STYLES.backButton.fontSize} ${HEADER_STYLES.backButton.fontWeight} ${HEADER_STYLES.backButton.text} ${HEADER_STYLES.backButton.hover.text} ${HEADER_STYLES.backButton.shadow} ${HEADER_STYLES.backButton.borderRadius} ${HEADER_STYLES.backButton.background} ${HEADER_STYLES.backButton.hover.background} ${HEADER_STYLES.backButton.border} ${HEADER_STYLES.backButton.hover.border} ${HEADER_STYLES.backButton.transition} ${HEADER_STYLES.backButton.active}`;

    const addButtonClasses = `${HEADER_STYLES.addButton.layout} ${HEADER_STYLES.addButton.padding} ${HEADER_STYLES.addButton.fontSize} ${HEADER_STYLES.addButton.fontWeight} ${HEADER_STYLES.addButton.text} ${HEADER_STYLES.addButton.shadow} ${HEADER_STYLES.addButton.borderRadius} ${HEADER_STYLES.addButton.background} ${HEADER_STYLES.addButton.hover.background} ${HEADER_STYLES.addButton.transition} ${HEADER_STYLES.addButton.active}`;

    return (
        <div className={`${HEADER_STYLES.container.padding} ${HEADER_STYLES.container.border} ${HEADER_STYLES.container.backdrop} ${HEADER_STYLES.container.layout} ${HEADER_STYLES.container.gap}`}>
            <span className={`${HEADER_STYLES.badge.display} ${HEADER_STYLES.badge.padding} ${HEADER_STYLES.badge.borderRadius} ${HEADER_STYLES.badge.background} ${HEADER_STYLES.badge.border} ${HEADER_STYLES.badge.text}`}>
                {TEXT_CONTENT.header.cardCount(cardCount)}
            </span>
            <div className={`${HEADER_STYLES.container.layout} ${HEADER_STYLES.container.gap}`}>
                {showBackButton && onNavigateBack && (
                    <button
                        onClick={onNavigateBack}
                        className={backButtonClasses}
                        aria-label={TEXT_CONTENT.ariaLabels.back}
                        title={TEXT_CONTENT.buttons.back}
                    >
                        <FiArrowLeft className={ICON_SIZES.small} />
                        <span className="hidden sm:inline">{TEXT_CONTENT.buttons.back}</span>
                    </button>
                )}
                {showAddButton && (
                    <button
                        onClick={onAddCard}
                        className={addButtonClasses}
                        aria-label={TEXT_CONTENT.ariaLabels.addCard}
                        title={TEXT_CONTENT.buttons.addCard}
                    >
                        <FiPlus className={ICON_SIZES.small} />
                    </button>
                )}
            </div>
        </div>
    );
};
