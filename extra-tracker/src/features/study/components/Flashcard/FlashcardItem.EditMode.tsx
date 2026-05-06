/**
 * 🎴 FLASHCARD ITEM - Edit Mode Component
 * =======================================
 *
 * Displays the card in edit mode with input fields.
 * Layout: unico blocco Domanda + Risposta con sezioni visivamente collegate,
 * action bar in basso. Ottimizzato per focus/flow (cinema/compact).
 */

import React, { useCallback, memo } from 'react';
import { X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { ANIMATION_CONFIG, TEXT_CONTENT, ICON_SIZES } from './FlashcardItem.constants';
import { MarkdownEditor } from './MarkdownEditor.lazy';

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

/** Pill label per sezione (Domanda / Risposta) in linea con FullscreenEditModal */
const SectionLabel: React.FC<{ label: string; sub: string; color: 'violet' | 'emerald' }> = ({ label, sub, color }) => {
    const classes = color === 'violet'
        ? 'bg-violet-500/15 border-violet-500/25 text-violet-700 dark:text-violet-300'
        : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-700 dark:text-emerald-300';
    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${classes}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${color === 'violet' ? 'bg-violet-500' : 'bg-emerald-500'}`} />
            <span>{label}</span>
            <span className="opacity-60 font-normal">{sub}</span>
        </div>
    );
};

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
    const stopPropagation = useCallback((e: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <div
            className="flex flex-col gap-3"
            onMouseDown={stopPropagation}
            onTouchStart={stopPropagation}
            onClick={stopPropagation}
        >
            {/* Blocco unico Domanda + Risposta: spaziatura ridotta al minimo */}
            <div className="rounded-xl border border-theme-default bg-theme-surface/50 overflow-hidden">
                {/* Sezione Domanda */}
                <div className="px-2.5 pt-2.5 pb-1.5 md:px-3 md:pt-3 md:pb-2">
                    <div className="mb-1.5">
                        <SectionLabel label="Domanda" sub="fronte" color="violet" />
                    </div>
                    <MarkdownEditor
                        value={frontValue}
                        onChange={onFrontChange}
                        placeholder={TEXT_CONTENT.placeholders.front}
                        autoFocus
                        disabled={isSaving}
                        onSave={canSave && !isSaving ? onSave : undefined}
                        onCancel={isSaving ? undefined : onCancel}
                        toolbarVisibility="always"
                        size="md"
                        minRows={3}
                        className="space-y-1.5"
                        textareaClassName="min-h-[64px]"
                    />
                </div>

                {/* Divisore compatto: Risposta attaccata alla Domanda */}
                <div className="border-t border-theme-default bg-theme-card/50 px-2.5 py-1 md:px-3 md:py-1.5">
                    <SectionLabel label="Risposta" sub="retro" color="emerald" />
                </div>

                {/* Sezione Risposta */}
                <div className="px-2.5 pt-1.5 pb-2.5 md:px-3 md:pt-2 md:pb-3">
                    <MarkdownEditor
                        value={backValue}
                        onChange={onBackChange}
                        placeholder={TEXT_CONTENT.placeholders.back}
                        disabled={isSaving}
                        onSave={canSave && !isSaving ? onSave : undefined}
                        onCancel={isSaving ? undefined : onCancel}
                        toolbarVisibility="always"
                        size="md"
                        minRows={4}
                        className="space-y-1.5"
                        textareaClassName="min-h-[88px]"
                    />
                </div>
            </div>

            {/* Action bar */}
            <div
                className="flex items-center gap-3 pt-1.5 border-t border-theme-default"
                onMouseDown={stopPropagation}
                onTouchStart={stopPropagation}
                onClick={stopPropagation}
            >
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onCancel(); }}
                    onMouseDown={stopPropagation}
                    onTouchStart={stopPropagation}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-theme-default bg-theme-surface text-theme-secondary hover:text-theme-primary hover:bg-theme-card hover:border-theme-strong transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                    <X className={ICON_SIZES.small} />
                    <span className="hidden sm:inline">{TEXT_CONTENT.buttons.cancel}</span>
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSave(); }}
                    onMouseDown={stopPropagation}
                    onTouchStart={stopPropagation}
                    disabled={!canSave || isSaving}
                    className="keep-light-text flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white font-medium text-sm shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
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
                            <Check className={ICON_SIZES.small} />
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
