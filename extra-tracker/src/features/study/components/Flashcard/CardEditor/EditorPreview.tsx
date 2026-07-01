/**
 * EDITOR PREVIEW - Live Markdown Preview
 * ======================================
 *
 * Componente per l'anteprima live del contenuto Markdown.
 * Usa CardContentRenderer per rendering identico alla card finale.
 *
 * @module EditorPreview
 */

import React, { memo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { CardContentRenderer } from '../CardContentRenderer';

// ============================================
// TYPES
// ============================================

export interface EditorPreviewProps {
    /** Contenuto Markdown da visualizzare */
    content: string;
    /** Mostra/nasconde l'anteprima */
    visible?: boolean;
    /** Toggle visibilità */
    onToggleVisibility?: () => void;
    /** Label header */
    label?: string;
    /** Classi CSS aggiuntive */
    className?: string;
    /** Altezza minima */
    minHeight?: string;
    /** Placeholder quando vuoto */
    emptyPlaceholder?: string;
}

// ============================================
// COMPONENT
// ============================================

/**
 * EditorPreview - Anteprima live del Markdown.
 *
 * Mostra esattamente come apparirà il contenuto nella flashcard finale,
 * incluse formule LaTeX, liste, codice, etc.
 */
const EditorPreviewComponent: React.FC<EditorPreviewProps> = ({
    content,
    visible = true,
    onToggleVisibility,
    label = 'Anteprima',
    className = '',
    minHeight = 'min-h-[200px]',
    emptyPlaceholder = 'Inizia a scrivere per vedere l\'anteprima...',
}) => {
    const hasContent = content.trim().length > 0;

    return (
        <div className={`flex flex-col ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-theme-muted flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5" />
                    {label}
                </label>
                {onToggleVisibility && (
                    <button
                        type="button"
                        onClick={onToggleVisibility}
                        className="p-1.5 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-surface transition-all"
                        aria-label={visible ? 'Nascondi anteprima' : 'Mostra anteprima'}
                        title={visible ? 'Nascondi anteprima' : 'Mostra anteprima'}
                    >
                        {visible ? (
                            <EyeOff className="w-4 h-4" />
                        ) : (
                            <Eye className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>

            {/* Preview Container */}
            {visible && (
                <div
                    className={`
                        ${minHeight}
                        rounded-xl
                        border border-theme-subtle
                        bg-theme-surface
                        p-4
                        overflow-y-auto
                        custom-scrollbar
                        transition-all duration-300
                    `}
                >
                    {hasContent ? (
                        <CardContentRenderer
                            content={content}
                            variant="answer"
                            size="base"
                            className="text-theme-primary"
                        />
                    ) : (
                        <p className="text-theme-muted text-sm italic">
                            {emptyPlaceholder}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Memoized version per performance.
 * Re-render solo quando il contenuto o la visibilità cambiano.
 */
export const EditorPreview = memo(EditorPreviewComponent, (prev, next) => {
    return (
        prev.content === next.content &&
        prev.visible === next.visible &&
        prev.className === next.className
    );
});

EditorPreview.displayName = 'EditorPreview';

export default EditorPreview;
