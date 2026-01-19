/**
 * 🎴 FLASHCARD ITEM - Edit Mode Component
 * =======================================
 * 
 * Displays the card in edit mode with input fields.
 * Optimized for immediate text input without animation interference.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { FiX, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { ANIMATION_CONFIG, INPUT_STYLES, BUTTON_STYLES, TEXT_CONTENT, ICON_SIZES, LAYOUT } from './FlashcardItem.constants';

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

export const EditMode: React.FC<EditModeProps> = ({
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
    // REFS
    // ============================================
    
    const frontInputRef = useRef<HTMLTextAreaElement>(null);

    // ============================================
    // EFFECTS
    // ============================================

    /**
     * Focus the first input when component mounts.
     * Using useEffect ensures focus happens after render, avoiding animation conflicts.
     */
    useEffect(() => {
        // Small delay to ensure DOM is ready and avoid animation interference
        const timeoutId = setTimeout(() => {
            frontInputRef.current?.focus();
            // Move cursor to end of text
            if (frontInputRef.current) {
                const length = frontInputRef.current.value.length;
                frontInputRef.current.setSelectionRange(length, length);
            }
        }, 0);

        return () => clearTimeout(timeoutId);
    }, []);

    /**
     * Handle keyboard shortcuts for better UX.
     * - Escape: Cancel editing
     * - Ctrl/Cmd + Enter: Save
     */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Escape to cancel
            if (e.key === 'Escape' && !isSaving) {
                e.preventDefault();
                onCancel();
                return;
            }

            // Ctrl/Cmd + Enter to save
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canSave && !isSaving) {
                e.preventDefault();
                onSave();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancel, onSave, canSave, isSaving]);

    // ============================================
    // STYLE COMPUTATION
    // ============================================

    const inputBaseClasses = `${INPUT_STYLES.base.width} ${INPUT_STYLES.base.resize} ${INPUT_STYLES.base.minHeight} ${INPUT_STYLES.base.padding} ${INPUT_STYLES.base.borderRadius} ${INPUT_STYLES.base.fontSize} ${INPUT_STYLES.base.background} ${INPUT_STYLES.base.border} ${INPUT_STYLES.base.backdrop} ${INPUT_STYLES.base.text} ${INPUT_STYLES.base.placeholder} ${INPUT_STYLES.base.focus.outline} ${INPUT_STYLES.base.focus.ring} ${INPUT_STYLES.base.focus.border} ${INPUT_STYLES.base.transition}`;

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

    /**
     * Handles input change and stops propagation.
     */
    const handleFrontChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        e.stopPropagation();
        onFrontChange(e.target.value);
    }, [onFrontChange]);

    /**
     * Handles input change and stops propagation.
     */
    const handleBackChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        e.stopPropagation();
        onBackChange(e.target.value);
    }, [onBackChange]);

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
            <div>
                <label 
                    htmlFor="flashcard-front-input"
                    className="block mb-2 text-xs font-medium text-slate-300"
                >
                    {TEXT_CONTENT.labels.front}
                </label>
                <textarea
                    id="flashcard-front-input"
                    ref={frontInputRef}
                    value={frontValue}
                    onChange={handleFrontChange}
                    onMouseDown={stopPropagation}
                    onTouchStart={stopPropagation}
                    onClick={stopPropagation}
                    onFocus={stopPropagation}
                    rows={3}
                    className={inputBaseClasses}
                    placeholder={TEXT_CONTENT.placeholders.front}
                />
            </div>

            {/* Back Input */}
            <div>
                <label 
                    htmlFor="flashcard-back-input"
                    className="block mb-2 text-xs font-medium text-slate-300"
                >
                    {TEXT_CONTENT.labels.back}
                </label>
                <textarea
                    id="flashcard-back-input"
                    value={backValue}
                    onChange={handleBackChange}
                    onMouseDown={stopPropagation}
                    onTouchStart={stopPropagation}
                    onClick={stopPropagation}
                    onFocus={stopPropagation}
                    rows={4}
                    className={inputBaseClasses}
                    placeholder={TEXT_CONTENT.placeholders.back}
                />
            </div>

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
                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
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
