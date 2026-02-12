/**
 * 🎴 FLASHCARD ITEM - Main Component
 * ==================================
 * 
 * Displays a single flashcard with view and edit modes.
 * Supports source navigation, editing, and deletion.
 * 
 * @module FlashcardItem
 */

import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import { CARD_STYLES, ANIMATION_CONFIG, TEXT_CONTENT } from './FlashcardItem.constants';
import { validateCardContent, isTemporaryCard, getButtonState, shouldHandleCardClick } from './FlashcardItem.utils';
import type { FlashcardItemProps } from './FlashcardItem.types';
import { ViewMode } from './FlashcardItem.ViewMode';
import { EditMode } from './FlashcardItem.EditMode';
import { FullscreenEditModal } from './CardEditor';

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
    onEditingChange,
    compactMode = false,
}) => {
    // ============================================
    // STATE
    // ============================================

    const [isEditing, setIsEditing] = useState(initialEditing);
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    /**
     * Notify parent component when editing state changes.
     * This allows parent to disable drag & drop during editing.
     */
    useEffect(() => {
        onEditingChange?.(isEditing);
    }, [isEditing, onEditingChange]);

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
     * For existing cards: opens fullscreen modal unless in compactMode (cinema view)
     * For new/temporary cards: uses inline editing
     */
    const handleStartEdit = useCallback(() => {
        if (isTemporaryCard(card.id)) {
            // New card: use inline editing
            setTempFront(card.front);
            setTempBack(card.back);
            setIsEditing(true);
            onEditingChange?.(true);
        } else if (compactMode) {
            // Cinema mode: use inline editing instead of fullscreen modal
            setTempFront(card.front);
            setTempBack(card.back);
            setIsEditing(true);
            onEditingChange?.(true);
        } else {
            // Normal mode: open fullscreen modal
            setIsModalOpen(true);
        }
    }, [card.id, card.front, card.back, onEditingChange, compactMode]);

    /**
     * Cancels editing and resets to original values.
     */
    const handleCancel = useCallback(() => {
        setTempFront(card.front);
        setTempBack(card.back);
        setIsEditing(false);
        onEditingChange?.(false);
        
        if (onCancel) {
            onCancel();
        }
    }, [card.front, card.back, onCancel, onEditingChange]);

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
            onEditingChange?.(false);
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
    }, [card.id, validation.trimmedFront, validation.trimmedBack, validation.canSave, onUpdate, onCreate, onEditingChange]);

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

    /**
     * Handles save from fullscreen modal.
     */
    const handleModalSave = useCallback(async (front: string, back: string) => {
        try {
            await onUpdate(card.id, front, back);
            emitToast.success(TEXT_CONTENT.toast.success.message, {
                title: TEXT_CONTENT.toast.success.title,
                duration: TEXT_CONTENT.toast.success.duration,
            });
            setIsModalOpen(false);
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : TEXT_CONTENT.toast.error.message;

            emitToast.error(errorMessage, {
                title: TEXT_CONTENT.toast.error.title,
                duration: TEXT_CONTENT.toast.error.duration,
            });
            throw error; // Re-throw so modal knows save failed
        }
    }, [card.id, onUpdate]);

    // ============================================
    // STYLE COMPUTATION (memoized for performance)
    // ============================================

    const cardClasses = useMemo((): string => {
        // @ts-ignore - height property added to constant
        const base = `${CARD_STYLES.base.borderRadius} ${CARD_STYLES.base.border} ${CARD_STYLES.base.padding} ${CARD_STYLES.base.shadow} ${CARD_STYLES.base.height || ''}`;
        // Disable hover effects and transitions during editing for better UX
        const interactive = !isEditing
            ? `${CARD_STYLES.base.transition} ${CARD_STYLES.base.hover.border} ${CARD_STYLES.base.hover.shadow}`
            : '';
        const cursor = onClick && !isEditing ? 'cursor-pointer' : '';
        const border = isSourceActive
            ? CARD_STYLES.sourceActive.border
            : CARD_STYLES.default.border;
        const shadow = isSourceActive && !isEditing ? CARD_STYLES.sourceActive.shadow : '';

        return `${base} ${interactive} ${cursor} ${border} ${shadow}`.trim();
    }, [isEditing, onClick, isSourceActive]);

    const cardBackground = useMemo((): string => {
        if (isEditing) {
            return 'var(--bg-surface)';
        }

        return isSourceActive
            ? CARD_STYLES.sourceActive.background
            : CARD_STYLES.default.background;
    }, [isEditing, isSourceActive]);

    // ============================================
    // RENDER
    // ============================================

    const cardContent = !isEditing ? (
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
    );

    // Use regular div when editing to avoid animation conflicts with text input
    // No motion props, no drag, no hover effects - completely static during editing
    if (isEditing) {
        return (
            <div
                className={`group ${cardClasses}`}
                style={{ background: cardBackground }}
                // No onClick during editing to prevent any interaction conflicts
            >
                {cardContent}
            </div>
        );
    }

    // Use motion.div for view mode to enable smooth animations
    return (
        <>
            <motion.div
                initial={ANIMATION_CONFIG.card.initial}
                animate={ANIMATION_CONFIG.card.animate}
                exit={ANIMATION_CONFIG.card.exit}
                className={`group ${cardClasses}`}
                style={{ background: cardBackground }}
                onClick={handleCardClick}
            >
                {cardContent}
            </motion.div>

            {/* Fullscreen Edit Modal for existing cards */}
            <FullscreenEditModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                frontContent={card.front}
                backContent={card.back}
                onSave={handleModalSave}
                title="Modifica Flashcard"
                showPreview={true}
            />
        </>
    );
});

FlashcardItem.displayName = 'FlashcardItem';

export default FlashcardItem;
