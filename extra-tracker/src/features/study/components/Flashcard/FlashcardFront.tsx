/**
 * FLASHCARD FRONT - Presentational Component
 * ==========================================
 *
 * Componente "stupido" per il lato frontale (domanda) della flashcard.
 * Usa CardContentRenderer per il rendering del contenuto.
 *
 * @module FlashcardFront
 */

import React, { memo } from 'react';
import { CardContentRenderer } from './CardContentRenderer';

// ============================================
// TYPES
// ============================================

export interface FlashcardFrontProps {
    /** Contenuto della domanda (Markdown + LaTeX) */
    content: string;
    /** Classi CSS aggiuntive */
    className?: string;
    /** Label da mostrare (default: "DOMANDA") */
    label?: string;
    /** Mostra hint per girare la carta */
    showFlipHint?: boolean;
    /** Testo hint (default: "Tocca per girare") */
    flipHintText?: string;
    /** Mostra shortcut tastiera nell'hint */
    showKeyboardHint?: boolean;
}

// ============================================
// COMPONENT
// ============================================

/**
 * FlashcardFront - Lato domanda della flashcard.
 *
 * Design distintivo con gradiente leggero e badge "DOMANDA".
 * Ottimizzato per leggibilità con tipografia adattiva.
 */
const FlashcardFrontComponent: React.FC<FlashcardFrontProps> = ({
    content,
    className = '',
    label = 'DOMANDA',
    showFlipHint = true,
    flipHintText = 'Tocca per girare',
    showKeyboardHint = true,
}) => {
    return (
        <div className={`flashcard-front ${className}`}>
            {/* Badge Label */}
            <div className="flex justify-end mb-3 flex-shrink-0">
                <span className="flashcard-label flashcard-label--question">
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
                        className="text-white font-bold leading-relaxed"
                    />
                </div>
            </div>

            {/* Flip Hint */}
            {showFlipHint && (
                <div className="flashcard-hint">
                    <span>{flipHintText}</span>
                    {showKeyboardHint && (
                        <>
                            <span className="text-xs opacity-50">|</span>
                            <kbd>Spazio</kbd>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Memoized version per performance.
 * Re-render solo quando il contenuto cambia.
 */
export const FlashcardFront = memo(FlashcardFrontComponent, (prev, next) => {
    return (
        prev.content === next.content &&
        prev.className === next.className &&
        prev.label === next.label &&
        prev.showFlipHint === next.showFlipHint
    );
});

FlashcardFront.displayName = 'FlashcardFront';

export default FlashcardFront;
