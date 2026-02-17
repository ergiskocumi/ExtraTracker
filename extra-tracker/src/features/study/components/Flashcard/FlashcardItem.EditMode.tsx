/**
 * 🎴 FLASHCARD ITEM - Edit Mode Component
 * =======================================
 *
 * Displays the card in edit mode with input fields.
 * Optimized for immediate text input without animation interference.
 * Memoized with React.memo to prevent unnecessary re-renders.
 */

import React, { useCallback, memo } from 'react';
import { FiX, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { ANIMATION_CONFIG, BUTTON_STYLES, TEXT_CONTENT, ICON_SIZES, LAYOUT } from './FlashcardItem.constants';
import { RichTextEditor as MarkdownEditor } from './CardEditor';

// ============================================
// TYPES
// ============================================

interface EditModeProps {
    frontValue: string;
    backValue: string;
    isSaving: boolean;
    canSave: boolean;
    onFrontChange: (value: string) => void;
    onBackChange: (value: string) => void;
    onSave: () => void;
    onCancel: () => void;
}

// ============================================
// COMPONENT
// ============================================

const EditModeComponent: React.FC<EditModeProps> = ({
    frontValue,
    backValue,
    isSaving,
    canSave,
    onFrontChange,
    onBackChange,
    onSave,
    onCancel,
}) => {
    // ============================================
    // STYLE COMPUTATION
    // ============================================

    const cancelButtonClasses = `flex items-center justify-center ${LAYOUT.spacing.gapButtons} px-4 py-2.5 ${BUTTON_STYLES.base.borderRadius} ${BUTTON_STYLES.base.border} ${BUTTON_STYLES.base.transition} ${BUTTON_STYLES.base.active} ${BUTTON_STYLES.cancel.border} ${BUTTON_STYLES.cancel.background} ${BUTTON_STYLES.cancel.text} ${BUTTON_STYLES.cancel.hover.text} ${BUTTON_STYLES.cancel.hover.background} ${BUTTON_STYLES.cancel.disabled.opacity} ${BUTTON_STYLES.cancel.disabled.cursor} text-sm font-medium`;

    const saveButtonClasses = `flex-1 flex items-center justify-center ${LAYOUT.spacing.gapButtons} px-4 py-2.5 ${BUTTON_STYLES.base.borderRadius} ${BUTTON_STYLES.base.transition} ${BUTTON_STYLES.base.active} text-sm font-medium ${BUTTON_STYLES.save.text} ${BUTTON_STYLES.save.background} ${BUTTON_STYLES.save.hover.background} ${BUTTON_STYLES.save.shadow} ${BUTTON_STYLES.save.disabled.opacity} ${BUTTON_STYLES.save.disabled.cursor}`;

    // ============================================
    // EVENT HANDLERS
    // ============================================

    /**
     * Stops event propagation to prevent drag handlers from being triggered.
     * This ensures that interactions with input fields don't interfere with drag & drop.
     */
    const stopPropagation = useCallback((e: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => {
        e.stopPropagation();
    }, []);

    // ============================================
    // RENDER
    // ============================================

    // Use regular div instead of motion.div to avoid animation interference with text input
    return (
        <div 
            className="space-y-4"
            onMouseDown={stopPropagation}
            onTouchStart={stopPropagation}
            onClick={stopPropagation}
        >
            {/* Front Input */}
            <MarkdownEditor
                value={frontValue}
                onChange={onFrontChange}
                label={TEXT_CONTENT.labels.front}
                placeholder={TEXT_CONTENT.placeholders.front}
                autoFocus
                disabled={isSaving}
                onSave={canSave && !isSaving ? onSave : undefined}
                onCancel={isSaving ? undefined : onCancel}
                toolbarVisibility="focus"
                size="md"
                minRows={3}
                className="space-y-2"
                textareaClassName="min-h-[80px]"
            />

            {/* Back Input */}
            <MarkdownEditor
                value={backValue}
                onChange={onBackChange}
                label={TEXT_CONTENT.labels.back}
                placeholder={TEXT_CONTENT.placeholders.back}
                disabled={isSaving}
                onSave={canSave && !isSaving ? onSave : undefined}
                onCancel={isSaving ? undefined : onCancel}
                toolbarVisibility="focus"
                size="md"
                minRows={4}
                className="space-y-2"
                textareaClassName="min-h-[120px]"
            />

            {/* Action Bar */}
            <div 
                className={`flex items-center ${LAYOUT.spacing.gapActions} ${LAYOUT.spacing.paddingTop} ${LAYOUT.divider.border}`}
                onMouseDown={stopPropagation}
                onTouchStart={stopPropagation}
                onClick={stopPropagation}
            >
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onCancel();
                    }}
                    onMouseDown={stopPropagation}
                    onTouchStart={stopPropagation}
                    disabled={isSaving}
                    className={cancelButtonClasses}
                >
                    <FiX className={ICON_SIZES.small} />
                    <span className="hidden sm:inline">{TEXT_CONTENT.buttons.cancel}</span>
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSave();
                    }}
                    onMouseDown={stopPropagation}
                    onTouchStart={stopPropagation}
                    disabled={!canSave}
                    className={saveButtonClasses}
                >
                    {isSaving ? (
                        <>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={ANIMATION_CONFIG.loadingSpinner}
                                className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white"
                            />
                            <span>{TEXT_CONTENT.buttons.saving}</span>
                        </>
                    ) : (
                        <>
                            <FiCheck className={ICON_SIZES.small} />
                            <span>{TEXT_CONTENT.buttons.save}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

/**
 * Memoized EditMode component.
 * Re-renders only when props change.
 */
export const EditMode = memo(EditModeComponent);
