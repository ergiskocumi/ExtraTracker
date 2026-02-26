import { Inbox, Loader2, Paperclip, User } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Feedback } from '../../types';
import {
    FEEDBACK_PRIORITY_COLORS,
    FEEDBACK_PRIORITY_LABELS,
    FEEDBACK_STATUS_COLORS,
    FEEDBACK_STATUS_LABELS,
    FEEDBACK_TYPE_COLORS,
    FEEDBACK_TYPE_LABELS,
} from '../../types';
import { TYPE_ACCENTS, TYPE_ICONS } from './constants';
import {
    formatDate,
    formatIssueKey,
    getAssigneeLabel,
    getUserDisplayName,
} from './utils';

interface AdminFeedbackListViewProps {
    feedbacks: Feedback[];
    isLoading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    onSelectFeedback: (feedback: Feedback) => void;
}

export const AdminFeedbackListView: React.FC<AdminFeedbackListViewProps> = ({
    feedbacks,
    isLoading,
    hasMore,
    onLoadMore,
    onSelectFeedback,
}) => {
    if (isLoading && feedbacks.length === 0) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
        );
    }

    if (feedbacks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="p-4 rounded-full bg-white/5 mb-4">
                    <Inbox className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-white/60 font-medium">Nessun feedback trovato</p>
                <p className="text-white/40 text-sm mt-1">
                    Prova a modificare i filtri
                </p>
            </div>
        );
    }

    return (
        <>
            {feedbacks.map((feedback) => {
                const TypeIcon = TYPE_ICONS[feedback.type];

                return (
                    <motion.div
                        key={feedback._id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden rounded-xl border border-white/20 bg-white/[0.08] shadow-md shadow-black/5 p-5 cursor-pointer transition-all hover:border-white/30 hover:bg-white/[0.12] hover:shadow-lg hover:shadow-black/10 group"
                        onClick={() => onSelectFeedback(feedback)}
                    >
                        <div className={`absolute inset-y-0 left-0 w-1.5 ${TYPE_ACCENTS[feedback.type]} group-hover:w-2 transition-all`} />
                        <div className="space-y-4 pl-1">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-xs text-white/60">
                                        <span className="font-mono font-semibold tracking-wide text-white/80">
                                            {formatIssueKey(feedback)}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-white/40" />
                                        <span>{formatDate(feedback.createdAt)}</span>
                                    </div>
                                    <h4 className="text-base font-bold text-white leading-snug group-hover:text-white/95 transition-colors">
                                        {feedback.title}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                                        <span className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-white/50" />
                                            {getUserDisplayName(feedback.user)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-white/50" />
                                            {getAssigneeLabel(feedback.assignee)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                    <span
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-sm ${FEEDBACK_STATUS_COLORS[feedback.status]}`}
                                    >
                                        {FEEDBACK_STATUS_LABELS[feedback.status]}
                                    </span>
                                    <span
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-sm ${FEEDBACK_PRIORITY_COLORS[feedback.priority]}`}
                                    >
                                        {FEEDBACK_PRIORITY_LABELS[feedback.priority]}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                                <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shadow-sm ${FEEDBACK_TYPE_COLORS[feedback.type]}`}
                                >
                                    <TypeIcon className="w-3.5 h-3.5" />
                                    <span className="text-xs font-medium">{FEEDBACK_TYPE_LABELS[feedback.type]}</span>
                                </span>
                                {feedback.attachments?.length > 0 && (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/20 bg-white/10 text-white/70 text-xs font-medium">
                                        <Paperclip className="w-3.5 h-3.5" />
                                        {feedback.attachments.length} allegati
                                    </span>
                                )}
                                {(feedback.labels || []).map((label) => (
                                    <span
                                        key={`${feedback._id}-${label}`}
                                        className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/70 text-xs font-medium"
                                    >
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                );
            })}

            {hasMore && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={onLoadMore}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-white/10 border border-white/20 text-white/80 hover:text-white hover:bg-white/15 hover:border-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Caricamento...
                            </>
                        ) : (
                            'Carica altri'
                        )}
                    </button>
                </div>
            )}
        </>
    );
};

