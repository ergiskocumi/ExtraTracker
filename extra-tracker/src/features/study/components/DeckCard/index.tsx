import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import type { Deck, Tag } from '../../services/studyService';
import { getDeckTheme } from './utils/deckTheme';
import { DeckCardMenu } from './DeckCardMenu';
import { DeckCardHeader } from './DeckCardHeader';
import { DeckCardProgress } from './DeckCardProgress';
import { DeckCardActions } from './DeckCardActions';

export interface DeckCardProps {
    deck: Deck;
    onStudy: (deckId: string) => void;
    onRead?: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
    onExamSolver?: (deckId: string) => void;
    onUpdate: (deck: Deck) => void;
    tags?: Tag[];
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onTogglePin?: (deck: Deck) => void;
}

/**
 * Componente principale DeckCard
 *
 * Gestisce la visualizzazione e l'interazione con un deck di flashcard.
 * Supporta drag & drop, menu contestuale, e tutte le azioni principali.
 * Ottimizzato con React.memo per prevenire re-render non necessari.
 *
 * @param props - Le props del componente (vedi DeckCardProps)
 * @returns Il componente DeckCard renderizzato
 */
const DeckCardComponent: React.FC<DeckCardProps> = ({
    deck,
    onStudy,
    onRead,
    onMagicGenerate,
    onAddCard,
    onViewDetail,
    onDelete,
    onUpdate,
    onExamSolver,
    tags = [],
    onDragStart: onDragStartProp,
    onDragEnd: onDragEndProp,
    onTogglePin,
}) => {
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    
    /**
     * Indica se il menu contestuale è aperto o chiuso.
     * Il menu può essere aperto cliccando sui tre puntini o con click destro.
     */
    const [showMenu, setShowMenu] = useState(false);
    
    /**
     * Indica se il deck è attualmente in fase di drag.
     * Usato per applicare animazioni durante il trascinamento.
     */
    const [isDragging, setIsDragging] = useState(false);
    
    // ============================================
    // COMPUTED VALUES
    // ============================================
    
    /**
     * Verifica se ci sono carte da ripassare.
     * Le carte da ripassare sono quelle che hanno superato la data
     * di prossima revisione secondo l'algoritmo di spaced repetition.
     */
    const hasDueCards = (deck.dueCount ?? 0) > 0;
    
    /**
     * Numero totale di carte nel deck.
     * Usa totalCards se disponibile, altrimenti conta le carte nell'array.
     */
    const totalCards = deck.totalCards ?? deck.cards?.length ?? 0;
    
    /**
     * Numero di carte padroneggiate (status === 'mastered').
     * Usato per calcolare la percentuale di padronanza.
     */
    const masteredCards = deck.cards?.filter(c => c.status === 'mastered').length ?? 0;
    
    /**
     * Percentuale di padronanza del deck.
     * Calcolata come (carte padroneggiate / totale carte) * 100.
     * Mostrata nella progress bar e nelle statistiche.
     */
    const masteryPercent = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;
    
    /**
     * Indica se il deck ha un PDF associato.
     * Se presente, mostra badge e abilita funzionalità specifiche (es. Cinema Mode).
     */
    const hasPdf = !!deck.pdfUrl;
    
    /**
     * Tema visivo del deck, calcolato in base al titolo.
     * Include colori, gradienti e icone personalizzate per ogni deck.
     * Il tema viene memorizzato per evitare ricalcoli inutili.
     */
    const theme = useMemo(() => getDeckTheme(deck), [deck.title]);

    // ============================================
    // EVENT HANDLERS
    // ============================================
    
    /**
     * Gestisce l'inizio del drag & drop del deck.
     *
     * Crea un'anteprima personalizzata che segue il cursore durante il drag,
     * impostando i dati necessari per il drop e notificando il componente padre.
     *
     * L'anteprima viene creata dinamicamente e rimossa dopo il drag per
     * evitare memory leak.
     *
     * Memoizzato con useCallback per stabilizzare il riferimento.
     *
     * @param e - L'evento di drag start
     */
    const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        // Imposta l'effetto del drag (solo spostamento, non copia)
        e.dataTransfer.effectAllowed = 'move';
        
        // Salva l'ID del deck nei dati del drag per permettere al drop target
        // di identificare quale deck sta venendo spostato
        e.dataTransfer.setData('deckId', deck.id);
        e.dataTransfer.setData('text/plain', deck.id);
        
        // Crea un'anteprima personalizzata per il drag
        // Questa anteprima viene mostrata mentre si trascina il deck
        const dragPreview = document.createElement('div');
        dragPreview.style.position = 'absolute';
        dragPreview.style.top = '-1000px'; // Posizionata fuori schermo
        dragPreview.style.width = '200px';
        dragPreview.style.padding = '12px';
        dragPreview.style.background = 'rgba(139, 92, 246, 0.95)';
        dragPreview.style.borderRadius = '12px';
        dragPreview.style.border = '2px solid rgba(167, 139, 250, 0.8)';
        dragPreview.style.boxShadow = '0 10px 40px rgba(139, 92, 246, 0.4)';
        dragPreview.style.backdropFilter = 'blur(10px)';
        dragPreview.style.color = 'white';
        dragPreview.style.fontSize = '14px';
        dragPreview.style.fontWeight = '600';
        dragPreview.style.textAlign = 'center';
        dragPreview.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
                <span>📚</span>
                <span>${deck.title}</span>
            </div>
            <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">
                Rilascia nella cartella
            </div>
        `;
        
        // Aggiunge l'anteprima al DOM temporaneamente
        document.body.appendChild(dragPreview);
        
        // Imposta l'anteprima come immagine del drag
        // I parametri (100, 40) sono l'offset del cursore rispetto all'anteprima
        e.dataTransfer.setDragImage(dragPreview, 100, 40);
        
        // Aggiorna lo stato locale e notifica il componente padre
        setIsDragging(true);
        onDragStartProp?.();
        
        // Rimuove l'anteprima dopo un breve delay per evitare problemi di rendering
        setTimeout(() => {
            if (document.body.contains(dragPreview)) {
                document.body.removeChild(dragPreview);
            }
        }, 0);
    }, [deck.id, deck.title, onDragStartProp]);

    /**
     * Gestisce la fine del drag & drop del deck.
     *
     * Resetta lo stato locale e notifica il componente padre che il drag
     * è terminato, permettendo di aggiornare l'UI di conseguenza.
     *
     * Memoizzato con useCallback per stabilizzare il riferimento.
     */
    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        onDragEndProp?.();
    }, [onDragEndProp]);

    /**
     * Gestisce il click destro del mouse per aprire il menu contestuale.
     *
     * Previene il menu di default del browser e apre invece il nostro
     * menu personalizzato con tutte le azioni disponibili per il deck.
     *
     * Memoizzato con useCallback per stabilizzare il riferimento.
     *
     * @param event - L'evento del context menu (click destro)
     */
    const handleContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        // Previene il menu di default del browser
        event.preventDefault();
        event.stopPropagation();

        // Calcola la posizione del click per posizionare il menu
        // Per ora apriamo il menu nella posizione standard (top-left)
        // ma potremmo migliorarlo in futuro per posizionarlo vicino al click
        setShowMenu(true);
    }, []);

    return (
        <motion.div
            animate={{
                scale: isDragging ? 0.95 : 1,
                opacity: isDragging ? 0.6 : 1,
                rotateZ: isDragging ? 2 : 0,
            }}
            transition={{
                duration: 0.2,
                ease: 'easeOut',
            }}
            className={`
                relative rounded-xl sm:rounded-2xl md:rounded-3xl border overflow-hidden
                transition-all duration-300 hover:shadow-xl
                flex flex-col
                min-h-[280px] sm:min-h-[320px] md:min-h-[340px]
                cursor-move
                ${hasDueCards 
                    ? 'border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent shadow-lg shadow-orange-500/10' 
                    : `${theme.borderColor} bg-gradient-to-br ${theme.gradient} hover:shadow-lg`
                }
            `}
            draggable
            onDragStart={handleDragStart as any}
            onDragEnd={handleDragEnd}
            onContextMenu={handleContextMenu}
        >
            {/* Badges - Pinned & Due Cards */}
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex items-center gap-2">
                {deck.pinned && (
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] sm:text-xs font-bold shadow-lg"
                    >
                        ⭐
                    </motion.div>
                )}
                {hasDueCards && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-orange-500 text-white text-[10px] sm:text-xs font-bold shadow-lg"
                    >
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="hidden xs:inline">{deck.dueCount} da ripassare</span>
                        <span className="xs:hidden">{deck.dueCount}</span>
                    </motion.div>
                )}
            </div>

            {/* More Menu Button */}
            <DeckCardMenu
                deck={deck}
                totalCards={totalCards}
                showMenu={showMenu}
                onExamSolver={onExamSolver}
                onToggleMenu={() => setShowMenu(!showMenu)}
                onViewDetail={onViewDetail}
                onMagicGenerate={onMagicGenerate}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
                onUpdate={onUpdate}
            />

            {/* Main Content - Clickable */}
            <div 
                className="p-4 sm:p-5 md:p-6 cursor-pointer flex-1 flex flex-col touch-manipulation"
                onClick={() => onViewDetail(deck.id)}
            >
                <DeckCardHeader
                    deck={deck}
                    theme={theme}
                    hasDueCards={hasDueCards}
                    totalCards={totalCards}
                    hasPdf={hasPdf}
                    tags={tags}
                    onUpdate={onUpdate}
                />

                <DeckCardProgress masteryPercent={masteryPercent} />

                <DeckCardActions
                    deck={deck}
                    totalCards={totalCards}
                    hasDueCards={hasDueCards}
                    hasPdf={hasPdf}
                    onStudy={onStudy}
                    onRead={onRead}
                    onMagicGenerate={onMagicGenerate}
                    onAddCard={onAddCard}
                />
            </div>
        </motion.div>
    );
};

/**
 * DeckCard memoizzato per prevenire re-render non necessari.
 *
 * Viene eseguito un re-render solo se:
 * - L'ID del deck cambia
 * - Il contenuto del deck cambia (titolo, carte, ecc.)
 * - Le funzioni callback cambiano riferimento
 * - I tags cambiano
 */
export const DeckCard = React.memo(DeckCardComponent);
