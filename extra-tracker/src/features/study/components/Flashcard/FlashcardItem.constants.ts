/**
 * 🎴 FLASHCARD ITEM - Constants & Configuration
 * =============================================
 * 
 * Centralized constants for FlashcardItem component.
 * All hardcoded values are extracted here for maintainability.
 */

// ============================================
// ANIMATION CONFIGURATION
// ============================================

export const ANIMATION_CONFIG = {
    card: {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
    },
    viewMode: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
    },
    editMode: {
        initial: { opacity: 0, y: 5 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -5 },
    },
    loadingSpinner: {
        duration: 1,
        repeat: Infinity,
        ease: 'linear' as const,
    },
} as const;

// ============================================
// STYLING CONSTANTS
// ============================================

export const CARD_STYLES = {
    base: {
        borderRadius: 'rounded-2xl',
        padding: 'p-5 md:p-6', 
        border: 'border border-theme-default',
        shadow: 'shadow-theme-sm',
        transition: 'transition-colors duration-200',
        height: 'h-auto flex flex-col',
        hover: {
            border: 'hover:border-theme-strong',
            shadow: 'hover:shadow-theme-md',
        },
    },
    sourceActive: {
        border: 'border-primary-500/45',
        shadow: 'shadow-[0_0_18px_rgba(124,58,237,0.22)]',
        background: 'rgba(124, 58, 237, 0.12)', // CSS value for inline style
    },
    default: {
        border: 'border-theme-default',
        background: 'var(--bg-card)', // Use CSS variable for theme-aware background
    },
} as const;

export const BADGE_STYLES = {
    question: {
        size: 'w-7 h-7 md:w-8 md:h-8',
        borderRadius: 'rounded-full',
        background: 'bg-primary-500/15',
        border: 'border border-primary-500/35',
        text: 'text-[10px] font-semibold text-primary-700 dark:text-primary-200',
        shadow: '',
    },
    answer: {
        size: 'w-7 h-7 md:w-8 md:h-8',
        borderRadius: 'rounded-full',
        background: 'bg-amber-500/10',
        border: 'border border-amber-500/25',
        text: 'text-[10px] font-semibold text-amber-700 dark:text-amber-200',
        shadow: '',
    },
} as const;

export const BUTTON_STYLES = {
    base: {
        size: 'p-2.5',
        borderRadius: 'rounded-xl',
        border: 'border backdrop-blur-sm',
        transition: 'transition-all duration-300',
        active: 'active:scale-95',
    },
    edit: {
        border: 'border-theme-default',
        background: 'bg-theme-surface',
        text: 'text-theme-secondary',
        hover: {
            text: 'hover:text-theme-primary',
            background: 'hover:bg-theme-card',
        },
    },
    delete: {
        border: 'border-red-500/20',
        background: 'bg-red-500/10',
        text: 'text-red-400',
        hover: {
            text: 'hover:text-red-300',
            background: 'hover:bg-red-500/20',
        },
    },
    showSource: {
        disabled: {
            border: 'border-red-500/40',
            background: 'bg-red-500/20',
            text: 'text-red-300',
            opacity: 'opacity-50',
            cursor: 'cursor-not-allowed',
        },
        active: {
            border: 'border-violet-500/60',
            background: 'bg-violet-500/25',
            text: 'text-violet-300',
            hover: {
                background: 'hover:bg-violet-500/35',
            },
            shadow: 'shadow-[0_0_15px_rgba(139,92,246,0.5)]',
        },
        default: {
            border: 'border-violet-500/40',
            background: 'bg-violet-500/20',
            text: 'text-violet-300',
            hover: {
                text: 'hover:text-violet-200',
                background: 'hover:bg-violet-500/30',
                border: 'hover:border-violet-500/60',
            },
            shadow: 'shadow-md',
        },
    },
    cancel: {
        border: 'border-theme-default',
        background: 'bg-theme-surface',
        text: 'text-theme-secondary',
        hover: {
            text: 'hover:text-theme-primary',
            background: 'hover:bg-theme-card',
        },
        disabled: {
            opacity: 'disabled:opacity-50',
            cursor: 'disabled:cursor-not-allowed',
        },
    },
    save: {
        background: 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
        hover: {
            background: 'hover:from-violet-400 hover:to-fuchsia-400',
        },
        text: 'text-white',
        shadow: 'shadow-lg shadow-violet-500/20',
        disabled: {
            opacity: 'disabled:opacity-40',
            cursor: 'disabled:cursor-not-allowed',
        },
    },
} as const;

export const INPUT_STYLES = {
    base: {
        width: 'w-full',
        resize: 'resize-y',
        minHeight: 'min-h-[80px]',
        padding: 'p-3',
        borderRadius: 'rounded-xl',
        fontSize: 'text-sm md:text-base',
        background: 'bg-theme-surface',
        border: 'border border-theme-default',
        backdrop: '',
        text: 'text-theme-primary',
        placeholder: 'placeholder:text-theme-muted',
        focus: {
            outline: 'focus:outline-none',
            ring: 'focus:ring-2 focus:ring-primary-500/30',
            border: 'focus:border-primary-500/60',
        },
        transition: 'transition-all duration-300',
    },
} as const;

// ============================================
// TEXT CONTENT
// ============================================

export const TEXT_CONTENT = {
    labels: {
        front: 'Fronte (Domanda)',
        back: 'Retro (Risposta)',
    },
    placeholders: {
        front: 'Inserisci la domanda...',
        back: 'Inserisci la risposta...',
    },
    buttons: {
        edit: 'Modifica',
        delete: 'Elimina',
        cancel: 'Annulla',
        save: 'Salva',
        saving: 'Salvataggio...',
        showSource: 'Vai alla fonte nel PDF',
        showSourceDisabled: 'Fonte disponibile ma callback mancante',
    },
    ariaLabels: {
        edit: 'Modifica carta',
        delete: 'Elimina carta',
        showSource: 'Vai alla fonte nel PDF',
        showSourceDisabled: 'Fonte disponibile ma callback mancante',
    },
    toast: {
        success: {
            title: 'Modifica completata',
            message: 'Carta aggiornata con successo',
            duration: 2000,
        },
        error: {
            title: 'Errore',
            message: 'Errore durante il salvataggio',
            duration: 4000,
        },
    },
} as const;

// ============================================
// VALIDATION CONSTANTS
// ============================================

export const VALIDATION = {
    minTextLength: 0,
    tempCardPrefix: 'temp-',
} as const;

// ============================================
// ICON SIZES
// ============================================

export const ICON_SIZES = {
    small: 'w-4 h-4',
    medium: 'w-4 h-4 md:w-5 md:h-5',
} as const;

// ============================================
// LAYOUT CONSTANTS
// ============================================

export const LAYOUT = {
    spacing: {
        gap: 'gap-3',
        gapButtons: 'gap-2',
        gapActions: 'gap-3',
        paddingTop: 'pt-3',
    },
    text: {
        question: 'text-sm md:text-base font-semibold leading-relaxed text-theme-primary',
        answer: 'text-sm md:text-base leading-relaxed whitespace-pre-wrap text-theme-secondary',
    },
    divider: {
        border: 'border-t border-theme-default',
    },
} as const;
