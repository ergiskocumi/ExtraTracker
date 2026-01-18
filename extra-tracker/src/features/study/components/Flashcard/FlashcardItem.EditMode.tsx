/**
 * 🎴 FLASHCARD ITEM - Edit Mode Component
 * =======================================
 * 
 * Displays the card in edit mode with input fields.
 */

import React from 'react';
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
    const inputBaseClasses = `${INPUT_STYLES.base.width} ${INPUT_STYLES.base.resize} ${INPUT_STYLES.base.minHeight} ${INPUT_STYLES.base.padding} ${INPUT_STYLES.base.borderRadius} ${INPUT_STYLES.base.fontSize} ${INPUT_STYLES.base.background} ${INPUT_STYLES.base.border} ${INPUT_STYLES.base.backdrop} ${INPUT_STYLES.base.text} ${INPUT_STYLES.base.placeholder} ${INPUT_STYLES.base.focus.outline} ${INPUT_STYLES.base.focus.ring} ${INPUT_STYLES.base.focus.border} ${INPUT_STYLES.base.transition}`;

    const cancelButtonClasses = `flex items-center justify-center ${LAYOUT.spacing.gapButtons} px-4 py-2.5 ${BUTTON_STYLES.base.borderRadius} ${BUTTON_STYLES.base.border} ${BUTTON_STYLES.base.transition} ${BUTTON_STYLES.base.active} ${BUTTON_STYLES.cancel.border} ${BUTTON_STYLES.cancel.background} ${BUTTON_STYLES.cancel.text} ${BUTTON_STYLES.cancel.hover.text} ${BUTTON_STYLES.cancel.hover.background} ${BUTTON_STYLES.cancel.disabled.opacity} ${BUTTON_STYLES.cancel.disabled.cursor} text-sm font-medium`;

    const saveButtonClasses = `flex-1 flex items-center justify-center ${LAYOUT.spacing.gapButtons} px-4 py-2.5 ${BUTTON_STYLES.base.borderRadius} ${BUTTON_STYLES.base.transition} ${BUTTON_STYLES.base.active} text-sm font-medium ${BUTTON_STYLES.save.text} ${BUTTON_STYLES.save.background} ${BUTTON_STYLES.save.hover.background} ${BUTTON_STYLES.save.shadow} ${BUTTON_STYLES.save.disabled.opacity} ${BUTTON_STYLES.save.disabled.cursor}`;

    return (
        <motion.div
            key="edit"
            initial={ANIMATION_CONFIG.editMode.initial}
            animate={ANIMATION_CONFIG.editMode.animate}
            exit={ANIMATION_CONFIG.editMode.exit}
            className="space-y-4"
        >
            {/* Front Input */}
            <div>
                <label className="block mb-2 text-xs font-medium text-slate-300">
                    {TEXT_CONTENT.labels.front}
                </label>
                <textarea
                    value={frontValue}
                    onChange={(e) => onFrontChange(e.target.value)}
                    rows={3}
                    autoFocus
                    className={inputBaseClasses}
                    placeholder={TEXT_CONTENT.placeholders.front}
                />
            </div>

            {/* Back Input */}
            <div>
                <label className="block mb-2 text-xs font-medium text-slate-300">
                    {TEXT_CONTENT.labels.back}
                </label>
                <textarea
                    value={backValue}
                    onChange={(e) => onBackChange(e.target.value)}
                    rows={4}
                    className={inputBaseClasses}
                    placeholder={TEXT_CONTENT.placeholders.back}
                />
            </div>

            {/* Action Bar */}
            <div className={`flex items-center ${LAYOUT.spacing.gapActions} ${LAYOUT.spacing.paddingTop} ${LAYOUT.divider.border}`}>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSaving}
                    className={cancelButtonClasses}
                >
                    <FiX className={ICON_SIZES.small} />
                    <span className="hidden sm:inline">{TEXT_CONTENT.buttons.cancel}</span>
                </button>
                <button
                    type="button"
                    onClick={onSave}
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
        </motion.div>
    );
};
