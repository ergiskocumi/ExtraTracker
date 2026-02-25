/**
 * DECK CARD FILTERS - Filtri per le carte del mazzo
 *
 * Features:
 * - Tab visivi con conteggi e colori
 * - Barra di ricerca con highlight
 * - Ordinamento
 * - Vista lista unica (no toggle griglia/lista)
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    ArrowUpDown,
    Sparkles,
    BookOpen,
    GraduationCap,
    Trophy,
    Layers,
    X,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type FilterStatus = 'all' | 'new' | 'learning' | 'review' | 'mastered';
export type SortOption = 'order' | 'created' | 'alphabetical' | 'interval';

interface DeckCardFiltersProps {
    activeFilter: FilterStatus;
    onFilterChange: (filter: FilterStatus) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    sortBy: SortOption;
    onSortChange: (sort: SortOption) => void;
    counts: {
        all: number;
        new: number;
        learning: number;
        review: number;
        mastered: number;
    };
}

interface FilterTab {
    key: FilterStatus;
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
}

// ============================================
// CONFIG
// ============================================

const FILTER_TABS: FilterTab[] = [
    {
        key: 'all',
        label: 'Tutte',
        icon: Layers,
        color: 'text-theme-primary',
        bgColor: 'bg-theme-surface',
        borderColor: 'border-theme-strong',
    },
    {
        key: 'new',
        label: 'Nuove',
        icon: Sparkles,
        color: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-blue-500/15',
        borderColor: 'border-blue-500/30',
    },
    {
        key: 'learning',
        label: 'Studio',
        icon: BookOpen,
        color: 'text-amber-700 dark:text-amber-300',
        bgColor: 'bg-amber-500/15',
        borderColor: 'border-amber-500/30',
    },
    {
        key: 'review',
        label: 'Ripasso',
        icon: GraduationCap,
        color: 'text-orange-700 dark:text-orange-300',
        bgColor: 'bg-orange-500/15',
        borderColor: 'border-orange-500/30',
    },
    {
        key: 'mastered',
        label: 'Padroneggiate',
        icon: Trophy,
        color: 'text-emerald-700 dark:text-emerald-300',
        bgColor: 'bg-emerald-500/15',
        borderColor: 'border-emerald-500/30',
    },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'order', label: 'Ordine personalizzato' },
    { value: 'created', label: 'Data creazione' },
    { value: 'alphabetical', label: 'Alfabetico' },
    { value: 'interval', label: 'Intervallo' },
];

// ============================================
// COMPONENT
// ============================================

export const DeckCardFilters: React.FC<DeckCardFiltersProps> = ({
    activeFilter,
    onFilterChange,
    searchQuery,
    onSearchChange,
    sortBy,
    onSortChange,
    counts,
}) => {
    const hasActiveFilters = activeFilter !== 'all' || searchQuery.length > 0;

    const clearFilters = () => {
        onFilterChange('all');
        onSearchChange('');
    };

    return (
        <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
                {FILTER_TABS.map((tab) => {
                    const count = counts[tab.key];
                    const isActive = activeFilter === tab.key;
                    
                    return (
                        <motion.button
                            key={tab.key}
                            onClick={() => onFilterChange(tab.key)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                                transition-all duration-200 border
                                ${isActive
                                    ? `${tab.bgColor} ${tab.color} ${tab.borderColor} shadow-lg`
                                    : 'bg-theme-card text-theme-secondary border-theme-default hover:bg-theme-surface hover:text-theme-primary'
                                }
                            `}
                        >
                            <tab.icon className={`w-4 h-4 ${isActive ? '' : 'opacity-60'}`} />
                            <span>{tab.label}</span>
                            <span className={`
                                ml-1 px-2 py-0.5 rounded-full text-xs font-bold
                                ${isActive ? 'bg-theme-elevated text-theme-primary border border-theme-default' : 'bg-theme-elevated text-theme-muted border border-theme-default'}
                            `}>
                                {count}
                            </span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Search & Controls Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Cerca carte..."
                        className="
                            w-full pl-12 pr-10 py-3 rounded-xl
                            bg-theme-card border border-theme-default
                            text-theme-primary placeholder:text-theme-muted
                            focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20
                            transition-all hover:bg-theme-surface
                        "
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-theme-surface text-theme-muted hover:text-theme-primary transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Controls Group */}
                <div className="flex items-center gap-2">
                    {/* Sort Dropdown */}
                    <div className="relative group">
                        <select
                            value={sortBy}
                            onChange={(e) => onSortChange(e.target.value as SortOption)}
                            className="
                                appearance-none pl-10 pr-8 py-3 rounded-xl
                                bg-theme-card border border-theme-default
                                text-theme-primary text-sm
                                focus:border-primary-500/50 focus:outline-none
                                cursor-pointer hover:bg-theme-surface transition-all
                            "
                        >
                            {SORT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-theme-elevated">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted pointer-events-none" />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-theme-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={clearFilters}
                            className="
                                flex items-center gap-2 px-4 py-3 rounded-xl
                                bg-theme-card hover:bg-theme-surface border border-theme-default
                                text-theme-secondary hover:text-theme-primary text-sm font-medium
                                transition-all
                            "
                        >
                            <X className="w-4 h-4" />
                            <span className="hidden sm:inline">Cancella filtri</span>
                        </motion.button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeckCardFilters;
