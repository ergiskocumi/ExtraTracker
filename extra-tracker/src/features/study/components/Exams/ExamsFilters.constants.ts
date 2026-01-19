/**
 * 🎨 EXAMS FILTERS - Style Constants & Configuration
 * ==================================================
 * 
 * Semantic color mapping for filter buttons using "Tinted" Dark Mode pattern.
 * Each filter type has distinct visual identity for instant recognition.
 */

import type { ExamFilterOption } from './ExamsFilters';

// ============================================
// FILTER STYLE CONFIGURATION
// ============================================

/**
 * Style configuration for each filter type.
 * Uses "Tinted" pattern: low opacity backgrounds, high visibility text, subtle borders.
 */
export const FILTER_STYLES: Record<
    ExamFilterOption,
    {
        /** Active state styles */
        active: {
            background: string;
            text: string;
            border: string;
            badge: {
                background: string;
                text: string;
            };
        };
        /** Inactive state styles */
        inactive: {
            background: string;
            text: string;
            border: string;
            hover: {
                background: string;
                text: string;
            };
            badge: {
                background: string;
                text: string;
            };
        };
    }
> = {
    // Tutti - Neutral/Primary (Purple/Violet)
    all: {
        active: {
            background: 'bg-violet-500/20',
            text: 'text-violet-300',
            border: 'border-violet-500/40',
            badge: {
                background: 'bg-violet-500/30',
                text: 'text-violet-200',
            },
        },
        inactive: {
            background: 'bg-white/5',
            text: 'text-white/50',
            border: 'border-white/10',
            hover: {
                background: 'hover:bg-white/10',
                text: 'hover:text-white/70',
            },
            badge: {
                background: 'bg-slate-500/20',
                text: 'text-slate-400',
            },
        },
    },
    // Urgenti - Red/Rose (Alert/Attention)
    urgent: {
        active: {
            background: 'bg-red-500/20',
            text: 'text-red-400',
            border: 'border-red-500/40',
            badge: {
                background: 'bg-red-500/30',
                text: 'text-red-300',
            },
        },
        inactive: {
            background: 'bg-white/5',
            text: 'text-white/50',
            border: 'border-white/10',
            hover: {
                background: 'hover:bg-white/10',
                text: 'hover:text-white/70',
            },
            badge: {
                background: 'bg-red-500/20',
                text: 'text-red-400',
            },
        },
    },
    // In arrivo - Blue/Sky (Neutral/Future Info)
    upcoming: {
        active: {
            background: 'bg-blue-500/20',
            text: 'text-blue-400',
            border: 'border-blue-500/40',
            badge: {
                background: 'bg-blue-500/30',
                text: 'text-blue-300',
            },
        },
        inactive: {
            background: 'bg-white/5',
            text: 'text-white/50',
            border: 'border-white/10',
            hover: {
                background: 'hover:bg-white/10',
                text: 'hover:text-white/70',
            },
            badge: {
                background: 'bg-blue-500/20',
                text: 'text-blue-400',
            },
        },
    },
    // Completati - Emerald/Green (Success)
    completed: {
        active: {
            background: 'bg-emerald-500/20',
            text: 'text-emerald-400',
            border: 'border-emerald-500/40',
            badge: {
                background: 'bg-emerald-500/30',
                text: 'text-emerald-300',
            },
        },
        inactive: {
            background: 'bg-white/5',
            text: 'text-white/50',
            border: 'border-white/10',
            hover: {
                background: 'hover:bg-white/10',
                text: 'hover:text-white/70',
            },
            badge: {
                background: 'bg-emerald-500/20',
                text: 'text-emerald-400',
            },
        },
    },
} as const;

// ============================================
// BASE STYLES
// ============================================

/**
 * Base styles applied to all filter buttons.
 */
export const FILTER_BASE_STYLES = {
    container: 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border',
    icon: 'w-4 h-4 flex-shrink-0',
    badge: 'px-2 py-0.5 rounded-full text-xs font-bold',
} as const;
