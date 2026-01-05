/**
 * 📝 ENTRY CARD
 * =============
 * 
 * Card singola entry con info progetto, categoria e contenuto.
 */

import { motion } from 'framer-motion';
import { FiClock, FiTag } from 'react-icons/fi';
import type { WorkEntry, WorkProject } from '../types';

interface EntryCardProps {
    entry: WorkEntry;
    project: WorkProject | null;
    onClick?: () => void;
}

const CATEGORY_ICONS: Record<WorkEntry['category'], string> = {
    development: '💻',
    documentation: '📝',
    ticket: '🎫',
    meeting: '🤝',
    research: '🔬',
    freeform: '📄',
};

const CATEGORY_LABELS: Record<WorkEntry['category'], string> = {
    development: 'Development',
    documentation: 'Documentation',
    ticket: 'Ticket',
    meeting: 'Meeting',
    research: 'Research',
    freeform: 'Freeform',
};

export const EntryCard = ({ entry, project, onClick }: EntryCardProps) => {
    const formatDuration = (minutes?: number) => {
        if (!minutes) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
        }
        return `${mins}m`;
    };

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
                {/* ICONA CATEGORIA */}
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 text-xl">
                    {CATEGORY_ICONS[entry.category]}
                </div>

                {/* CONTENUTO */}
                <div className="flex-1 min-w-0">
                    {/* HEADER: Progetto + Categoria */}
                    <div className="flex items-center gap-2 mb-2">
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
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80">
                            {CATEGORY_LABELS[entry.category]}
                        </span>
                    </div>

                    {/* TITOLO */}
                    <h4 className="text-base font-semibold text-white mb-2">
                        {entry.title}
                    </h4>

                    {/* CONTENUTO */}
                    {entry.content && (
                        <p className="text-sm text-white/70 line-clamp-3 mb-3">
                            {entry.content}
                        </p>
                    )}

                    {/* METADATA: Durata e Tags */}
                    <div className="flex items-center gap-4 text-xs text-white/50">
                        {entry.duration && (
                            <div className="flex items-center gap-1">
                                <FiClock size={12} />
                                <span>{formatDuration(entry.duration)}</span>
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
