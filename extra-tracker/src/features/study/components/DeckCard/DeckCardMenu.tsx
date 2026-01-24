import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Eye, Sparkles, BarChart2, Trash2, Star, BookOpen, FileText } from 'lucide-react';
import type { Deck } from '../../services/studyService';
import { ChangeExamModal } from '../Deck/ChangeExamModal';

/**
 * Props del componente DeckCardMenu
 * 
 * Definisce tutte le dipendenze esterne del componente,
 * permettendo di testarlo facilmente e di capire le sue responsabilità.
 */
interface DeckCardMenuProps {
    /** Il deck per cui mostrare il menu */
    deck: Deck;
    
    /** Numero totale di carte nel deck */
    totalCards: number;
    
    /** Indica se il menu è aperto o chiuso */
    showMenu: boolean;
    
    /** Callback per aprire/chiudere il menu */
    onToggleMenu: () => void;
    
    /** Callback chiamato quando l'utente vuole vedere i dettagli del deck */
    onViewDetail: (deckId: string) => void;
    
    /** Callback chiamato quando l'utente vuole generare carte con AI */
    onMagicGenerate: (deck: Deck) => void;
    
    /** Callback chiamato quando l'utente vuole aprire Exam Solver per questo deck */
    onExamSolver?: (deckId: string) => void;
    
    /** Callback chiamato quando l'utente vuole eliminare il deck */
    onDelete: (deck: Deck) => void;
    
    /** Callback chiamato quando l'utente vuole aggiungere/rimuovere dai preferiti */
    onTogglePin?: (deck: Deck) => void;
    
    /** 
     * Callback chiamato quando il deck viene aggiornato (es. dopo cambio esame).
     * Permette al componente padre di aggiornare lo stato locale.
     */
    onUpdate?: (deck: Deck) => void;
}

/**
 * Componente per il menu contestuale delle card dei deck
 * 
 * Fornisce un menu dropdown con tutte le azioni disponibili per un deck:
 * - Visualizza dettagli
 * - Magic Generate (generazione AI)
 * - Statistiche
 * - Aggiungi/Rimuovi dai preferiti
 * - Cambia esame (nuova funzionalità)
 * - Elimina deck
 * 
 * MODALITÀ DI APERTURA:
 * - Click sul pulsante con tre puntini (MoreHorizontal icon)
 * - Click destro del mouse sulla card del deck (context menu)
 * 
 * CHIUSURA:
 * - Click fuori dal menu (backdrop)
 * - Selezione di un'opzione
 * 
 * DESIGN:
 * - Larghezza adattiva (min 200px, max 280px) per evitare tagli del testo
 * - Testo con whitespace-nowrap per prevenire wrapping
 * - Area touch-friendly (min 44px di altezza per ogni item)
 * - Animazioni fluide per apertura/chiusura
 * 
 * @component
 */
export const DeckCardMenu: React.FC<DeckCardMenuProps> = ({
    deck,
    totalCards,
    showMenu,
    onToggleMenu,
    onViewDetail,
    onMagicGenerate,
    onExamSolver,
    onDelete,
    onTogglePin,
    onUpdate,
}) => {
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    
    /**
     * Indica se il deck è nei preferiti.
     * Usato per mostrare lo stato corretto nel menu.
     */
    const isPinned = deck.pinned === true;
    
    /**
     * Indica se il modal per cambiare l'esame è aperto.
     * Permette di controllare la visibilità del modal.
     */
    const [isChangeExamModalOpen, setIsChangeExamModalOpen] = useState(false);
    
    /**
     * Riferimento al pulsante del menu per calcolare la posizione.
     * Usato per posizionare il menu dropdown in modo preciso sopra la card.
     */
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    
    /**
     * Posizione calcolata del menu dropdown.
     * Viene calcolata quando il menu si apre per posizionarlo correttamente
     * sopra la card, evitando che venga tagliato dai container parent.
     */
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

    // ============================================
    // EVENT HANDLERS
    // ============================================
    
    /**
     * Gestisce l'apertura del modal per cambiare l'esame.
     * 
     * Chiude il menu principale e apre il modal di cambio esame.
     */
    const handleOpenChangeExamModal = () => {
        onToggleMenu(); // Chiude il menu principale
        setIsChangeExamModalOpen(true);
    };

    /**
     * Gestisce la chiusura del modal per cambiare l'esame.
     */
    const handleCloseChangeExamModal = () => {
        setIsChangeExamModalOpen(false);
    };

    /**
     * Gestisce il cambio di esame completato con successo.
     * 
     * Riceve il deck aggiornato e notifica il componente padre
     * tramite il callback onUpdate, permettendo di aggiornare
     * lo stato locale senza dover ricaricare tutti i dati.
     * 
     * @param updatedDeck - Il deck aggiornato con il nuovo goalId
     */
    const handleExamChanged = (updatedDeck: Deck) => {
        // Notifica il componente padre del cambio
        onUpdate?.(updatedDeck);
        
        // Chiude il modal
        setIsChangeExamModalOpen(false);
    };

    /**
     * Calcola la posizione del menu dropdown basandosi sulla posizione del pulsante.
     * 
     * Usa getBoundingClientRect() per ottenere le coordinate assolute del pulsante
     * rispetto al viewport, permettendo di posizionare il menu in modo fixed
     * sopra tutti gli altri elementi, evitando problemi di overflow.
     * 
     * La funzione calcola anche se c'è abbastanza spazio sotto il pulsante per
     * mostrare il menu. Se non c'è spazio sufficiente, posiziona il menu sopra
     * il pulsante invece che sotto.
     * 
     * Questa funzione viene chiamata ogni volta che il menu si apre per
     * assicurarsi che la posizione sia sempre corretta, anche se la pagina
     * viene scrollata o ridimensionata.
     */
    const calculateMenuPosition = () => {
        if (!menuButtonRef.current) return;

        const buttonRect = menuButtonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Stima dell'altezza del menu (circa 300px per 6-7 items)
        const estimatedMenuHeight = 350;
        const menuMargin = 8;
        
        // Verifica se c'è spazio sufficiente sotto il pulsante
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        
        // Determina se posizionare il menu sopra o sotto il pulsante
        const shouldPositionAbove = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;
        
        // Calcola la posizione verticale
        let top: number;
        if (shouldPositionAbove) {
            // Posiziona sopra il pulsante
            top = buttonRect.top - estimatedMenuHeight - menuMargin;
        } else {
            // Posiziona sotto il pulsante (comportamento standard)
            top = buttonRect.bottom + menuMargin;
        }
        
        // Calcola la posizione orizzontale
        // Assicura che il menu non esca dallo schermo a destra
        const menuWidth = 280; // max-w-[280px]
        let left = buttonRect.left;
        
        // Se il menu esce dallo schermo a destra, allinealo al bordo destro
        if (left + menuWidth > viewportWidth) {
            left = viewportWidth - menuWidth - 16; // 16px di margine dal bordo
        }
        
        // Assicura che non esca dallo schermo a sinistra
        if (left < 16) {
            left = 16; // 16px di margine dal bordo sinistro
        }
        
        setMenuPosition({
            left,
            top: Math.max(16, Math.min(top, viewportHeight - estimatedMenuHeight - 16)),
        });
    };

    /**
     * Gestisce l'apertura del menu.
     * 
     * Apre il menu. La posizione viene calcolata nell'useEffect
     * quando showMenu diventa true.
     */
    const handleOpenMenu = () => {
        onToggleMenu();
    };

    /**
     * Effetto che calcola la posizione del menu quando si apre.
     * 
     * Questo assicura che il menu sia sempre posizionato correttamente,
     * anche se la pagina viene scrollata o ridimensionata mentre è aperto.
     */
    useEffect(() => {
        if (showMenu) {
            // Calcola la posizione quando il menu si apre
            // Usa requestAnimationFrame per assicurarsi che il DOM sia aggiornato
            requestAnimationFrame(() => {
                calculateMenuPosition();
            });
            
            // Ricalcola la posizione quando la finestra viene ridimensionata o scrollata
            const handleResize = () => calculateMenuPosition();
            const handleScroll = () => calculateMenuPosition();
            
            window.addEventListener('resize', handleResize);
            window.addEventListener('scroll', handleScroll, true); // true = capture phase
            
            return () => {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('scroll', handleScroll, true);
            };
        } else {
            // Reset della posizione quando il menu si chiude
            setMenuPosition(null);
        }
    }, [showMenu]);
    return (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
            <button
                ref={menuButtonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    handleOpenMenu();
                }}
                className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-black/20 backdrop-blur-sm text-white/60 hover:text-white hover:bg-black/40 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Menu opzioni"
            >
                <MoreHorizontal className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>

            {/* Dropdown Menu - Renderizzato tramite Portal per evitare problemi di stacking context */}
            {typeof window !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showMenu && (
                        <>
                            {/* Backdrop - Copre tutto lo schermo per chiudere il menu quando si clicca fuori */}
                            <motion.div
                                key="menu-backdrop"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[99998]"
                                onClick={onToggleMenu}
                                style={{ pointerEvents: 'auto' }}
                            />
                            
                            {/* Menu Dropdown - Posizionato in modo fixed sopra tutto */}
                            {/* 
                                PORTAL:
                                - Usa React Portal per renderizzare il menu direttamente nel body
                                - Questo evita completamente i problemi di stacking context
                                - Il menu appare sempre sopra qualsiasi altro elemento
                                
                                POSIZIONAMENTO FIXED:
                                - Usa fixed invece di absolute per evitare problemi di overflow
                                - La posizione viene calcolata dinamicamente basandosi sul pulsante
                                - z-[99999]: z-index estremamente alto per apparire sopra tutti gli elementi
                                
                                LARGHEZZA:
                                - min-w-[200px]: larghezza minima per garantire leggibilità
                                - max-w-[280px]: larghezza massima per evitare che diventi troppo largo
                                - w-auto: si adatta al contenuto tra min e max
                                
                                OVERFLOW:
                                - max-h-[90vh]: massima altezza per evitare che esca dallo schermo
                                - overflow-y-auto: scroll verticale se il contenuto è troppo lungo
                                
                                VANTAGGI DEL PORTAL:
                                - Non viene tagliato dai container parent con overflow-hidden
                                - Non è limitato da stacking context creati da transform/opacity
                                - Appare sempre sopra tutti gli altri elementi
                                - Posizione precisa calcolata dinamicamente
                                
                                Z-INDEX MOLTO ALTO:
                                - z-[99999] assicura che il menu appaia sopra qualsiasi altro elemento
                                - Anche sopra modali e altri overlay se necessario
                            */}
                            {menuPosition && (
                                <motion.div
                                    key="menu-dropdown"
                                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                    style={{
                                        position: 'fixed',
                                        top: `${menuPosition.top}px`,
                                        left: `${menuPosition.left}px`,
                                        zIndex: 99999,
                                    }}
                                    className="min-w-[200px] max-w-[280px] w-auto 
                                               py-2 rounded-xl 
                                               bg-zinc-900 border border-white/10 
                                               shadow-2xl
                                               max-h-[90vh] overflow-y-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                            {/* 
                                Ogni pulsante del menu ha:
                                - whitespace-nowrap: previene il wrapping del testo
                                - flex-1 text-left: permette al testo di espandersi e allinearsi a sinistra
                                - min-h-[44px]: garantisce un'area touch-friendly (standard iOS/Android)
                                - gap-3: spazio consistente tra icona e testo
                            */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewDetail(deck.id);
                                    onToggleMenu();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-white/80 hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation min-h-[44px] whitespace-nowrap"
                            >
                                <Eye className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 text-left">Visualizza Dettagli</span>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMagicGenerate(deck);
                                    onToggleMenu();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 active:bg-amber-500/15 transition-colors touch-manipulation min-h-[44px] whitespace-nowrap"
                            >
                                <Sparkles className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 text-left">{totalCards === 0 ? 'Magic Generate' : 'Add Chapter via AI'}</span>
                            </button>
                            {onExamSolver && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onExamSolver(deck.id);
                                        onToggleMenu();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-orange-400 hover:bg-orange-500/10 active:bg-orange-500/15 transition-colors touch-manipulation min-h-[44px] whitespace-nowrap"
                                >
                                    <FileText className="w-4 h-4 flex-shrink-0" />
                                    <span className="flex-1 text-left">Aggiungi domande d&apos;esame</span>
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewDetail(deck.id);
                                    onToggleMenu();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 active:bg-blue-500/15 transition-colors touch-manipulation min-h-[44px] whitespace-nowrap"
                            >
                                <BarChart2 className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 text-left">Statistiche</span>
                            </button>
                            {onTogglePin && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTogglePin(deck);
                                        onToggleMenu();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 active:bg-amber-500/15 transition-colors touch-manipulation min-h-[44px] whitespace-nowrap"
                                >
                                    <Star className={`w-4 h-4 flex-shrink-0 ${isPinned ? 'fill-current' : ''}`} />
                                    <span className="flex-1 text-left">{isPinned ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}</span>
                                </button>
                            )}
                            
                            {/* Opzione per cambiare l'esame associato */}
                            {onUpdate && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenChangeExamModal();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-violet-400 hover:bg-violet-500/10 active:bg-violet-500/15 transition-colors touch-manipulation min-h-[44px] whitespace-nowrap"
                                >
                                    <BookOpen className="w-4 h-4 flex-shrink-0" />
                                    <span className="flex-1 text-left">Cambia Esame</span>
                                </button>
                            )}
                            
                            <div className="my-2 border-t border-white/10" />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(deck);
                                    onToggleMenu();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-red-400 hover:bg-red-500/10 active:bg-red-500/15 transition-colors touch-manipulation min-h-[44px] whitespace-nowrap"
                            >
                                <Trash2 className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 text-left">Elimina Mazzo</span>
                            </button>
                        </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
            
            {/* Modal per cambiare l'esame associato */}
            {onUpdate && (
                <ChangeExamModal
                    isOpen={isChangeExamModalOpen}
                    deck={deck}
                    onExamChanged={handleExamChanged}
                    onClose={handleCloseChangeExamModal}
                />
            )}
        </div>
    );
};
