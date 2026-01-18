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
        borderRadius: 'rounded-2xl md:rounded-3xl',
        padding: 'p-4 md:p-5',
        border: 'border backdrop-blur-xl',
        transition: 'transition-all duration-300',
        hover: {
            border: 'hover:border-white/[0.15]',
            shadow: 'hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]',
        },
    },
    sourceActive: {
        border: 'border-violet-500/50',
        shadow: 'shadow-[0_0_20px_rgba(139,92,246,0.3)]',
        background: 'linear-gradient(145deg, rgba(139,92,246,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)',
    },
    default: {
        border: 'border-white/[0.08]',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.01) 100%)',
    },
} as const;

export const BADGE_STYLES = {
    question: {
        size: 'w-8 h-8 md:w-10 md:h-10',
        borderRadius: 'rounded-xl',
        background: 'bg-violet-500/10',
        border: 'border border-violet-500/20',
        text: 'text-xs font-semibold text-violet-400',
        shadow: 'shadow-[0_0_10px_rgb(139,92,246,0.2)]',
    },
    answer: {
        size: 'w-8 h-8 md:w-10 md:h-10',
        borderRadius: 'rounded-xl',
        background: 'bg-amber-500/10',
        border: 'border border-amber-500/20',
        text: 'text-xs font-semibold text-amber-400',
        shadow: 'shadow-[0_0_10px_rgb(245,158,11,0.2)]',
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
        border: 'border-white/[0.08]',
        background: 'bg-white/[0.05]',
        text: 'text-white/70',
        hover: {
            text: 'hover:text-white',
            background: 'hover:bg-white/[0.10]',
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
        border: 'border-white/[0.08]',
        background: 'bg-white/[0.05]',
        text: 'text-slate-300',
        hover: {
            text: 'hover:text-white',
            background: 'hover:bg-white/[0.10]',
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
        background: 'bg-white/[0.05]',
        border: 'border border-white/[0.08]',
        backdrop: 'backdrop-blur-sm',
        text: 'text-white',
        placeholder: 'placeholder:text-slate-400',
        focus: {
            outline: 'focus:outline-none',
            ring: 'focus:ring-2 focus:ring-violet-500/50',
            border: 'focus:border-violet-500/60',
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
        question: 'text-sm md:text-base font-semibold leading-relaxed text-white',
        answer: 'text-sm md:text-base leading-relaxed whitespace-pre-wrap text-white/80',
    },
    divider: {
        border: 'border-t border-white/[0.08]',
    },
} as const;
