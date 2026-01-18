/**
 * 🎴 FLASHCARD LIST - Constants & Configuration
 * =============================================
 * 
 * Centralized constants for FlashcardList component.
 * All hardcoded values are extracted here for maintainability.
 */

// ============================================
// DRAG & DROP CONFIGURATION
// ============================================

export const DRAG_AND_DROP = {
    activationDistance: 5, // Pixels to move before drag activates
    touchDelay: 200, // Milliseconds delay for touch activation
    insertButtonHeight: 40, // Height of insert button in pixels
    dragOverlayZIndex: 9999,
} as const;

// ============================================
// ANIMATION CONFIGURATION
// ============================================

export const ANIMATION_CONFIG = {
    insertButton: {
        initial: { opacity: 0, scale: 0.8, y: -10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.8, y: -10 },
        transition: {
            duration: 0.3,
            ease: 'easeOut' as const,
        },
    },
    insertButtonLine: {
        scaleX: [1, 1.2, 1],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut' as const,
        },
    },
    insertButtonIcon: {
        scale: [1, 1.1, 1],
        boxShadow: [
            '0 0 20px rgba(139, 92, 246, 0.3)',
            '0 0 30px rgba(139, 92, 246, 0.5)',
            '0 0 20px rgba(139, 92, 246, 0.3)',
        ],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut' as const,
        },
    },
    dragOverlay: {
        scale: 1.1,
        rotate: 3,
        transition: {
            duration: 0.2,
            ease: 'easeOut' as const,
        },
    },
} as const;

// ============================================
// STYLING CONSTANTS
// ============================================

export const HEADER_STYLES = {
    container: {
        padding: 'px-4 py-3',
        border: 'border-b border-white/[0.08]',
        backdrop: 'backdrop-blur-sm',
        layout: 'flex items-center justify-between flex-shrink-0',
        gap: 'gap-2',
    },
    badge: {
        display: 'inline-block',
        padding: 'px-2.5 py-1',
        borderRadius: 'rounded-full',
        background: 'bg-violet-500/10',
        border: 'border border-violet-500/20',
        text: 'text-violet-400 text-[10px] font-medium',
    },
    backButton: {
        layout: 'flex items-center gap-2',
        padding: 'px-3 py-2',
        fontSize: 'text-sm',
        fontWeight: 'font-medium',
        text: 'text-white/80',
        hover: {
            text: 'hover:text-white',
            background: 'hover:bg-white/20',
            border: 'hover:border-white/30',
        },
        shadow: 'shadow-lg',
        borderRadius: 'rounded-xl',
        background: 'bg-white/10',
        border: 'border border-white/20',
        transition: 'transition-all duration-300',
        active: 'active:scale-95',
    },
    addButton: {
        layout: 'flex items-center gap-2',
        padding: 'px-3 py-2',
        fontSize: 'text-sm',
        fontWeight: 'font-medium',
        text: 'text-white',
        shadow: 'shadow-lg shadow-violet-500/20',
        borderRadius: 'rounded-xl',
        background: 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
        hover: {
            background: 'hover:from-violet-400 hover:to-fuchsia-400',
        },
        transition: 'transition-all duration-300',
        active: 'active:scale-95',
    },
} as const;

export const INSERT_BUTTON_STYLES = {
    container: {
        layout: 'flex items-center justify-center',
        padding: 'py-2 my-1',
    },
    line: {
        flex: 'flex-1',
        height: 'h-0.5',
        background: 'bg-gradient-to-r from-transparent via-violet-500/50 to-transparent',
    },
    button: {
        margin: 'mx-4',
        layout: 'flex items-center justify-center',
        size: 'w-12 h-12',
        borderRadius: 'rounded-full',
        background: 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
        text: 'text-white',
        shadow: 'shadow-lg shadow-violet-500/50',
        hover: {
            shadow: 'hover:shadow-violet-500/70',
            scale: 'hover:scale-110',
        },
        active: 'active:scale-95',
        transition: 'transition-all duration-200',
    },
    icon: {
        size: 'w-6 h-6',
    },
} as const;

export const EMPTY_STATE_STYLES = {
    container: {
        borderRadius: 'rounded-2xl md:rounded-3xl',
        border: 'border border-white/[0.08]',
        backdrop: 'backdrop-blur-xl',
        padding: 'p-6',
        alignment: 'text-center',
        shadow: 'shadow-[0_8px_30px_rgb(0,0,0,0.12)]',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.01) 100%)',
    },
    text: {
        fontSize: 'text-sm md:text-base',
        color: 'text-slate-400',
    },
} as const;

export const DRAG_OVERLAY_STYLES = {
    container: {
        scale: 'scale-110',
        rotate: 'rotate-3',
        shadow: 'shadow-2xl',
        cursor: 'cursor-grabbing',
        transition: 'transition-all duration-200 ease-out',
        boxShadow: '0 25px 50px -12px rgba(139, 92, 246, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        filter: 'drop-shadow(0 30px 60px -15px rgba(0, 0, 0, 0.4))',
    },
    listView: {
        layout: 'flex items-start gap-3',
        indexContainer: {
            layout: 'flex flex-col items-center gap-2 pt-1 flex-shrink-0',
            opacity: 'opacity-50',
        },
        indexIcon: {
            padding: 'p-1',
            color: 'text-white/20',
        },
        indexText: {
            fontSize: 'text-xs',
            fontWeight: 'font-medium',
            color: 'text-white/30',
            userSelect: 'select-none',
        },
        cardContainer: {
            flex: 'flex-1',
            minWidth: 'min-w-0',
        },
    },
} as const;

export const GRID_STYLES = {
    container: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6',
    fullSpan: 'col-span-full sm:col-span-2 lg:col-span-3',
} as const;

export const LIST_STYLES = {
    container: 'space-y-3 md:space-y-4',
    insertButtonGroup: 'group/insert',
} as const;

export const CONTENT_STYLES = {
    container: {
        flex: 'flex-1',
        padding: 'p-3 md:p-4',
        overflow: 'overflow-y-auto overscroll-contain',
    },
} as const;

// ============================================
// TEXT CONTENT
// ============================================

export const TEXT_CONTENT = {
    header: {
        cardCount: (count: number) => `${count} ${count === 1 ? 'carta' : 'carte'}`,
    },
    buttons: {
        back: 'Indietro',
        addCard: 'Aggiungi carta',
        insertCard: (position: number) => `Inserisci card in posizione ${position + 1}`,
    },
    ariaLabels: {
        back: 'Torna al mazzo',
        addCard: 'Aggiungi carta',
        insertCard: (position: number) => `Inserisci card in posizione ${position + 1}`,
    },
    emptyState: {
        message: 'Nessuna carta ancora. Puoi aggiungerne una mentre leggi il PDF.',
    },
    toast: {
        reorderSuccess: 'Card riordinata con successo',
        reorderError: 'Errore nel riordinamento delle card',
        deleteSuccess: 'Card eliminata con successo',
        deleteError: 'Errore nell\'eliminazione della card',
        addSuccess: (position: number) => `Card aggiunta in posizione ${position + 1}`,
        addError: 'Errore nell\'aggiunta della card',
    },
} as const;

// ============================================
// VIEW MODE CONFIGURATION
// ============================================

export const VIEW_MODE = {
    list: 'list',
    grid: 'grid',
} as const;

export type ViewModeType = typeof VIEW_MODE[keyof typeof VIEW_MODE];

// ============================================
// ICON SIZES
// ============================================

export const ICON_SIZES = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
} as const;
