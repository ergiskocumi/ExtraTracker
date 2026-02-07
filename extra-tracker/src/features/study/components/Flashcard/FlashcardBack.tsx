/**
 * FLASHCARD BACK - Presentational Component
 * =========================================
 *
 * Componente "stupido" per il lato posteriore (risposta) della flashcard.
 * Usa CardContentRenderer per il rendering del contenuto.
 *
 * @module FlashcardBack
 */

import React, { memo, type ReactNode } from 'react';
import { CardContentRenderer } from './CardContentRenderer';

// ============================================
// TYPES
// ============================================

export interface FlashcardBackProps {
    /** Contenuto della risposta (Markdown + LaTeX) */
    content: string;
    /** Classi CSS aggiuntive */
    className?: string;
    /** Label da mostrare (default: "RISPOSTA") */
    label?: string;
    /** Slot per i controlli (edit, delete, flip buttons) */
    controls?: ReactNode;
}

// ============================================
// COMPONENT
// ============================================

/**
 * FlashcardBack - Lato risposta della flashcard.
 *
 * Design con sfumatura viola per distinguerlo dal fronte.
 * Include slot per controlli opzionali.
 */
const FlashcardBackComponent: React.FC<FlashcardBackProps> = ({
    content,
    className = '',
    label = 'RISPOSTA',
    controls,
}) => {
    return (
        <div className={`flashcard-back ${className}`}>
            {/* Badge Label */}
            <div className="flex justify-start mb-3 flex-shrink-0">
                <span className="flashcard-label flashcard-label--answer">
                    {label}
                </span>
            </div>

            {/* Content Area */}
            <div className="flashcard-content">
                <div className="w-full max-w-full px-2">
                    <CardContentRenderer
                        content={content}
                        variant="study"
                        size="adaptive"
                        centered={true}
                        className="text-white/95 font-semibold leading-relaxed"
                    />
                </div>
            </div>

            {/* Controls Slot */}
            {controls && (
                <div className="flashcard-controls">
                    {controls}
                </div>
            )}
        </div>
    );
};

/**
 * Memoized version per performance.
 * Re-render solo quando il contenuto o i controlli cambiano.
 */
export const FlashcardBack = memo(FlashcardBackComponent, (prev, next) => {
    return (
        prev.content === next.content &&
        prev.className === next.className &&
        prev.label === next.label &&
        prev.controls === next.controls
    );
});

FlashcardBack.displayName = 'FlashcardBack';

export default FlashcardBack;
