/**
 * FLASHCARD MODULAR - CSS-Based Flip Card
 * =======================================
 *
 * Componente wrapper che orchestra:
 * - FlashcardFront (domanda)
 * - FlashcardBack (risposta)
 * - FlashcardControls (azioni)
 *
 * Usa CSS puro per le animazioni 3D (no Framer Motion).
 * Ideale per performance e bundle size ridotto.
 *
 * @module FlashcardModular
 *
 * @example
 * <FlashcardModular
 *   question="Qual è la formula dell'energia?"
 *   answer="$E = mc^2$"
 *   onEdit={() => console.log('edit')}
 *   onDelete={() => console.log('delete')}
 * />
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import { FlashcardFront } from './FlashcardFront';
import { FlashcardBack } from './FlashcardBack';
import { FlashcardControls } from './FlashcardControls';
import './styles/flashcard.css';

// ============================================
// TYPES
// ============================================

export interface FlashcardModularProps {
    /** Contenuto della domanda (Markdown + LaTeX) */
    question: string;
    /** Contenuto della risposta (Markdown + LaTeX) */
    answer: string;
    /** Callback per modifica */
    onEdit?: () => void;
    /** Callback per eliminazione */
    onDelete?: () => void;
    /** Stato iniziale flip (default: false = mostra domanda) */
    initialFlipped?: boolean;
    /** Callback quando lo stato flip cambia */
    onFlipChange?: (isFlipped: boolean) => void;
    /** Classi CSS aggiuntive per il container */
    className?: string;
    /** Abilita flip con tastiera (Spazio) */
    enableKeyboardFlip?: boolean;
    /** Mostra controlli sul retro */
    showControls?: boolean;
    /** Mostra pulsante "Gira" nei controlli */
    showFlipButton?: boolean;
    /** Label per il fronte */
    frontLabel?: string;
    /** Label per il retro */
    backLabel?: string;
}

// ============================================
// COMPONENT
// ============================================

/**
 * FlashcardModular - Flashcard modulare con flip CSS.
 *
 * Struttura:
 * ```
 * <div class="perspective-container">
 *   <div class="flashcard-inner [rotated]">
 *     <FlashcardFront />
 *     <FlashcardBack>
 *       <FlashcardControls />
 *     </FlashcardBack>
 *   </div>
 * </div>
 * ```
 */
const FlashcardModularComponent: React.FC<FlashcardModularProps> = ({
    question,
    answer,
    onEdit,
    onDelete,
    initialFlipped = false,
    onFlipChange,
    className = '',
    enableKeyboardFlip = true,
    showControls = true,
    showFlipButton = false,
    frontLabel,
    backLabel,
}) => {
    // State: carta girata o no
    const [isFlipped, setIsFlipped] = useState(initialFlipped);

    // Handler per girare la carta
    const handleFlip = useCallback(() => {
        setIsFlipped((prev) => {
            const newValue = !prev;
            onFlipChange?.(newValue);
            return newValue;
        });
    }, [onFlipChange]);

    // Handler click sul container (gira solo se clicchi sul fronte)
    const handleContainerClick = useCallback(() => {
        if (!isFlipped) {
            handleFlip();
        }
    }, [isFlipped, handleFlip]);

    // Keyboard handler (Spazio per flip)
    useEffect(() => {
        if (!enableKeyboardFlip) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignora se focus è su input/textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault();
                handleFlip();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enableKeyboardFlip, handleFlip]);

    // Sync con prop esterna
    useEffect(() => {
        setIsFlipped(initialFlipped);
    }, [initialFlipped]);

    return (
        <div
            className={`perspective-container ${className}`}
            onClick={handleContainerClick}
            role="button"
            tabIndex={0}
            aria-label={isFlipped ? 'Mostra domanda' : 'Mostra risposta'}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    handleFlip();
                }
            }}
        >
            <div className={`flashcard-inner ${isFlipped ? 'rotated' : ''}`}>
                {/* FRONTE - Domanda */}
                <FlashcardFront
                    content={question}
                    label={frontLabel}
                    showFlipHint={!isFlipped}
                    showKeyboardHint={enableKeyboardFlip}
                />

                {/* RETRO - Risposta */}
                <FlashcardBack
                    content={answer}
                    label={backLabel}
                    controls={
                        showControls && (
                            <FlashcardControls
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onFlip={showFlipButton ? handleFlip : undefined}
                                showEdit={!!onEdit}
                                showDelete={!!onDelete}
                                showFlip={showFlipButton}
                            />
                        )
                    }
                />
            </div>
        </div>
    );
};

/**
 * Memoized version per performance.
 */
export const FlashcardModular = memo(FlashcardModularComponent, (prev, next) => {
    return (
        prev.question === next.question &&
        prev.answer === next.answer &&
        prev.initialFlipped === next.initialFlipped &&
        prev.className === next.className &&
        prev.onEdit === next.onEdit &&
        prev.onDelete === next.onDelete &&
        prev.showControls === next.showControls &&
        prev.showFlipButton === next.showFlipButton
    );
});

FlashcardModular.displayName = 'FlashcardModular';

export default FlashcardModular;
