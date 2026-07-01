/**
 * CARD EDITOR - Complete Editor with Live Preview
 * ===============================================
 *
 * Componente wrapper che combina:
 * - MarkdownEditor (scrittura)
 * - EditorPreview (anteprima live)
 * - useAutoSave (salvataggio automatico)
 *
 * Supporta Dark Mode e layout responsive.
 *
 * @module CardEditor
 *
 * @example
 * <CardEditor
 *   initialContent="Testo con $x^2$"
 *   onSave={(content) => saveToServer(content)}
 *   autoSaveDelay={2000}
 * />
 */

import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { Save, X, Columns, Rows, Eye, EyeOff } from 'lucide-react';
import { RichTextEditor as MarkdownEditor } from './RichTextEditor';
import { EditorPreview } from './EditorPreview';
import { useAutoSave } from './useAutoSave';

// ============================================
// TYPES
// ============================================

export type EditorLayout = 'split-horizontal' | 'split-vertical' | 'editor-only' | 'preview-only';

export interface CardEditorProps {
    /** Contenuto iniziale dell'editor */
    initialContent?: string;
    /** Callback quando il contenuto viene salvato */
    onSave?: (content: string) => Promise<void> | void;
    /** Callback quando l'editor viene chiuso/annullato */
    onCancel?: () => void;
    /** Abilita auto-save */
    autoSave?: boolean;
    /** Delay auto-save in ms (default: 2000) */
    autoSaveDelay?: number;
    /** Layout iniziale */
    layout?: EditorLayout;
    /** Mostra controlli layout */
    showLayoutControls?: boolean;
    /** Classi CSS aggiuntive */
    className?: string;
    /** Placeholder editor */
    placeholder?: string;
    /** Label editor */
    label?: string;
    /** Altezza minima (CSS value) */
    minHeight?: string;
    /** Mostra bottoni Salva/Annulla */
    showActionButtons?: boolean;
    /** Disabilita editor */
    disabled?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const LAYOUT_ICONS: Record<EditorLayout, React.ReactNode> = {
    'split-horizontal': <Columns className="w-4 h-4" />,
    'split-vertical': <Rows className="w-4 h-4" />,
    'editor-only': <EyeOff className="w-4 h-4" />,
    'preview-only': <Eye className="w-4 h-4" />,
};

const LAYOUT_LABELS: Record<EditorLayout, string> = {
    'split-horizontal': 'Editor e Preview affiancati',
    'split-vertical': 'Editor e Preview sovrapposti',
    'editor-only': 'Solo Editor',
    'preview-only': 'Solo Preview',
};

// ============================================
// COMPONENT
// ============================================

/**
 * CardEditor - Editor completo per flashcard.
 *
 * Features:
 * - Editor Markdown con toolbar completa
 * - Anteprima live con CardContentRenderer
 * - Auto-save con debounce
 * - Layout flessibile (split, solo editor, solo preview)
 * - Dark mode support
 * - Keyboard shortcuts
 */
const CardEditorComponent: React.FC<CardEditorProps> = ({
    initialContent = '',
    onSave,
    onCancel,
    autoSave = true,
    autoSaveDelay = 2000,
    layout: initialLayout = 'split-horizontal',
    showLayoutControls = true,
    className = '',
    placeholder = 'Scrivi qui... Supporta Markdown e LaTeX ($formula$)',
    label,
    minHeight = '300px',
    showActionButtons = true,
    disabled = false,
}) => {
    // State
    const [content, setContent] = useState(initialContent);
    const [layout, setLayout] = useState<EditorLayout>(initialLayout);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Sync con prop esterna
    useEffect(() => {
        setContent(initialContent);
    }, [initialContent]);

    // Auto-save handler
    const handleAutoSave = useCallback(async (contentToSave: string) => {
        if (!onSave) return;
        try {
            await onSave(contentToSave);
            setLastSaved(new Date());
        } catch (error) {
            console.error('[CardEditor] Auto-save failed:', error);
        }
    }, [onSave]);

    // Hook auto-save
    const { forceSave: _forceSave } = useAutoSave({
        content,
        onSave: handleAutoSave,
        enabled: autoSave && !!onSave && !disabled,
        delay: autoSaveDelay,
    });

    // Manual save handler
    const handleManualSave = useCallback(async () => {
        if (!onSave || disabled) return;
        setIsSaving(true);
        try {
            await onSave(content);
            setLastSaved(new Date());
        } catch (error) {
            console.error('[CardEditor] Save failed:', error);
        } finally {
            setIsSaving(false);
        }
    }, [content, onSave, disabled]);

    // Cancel handler
    const handleCancel = useCallback(() => {
        setContent(initialContent);
        onCancel?.();
    }, [initialContent, onCancel]);

    // Layout toggle
    const cycleLayout = useCallback(() => {
        const layouts: EditorLayout[] = ['split-horizontal', 'split-vertical', 'editor-only', 'preview-only'];
        const currentIndex = layouts.indexOf(layout);
        const nextIndex = (currentIndex + 1) % layouts.length;
        setLayout(layouts[nextIndex]);
    }, [layout]);

    // Computed values
    const showEditor = layout !== 'preview-only';
    const showPreview = layout !== 'editor-only';
    const isHorizontalSplit = layout === 'split-horizontal';

    // Layout classes
    const containerClasses = useMemo(() => {
        const base = 'rounded-2xl border border-theme-subtle bg-theme-elevated overflow-hidden';
        return `${base} ${className}`;
    }, [className]);

    const contentClasses = useMemo(() => {
        if (layout === 'editor-only' || layout === 'preview-only') {
            return 'flex flex-col';
        }
        if (isHorizontalSplit) {
            return 'grid grid-cols-1 md:grid-cols-2 gap-4';
        }
        return 'flex flex-col gap-4';
    }, [layout, isHorizontalSplit]);

    // Last saved text
    const lastSavedText = useMemo(() => {
        if (!lastSaved) return null;
        const now = new Date();
        const diffMs = now.getTime() - lastSaved.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec < 5) return 'Salvato ora';
        if (diffSec < 60) return `Salvato ${diffSec}s fa`;
        const diffMin = Math.floor(diffSec / 60);
        return `Salvato ${diffMin}m fa`;
    }, [lastSaved]);

    return (
        <div className={containerClasses}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-theme-subtle bg-theme-surface">
                <div className="flex items-center gap-3">
                    {label && (
                        <span className="text-sm font-medium text-theme-primary">
                            {label}
                        </span>
                    )}
                    {autoSave && lastSavedText && (
                        <span className="text-xs text-theme-muted">
                            {lastSavedText}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Layout Toggle */}
                    {showLayoutControls && (
                        <button
                            type="button"
                            onClick={cycleLayout}
                            className="p-2 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-surface-hover transition-all"
                            aria-label={LAYOUT_LABELS[layout]}
                            title={LAYOUT_LABELS[layout]}
                        >
                            {LAYOUT_ICONS[layout]}
                        </button>
                    )}

                    {/* Action Buttons */}
                    {showActionButtons && (
                        <>
                            {onCancel && (
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={disabled}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-theme-secondary border border-theme-subtle hover:bg-theme-surface-hover transition-all disabled:opacity-50"
                                >
                                    <X className="w-4 h-4" />
                                    <span className="hidden sm:inline">Annulla</span>
                                </button>
                            )}
                            {onSave && (
                                <button
                                    type="button"
                                    onClick={handleManualSave}
                                    disabled={disabled || isSaving}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
                                >
                                    <Save className="w-4 h-4" />
                                    <span className="hidden sm:inline">
                                        {isSaving ? 'Salvataggio...' : 'Salva'}
                                    </span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className={`p-4 ${contentClasses}`} style={{ minHeight }}>
                {/* Editor */}
                {showEditor && (
                    <div className={showPreview && isHorizontalSplit ? '' : 'flex-1'}>
                        <MarkdownEditor
                            value={content}
                            onChange={setContent}
                            placeholder={placeholder}
                            toolbarVisibility="always"
                            size="md"
                            disabled={disabled}
                            onSave={handleManualSave}
                            onCancel={handleCancel}
                            minRows={8}
                        />
                    </div>
                )}

                {/* Preview */}
                {showPreview && (
                    <EditorPreview
                        content={content}
                        visible={true}
                        label="Anteprima Live"
                        minHeight={showEditor ? 'min-h-[200px]' : 'min-h-[300px]'}
                        className={showEditor && isHorizontalSplit ? '' : 'flex-1'}
                    />
                )}
            </div>
        </div>
    );
};

/**
 * Memoized version per performance.
 */
export const CardEditor = memo(CardEditorComponent, (prev, next) => {
    return (
        prev.initialContent === next.initialContent &&
        prev.autoSave === next.autoSave &&
        prev.autoSaveDelay === next.autoSaveDelay &&
        prev.layout === next.layout &&
        prev.disabled === next.disabled &&
        prev.className === next.className
    );
});

CardEditor.displayName = 'CardEditor';

export default CardEditor;
