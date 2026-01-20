/**
 * 🎴 FLASHCARD LIST - Insert Button Component
 * ============================================
 * 
 * Button for inserting a card at a specific position.
 * Appears between cards when hovering or during drag.
 */

import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { ANIMATION_CONFIG, INSERT_BUTTON_STYLES, DRAG_AND_DROP, TEXT_CONTENT } from './FlashcardList.constants';
import type { InsertButtonProps } from './FlashcardList.types';

// ============================================
// COMPONENT
// ============================================

/**
 * InsertButton Component
 * 
 * Displays a button for inserting a card at a specific position.
 * 
 * @param props - Component props
 * @returns InsertButton component
 */
export const InsertButton: React.FC<InsertButtonProps> = ({ 
    position, 
    onInsert, 
    isVisible 
}) => {
    const handleClick = React.useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onInsert(position);
    }, [position, onInsert]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={ANIMATION_CONFIG.insertButton.initial}
                    animate={ANIMATION_CONFIG.insertButton.animate}
                    exit={ANIMATION_CONFIG.insertButton.exit}
                    transition={ANIMATION_CONFIG.insertButton.transition}
                    className={`${INSERT_BUTTON_STYLES.container.layout} ${INSERT_BUTTON_STYLES.container.padding}`}
                    style={{ minHeight: `${DRAG_AND_DROP.insertButtonHeight}px` }}
                >
                    <motion.div 
                        className={`${INSERT_BUTTON_STYLES.line.flex} ${INSERT_BUTTON_STYLES.line.height} ${INSERT_BUTTON_STYLES.line.background}`}
                        animate={{ scaleX: ANIMATION_CONFIG.insertButtonLine.scaleX }}
                        transition={ANIMATION_CONFIG.insertButtonLine.transition}
                    />
                    <motion.button
                        onClick={handleClick}
                        className={`${INSERT_BUTTON_STYLES.button.margin} ${INSERT_BUTTON_STYLES.button.layout} ${INSERT_BUTTON_STYLES.button.size} ${INSERT_BUTTON_STYLES.button.borderRadius} ${INSERT_BUTTON_STYLES.button.background} ${INSERT_BUTTON_STYLES.button.text} ${INSERT_BUTTON_STYLES.button.shadow} ${INSERT_BUTTON_STYLES.button.hover.shadow} ${INSERT_BUTTON_STYLES.button.hover.scale} ${INSERT_BUTTON_STYLES.button.active} ${INSERT_BUTTON_STYLES.button.transition}`}
                        aria-label={TEXT_CONTENT.ariaLabels.insertCard(position)}
                        title={TEXT_CONTENT.buttons.insertCard(position)}
                        animate={{ scale: ANIMATION_CONFIG.insertButtonIcon.scale }}
                        transition={ANIMATION_CONFIG.insertButtonIcon.transition}
                    >
                        <FiPlus className={INSERT_BUTTON_STYLES.icon.size} />
                    </motion.button>
                    <motion.div 
                        className={`${INSERT_BUTTON_STYLES.line.flex} ${INSERT_BUTTON_STYLES.line.height} ${INSERT_BUTTON_STYLES.line.background}`}
                        animate={{ scaleX: ANIMATION_CONFIG.insertButtonLine.scaleX }}
                        transition={ANIMATION_CONFIG.insertButtonLine.transition}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};
