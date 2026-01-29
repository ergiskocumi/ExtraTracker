import React from 'react';
import { Filter, Calendar, TrendingUp, Search, X, Clock } from 'lucide-react';
import type { Exam } from '../../types/exam';
import { FILTER_STYLES, FILTER_BASE_STYLES } from './ExamsFilters.constants';

// ============================================
// TYPES
// ============================================

export type ExamSortOption = 'recent' | 'deadline' | 'mastery' | 'name' | 'cards';
export type ExamFilterOption = 'all' | 'urgent' | 'upcoming' | 'completed';

interface ExamsFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    sortBy: ExamSortOption;
    onSortChange: (sort: ExamSortOption) => void;
    filter: ExamFilterOption;
    onFilterChange: (filter: ExamFilterOption) => void;
    exams: Exam[];
}

// ============================================
// COMPONENT
// ============================================

export const ExamsFilters: React.FC<ExamsFiltersProps> = ({
    searchQuery,
    onSearchChange,
    sortBy,
    onSortChange,
    filter,
    onFilterChange,
    exams,
}) => {
    // Calcola conteggi per i filtri
    const now = Date.now();
    const urgentCount = exams.filter(exam => {
        const deadline = new Date(exam.deadline).getTime();
        const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        return daysUntil <= 7 && daysUntil >= 0;
    }).length;

    const upcomingCount = exams.filter(exam => {
        const deadline = new Date(exam.deadline).getTime();
        const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        return daysUntil > 7;
    }).length;

    const completedCount = exams.filter(exam =>
        exam.status === 'completed' ||
        exam.status === 'passed' ||
        exam.status === 'failed' ||
        exam.status === 'archived'
    ).length;

    const filters: { key: ExamFilterOption; label: string; count?: number }[] = [
        { key: 'all', label: 'Tutti' },
        { key: 'urgent', label: 'Urgenti', count: urgentCount },
        { key: 'upcoming', label: 'In arrivo', count: upcomingCount },
        { key: 'completed', label: 'Completati', count: completedCount },
    ];

    const sortOptions: { key: ExamSortOption; label: string; icon: React.ElementType }[] = [
        { key: 'recent', label: 'Recente', icon: Clock },
        { key: 'deadline', label: 'Scadenza', icon: Calendar },
        { key: 'mastery', label: 'Padronanza', icon: TrendingUp },
        { key: 'name', label: 'Nome', icon: Search },
        { key: 'cards', label: 'Carte', icon: Filter },
    ];

    return (
        <div className="space-y-4 mb-6">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Cerca esami e mazzi..."
                    className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all text-base"
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Cancella ricerca"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Filters & Sort */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none flex-1">
                    {filters.map((f) => {
                        const isActive = filter === f.key;
                        const styles = FILTER_STYLES[f.key];
                        const stateStyles = isActive ? styles.active : styles.inactive;

                        return (
                            <button
                                key={f.key}
                                onClick={() => onFilterChange(f.key)}
                                className={`
                                    ${FILTER_BASE_STYLES.container}
                                    ${stateStyles.background}
                                    ${stateStyles.text}
                                    ${stateStyles.border}
                                    ${!isActive ? stateStyles.hover.background : ''}
                                    ${!isActive ? stateStyles.hover.text : ''}
                                `}
                            >
                                <Filter className={FILTER_BASE_STYLES.icon} />
                                {f.label}
                                {f.count !== undefined && f.count > 0 && (
                                    <span className={`
                                        ${FILTER_BASE_STYLES.badge}
                                        ${isActive ? styles.active.badge.background : styles.inactive.badge.background}
                                        ${isActive ? styles.active.badge.text : styles.inactive.badge.text}
                                    `}>
                                        {f.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Sort */}
                <div className="relative">
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value as ExamSortOption)}
                        className="appearance-none px-4 py-2.5 pr-10 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
                    >
                        {sortOptions.map((option) => (
                            <option key={option.key} value={option.key} className="bg-zinc-900">
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Filter className="w-4 h-4 text-white/40" />
                    </div>
                </div>
            </div>
        </div>
    );
};
