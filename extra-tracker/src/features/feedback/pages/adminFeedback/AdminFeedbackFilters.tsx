import { Filter, Search, Tag } from 'lucide-react';
import type {
    FeedbackFilters,
    FeedbackPriority,
    FeedbackStatus,
    FeedbackType,
    FeedbackUser,
} from '../../types';
import {
    PRIORITY_OPTIONS,
    STATUS_OPTIONS,
    TYPE_OPTIONS,
} from './constants';
import { getAssigneeLabel, normalizeLabel } from './utils';

interface AdminFeedbackFiltersProps {
    filters: FeedbackFilters;
    total: number;
    adminUsers: FeedbackUser[];
    onFiltersChange: (next: FeedbackFilters) => void;
}

export const AdminFeedbackFilters: React.FC<AdminFeedbackFiltersProps> = ({
    filters,
    total,
    adminUsers,
    onFiltersChange,
}) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-gray-600 dark:text-white/60">
                <Filter className="w-4 h-4" />
                <span className="text-xs uppercase tracking-[0.2em]">Filtri</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-white/40">{total} ticket</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase text-gray-500 dark:text-white/40">Stato</label>
                <select
                    value={filters.status || ''}
                    onChange={(event) =>
                        onFiltersChange({
                            ...filters,
                            status: (event.target.value as FeedbackStatus) || undefined,
                        })
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-white/10 dark:bg-dark-400/70 dark:text-white"
                >
                    {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="bg-white text-gray-900 dark:bg-dark-300 dark:text-white">
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase text-gray-500 dark:text-white/40">Tipo</label>
                <select
                    value={filters.type || ''}
                    onChange={(event) =>
                        onFiltersChange({
                            ...filters,
                            type: (event.target.value as FeedbackType) || undefined,
                        })
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-white/10 dark:bg-dark-400/70 dark:text-white"
                >
                    {TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="bg-white text-gray-900 dark:bg-dark-300 dark:text-white">
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase text-gray-500 dark:text-white/40">Priorita</label>
                <select
                    value={filters.priority || ''}
                    onChange={(event) =>
                        onFiltersChange({
                            ...filters,
                            priority: (event.target.value as FeedbackPriority) || undefined,
                        })
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-white/10 dark:bg-dark-400/70 dark:text-white"
                >
                    {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="bg-white text-gray-900 dark:bg-dark-300 dark:text-white">
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase text-gray-500 dark:text-white/40">Assegnatario</label>
                <select
                    value={filters.assignee || ''}
                    onChange={(event) =>
                        onFiltersChange({
                            ...filters,
                            assignee: event.target.value || undefined,
                        })
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-white/10 dark:bg-dark-400/70 dark:text-white"
                >
                    <option value="" className="bg-white text-gray-900 dark:bg-dark-300 dark:text-white">Tutti</option>
                    <option value="unassigned" className="bg-white text-gray-900 dark:bg-dark-300 dark:text-white">Non assegnato</option>
                    {adminUsers.map((admin) => (
                        <option key={admin._id} value={admin._id} className="bg-white text-gray-900 dark:bg-dark-300 dark:text-white">
                            {getAssigneeLabel(admin)}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase text-gray-500 dark:text-white/40">Etichetta</label>
                <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
                    <input
                        type="text"
                        value={filters.labels?.[0] || ''}
                        onChange={(event) =>
                            onFiltersChange({
                                ...filters,
                                labels: event.target.value ? [normalizeLabel(event.target.value)] : [],
                            })
                        }
                        placeholder="es. ui"
                        className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-white/10 dark:bg-dark-400/70 dark:text-white dark:placeholder:text-white/40"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2 xl:col-span-2">
                <label className="text-[11px] uppercase text-gray-500 dark:text-white/40">Cerca</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
                    <input
                        type="text"
                        value={filters.search || ''}
                        onChange={(event) =>
                            onFiltersChange({ ...filters, search: event.target.value })
                        }
                        placeholder="Titolo, descrizione o utente"
                        className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-white/10 dark:bg-dark-400/70 dark:text-white dark:placeholder:text-white/40"
                    />
                </div>
            </div>
        </div>
    </div>
);

