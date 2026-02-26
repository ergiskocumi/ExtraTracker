import type { DragEvent } from 'react';
import { Inbox, User } from 'lucide-react';
import type { Feedback, FeedbackFilters, FeedbackStatus } from '../../types';
import {
    FEEDBACK_PRIORITY_COLORS,
    FEEDBACK_PRIORITY_LABELS,
    FEEDBACK_STATUS_LABELS,
    FEEDBACK_TYPE_COLORS,
    FEEDBACK_TYPE_LABELS,
} from '../../types';
import {
    COMPLETED_STATUSES,
    STATUS_FLOW,
    TYPE_ACCENTS,
    TYPE_ICONS,
} from './constants';
import { formatIssueKey, getAssigneeLabel } from './utils';

interface AdminFeedbackBoardViewProps {
    filters: FeedbackFilters;
    feedbacks: Feedback[];
    feedbackByStatus: Record<FeedbackStatus, Feedback[]>;
    visibleStatuses: FeedbackStatus[];
    total: number;
    hasMore: boolean;
    draggingId: string | null;
    dragOverStatus: FeedbackStatus | null;
    onSelectFeedback: (feedback: Feedback) => void;
    onSetStatusFilter: (status?: FeedbackStatus) => void;
    onDragStart: (event: DragEvent<HTMLDivElement>, feedbackId: string) => void;
    onDragEnd: () => void;
    onDropOnStatus: (event: DragEvent<HTMLDivElement>, status: FeedbackStatus) => void;
    onDragOverStatus: (status: FeedbackStatus | null) => void;
}

export const AdminFeedbackBoardView: React.FC<AdminFeedbackBoardViewProps> = ({
    filters,
    feedbacks,
    feedbackByStatus,
    visibleStatuses,
    total,
    hasMore,
    draggingId,
    dragOverStatus,
    onSelectFeedback,
    onSetStatusFilter,
    onDragStart,
    onDragEnd,
    onDropOnStatus,
    onDragOverStatus,
}) => (
    <div className="space-y-3">
        {visibleStatuses.length < STATUS_FLOW.length && !filters.status && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs text-gray-700 dark:border-white/20 dark:bg-white/8 dark:text-white/70">
                <span className="flex items-center gap-2">
                    <span>Mostrando solo ticket attivi (Aperto, In lavorazione)</span>
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onSetStatusFilter('resolved')}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-gray-800 shadow-sm transition-colors hover:bg-gray-100 dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:hover:text-white"
                    >
                        Mostra Risolti
                    </button>
                    <button
                        onClick={() => onSetStatusFilter('closed')}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-gray-800 shadow-sm transition-colors hover:bg-gray-100 dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:hover:text-white"
                    >
                        Mostra Chiusi
                    </button>
                </div>
            </div>
        )}

        {filters.status && COMPLETED_STATUSES.includes(filters.status) && (
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-white/80">
                <span className="flex items-center gap-2">
                    <span>Filtro attivo: {FEEDBACK_STATUS_LABELS[filters.status]}</span>
                </span>
                <button
                    onClick={() => onSetStatusFilter(undefined)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-gray-800 shadow-sm transition-colors hover:bg-gray-100 dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:hover:text-white"
                >
                    Rimuovi filtro
                </button>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
            {visibleStatuses.map((status) => {
                const items = feedbackByStatus[status] || [];
                const isDragOver = dragOverStatus === status;

                return (
                    <div
                        key={status}
                        onDragOver={(event) => {
                            event.preventDefault();
                            onDragOverStatus(status);
                        }}
                        onDragLeave={() => onDragOverStatus(null)}
                        onDrop={(event) => onDropOnStatus(event, status)}
                        className={`rounded-xl border shadow-lg transition-all ${
                            isDragOver
                                ? 'border-primary-500 ring-2 ring-primary-500/30 bg-primary-500/10 dark:border-primary-500/50 dark:bg-primary-500/15 dark:shadow-primary-500/20'
                                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-white/20 dark:bg-white/[0.08] dark:shadow-black/10 dark:hover:border-white/30'
                        }`}
                    >
                        <div className="flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-gray-50 px-4 py-3.5 dark:border-white/20 dark:bg-white/[0.12]">
                            <span className="text-xs font-bold uppercase tracking-[0.1em] text-gray-800 dark:text-white/90">
                                {FEEDBACK_STATUS_LABELS[status]}
                            </span>
                            <span className="rounded-lg border border-gray-300 bg-white px-2 py-0.5 text-xs font-semibold text-gray-700 shadow-sm dark:border-white/30 dark:bg-white/20 dark:text-white/80">
                                {items.length}
                            </span>
                        </div>

                        <div className="min-h-[200px] space-y-3 bg-gradient-to-b from-gray-50/80 to-transparent p-4 dark:from-white/[0.04] dark:to-transparent">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                                    <Inbox className="h-8 w-8 text-gray-300 dark:text-white/30" aria-hidden />
                                    <p className="text-sm font-medium text-gray-500 dark:text-white/50">
                                        Nessun ticket
                                    </p>
                                    <p className="max-w-[140px] text-[11px] leading-snug text-gray-400 dark:text-white/40">
                                        Trascina qui i card da altre colonne o usa i filtri per cercare in altri stati.
                                    </p>
                                </div>
                            ) : (
                                items.map((feedback) => {
                                    const TypeIcon = TYPE_ICONS[feedback.type];
                                    return (
                                        <div
                                            key={feedback._id}
                                            draggable
                                            onDragStart={(event) => onDragStart(event, feedback._id)}
                                            onDragEnd={onDragEnd}
                                            onClick={() => onSelectFeedback(feedback)}
                                            className={`rounded-lg border p-3.5 shadow-md cursor-pointer transition-all group ${
                                                draggingId === feedback._id
                                                    ? 'scale-95 opacity-50 border-primary-500/40'
                                                    : 'border-gray-200 bg-white hover:border-primary-500/50 hover:shadow-lg dark:border-white/20 dark:bg-white/[0.12] dark:shadow-black/5 dark:hover:border-primary-500/40 dark:hover:bg-white/[0.18] dark:hover:shadow-primary-500/10 hover:scale-[1.02]'
                                            }`}
                                        >
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${TYPE_ACCENTS[feedback.type]}`} />
                                                <span className="font-mono text-[10px] font-semibold tracking-wide text-gray-600 dark:text-white/70">
                                                    {formatIssueKey(feedback)}
                                                </span>
                                            </div>
                                            <p className="mb-2.5 line-clamp-2 text-sm font-bold leading-snug text-gray-900 transition-colors group-hover:text-gray-800 dark:text-white dark:group-hover:text-white/95">
                                                {feedback.title}
                                            </p>
                                            <div className="mb-2.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/60">
                                                <User className="h-3 w-3 text-gray-400 dark:text-white/50" />
                                                <span className="truncate">{getAssigneeLabel(feedback.assignee)}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-2 dark:border-white/10">
                                                <span
                                                    className={`px-2 py-1 text-[10px] font-semibold rounded-md border shadow-sm ${FEEDBACK_PRIORITY_COLORS[feedback.priority]}`}
                                                >
                                                    {FEEDBACK_PRIORITY_LABELS[feedback.priority]}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border shadow-sm ${FEEDBACK_TYPE_COLORS[feedback.type]}`}
                                                >
                                                    <TypeIcon className="w-2.5 h-2.5" />
                                                    {FEEDBACK_TYPE_LABELS[feedback.type]}
                                                </span>
                                                {(feedback.labels || []).slice(0, 2).map((label) => (
                                                    <span
                                                        key={`${feedback._id}-${label}`}
                                                        className="rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600 dark:border-white/20 dark:bg-white/10 dark:text-white/70"
                                                    >
                                                        {label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        {hasMore && (
            <p className="text-xs text-gray-500 dark:text-white/40">
                Mostrati {feedbacks.length} di {total} ticket. Affina i filtri o passa
                alla lista per caricare altro.
            </p>
        )}
    </div>
);

