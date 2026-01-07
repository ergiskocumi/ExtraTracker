/**
 * 📝 ENTRY CARD
 * =============
 * 
 * Card singola entry (WorkLog) con info progetto e contenuto.
 * Supporta sia log con orari (Timer) che note senza orari (Journal).
 */

import { motion } from 'framer-motion';
import { FiClock, FiTag, FiCalendar } from 'react-icons/fi';
import type { WorkLog } from '../../tracker/type';
import type { WorkProject } from '../types';

interface EntryCardProps {
    entry: WorkLog;
    project: WorkProject | null;
    onClick?: () => void;
}

const MOOD_ICONS: Record<string, string> = {
    high: '😊',
    neutral: '😐',
    low: '😔',
};

const MOOD_LABELS: Record<string, string> = {
    high: 'Alto',
    neutral: 'Neutrale',
    low: 'Basso',
};

export const EntryCard = ({ entry, project, onClick }: EntryCardProps) => {
    const formatDuration = (minutes?: number) => {
        if (!minutes || minutes === 0) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
        }
        return `${mins}m`;
    };

    const formatTime = (time?: string) => {
        if (!time) return null;
        return time; // Formato già HH:mm
    };

    const hasTimeTracking = !!(entry.startTime && entry.endTime);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onClick}
            className={`card p-4 transition-colors ${
                onClick ? 'cursor-pointer hover:bg-white/10 hover:border-white/20' : 'hover:bg-white/5'
            }`}
        >
            <div className="flex items-start gap-3">
                {/* ICONA: Timer o Journal */}
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 text-xl">
                    {hasTimeTracking ? '⏱️' : '📝'}
                </div>

                {/* CONTENUTO */}
                <div className="flex-1 min-w-0">
                    {/* HEADER: Progetto + Mood/Billable */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {project && (
                            <div
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
                                style={{
                                    backgroundColor: `${project.color}20`,
                                    color: project.color,
                                }}
                            >
                                <span>{project.icon}</span>
                                <span className="truncate max-w-[120px]">{project.name}</span>
                            </div>
                        )}
                        {entry.mood && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80">
                                {MOOD_ICONS[entry.mood]} {MOOD_LABELS[entry.mood]}
                            </span>
                        )}
                        {entry.isBillable === false && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300">
                                Non fatturabile
                            </span>
                        )}
                    </div>

                    {/* TITOLO */}
                    <h4 className="text-base font-semibold text-white mb-2">
                        {entry.title}
                    </h4>

                    {/* CONTENUTO */}
                    {entry.description && (
                        <p className="text-sm text-white/70 line-clamp-3 mb-3">
                            {entry.description}
                        </p>
                    )}

                    {/* METADATA: Orari, Durata e Tags */}
                    <div className="flex items-center gap-4 text-xs text-white/50 flex-wrap">
                        {hasTimeTracking && (
                            <>
                                {formatTime(entry.startTime) && formatTime(entry.endTime) && (
                                    <div className="flex items-center gap-1">
                                        <FiClock size={12} />
                                        <span>{formatTime(entry.startTime)} - {formatTime(entry.endTime)}</span>
                                    </div>
                                )}
                                {entry.durationMinutes && entry.durationMinutes > 0 && (
                                    <div className="flex items-center gap-1">
                                        <span>{formatDuration(entry.durationMinutes)}</span>
                                    </div>
                                )}
                            </>
                        )}
                        {!hasTimeTracking && entry.durationMinutes && entry.durationMinutes > 0 && (
                            <div className="flex items-center gap-1">
                                <FiClock size={12} />
                                <span>{formatDuration(entry.durationMinutes)}</span>
                            </div>
                        )}
                        {entry.tags && entry.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <FiTag size={12} />
                                {entry.tags.map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="px-1.5 py-0.5 rounded bg-white/5 text-white/60"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
