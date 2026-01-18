/**
 * 🎴 FLASHCARD LIST - Main Component
 * ==================================
 * 
 * iOS-Style Sortable List/Grid with dnd-kit.
 * 
 * Features:
 * - Drag & drop reordering with @dnd-kit
 * - Grid and List view modes
 * - Inline card insertion
 * - Source navigation support
 * 
 * @module FlashcardList
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
} from '@dnd-kit/sortable';
import type { Deck, Card } from '../../services/studyService';
import { studyService } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';
import { SortableItem } from './SortableItem';
import { FlashcardInlineForm } from './FlashcardInlineForm';
import { DeleteCardModal } from './DeleteCardModal';
import { DRAG_AND_DROP, VIEW_MODE, TEXT_CONTENT, CONTENT_STYLES, GRID_STYLES, LIST_STYLES } from './FlashcardList.constants';
import { haveCardIdsChanged, calculateReorderResult, calculateInsertPosition, findCardById } from './FlashcardList.utils';
import type { FlashcardListProps } from './FlashcardList.types';
import { InsertButton } from './FlashcardList.InsertButton';
import { Header } from './FlashcardList.Header';
import { EmptyState } from './FlashcardList.EmptyState';
import { DragOverlayContent } from './FlashcardList.DragOverlay';

// ============================================
// COMPONENT
// ============================================

/**
 * FlashcardList Component
 * 
 * Displays a sortable list or grid of flashcards with drag & drop support.
 * 
 * @param props - Component props
 * @returns FlashcardList component
 */
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
    viewMode = VIEW_MODE.list,
    onShowSource,
    activeSourceCardId,
}) => {
    // ============================================
    // STATE
    // ============================================

    const [items, setItems] = useState<Card[]>(() => {
        return filteredCards || deck.cards || [];
    });

    const [activeId, setActiveId] = useState<string | null>(null);
    const [insertingIndex, setInsertingIndex] = useState<number | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [hoveredInsertPosition, setHoveredInsertPosition] = useState<number | null>(null);

    // ============================================
    // EFFECTS
    // ============================================

    /**
     * Syncs local state when deck or filteredCards change (but not during drag).
     */
    useEffect(() => {
        const newCards = filteredCards || deck.cards || [];
        
        if (haveCardIdsChanged(items, newCards) && !activeId) {
            setItems(newCards);
        }
    }, [deck.cards, filteredCards, activeId, items]);

    // ============================================
    // SENSORS CONFIGURATION
    // ============================================

    /**
     * Configures drag sensors with activation constraints.
     * Prevents accidental drags when clicking (requires movement).
     */
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: DRAG_AND_DROP.activationDistance,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: DRAG_AND_DROP.touchDelay,
                tolerance: DRAG_AND_DROP.activationDistance,
            },
        }),
        useSensor(KeyboardSensor)
    );

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const cardCount = items.length;
    const activeCard = useMemo(() => {
        return activeId ? findCardById(items, activeId) : null;
    }, [activeId, items]);

    // Sorting strategy is determined inline in render methods

    // ============================================
    // EVENT HANDLERS
    // ============================================

    /**
     * Handles drag start - tracks which card is being dragged.
     */
    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    /**
     * Handles drag end - syncs with API/Server.
     * Called only when user releases, preventing API spam during drag.
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

        try {
            const fullDeckCards = deck.cards || [];
            const { finalOrder, newOrder } = calculateReorderResult(
                items,
                oldIndex,
                newIndex,
                fullDeckCards,
                filteredCards
            );

            // Update local state immediately for instant feedback
            setItems(newOrder);

            // Call API to persist the new order
            const updatedDeck = await studyService.reorderCards(deck.id, finalOrder);

            if (onDeckUpdate) {
                onDeckUpdate(updatedDeck);
            }

            emitToast.success(TEXT_CONTENT.toast.reorderSuccess);
        } catch (error) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : TEXT_CONTENT.toast.reorderError;
            
            console.error('[FlashcardList] Errore nel riordinamento:', error);
            emitToast.error(errorMessage);
            
            // Revert local state on error
            setItems(filteredCards || deck.cards || []);
        }
    }, [items, deck.id, deck.cards, filteredCards, onDeckUpdate]);

    /**
     * Opens inline form for inserting a card at specific position.
     */
    const handleInsertCard = useCallback((position: number) => {
        setInsertingIndex(position);
    }, []);

    /**
     * Opens delete confirmation modal.
     */
    const handleDeleteClick = useCallback((cardId: string) => {
        const card = findCardById(items, cardId);
        if (card) {
            setCardToDelete(card);
            setIsDeleteModalOpen(true);
        }
    }, [items]);

    /**
     * Confirms card deletion.
     */
    const handleConfirmDelete = useCallback(async () => {
        if (!cardToDelete) return;

        setIsDeleting(true);
        try {
            if (onDelete) {
                await onDelete(cardToDelete.id);
            } else {
                const updatedDeck = await studyService.deleteCard(deck.id, cardToDelete.id);

                if (onDeckUpdate) {
                    onDeckUpdate(updatedDeck);
                }

                emitToast.success(TEXT_CONTENT.toast.deleteSuccess);
            }

            setIsDeleteModalOpen(false);
            setCardToDelete(null);
        } catch (error) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : TEXT_CONTENT.toast.deleteError;
            
            console.error('[FlashcardList] Errore nell\'eliminazione:', error);
            emitToast.error(errorMessage);
        } finally {
            setIsDeleting(false);
        }
    }, [cardToDelete, deck.id, onDelete, onDeckUpdate]);

    /**
     * Closes delete confirmation modal.
     */
    const handleCloseDeleteModal = useCallback(() => {
        if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setCardToDelete(null);
        }
    }, [isDeleting]);

    /**
     * Handles header add card button - adds card at the end.
     */
    const handleHeaderAddCard = useCallback(() => {
        if (onAddCard) {
            onAddCard();
        } else {
            handleInsertCard(items.length);
        }
    }, [onAddCard, handleInsertCard, items.length]);

    /**
     * Saves card from inline form.
     */
    const handleSaveInlineForm = useCallback(async (front: string, back: string) => {
        if (insertingIndex === null) return;

        try {
            const insertPosition = calculateInsertPosition(
                insertingIndex,
                filteredCards,
                deck.cards || []
            );

            const updatedDeck = await studyService.addCardAtPosition(deck.id, {
                front: front.trim(),
                back: back.trim(),
                position: insertPosition,
            });

            if (onDeckUpdate) {
                onDeckUpdate(updatedDeck);
            }

            emitToast.success(TEXT_CONTENT.toast.addSuccess(insertPosition));
            setInsertingIndex(null);
        } catch (error) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : TEXT_CONTENT.toast.addError;
            
            console.error('[FlashcardList] Errore nell\'inserimento:', error);
            emitToast.error(errorMessage);
        }
    }, [insertingIndex, deck.id, deck.cards, filteredCards, onDeckUpdate]);

    /**
     * Cancels inline form.
     */
    const handleCancelInlineForm = useCallback(() => {
        setInsertingIndex(null);
    }, []);

    // ============================================
    // RENDER HELPERS
    // ============================================

    /**
     * Renders grid view with sortable items.
     */
    const renderGridView = () => (
        <SortableContext
            items={items.map(card => card.id)}
            strategy={rectSortingStrategy}
        >
            <div className={GRID_STYLES.container}>
                {items.map((card, index) => (
                    <React.Fragment key={card.id}>
                        <SortableItem
                            card={card}
                            index={index}
                            totalCards={cardCount}
                            onUpdate={onUpdate}
                            onClick={onCardClick}
                            onDelete={onDelete || handleDeleteClick}
                            viewMode="grid"
                            onShowSource={onShowSource}
                            isSourceActive={activeSourceCardId === card.id}
                        />
                        {insertingIndex === index && (
                            <div className={GRID_STYLES.fullSpan}>
                                <FlashcardInlineForm
                                    onSave={handleSaveInlineForm}
                                    onCancel={handleCancelInlineForm}
                                    position={index}
                                />
                            </div>
                        )}
                    </React.Fragment>
                ))}
                {insertingIndex === items.length && (
                    <div className={GRID_STYLES.fullSpan}>
                        <FlashcardInlineForm
                            onSave={handleSaveInlineForm}
                            onCancel={handleCancelInlineForm}
                            position={items.length}
                        />
                    </div>
                )}
            </div>
        </SortableContext>
    );

    /**
     * Renders list view with sortable items and insert buttons.
     */
    const renderListView = () => (
        <SortableContext
            items={items.map(card => card.id)}
            strategy={verticalListSortingStrategy}
        >
            <div className={LIST_STYLES.container}>
                {insertingIndex === 0 ? (
                    <FlashcardInlineForm
                        onSave={handleSaveInlineForm}
                        onCancel={handleCancelInlineForm}
                        position={0}
                    />
                ) : (
                    <div
                        className={LIST_STYLES.insertButtonGroup}
                        onMouseEnter={() => setHoveredInsertPosition(0)}
                        onMouseLeave={() => setHoveredInsertPosition(null)}
                        style={{ minHeight: `${DRAG_AND_DROP.insertButtonHeight}px` }}
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
                            onClick={onCardClick}
                            onDelete={onDelete || handleDeleteClick}
                            viewMode="list"
                            onShowSource={onShowSource}
                            isSourceActive={activeSourceCardId === card.id}
                        />
                        {insertingIndex === index + 1 ? (
                            <FlashcardInlineForm
                                onSave={handleSaveInlineForm}
                                onCancel={handleCancelInlineForm}
                                position={index + 1}
                            />
                        ) : (
                            <div
                                className={LIST_STYLES.insertButtonGroup}
                                onMouseEnter={() => setHoveredInsertPosition(index + 1)}
                                onMouseLeave={() => setHoveredInsertPosition(null)}
                                style={{ minHeight: `${DRAG_AND_DROP.insertButtonHeight}px` }}
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

                {insertingIndex === items.length ? (
                    <FlashcardInlineForm
                        onSave={handleSaveInlineForm}
                        onCancel={handleCancelInlineForm}
                        position={items.length}
                    />
                ) : (
                    <div
                        className={LIST_STYLES.insertButtonGroup}
                        onMouseEnter={() => setHoveredInsertPosition(items.length)}
                        onMouseLeave={() => setHoveredInsertPosition(null)}
                        style={{ minHeight: `${DRAG_AND_DROP.insertButtonHeight}px` }}
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
    );

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="flex flex-col h-full">
            {showHeader && (
                <Header
                    cardCount={cardCount}
                    showBackButton={Boolean(onNavigateBack)}
                    showAddButton={viewMode !== VIEW_MODE.grid}
                    onNavigateBack={onNavigateBack}
                    onAddCard={handleHeaderAddCard}
                />
            )}

            <div className={`${CONTENT_STYLES.container.flex} ${CONTENT_STYLES.container.padding} ${CONTENT_STYLES.container.overflow}`}>
                {cardCount === 0 ? (
                    <EmptyState message={TEXT_CONTENT.emptyState.message} />
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        {viewMode === VIEW_MODE.grid ? renderGridView() : renderListView()}

                        <DragOverlay
                            style={{ zIndex: DRAG_AND_DROP.dragOverlayZIndex }}
                        >
                            {activeCard ? (
                                <DragOverlayContent
                                    card={activeCard}
                                    viewMode={viewMode}
                                    items={items}
                                    onUpdate={onUpdate}
                                    onCardClick={onCardClick}
                                    onDelete={onDelete}
                                    onShowSource={onShowSource}
                                    isSourceActive={activeSourceCardId === activeCard.id}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}

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
