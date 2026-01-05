/**
 * 📅 ENTRY TIMELINE
 * =================
 * 
 * Timeline delle entries raggruppate per data.
 */

import { useMemo } from 'react';
import { EntryCard } from './EntryCard';
import { FiClock } from 'react-icons/fi';
import type { WorkEntry, WorkProject } from '../types';

interface EntryTimelineProps {
    entries: WorkEntry[];
    loading: boolean;
    projects: WorkProject[];
}

export const EntryTimeline = ({ entries, loading, projects }: EntryTimelineProps) => {
    // Raggruppa entries per data
    const groupedEntries = useMemo(() => {
        const groups: Record<string, WorkEntry[]> = {};
        
        entries.forEach((entry) => {
            if (!groups[entry.date]) {
                groups[entry.date] = [];
            }
            groups[entry.date].push(entry);
        });
        
        // Ordina per data (più recente prima)
        return Object.entries(groups)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, entries]) => ({ date, entries }));
    }, [entries]);

    // Helper per formattare la data
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffTime = today.getTime() - entryDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Oggi';
        if (diffDays === 1) return 'Ieri';
        if (diffDays < 7) return `${diffDays} giorni fa`;
        
        return date.toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    // Helper per trovare progetto
    const getProject = (entry: WorkEntry): WorkProject | null => {
        if (typeof entry.project === 'object') {
            return entry.project;
        }
        return projects.find((p) => p.id === entry.project) || null;
    };

    if (loading) {
        return (
            <div className="card p-6">
                <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="card p-8 text-center">
                <FiClock size={48} className="mx-auto text-white/20 mb-4" />
                <p className="text-white/60 mb-2">Nessuna entry ancora</p>
                <p className="text-sm text-white/40">
                    Inizia a tracciare il tuo lavoro creando la prima entry
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Timeline Recente</h3>
                <span className="text-sm text-white/50">{entries.length} entries</span>
            </div>

            {groupedEntries.map(({ date, entries: dateEntries }) => (
                <div key={date} className="space-y-4">
                    {/* HEADER DATA */}
                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                            {formatDate(date)}
                        </h4>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </div>

                    {/* ENTRIES DEL GIORNO */}
                    <div className="space-y-3">
                        {dateEntries.map((entry) => {
                            const project = getProject(entry);
                            return (
                                <EntryCard
                                    key={entry.id}
                                    entry={entry}
                                    project={project}
                                />
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
