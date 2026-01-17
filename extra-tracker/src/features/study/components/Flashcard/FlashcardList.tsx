/**
 * 🎴 FLASHCARD LIST - iOS-Style Sortable List/Grid with dnd-kit
 * ============================================================================
 * 
 * Refactored component using @dnd-kit for robust, industry-standard drag & drop.
 * Features:
 * - DndContext: Main drag & drop context
 * - SortableContext: Manages sortable items with appropriate strategies
 * - DragOverlay: Renders a clean copy of the dragged card in a portal (solves Z-index issues)
 * - Sensors: Mouse, Touch, Keyboard with activation constraints (5px movement)
 * 
 * Architecture:
 * - Grid View: Uses rectSortingStrategy for 2D grid layout
 * - List View: Uses verticalListSortingStrategy for vertical stacking
 * - Insert Buttons: Safe to render between SortableItems (dnd-kit is headless)
 * 
 * Why DragOverlay Solves Visual Glitches:
 * - The dragged item is rendered in a portal, completely separate from the DOM tree
 * - No z-index conflicts because it's outside the normal stacking context
 * - The original item stays in place (with reduced opacity) while overlay follows cursor
 * - This eliminates overlapping, clipping, and visual glitches completely
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { FiPlus, FiArrowLeft } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
    SortableContext,
    rectSortingStrategy,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import type { Deck, Card } from '../../services/studyService';
import { SortableItem } from './SortableItem';
import { FlashcardItem } from './FlashcardItem';
import { DeleteCardModal } from './DeleteCardModal';
import { FlashcardInlineForm } from './FlashcardInlineForm';
import { studyService } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';

// ============================================
// TYPES
// ============================================

interface FlashcardListProps {
    deck: Deck;
    onAddCard: () => void;
    onUpdate: (cardId: string, front: string, back: string) => Promise<void>;
    onCardClick?: (card: Card) => void;
    /** Callback per eliminare una card (opzionale) */
    onDelete?: (cardId: string) => void;
    showHeader?: boolean;
    /** Callback per navigazione indietro (opzionale) */
    onNavigateBack?: () => void;
    /** Callback quando il deck viene aggiornato (per refresh) */
    onDeckUpdate?: (updatedDeck: Deck) => void;
    /** Card filtrate da mostrare (opzionale, usa deck.cards se non fornito) */
    filteredCards?: Card[];
    /** Modalità di visualizzazione: 'list' (lista verticale) o 'grid' (griglia quadrata) */
    viewMode?: 'list' | 'grid';
    /** Callback quando si clicca "Show Source" su una card */
    onShowSource?: (card: Card) => void;
    /** ID della card attualmente evidenziata come "source active" */
    activeSourceCardId?: string | null;
}

interface InsertButtonProps {
    position: number;
    onInsert: (position: number) => void;
    isVisible: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const INSERT_BUTTON_HEIGHT = 40; // Altezza del pulsante di inserimento in px
const ACTIVATION_DISTANCE = 5; // Pixels to move before drag activates (prevents accidental drags)

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Pulsante per inserire una card in una posizione specifica
 * Appare tra due card quando si passa il mouse sopra o durante il drag
 */
const InsertButton: React.FC<InsertButtonProps> = ({ position, onInsert, isVisible }) => {
    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onInsert(position);
    }, [position, onInsert]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                    animate={{ 
                        opacity: 1, 
                        scale: 1, 
                        y: 0,
                    }}
                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                    transition={{ 
                        duration: 0.3,
                        ease: 'easeOut',
                    }}
                    className="flex items-center justify-center py-2 my-1"
                    style={{ minHeight: `${INSERT_BUTTON_HEIGHT}px` }}
                >
                    <motion.div 
                        className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"
                        animate={{
                            scaleX: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    <motion.button
                        onClick={handleClick}
                        className="mx-4 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/50 hover:shadow-violet-500/70 hover:scale-110 active:scale-95 transition-all duration-200"
                        aria-label={`Inserisci card in posizione ${position + 1}`}
                        title={`Inserisci card in posizione ${position + 1}`}
                        animate={{
                            scale: [1, 1.1, 1],
                            boxShadow: [
                                '0 0 20px rgba(139, 92, 246, 0.3)',
                                '0 0 30px rgba(139, 92, 246, 0.5)',
                                '0 0 20px rgba(139, 92, 246, 0.3)',
                            ],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    >
                        <FiPlus className="w-6 h-6" />
                    </motion.button>
                    <motion.div 
                        className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"
                        animate={{
                            scaleX: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const FlashcardList: React.FC<FlashcardListProps> = ({
    deck,
    onAddCard,
    onUpdate,
    onCardClick,
    onDelete,
    showHeader = false,
    onNavigateBack,
    onDeckUpdate,
    filteredCards,
    viewMode = 'list',
    onShowSource,
    activeSourceCardId,
}) => {
    // Local state for drag interactions - ensures instant visual feedback
    // Add mock sourceMetadata to first 2-3 cards for testing
    const [items, setItems] = useState<Card[]>(() => {
        const cards = filteredCards || deck.cards || [];
        // Add mock sourceMetadata to first 2-3 cards if they don't have it
        return cards.map((card, index) => {
            if (index < 3 && !card.sourceMetadata) {
                return {
                    ...card,
                    sourceMetadata: {
                        pageNumber: index + 1, // Pages 1, 2, 3
                        originalText: card.front.substring(0, 50) + '...', // Mock: first 50 chars of front
                    },
                };
            }
            return card;
        });
    });

    // Track which card is being dragged (for DragOverlay)
    const [activeId, setActiveId] = useState<string | null>(null);


    // Inline form state (per entrambe le viste)
    const [insertingIndex, setInsertingIndex] = useState<number | null>(null);

    // Modal state for deleting cards
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);


    // Sync local state when deck or filteredCards change (but not during drag)
    useEffect(() => {
        const newCards = filteredCards || deck.cards || [];
        // Only update if the card IDs have changed (not just reordered)
        const currentIds = items.map(c => c.id).sort().join(',');
        const newIds = newCards.map(c => c.id).sort().join(',');
        if (currentIds !== newIds && !activeId) {
            setItems(newCards);
        }
    }, [deck.cards, filteredCards, activeId]);

    // Configure sensors with activation constraints
    // This prevents accidental drags when clicking (requires 5px movement)
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: ACTIVATION_DISTANCE,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: ACTIVATION_DISTANCE,
            },
        }),
        useSensor(KeyboardSensor)
    );

    // Memoize callback for card clicks
    const handleCardClick = useMemo(() => {
        if (!onCardClick) return undefined;
        return (card: Card) => onCardClick(card);
    }, [onCardClick]);

    const cardCount = items.length;

    /**
     * Handler for drag start - tracks which card is being dragged
     */
    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    /**
     * Handler for drag end - syncs with API/Server
     * Called only when user releases, preventing API spam during drag
     */
    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);

        if (!over || active.id === over.id) {
            return;
        }
        
        const oldIndex = items.findIndex((card) => card.id === active.id);
        const newIndex = items.findIndex((card) => card.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        // Update local state immediately for instant feedback
        const newOrder = arrayMove(items, oldIndex, newIndex);
        setItems(newOrder);

        try {
            // Map the reordered items to the full deck if filteredCards are used
            const fullDeckCards = deck.cards || [];
            
            let finalOrder: string[];
            
            if (filteredCards && filteredCards.length > 0 && filteredCards.length !== fullDeckCards.length) {
                // If we have filtered cards, map the new order to the full deck
                const newOrderIds = newOrder.map(c => c.id);
                const visibleCardIds = filteredCards.map(c => c.id);
                const hiddenCardIds = fullDeckCards
                    .map(c => c.id)
                    .filter(id => !visibleCardIds.includes(id));
                
                // Combine: hidden cards first, then the reordered visible cards
                finalOrder = [...hiddenCardIds, ...newOrderIds];
            } else {
                // Simple case: just use the new order
                finalOrder = newOrder.map(card => card.id);
            }

            // Call API to persist the new order
            const updatedDeck = await studyService.reorderCards(deck.id, finalOrder);
            
            if (onDeckUpdate) {
                onDeckUpdate(updatedDeck);
            }

            emitToast.success('Card riordinata con successo');
        } catch (err: any) {
            console.error('Errore nel riordinamento:', err);
            emitToast.error(err.message || 'Errore nel riordinamento delle card');
            // Revert local state on error
            setItems(filteredCards || deck.cards || []);
        }
    }, [items, deck.id, deck.cards, filteredCards, onDeckUpdate]);

    /**
     * Handler per aprire il form inline di aggiunta card
     * @param position - The index position where the card should be inserted (0-based)
     */
    const handleInsertCard = useCallback((position: number) => {
        // Usa sempre il form inline (sia grid che list view)
        setInsertingIndex(position);
    }, []);


    /**
     * Handler per aprire il modal di eliminazione
     * @param cardId - ID della card da eliminare
     */
    const handleDeleteClick = useCallback((cardId: string) => {
        const card = items.find(c => c.id === cardId);
        if (card) {
            setCardToDelete(card);
            setIsDeleteModalOpen(true);
        }
    }, [items]);

    /**
     * Handler per confermare l'eliminazione della card
     */
    const handleConfirmDelete = useCallback(async () => {
        if (!cardToDelete) return;

        setIsDeleting(true);
        try {
            // Se onDelete è passato come prop, usalo (il parent gestisce l'eliminazione)
            if (onDelete) {
                await onDelete(cardToDelete.id);
            } else {
                // Altrimenti, gestisci l'eliminazione direttamente
                const updatedDeck = await studyService.deleteCard(deck.id, cardToDelete.id);

                if (onDeckUpdate) {
                    onDeckUpdate(updatedDeck);
                }

                emitToast.success('Card eliminata con successo');
            }

            setIsDeleteModalOpen(false);
            setCardToDelete(null);
        } catch (err: any) {
            console.error('Errore nell\'eliminazione:', err);
            emitToast.error(err.message || 'Errore nell\'eliminazione della card');
        } finally {
            setIsDeleting(false);
        }
    }, [cardToDelete, deck.id, onDelete, onDeckUpdate]);

    /**
     * Handler per chiudere il modal di eliminazione
     */
    const handleCloseDeleteModal = useCallback(() => {
        if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setCardToDelete(null);
        }
    }, [isDeleting]);

    /**
     * Handler per il pulsante "+" nell'header - aggiunge card alla fine
     */
    const handleHeaderAddCard = useCallback(() => {
        // In entrambe le viste, usa il form inline
        if (onAddCard) {
            onAddCard();
        } else {
            handleInsertCard(items.length);
        }
    }, [onAddCard, handleInsertCard, items.length]);

    /**
     * Handler per salvare la card dal form inline
     * @param front - Il testo della domanda
     * @param back - Il testo della risposta
     */
    const handleSaveInlineForm = useCallback(async (front: string, back: string) => {
        if (insertingIndex === null) {
            return;
        }

        try {
            const position = insertingIndex;

            // Se ci sono card filtrate, mappa la posizione al deck completo
            let insertPosition = position;
            if (filteredCards && filteredCards.length > 0 && filteredCards.length !== deck.cards.length) {
                const fullDeckCards = deck.cards || [];
                
                if (position === 0) {
                    // Inserisci all'inizio del deck
                    insertPosition = 0;
                } else if (position >= filteredCards.length) {
                    // Inserisci alla fine del deck
                    insertPosition = fullDeckCards.length;
                } else {
                    // Trova la posizione della card precedente nel deck completo
                    const previousCard = filteredCards[position - 1];
                    const previousIndex = fullDeckCards.findIndex(c => c.id === previousCard.id);
                    insertPosition = previousIndex >= 0 ? previousIndex + 1 : fullDeckCards.length;
                }
            }

            // Inserisci la card nella posizione specificata
            const updatedDeck = await studyService.addCardAtPosition(deck.id, {
                front: front.trim(),
                back: back.trim(),
                position: insertPosition,
            });

            if (onDeckUpdate) {
                onDeckUpdate(updatedDeck);
            }

            emitToast.success(`Card aggiunta in posizione ${insertPosition + 1}`);
            
            // Chiudi il form inline
            setInsertingIndex(null);
        } catch (err: any) {
            console.error('Errore nell\'inserimento:', err);
            emitToast.error(err.message || 'Errore nell\'aggiunta della card');
        }
    }, [insertingIndex, deck.id, deck.cards, filteredCards, onDeckUpdate]);

    /**
     * Handler per cancellare il form inline
     */
    const handleCancelInlineForm = useCallback(() => {
        setInsertingIndex(null);
    }, []);


    // State for insert button visibility (list view only)
    const [hoveredInsertPosition, setHoveredInsertPosition] = useState<number | null>(null);

    // Get the active card for DragOverlay
    const activeCard = activeId ? items.find((card) => card.id === activeId) : null;

    return (
        <div className="flex flex-col h-full">
            {showHeader && (
                <div className="px-4 py-3 border-b border-white/[0.08] backdrop-blur-sm flex items-center justify-between flex-shrink-0 gap-2">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-medium">
                        {cardCount} carte
                    </span>
                    <div className="flex items-center gap-2">
                        {/* Pulsante Indietro - Visibile solo se onNavigateBack è fornito */}
                        {onNavigateBack && (
                            <button
                                onClick={onNavigateBack}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/80 hover:text-white shadow-lg rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all duration-300 active:scale-95"
                                aria-label="Torna al mazzo"
                                title="Torna al dettaglio del mazzo"
                            >
                                <FiArrowLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">Indietro</span>
                            </button>
                        )}
                        {/* Fixed "Add Card" button - Nascosto in cinema mode (grid view) */}
                        {viewMode !== 'grid' && (
                    <button
                                onClick={handleHeaderAddCard}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white shadow-lg rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-violet-500/20 hover:from-violet-400 hover:to-fuchsia-400 transition-all duration-300 active:scale-95"
                        aria-label="Aggiungi carta"
                        title="Aggiungi carta"
                    >
                        <FiPlus className="w-4 h-4" />
                    </button>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 p-3 md:p-4 overflow-y-auto overscroll-contain">
                {cardCount === 0 ? (
                    <div 
                        className="rounded-2xl md:rounded-3xl border border-white/[0.08] backdrop-blur-xl p-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                        style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.01) 100%)',
                        }}
                    >
                        <p className="text-sm md:text-base text-slate-400">
                            Nessuna carta ancora. Puoi aggiungerne una mentre leggi il PDF.
                        </p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        {viewMode === 'grid' ? (
                            // GRID VIEW: Use rectSortingStrategy for 2D grid layout
                            <SortableContext
                                items={items.map(card => card.id)}
                                strategy={rectSortingStrategy}
                            >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                    {items.map((card, index) => (
                                        <React.Fragment key={card.id}>
                                            <SortableItem
                                    card={card} 
                                    index={index}
                                    totalCards={cardCount}
                                    onUpdate={onUpdate}
                                    onClick={handleCardClick}
                                                onDelete={onDelete || handleDeleteClick}
                                    viewMode="grid"
                                    onShowSource={onShowSource}
                                    isSourceActive={activeSourceCardId === card.id}
                                />
                                            
                                            {/* Inline form dopo questa card se insertingIndex === index */}
                                            {insertingIndex === index && (
                                                <div className="col-span-full sm:col-span-2 lg:col-span-3">
                                                    <FlashcardInlineForm
                                                        onSave={handleSaveInlineForm}
                                                        onCancel={handleCancelInlineForm}
                                                        position={index}
                                                    />
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    
                                    {/* Inline form alla fine se insertingIndex === items.length */}
                                    {insertingIndex === items.length && (
                                        <div className="col-span-full sm:col-span-2 lg:col-span-3">
                                            <FlashcardInlineForm
                                                onSave={handleSaveInlineForm}
                                                onCancel={handleCancelInlineForm}
                                                position={items.length}
                                            />
                                        </div>
                                    )}
                    </div>
                            </SortableContext>
                ) : (
                            // LIST VIEW: Use verticalListSortingStrategy for vertical stacking
                            <SortableContext
                                items={items.map(card => card.id)}
                                strategy={verticalListSortingStrategy}
                            >
                    <div className="space-y-3 md:space-y-4">
                                    {/* Inline form all'inizio se insertingIndex === 0 */}
                                    {insertingIndex === 0 ? (
                                        <FlashcardInlineForm
                                            onSave={handleSaveInlineForm}
                                            onCancel={handleCancelInlineForm}
                                            position={0}
                                        />
                                    ) : (
                                        /* Insert button at the start */
                        <div
                            className="group/insert"
                                            onMouseEnter={() => setHoveredInsertPosition(0)}
                                            onMouseLeave={() => setHoveredInsertPosition(null)}
                            style={{ minHeight: `${INSERT_BUTTON_HEIGHT}px` }}
                        >
                            <InsertButton
                                position={0}
                                onInsert={handleInsertCard}
                                                isVisible={hoveredInsertPosition === 0 || activeId !== null}
                            />
                        </div>
                                    )}

                                    {items.map((card, index) => (
                                <React.Fragment key={card.id}>
                                            <SortableItem
                                        card={card}
                                        index={index}
                                        totalCards={cardCount}
                                        onUpdate={onUpdate}
                                        onClick={handleCardClick}
                                                onDelete={onDelete || handleDeleteClick}
                                        viewMode="list"
                                        onShowSource={onShowSource}
                                        isSourceActive={activeSourceCardId === card.id}
                                    />

                                            {/* Inline form dopo questa card se insertingIndex === index + 1 */}
                                            {insertingIndex === index + 1 ? (
                                                <FlashcardInlineForm
                                                    onSave={handleSaveInlineForm}
                                                    onCancel={handleCancelInlineForm}
                                                    position={index + 1}
                                                />
                                            ) : (
                                                /* Insert button after each card */
                                    <div
                                        className="group/insert"
                                                    onMouseEnter={() => setHoveredInsertPosition(index + 1)}
                                                    onMouseLeave={() => setHoveredInsertPosition(null)}
                                        style={{ minHeight: `${INSERT_BUTTON_HEIGHT}px` }}
                                    >
                                        <InsertButton
                                            position={index + 1}
                                            onInsert={handleInsertCard}
                                                        isVisible={hoveredInsertPosition === index + 1 || activeId !== null}
                                        />
                                    </div>
                                            )}
                                </React.Fragment>
                            ))}
                                    
                                    {/* Inline form alla fine se insertingIndex === items.length */}
                                    {insertingIndex === items.length ? (
                                        <FlashcardInlineForm
                                            onSave={handleSaveInlineForm}
                                            onCancel={handleCancelInlineForm}
                                            position={items.length}
                                        />
                                    ) : (
                                        /* Insert button alla fine se non c'è form inline */
                                        <div
                                            className="group/insert"
                                            onMouseEnter={() => setHoveredInsertPosition(items.length)}
                                            onMouseLeave={() => setHoveredInsertPosition(null)}
                                            style={{ minHeight: `${INSERT_BUTTON_HEIGHT}px` }}
                                        >
                                            <InsertButton
                                                position={items.length}
                                                onInsert={handleInsertCard}
                                                isVisible={hoveredInsertPosition === items.length || activeId !== null}
                                            />
                                        </div>
                                    )}
                                </div>
                            </SortableContext>
                        )}

                        {/* DragOverlay: iOS-style lifted card with physics */}
                        <DragOverlay
                            style={{
                                zIndex: 9999,
                            }}
                        >
                            {activeCard ? (
                                <div
                                    className="scale-110 rotate-3 shadow-2xl cursor-grabbing transition-all duration-200 ease-out"
                                    style={{
                                        // Deep, soft iOS-style shadow with violet tint
                                        boxShadow: '0 25px 50px -12px rgba(139, 92, 246, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                                        // Additional depth with filter
                                        filter: 'drop-shadow(0 30px 60px -15px rgba(0, 0, 0, 0.4))',
                                    }}
                                >
                                    {viewMode === 'grid' ? (
                                        <FlashcardItem
                                            card={activeCard}
                                            onUpdate={onUpdate}
                                            onClick={handleCardClick}
                                            onDelete={onDelete}
                                            onShowSource={onShowSource}
                                            isSourceActive={activeSourceCardId === activeCard.id}
                                        />
                                    ) : (
                                        <div className="flex items-start gap-3">
                                            <div className="flex flex-col items-center gap-2 pt-1 flex-shrink-0 opacity-50">
                                                <div className="p-1 text-white/20">
                                                    <svg
                                                        className="w-4 h-4"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <circle cx="9" cy="5" r="1" />
                                                        <circle cx="9" cy="12" r="1" />
                                                        <circle cx="9" cy="19" r="1" />
                                                        <circle cx="15" cy="5" r="1" />
                                                        <circle cx="15" cy="12" r="1" />
                                                        <circle cx="15" cy="19" r="1" />
                                                    </svg>
                                                </div>
                                                <span className="text-xs font-medium text-white/30 select-none">
                                                    #{items.findIndex(c => c.id === activeCard.id) + 1}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <FlashcardItem
                                                    card={activeCard}
                                                    onUpdate={onUpdate}
                                                    onClick={handleCardClick}
                                                    onDelete={onDelete}
                                                    onShowSource={onShowSource}
                                                    isSourceActive={activeSourceCardId === activeCard.id}
                                                />
                                            </div>
                                        </div>
                                    )}
                    </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}

                {/* Add Card Modal - Rimosso, ora usiamo sempre il form inline */}

                {/* Delete Card Modal */}
                <DeleteCardModal
                    isOpen={isDeleteModalOpen}
                    onClose={handleCloseDeleteModal}
                    onConfirm={handleConfirmDelete}
                    card={cardToDelete}
                    isDeleting={isDeleting}
                />
            </div>
        </div>
    );
};

export default FlashcardList;
