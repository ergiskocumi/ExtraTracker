/**
 * 📝 ENTRY DETAIL MODAL
 * =====================
 * 
 * Modal per visualizzare i dettagli completi di un'entry.
 * Mostra tutti i dati incluso templateData strutturato.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiClock, FiTag, FiCalendar, FiFolder, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
import type { WorkEntry, WorkProject } from '../types';

interface EntryDetailModalProps {
    isOpen: boolean;
    entry: WorkEntry | null;
    project: WorkProject | null;
    onClose: () => void;
    onEdit?: (entry: WorkEntry) => void;
    onDelete?: (entryId: string) => void;
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

export const EntryDetailModal = ({
    isOpen,
    entry,
    project,
    onClose,
    onEdit,
    onDelete,
}: EntryDetailModalProps) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    if (!entry) return null;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatDuration = (minutes?: number) => {
        if (!minutes) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
        }
        return `${mins}m`;
    };

    const renderTemplateData = () => {
        if (!entry.templateData || Object.keys(entry.templateData).length === 0) {
            return null;
        }

        const data = entry.templateData;

        // Development template
        if (entry.category === 'development') {
            return (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-white/90">Development Details</h4>
                    {data.branch && (
                        <div>
                            <span className="text-xs text-white/60">Branch:</span>
                            <p className="text-sm text-white/80 font-mono">{data.branch as string}</p>
                        </div>
                    )}
                    {Array.isArray(data.commits) && data.commits.length > 0 && (
                        <div>
                            <span className="text-xs text-white/60">Commits:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {(data.commits as string[]).map((commit, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-1 rounded bg-primary-500/20 text-primary-300 text-xs font-mono"
                                    >
                                        {commit}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {Array.isArray(data.filesChanged) && data.filesChanged.length > 0 && (
                        <div>
                            <span className="text-xs text-white/60">Files Changed:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {(data.filesChanged as string[]).map((file, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs"
                                    >
                                        {file}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {data.status && (
                        <div>
                            <span className="text-xs text-white/60">Status:</span>
                            <span className="ml-2 px-2 py-1 rounded bg-white/10 text-white/80 text-xs">
                                {data.status as string}
                            </span>
                        </div>
                    )}
                </div>
            );
        }

        // Ticket template
        if (entry.category === 'ticket') {
            return (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-white/90">Ticket Details</h4>
                    {data.ticketId && (
                        <div>
                            <span className="text-xs text-white/60">Ticket ID:</span>
                            <p className="text-sm text-white/80 font-mono">{data.ticketId as string}</p>
                        </div>
                    )}
                    {data.ticketUrl && (
                        <div>
                            <span className="text-xs text-white/60">URL:</span>
                            <a
                                href={data.ticketUrl as string}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary-400 hover:text-primary-300 underline break-all"
                            >
                                {data.ticketUrl as string}
                            </a>
                        </div>
                    )}
                    {data.priority && (
                        <div>
                            <span className="text-xs text-white/60">Priority:</span>
                            <span className="ml-2 px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-xs">
                                {data.priority as string}
                            </span>
                        </div>
                    )}
                    {data.resolution && (
                        <div>
                            <span className="text-xs text-white/60">Resolution:</span>
                            <span className="ml-2 px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs">
                                {data.resolution as string}
                            </span>
                        </div>
                    )}
                </div>
            );
        }

        // Documentation template
        if (entry.category === 'documentation') {
            return (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-white/90">Documentation Details</h4>
                    {data.docType && (
                        <div>
                            <span className="text-xs text-white/60">Type:</span>
                            <span className="ml-2 px-2 py-1 rounded bg-violet-500/20 text-violet-300 text-xs">
                                {data.docType as string}
                            </span>
                        </div>
                    )}
                    {Array.isArray(data.sections) && data.sections.length > 0 && (
                        <div>
                            <span className="text-xs text-white/60">Sections:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {(data.sections as string[]).map((section, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-1 rounded bg-violet-500/20 text-violet-300 text-xs"
                                    >
                                        {section}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Generic template data
        return (
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-white/90">Additional Data</h4>
                <pre className="text-xs text-white/60 bg-white/5 p-3 rounded overflow-auto">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        );
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/95 via-slate-900/98 to-slate-900/95 backdrop-blur-2xl shadow-2xl"
                        >
                            {/* HEADER */}
                            <div className="sticky top-0 px-6 py-5 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 text-xl">
                                        {CATEGORY_ICONS[entry.category]}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">{entry.title}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80">
                                                {CATEGORY_LABELS[entry.category]}
                                            </span>
                                            {project && (
                                                <span
                                                    className="px-2 py-0.5 rounded text-xs font-medium"
                                                    style={{
                                                        backgroundColor: `${project.color}20`,
                                                        color: project.color,
                                                    }}
                                                >
                                                    {project.icon} {project.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {onEdit && (
                                        <button
                                            onClick={() => {
                                                onEdit(entry);
                                                onClose();
                                            }}
                                            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                            title="Modifica"
                                        >
                                            <FiEdit2 size={18} />
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="p-2 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                                            title="Elimina"
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                    >
                                        <FiX size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* CONTENT */}
                            <div className="p-6 space-y-6">
                                {/* METADATA */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2 text-sm text-white/60">
                                        <FiCalendar size={16} />
                                        <span>{formatDate(entry.date)}</span>
                                    </div>
                                    {entry.duration && (
                                        <div className="flex items-center gap-2 text-sm text-white/60">
                                            <FiClock size={16} />
                                            <span>{formatDuration(entry.duration)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* CONTENUTO */}
                                {entry.content && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-white/90 mb-2">Note</h3>
                                        <p className="text-sm text-white/80 whitespace-pre-wrap">{entry.content}</p>
                                    </div>
                                )}

                                {/* TEMPLATE DATA */}
                                {renderTemplateData()}

                                {/* TAGS */}
                                {entry.tags && entry.tags.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-white/90 mb-2 flex items-center gap-2">
                                            <FiTag size={14} />
                                            Tag
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {entry.tags.map((tag, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-1 rounded bg-primary-500/20 text-primary-300 text-xs"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TIMESTAMP */}
                                <div className="pt-4 border-t border-white/10 text-xs text-white/40">
                                    Creato: {new Date(entry.createdAt).toLocaleString('it-IT')}
                                    {entry.updatedAt !== entry.createdAt && (
                                        <> • Aggiornato: {new Date(entry.updatedAt).toLocaleString('it-IT')}</>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* DELETE CONFIRMATION */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title="Elimina Entry"
                description={`Sei sicuro di voler eliminare "${entry.title}"? Questa azione non può essere annullata.`}
                confirmLabel="Elimina"
                destructive
                onConfirm={() => {
                    if (onDelete && entry) {
                        onDelete(entry.id);
                        setShowDeleteConfirm(false);
                        onClose();
                    }
                }}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </>
    );
};
