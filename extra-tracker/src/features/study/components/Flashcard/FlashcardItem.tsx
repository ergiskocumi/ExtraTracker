/**
 * 🎴 FLASHCARD ITEM - Main Component
 * ==================================
 * 
 * Displays a single flashcard with view and edit modes.
 * Supports source navigation, editing, and deletion.
 * 
 * @module FlashcardItem
 */

import React, { useEffect, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import { CARD_STYLES, ANIMATION_CONFIG, TEXT_CONTENT } from './FlashcardItem.constants';
import { validateCardContent, isTemporaryCard, getButtonState, shouldHandleCardClick } from './FlashcardItem.utils';
import type { FlashcardItemProps } from './FlashcardItem.types';
import { ViewMode } from './FlashcardItem.ViewMode';
import { EditMode } from './FlashcardItem.EditMode';

// ============================================
// COMPONENT
// ============================================

/**
 * FlashcardItem Component
 * 
 * Displays a flashcard with support for viewing, editing, and source navigation.
 * 
 * @param props - Component props
 * @returns FlashcardItem component
 */
export const FlashcardItem: React.FC<FlashcardItemProps> = memo(({ 
    card, 
    onUpdate, 
    onClick, 
    onDelete, 
    initialEditing = false, 
    onCancel, 
    onCreate,
    onShowSource,
    isSourceActive = false,
}) => {
    // ============================================
    // STATE
    // ============================================

    const [isEditing, setIsEditing] = useState(initialEditing);
    const [tempFront, setTempFront] = useState(card.front);
    const [tempBack, setTempBack] = useState(card.back);
    const [isSaving, setIsSaving] = useState(false);

    // ============================================
    // EFFECTS
    // ============================================

    /**
     * Syncs temporary values with card data when not editing.
     */
    useEffect(() => {
        if (!isEditing) {
            setTempFront(card.front);
            setTempBack(card.back);
        }
    }, [card.front, card.back, isEditing]);

    // ============================================
    // VALIDATION
    // ============================================

    const validation = validateCardContent(
        tempFront,
        tempBack,
        card.front,
        card.back,
        isSaving
    );

    // ============================================
    // BUTTON STATE
    // ============================================

    const buttonState = getButtonState(card, onShowSource);

    // ============================================
    // EVENT HANDLERS
    // ============================================

    /**
     * Starts editing mode.
     */
    const handleStartEdit = useCallback(() => {
        setTempFront(card.front);
        setTempBack(card.back);
        setIsEditing(true);
    }, [card.front, card.back]);

    /**
     * Cancels editing and resets to original values.
     */
    const handleCancel = useCallback(() => {
        setTempFront(card.front);
        setTempBack(card.back);
        setIsEditing(false);
        
        if (onCancel) {
            onCancel();
        }
    }, [card.front, card.back, onCancel]);

    /**
     * Saves card changes.
     */
    const handleSave = useCallback(async () => {
        if (!validation.canSave) return;

        setIsSaving(true);
        try {
            if (isTemporaryCard(card.id) && onCreate) {
                await onCreate(validation.trimmedFront, validation.trimmedBack);
            } else {
                await onUpdate(card.id, validation.trimmedFront, validation.trimmedBack);
                emitToast.success(TEXT_CONTENT.toast.success.message, {
                    title: TEXT_CONTENT.toast.success.title,
                    duration: TEXT_CONTENT.toast.success.duration,
                });
            }
            setIsEditing(false);
        } catch (error) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : TEXT_CONTENT.toast.error.message;
            
            emitToast.error(errorMessage, {
                title: TEXT_CONTENT.toast.error.title,
                duration: TEXT_CONTENT.toast.error.duration,
            });
        } finally {
            setIsSaving(false);
        }
    }, [card.id, validation.trimmedFront, validation.trimmedBack, validation.canSave, onUpdate, onCreate]);

    /**
     * Handles card click (only when not editing).
     */
    const handleCardClick = useCallback((e: React.MouseEvent) => {
        if (shouldHandleCardClick(e, isEditing) && onClick) {
            onClick(card);
        }
    }, [isEditing, onClick, card]);

    /**
     * Handles show source button click.
     */
    const handleShowSource = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (onShowSource && card.sourceMetadata) {
            onShowSource(card);
        }
    }, [onShowSource, card]);

    // ============================================
    // STYLE COMPUTATION
    // ============================================

    const getCardClasses = (): string => {
        const base = `${CARD_STYLES.base.borderRadius} ${CARD_STYLES.base.border} ${CARD_STYLES.base.padding} ${CARD_STYLES.base.transition} ${CARD_STYLES.base.hover.border} ${CARD_STYLES.base.hover.shadow}`;
        const cursor = onClick && !isEditing ? 'cursor-pointer' : '';
        const border = isSourceActive 
            ? CARD_STYLES.sourceActive.border 
            : CARD_STYLES.default.border;
        const shadow = isSourceActive ? CARD_STYLES.sourceActive.shadow : '';
        
        return `${base} ${cursor} ${border} ${shadow}`.trim();
    };

    const getCardBackground = (): string => {
        return isSourceActive 
            ? CARD_STYLES.sourceActive.background 
            : CARD_STYLES.default.background;
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <motion.div
            initial={ANIMATION_CONFIG.card.initial}
            animate={ANIMATION_CONFIG.card.animate}
            exit={ANIMATION_CONFIG.card.exit}
            className={getCardClasses()}
            style={{ background: getCardBackground() }}
            onClick={handleCardClick}
        >
            <AnimatePresence mode="wait">
                {!isEditing ? (
                    <ViewMode
                        card={card}
                        buttonState={buttonState}
                        isSourceActive={isSourceActive}
                        onEdit={handleStartEdit}
                        onDelete={onDelete}
                        onShowSource={handleShowSource}
                        onCardClick={handleCardClick}
                    />
                ) : (
                    <EditMode
                        frontValue={tempFront}
                        backValue={tempBack}
                        isSaving={isSaving}
                        canSave={validation.canSave}
                        onFrontChange={setTempFront}
                        onBackChange={setTempBack}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
});

FlashcardItem.displayName = 'FlashcardItem';

export default FlashcardItem;
