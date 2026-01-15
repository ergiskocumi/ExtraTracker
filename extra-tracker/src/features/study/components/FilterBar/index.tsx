import React, { useState } from 'react';
import { Search, Filter, X, Info } from 'lucide-react';
import { ViewToggle, type ViewMode } from '../ViewToggle/ViewToggle';
import { motion, AnimatePresence } from 'framer-motion';

type FilterType = 'all' | 'due' | 'mastered' | 'recent';

interface FilterBarProps {
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    dueCount: number;
    viewMode?: ViewMode;
    onViewModeChange?: (view: ViewMode) => void;
}

interface FilterInfo {
    key: FilterType;
    label: string;
    description: string;
    count?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    activeFilter,
    onFilterChange,
    searchQuery,
    onSearchChange,
    dueCount,
    viewMode,
    onViewModeChange,
}) => {
    const [hoveredFilter, setHoveredFilter] = useState<FilterType | null>(null);

    const filters: FilterInfo[] = [
        { 
            key: 'all', 
            label: 'Tutti',
            description: 'Mostra tutti i mazzi, ordinati dal più recente al più vecchio'
        },
        { 
            key: 'due', 
            label: 'Da Ripassare', 
            count: dueCount,
            description: 'Mostra solo i mazzi con carte da ripassare, ordinati per priorità (più carte da ripassare = più in alto)'
        },
        { 
            key: 'mastered', 
            label: 'Completati',
            description: 'Mostra i mazzi completamente padroneggiati (tutte le carte sono state completate)'
        },
        { 
            key: 'recent', 
            label: 'Recenti',
            description: 'Mostra i mazzi creati negli ultimi 7 giorni, ordinati dal più recente'
        },
    ];

    return (
        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/30" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Cerca mazzi..."
                    className="w-full pl-10 sm:pl-12 pr-10 sm:pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all text-sm sm:text-base touch-manipulation"
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-1 rounded-lg text-white/40 hover:text-white active:bg-white/10 touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
                        aria-label="Cancella ricerca"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Filters + View Toggle */}
            <div className="flex items-center justify-between gap-4">
                {/* Filters - Horizontal Scroll on Mobile */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none flex-1">
                    {filters.map((filter) => (
                        <div
                            key={filter.key}
                            className="relative"
                            onMouseEnter={() => setHoveredFilter(filter.key)}
                            onMouseLeave={() => setHoveredFilter(null)}
                        >
                            <button
                                onClick={() => onFilterChange(filter.key)}
                                className={`
                                    flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all touch-manipulation
                                    min-h-[40px] sm:min-h-[44px]
                                    ${activeFilter === filter.key
                                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                        : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 border border-white/10 active:bg-white/10'
                                    }
                                `}
                            >
                                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                {filter.label}
                                {filter.count !== undefined && filter.count > 0 && (
                                    <span className={`
                                        px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold
                                        ${activeFilter === filter.key
                                            ? 'bg-violet-500/30 text-violet-200'
                                            : 'bg-orange-500/20 text-orange-400'
                                        }
                                    `}>
                                        {filter.count}
                                    </span>
                                )}
                                <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1 opacity-50" />
                            </button>

                            {/* Tooltip con spiegazione */}
                            <AnimatePresence>
                                {hoveredFilter === filter.key && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-64 p-3 rounded-xl bg-zinc-900/95 border border-white/10 backdrop-blur-xl shadow-2xl"
                                    >
                                        <p className="text-xs text-white/80 leading-relaxed">
                                            {filter.description}
                                        </p>
                                        {/* Freccia */}
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 border-l border-t border-white/10 rotate-45" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>

                {/* View Toggle */}
                {viewMode && onViewModeChange && (
                    <ViewToggle
                        view={viewMode}
                        onChange={onViewModeChange}
                        className="hidden sm:flex flex-shrink-0"
                    />
                )}
            </div>
        </div>
    );
};
