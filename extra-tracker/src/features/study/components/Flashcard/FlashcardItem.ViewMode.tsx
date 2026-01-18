/**
 * 🎴 FLASHCARD ITEM - View Mode Component
 * =======================================
 * 
 * Displays the card in view mode (non-editing).
 */

import React from 'react';
import { FiEdit2, FiTrash2, FiTarget } from 'react-icons/fi';
import { motion } from 'framer-motion';
import type { Card } from '../../services/studyService';
import { ANIMATION_CONFIG, BADGE_STYLES, BUTTON_STYLES, TEXT_CONTENT, ICON_SIZES, LAYOUT } from './FlashcardItem.constants';
import type { ButtonState } from './FlashcardItem.types';

// ============================================
// TYPES
// ============================================

interface ViewModeProps {
    card: Card;
    buttonState: ButtonState;
    isSourceActive: boolean;
    onEdit: () => void;
    onDelete?: (cardId: string) => void;
    onShowSource?: (e: React.MouseEvent) => void;
    onCardClick?: (e: React.MouseEvent) => void;
}

// ============================================
// COMPONENT
// ============================================

export const ViewMode: React.FC<ViewModeProps> = ({
    card,
    buttonState,
    isSourceActive,
    onEdit,
    onDelete,
    onShowSource,
    onCardClick,
}) => {
    const getShowSourceButtonClasses = (): string => {
        const base = `${BUTTON_STYLES.base.size} ${BUTTON_STYLES.base.borderRadius} ${BUTTON_STYLES.base.border} ${BUTTON_STYLES.base.transition} ${BUTTON_STYLES.base.active}`;
        
        if (!buttonState.hasOnShowSource) {
            return `${base} ${BUTTON_STYLES.showSource.disabled.border} ${BUTTON_STYLES.showSource.disabled.background} ${BUTTON_STYLES.showSource.disabled.text} ${BUTTON_STYLES.showSource.disabled.opacity} ${BUTTON_STYLES.showSource.disabled.cursor}`;
        }
        
        if (isSourceActive) {
            return `${base} ${BUTTON_STYLES.showSource.active.border} ${BUTTON_STYLES.showSource.active.background} ${BUTTON_STYLES.showSource.active.text} ${BUTTON_STYLES.showSource.active.hover.background} ${BUTTON_STYLES.showSource.active.shadow}`;
        }
        
        return `${base} ${BUTTON_STYLES.showSource.default.border} ${BUTTON_STYLES.showSource.default.background} ${BUTTON_STYLES.showSource.default.text} ${BUTTON_STYLES.showSource.default.hover.text} ${BUTTON_STYLES.showSource.default.hover.background} ${BUTTON_STYLES.showSource.default.hover.border} ${BUTTON_STYLES.showSource.default.shadow}`;
    };

    return (
        <motion.div
            key="view"
            initial={ANIMATION_CONFIG.viewMode.initial}
            animate={ANIMATION_CONFIG.viewMode.animate}
            exit={ANIMATION_CONFIG.viewMode.exit}
            className="space-y-3"
            onClick={onCardClick}
        >
            {/* Question Section */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`${BADGE_STYLES.question.size} ${BADGE_STYLES.question.borderRadius} ${BADGE_STYLES.question.background} ${BADGE_STYLES.question.border} backdrop-blur-sm flex items-center justify-center ${BADGE_STYLES.question.text} flex-shrink-0 ${BADGE_STYLES.question.shadow}`}>
                        Q
                    </div>
                    <p className={LAYOUT.text.question + ' whitespace-pre-wrap break-words'}>
                        {card.front}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className={`flex items-center ${LAYOUT.spacing.gapButtons} shrink-0`}>
                    {/* Show Source Button */}
                    {buttonState.hasSourceMetadata && (
                        <button
                            type="button"
                            onClick={onShowSource}
                            disabled={!buttonState.hasOnShowSource}
                            className={getShowSourceButtonClasses()}
                            aria-label={
                                buttonState.hasOnShowSource
                                    ? TEXT_CONTENT.ariaLabels.showSource
                                    : TEXT_CONTENT.ariaLabels.showSourceDisabled
                            }
                            title={
                                buttonState.hasOnShowSource
                                    ? TEXT_CONTENT.buttons.showSource
                                    : TEXT_CONTENT.buttons.showSourceDisabled
                            }
                            style={{ zIndex: 9999, position: 'relative' }}
                        >
                            <FiTarget className={ICON_SIZES.medium} />
                        </button>
                    )}

                    {/* Edit Button */}
                    <button
                        type="button"
                        onClick={onEdit}
                        className={`${BUTTON_STYLES.base.size} ${BUTTON_STYLES.base.borderRadius} ${BUTTON_STYLES.base.border} ${BUTTON_STYLES.base.transition} ${BUTTON_STYLES.base.active} ${BUTTON_STYLES.edit.border} ${BUTTON_STYLES.edit.background} ${BUTTON_STYLES.edit.text} ${BUTTON_STYLES.edit.hover.text} ${BUTTON_STYLES.edit.hover.background}`}
                        aria-label={TEXT_CONTENT.ariaLabels.edit}
                        title={TEXT_CONTENT.buttons.edit}
                    >
                        <FiEdit2 className={ICON_SIZES.medium} />
                    </button>

                    {/* Delete Button */}
                    {onDelete && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(card.id);
                            }}
                            className={`${BUTTON_STYLES.base.size} ${BUTTON_STYLES.base.borderRadius} ${BUTTON_STYLES.base.border} ${BUTTON_STYLES.base.transition} ${BUTTON_STYLES.base.active} ${BUTTON_STYLES.delete.border} ${BUTTON_STYLES.delete.background} ${BUTTON_STYLES.delete.text} ${BUTTON_STYLES.delete.hover.text} ${BUTTON_STYLES.delete.hover.background}`}
                            aria-label={TEXT_CONTENT.ariaLabels.delete}
                            title={TEXT_CONTENT.buttons.delete}
                        >
                            <FiTrash2 className={ICON_SIZES.medium} />
                        </button>
                    )}
                </div>
            </div>

            {/* Answer Section */}
            <div className={`flex items-start gap-3 ${LAYOUT.spacing.paddingTop} ${LAYOUT.divider.border}`}>
                <div className={`${BADGE_STYLES.answer.size} ${BADGE_STYLES.answer.borderRadius} ${BADGE_STYLES.answer.background} ${BADGE_STYLES.answer.border} backdrop-blur-sm flex items-center justify-center ${BADGE_STYLES.answer.text} flex-shrink-0 ${BADGE_STYLES.answer.shadow}`}>
                    A
                </div>
                <p className={LAYOUT.text.answer + ' break-words'}>
                    {card.back}
                </p>
            </div>
        </motion.div>
    );
};
