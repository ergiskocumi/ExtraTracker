import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { ViewToggle, type ViewMode } from '../ViewToggle/ViewToggle';

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

export const FilterBar: React.FC<FilterBarProps> = ({
    activeFilter,
    onFilterChange,
    searchQuery,
    onSearchChange,
    dueCount,
    viewMode,
    onViewModeChange,
}) => {
    const filters: { key: FilterType; label: string; count?: number }[] = [
        { key: 'all', label: 'Tutti' },
        { key: 'due', label: 'Da Ripassare', count: dueCount },
        { key: 'mastered', label: 'Completati' },
        { key: 'recent', label: 'Recenti' },
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
                        <button
                            key={filter.key}
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
                        </button>
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
