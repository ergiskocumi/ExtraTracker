/**
 * 🎴 FLASHCARD LIST - Lista di Card con Drag & Drop e Inserimento Posizionale
 * ============================================================================
 * 
 * Componente principale per la visualizzazione e manipolazione delle flashcard.
 * Supporta due modalità di visualizzazione: lista verticale e griglia quadrata.
 * 
 * Funzionalità principali:
 * - Numerazione delle card (visibile ma discreta, solo su hover in grid)
 * - Drag & Drop per riordinare le card con scambio visivo immediato
 * - Inserimento di nuove card in posizione specifica tramite pulsante +
 * - Supporto per card filtrate (mantiene l'ordine del deck completo)
 * 
 * Drag & Drop:
 * - Vista Grid: scambio visivo immediato quando si passa sopra un'altra card
 * - Vista List: inserimento posizionale basato sulla posizione del mouse
 * - Animazione fluida con scale e opacità durante il drag
 * 
 * Clean Code Principles:
 * - Single Responsibility: gestisce solo la lista e l'ordinamento
 * - Separation of Concerns: logica di business separata dalla presentazione
 * - Error Handling: gestione errori centralizzata
 * - State Management: stato locale per scambio visivo durante drag
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { FiPlus, FiArrowLeft } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import type { Deck, Card } from '../../services/studyService';
import { FlashcardItem } from './FlashcardItem';
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

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Icona personalizzata per il drag handle
 * Rappresenta visivamente la possibilità di trascinare l'elemento
 */
const DragHandleIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg
        className={className}
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
);

/**
 * Pulsante per inserire una card in una posizione specifica
 * Appare tra due card quando si passa il mouse sopra o durante il drag
 * Ha un effetto "risucchio" quando viene trascinata una card sopra
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

/**
 * Card Item con supporto per drag & drop e numerazione
 * 
 * Gestisce:
 * - Drag & Drop HTML5 nativo per riordinare le card
 * - Visualizzazione del numero di posizione (discreto ma visibile)
 * - Feedback visivo durante il drag
 */
interface DraggableCardItemProps {
    card: Card;
    index: number;
    totalCards: number;
    isDragging: boolean;
    onUpdate: (cardId: string, front: string, back: string) => Promise<void>;
    onClick?: (card: Card) => void;
    onDelete?: (cardId: string) => void;
    onDragStart: (e: React.DragEvent, cardId: string, index: number) => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDrop: (e: React.DragEvent, targetIndex: number) => void;
    viewMode?: 'list' | 'grid';
}

const DraggableCardItem: React.FC<DraggableCardItemProps> = ({
    card,
    index,
    totalCards,
    isDragging,
    onUpdate,
    onClick,
    onDelete,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    viewMode = 'list',
}) => {
    /**
     * Handler per iniziare il drag
     * Configura i dati del drag e l'immagine fantasma
     */
    const handleDragStart = useCallback((e: React.DragEvent) => {
        onDragStart(e, card.id, index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.id);
        
        // Crea un'immagine fantasma personalizzata più piccola e visibile
        const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
        dragImage.style.opacity = '1';
        dragImage.style.transform = 'scale(0.7) rotate(2deg)';
        dragImage.style.pointerEvents = 'none';
        dragImage.style.width = `${e.currentTarget.clientWidth}px`;
        dragImage.style.height = `${e.currentTarget.clientHeight}px`;
        document.body.appendChild(dragImage);
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        dragImage.style.left = '-1000px';
        e.dataTransfer.setDragImage(dragImage, e.currentTarget.clientWidth / 2, e.currentTarget.clientHeight / 2);
        setTimeout(() => {
            if (document.body.contains(dragImage)) {
                document.body.removeChild(dragImage);
            }
        }, 0);
    }, [card.id, index, onDragStart]);

    /**
     * Handler per drag over - permette il drop
     */
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(e, index);
    }, [index, onDragOver]);

    /**
     * Handler per drop - gestisce il riordinamento
     */
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(e, index);
    }, [index, onDrop]);

    // Per la vista grid, le card sono direttamente draggable senza wrapper
    // Layout identico alla foto: card quadrate senza elementi extra visibili
    if (viewMode === 'grid') {
        return (
            <motion.div
                draggable
                onDragStart={handleDragStart}
                onDragEnd={onDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="group relative cursor-grab active:cursor-grabbing"
                animate={{
                    scale: isDragging ? 0.7 : 1,
                    opacity: isDragging ? 1 : 1,
                }}
                transition={{
                    duration: 0.2,
                    ease: 'easeOut',
                }}
                layout
            >
                {/* Numero card in modalità grid - discreto, in alto a sinistra, visibile solo su hover */}
                <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-xs font-medium text-white/30 bg-black/30 px-2 py-1 rounded-full select-none">
                        #{index + 1}
                    </span>
                </div>
                <FlashcardItem
                    card={card}
                    onUpdate={onUpdate}
                    onClick={onClick}
                    onDelete={onDelete}
                />
            </motion.div>
        );
    }

    // Per la vista list, mantieni il layout con drag handle
    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="group relative cursor-grab active:cursor-grabbing"
        >
            <motion.div
                animate={{
                    scale: isDragging ? 0.7 : 1,
                    opacity: isDragging ? 1 : 1,
                }}
                transition={{
                    duration: 0.2,
                    ease: 'easeOut',
                }}
                className="flex items-start gap-3"
            >
                {/* Drag Handle e Numero */}
                <div className="flex flex-col items-center gap-2 pt-1 flex-shrink-0">
                    <button
                        type="button"
                        className="cursor-grab active:cursor-grabbing p-1 text-white/30 hover:text-white/60 transition-colors touch-none"
                        aria-label="Trascina per riordinare"
                        title="Trascina per riordinare"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <DragHandleIcon className="w-4 h-4" />
                    </button>
                    {/* Numero card - discreto ma visibile */}
                    <span className="text-xs font-medium text-white/40 select-none">
                        #{index + 1}
                    </span>
                </div>

                {/* Card Content */}
                <div className="flex-1 min-w-0">
                    <FlashcardItem
                        card={card}
                        onUpdate={onUpdate}
                        onClick={onClick}
                        onDelete={onDelete}
                    />
                </div>
            </motion.div>
        </div>
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
}) => {
    // State per drag & drop
    const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [hoveredInsertPosition, setHoveredInsertPosition] = useState<number | null>(null);
    const [isReordering, setIsReordering] = useState(false);
    /** Stato locale per l'ordine delle card durante il drag - permette scambio visivo immediato */
    const [localCardOrder, setLocalCardOrder] = useState<Card[] | null>(null);

    // Memoize cards array per evitare re-render inutili
    // Usa filteredCards se fornito, altrimenti deck.cards
    // Durante il drag, usa l'ordine locale per lo scambio visivo
    const cards = useMemo(() => {
        // Se c'è un ordine locale (durante drag), usalo per lo scambio visivo
        if (localCardOrder) {
            return localCardOrder;
        }
        // Altrimenti usa l'ordine normale
        if (filteredCards) {
            return filteredCards;
        }
        return deck.cards || [];
    }, [deck.cards, filteredCards, localCardOrder]);
    const cardCount = cards.length;

    // Memoize callback per evitare re-render delle card
    const handleCardClick = useMemo(() => {
        if (!onCardClick) return undefined;
        return (card: Card) => onCardClick(card);
    }, [onCardClick]);

    /**
     * Handler per iniziare il drag di una card
     * Inizializza l'ordine locale per permettere lo scambio visivo
     */
    const handleDragStart = useCallback((e: React.DragEvent, cardId: string, index: number) => {
        setDraggedCardId(cardId);
        setDraggedIndex(index);
        setIsReordering(true);
        // Inizializza l'ordine locale con l'ordine attuale
        const currentCards = filteredCards || deck.cards || [];
        setLocalCardOrder([...currentCards]);
    }, [deck.cards, filteredCards]);

    /**
     * Handler per terminare il drag
     * Resetta lo stato e ripristina l'ordine normale
     */
    const handleDragEnd = useCallback(() => {
        setDraggedCardId(null);
        setDraggedIndex(null);
        setIsReordering(false);
        setHoveredInsertPosition(null);
        // Ripristina l'ordine normale dopo un breve delay per permettere l'animazione
        setTimeout(() => {
            setLocalCardOrder(null);
        }, 100);
    }, []);

    /**
     * Handler per drag over - gestisce il feedback visivo durante il drag
     * Implementa lo scambio visivo immediato: quando si passa sopra una card,
     * quella card si sposta nella posizione della card trascinata
     * 
     * @param e - Evento drag
     * @param index - Indice della card su cui si sta passando
     */
    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (draggedIndex === null || draggedIndex === index || !localCardOrder) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }
        
        e.dataTransfer.dropEffect = 'move';
        
        // Per la vista grid, scambia direttamente le card quando si passa sopra
        if (viewMode === 'grid') {
            // Crea un nuovo array con le card scambiate
            const newOrder = [...localCardOrder];
            const draggedCard = newOrder[draggedIndex];
            const targetCard = newOrder[index];
            
            // Scambia le card
            newOrder[draggedIndex] = targetCard;
            newOrder[index] = draggedCard;
            
            // Aggiorna l'ordine locale solo se è diverso
            if (JSON.stringify(newOrder) !== JSON.stringify(localCardOrder)) {
                setLocalCardOrder(newOrder);
                // Aggiorna anche l'indice trascinato per riflettere la nuova posizione
                setDraggedIndex(index);
            }
        } else {
            // Per la vista list, usa la logica originale con posizione di inserimento
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const mouseY = e.clientY;
            const cardCenterY = rect.top + rect.height / 2;
            const insertPosition = mouseY < cardCenterY ? index : index + 1;
            setHoveredInsertPosition(insertPosition);
        }
    }, [draggedIndex, localCardOrder, viewMode]);

    /**
     * Handler per drop - riordina le card
     * Gestisce il riordinamento quando una card viene rilasciata su un'altra
     * 
     * Per la vista grid: usa l'ordine locale già calcolato durante il drag
     * Per la vista list: calcola la posizione basata sulla posizione del mouse
     * 
     * Nota: Usa sempre deck.cards per il riordinamento finale, anche se vengono mostrate card filtrate.
     * Questo garantisce che l'ordine del deck completo sia mantenuto correttamente.
     */
    const handleDrop = useCallback(async (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        e.stopPropagation();

        if (draggedIndex === null || draggedCardId === null) {
            handleDragEnd();
            return;
        }

        // Se la posizione è la stessa, non fare nulla
        if (draggedIndex === targetIndex && viewMode === 'grid') {
            handleDragEnd();
            return;
        }

        try {
            setIsReordering(true);

            // Usa sempre deck.cards per il riordinamento finale (non le card filtrate)
            const fullDeckCards = deck.cards || [];
            
            let finalOrder: string[];
            
            if (viewMode === 'grid' && localCardOrder) {
                // Per la vista grid, usa l'ordine locale già calcolato
                // Mappa l'ordine locale al deck completo
                const localOrderIds = localCardOrder.map(c => c.id);
                const fullOrderIds = fullDeckCards.map(c => c.id);
                
                // Mantieni l'ordine delle card non visibili, inserisci l'ordine locale per quelle visibili
                const visibleCardIds = (filteredCards || deck.cards || []).map(c => c.id);
                const hiddenCardIds = fullOrderIds.filter(id => !visibleCardIds.includes(id));
                
                // Combina: prima le card nascoste, poi l'ordine locale
                finalOrder = [...hiddenCardIds, ...localOrderIds];
            } else {
                // Per la vista list, calcola la posizione basata sul mouse
                const draggedCard = cards[draggedIndex];
                const targetCard = cards[targetIndex];
                
                const realDraggedIndex = fullDeckCards.findIndex(c => c.id === draggedCard.id);
                const realTargetIndex = fullDeckCards.findIndex(c => c.id === targetCard.id);

                if (realDraggedIndex === -1 || realTargetIndex === -1) {
                    handleDragEnd();
                    return;
                }

                // Calcola la nuova posizione basata sulla posizione del mouse
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const mouseY = e.clientY;
                const cardCenterY = rect.top + rect.height / 2;
                const finalTargetIndex = mouseY < cardCenterY ? realTargetIndex : realTargetIndex + 1;

                // Evita di riordinare se la posizione è la stessa
                if (realDraggedIndex === finalTargetIndex) {
                    handleDragEnd();
                    return;
                }

                // Crea il nuovo array riordinato usando il deck completo
                const newCards = [...fullDeckCards];
                const [removed] = newCards.splice(realDraggedIndex, 1);
                
                // Calcola l'indice di inserimento corretto
                let insertIndex = finalTargetIndex;
                if (finalTargetIndex > realDraggedIndex) {
                    insertIndex = finalTargetIndex - 1;
                }
                
                // Assicurati che l'indice sia valido
                insertIndex = Math.max(0, Math.min(insertIndex, newCards.length));
                newCards.splice(insertIndex, 0, removed);

                // Estrai gli IDs nell'ordine corretto
                finalOrder = newCards.map(card => card.id);
            }

            // Chiama l'API per riordinare
            const updatedDeck = await studyService.reorderCards(deck.id, finalOrder);
            
            if (onDeckUpdate) {
                onDeckUpdate(updatedDeck);
            }

            emitToast.success('Card riordinata con successo');
        } catch (err: any) {
            console.error('Errore nel riordinamento:', err);
            emitToast.error(err.message || 'Errore nel riordinamento delle card');
        } finally {
            handleDragEnd();
            setHoveredInsertPosition(null);
        }
    }, [cards, deck.cards, deck.id, draggedIndex, draggedCardId, localCardOrder, viewMode, filteredCards, onDeckUpdate, handleDragEnd]);

    /**
     * Handler per inserire una card in una posizione specifica
     * 
     * Nota: Se vengono mostrate card filtrate, la posizione viene mappata al deck completo.
     * Se la posizione è 0 o alla fine delle card filtrate, inserisce all'inizio o alla fine del deck.
     */
    const handleInsertCard = useCallback(async (position: number) => {
        try {
            // Chiedi all'utente i dati della card
            const front = window.prompt('Domanda:');
            if (!front?.trim()) return;

            const back = window.prompt('Risposta:');
            if (!back?.trim()) return;

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
        } catch (err: any) {
            console.error('Errore nell\'inserimento:', err);
            emitToast.error(err.message || 'Errore nell\'aggiunta della card');
        }
    }, [deck.id, deck.cards, filteredCards, onDeckUpdate]);

    /**
     * Handler per hover su area di inserimento
     * Durante il drag, mostra sempre l'area di inserimento per effetto "risucchio"
     */
    const handleInsertAreaHover = useCallback((position: number) => {
        setHoveredInsertPosition(position);
    }, []);

    const handleInsertAreaLeave = useCallback(() => {
        // Non nascondere durante il drag per mantenere l'effetto "risucchio"
        if (!isReordering) {
            setHoveredInsertPosition(null);
        }
    }, [isReordering]);

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
                    <button
                        onClick={onAddCard}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white shadow-lg rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-violet-500/20 hover:from-violet-400 hover:to-fuchsia-400 transition-all duration-300 active:scale-95"
                        aria-label="Aggiungi carta"
                        title="Aggiungi carta"
                    >
                        <FiPlus className="w-4 h-4" />
                    </button>
                    </div>
                </div>
            )}

            <div className="flex-1 p-3 md:p-4 overflow-y-auto overscroll-contain">
                {cardCount === 0 ? (
                    <div className="rounded-2xl md:rounded-3xl border border-white/[0.08] backdrop-blur-xl p-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                        style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.01) 100%)',
                        }}
                    >
                        <p className="text-sm md:text-base text-slate-400">
                            Nessuna carta ancora. Puoi aggiungerne una mentre leggi il PDF.
                        </p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        <AnimatePresence mode="popLayout">
                            {cards.map((card, index) => (
                                <DraggableCardItem
                                    key={card.id} 
                                    card={card} 
                                    index={index}
                                    totalCards={cardCount}
                                    isDragging={draggedCardId === card.id}
                                    onUpdate={onUpdate}
                                    onClick={handleCardClick}
                                    onDelete={onDelete}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    viewMode="grid"
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="space-y-3 md:space-y-4">
                        {/* Pulsante inserimento all'inizio */}
                        <div
                            className="group/insert"
                            onMouseEnter={() => handleInsertAreaHover(0)}
                            onMouseLeave={handleInsertAreaLeave}
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (isReordering) {
                                    handleInsertAreaHover(0);
                                }
                            }}
                            onDragLeave={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                    handleInsertAreaLeave();
                                }
                            }}
                            style={{ minHeight: `${INSERT_BUTTON_HEIGHT}px` }}
                        >
                            <InsertButton
                                position={0}
                                onInsert={handleInsertCard}
                                isVisible={hoveredInsertPosition === 0 || isReordering}
                            />
                        </div>

                        <AnimatePresence mode="popLayout">
                            {cards.map((card, index) => (
                                <React.Fragment key={card.id}>
                                    <DraggableCardItem
                                        card={card}
                                        index={index}
                                        totalCards={cardCount}
                                        isDragging={draggedCardId === card.id}
                                        onUpdate={onUpdate}
                                        onClick={handleCardClick}
                                        onDelete={onDelete}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        viewMode="list"
                                    />

                                    {/* Pulsante inserimento dopo ogni card */}
                                    <div
                                        className="group/insert"
                                        onMouseEnter={() => handleInsertAreaHover(index + 1)}
                                        onMouseLeave={handleInsertAreaLeave}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            if (isReordering) {
                                                handleInsertAreaHover(index + 1);
                                            }
                                        }}
                                        onDragLeave={(e) => {
                                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                                handleInsertAreaLeave();
                                            }
                                        }}
                                        style={{ minHeight: `${INSERT_BUTTON_HEIGHT}px` }}
                                    >
                                        <InsertButton
                                            position={index + 1}
                                            onInsert={handleInsertCard}
                                            isVisible={hoveredInsertPosition === index + 1 || isReordering}
                                        />
                                    </div>
                                </React.Fragment>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FlashcardList;
