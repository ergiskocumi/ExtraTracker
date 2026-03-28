/**
 * 📝 MY FEEDBACK LIST - Lista dei propri feedback
 *
 * Mostra i feedback inviati dall'utente con badge status colorati
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bug,
    Lightbulb,
    HelpCircle,
    Sparkles,
    MoreHorizontal,
    Clock,
    Paperclip,
    ChevronDown,
    ChevronUp,
    Loader2,
    RefreshCw,
    Inbox,
} from 'lucide-react';
import { feedbackService } from '../services/feedbackService';
import type { Feedback, FeedbackComment, FeedbackType } from '../types';
import {
    FEEDBACK_STATUS_LABELS,
    FEEDBACK_STATUS_COLORS,
    FEEDBACK_PRIORITY_LABELS,
    FEEDBACK_PRIORITY_COLORS,
    FEEDBACK_TYPE_COLORS,
} from '../types';

interface MyFeedbackListProps {
    refreshTrigger?: number;
}

const TYPE_ICONS: Record<FeedbackType, typeof Bug> = {
    bug: Bug,
    feature: Lightbulb,
    improvement: Sparkles,
    question: HelpCircle,
    other: MoreHorizontal,
};

export const MyFeedbackList: React.FC<MyFeedbackListProps> = ({ refreshTrigger }) => {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);

    const loadFeedbacks = useCallback(async (pageNum: number, append = false) => {
        try {
            setIsLoading(true);
            const response = await feedbackService.getMyFeedback(pageNum, 10);

            if (response.success && response.data) {
                if (append) {
                    setFeedbacks((prev) => [...prev, ...response.data!]);
                } else {
                    setFeedbacks(response.data);
                }
                setHasMore(response.meta?.hasMore ?? false);
                setTotal(response.meta?.total ?? 0);
            }
        } catch (error) {
            console.error('Errore caricamento feedback:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        setPage(1);
        loadFeedbacks(1, false);
    }, [refreshTrigger, loadFeedbacks]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadFeedbacks(nextPage, true);
    };

    const handleRefresh = () => {
        setPage(1);
        loadFeedbacks(1, false);
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getCommentAuthor = (comment: FeedbackComment): string => {
        if (!comment.author) return 'Team Silvi';
        if (typeof comment.author === 'string') return 'Team Silvi';
        if (comment.author.profile?.displayName) return comment.author.profile.displayName;
        if (comment.author.profile?.firstName || comment.author.profile?.lastName) {
            return `${comment.author.profile.firstName || ''} ${comment.author.profile.lastName || ''}`.trim();
        }
        return comment.author.email;
    };

    const toggleExpand = (id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    if (isLoading && feedbacks.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-white/40" />
            </div>
        );
    }

    if (feedbacks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-white/5 mb-4">
                    <Inbox className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-white/60 font-medium">Nessun feedback inviato</p>
                <p className="text-white/40 text-sm mt-1">
                    I tuoi feedback appariranno qui
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">
                    {total} feedback {total === 1 ? 'inviato' : 'inviati'}
                </p>
                <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Aggiorna
                </button>
            </div>

            {/* List */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {feedbacks.map((feedback) => {
                        const TypeIcon = TYPE_ICONS[feedback.type];
                        const isExpanded = expandedId === feedback._id;

                        return (
                            <motion.div
                                key={feedback._id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
                            >
                                {/* Header Row */}
                                <button
                                    onClick={() => toggleExpand(feedback._id)}
                                    className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
                                >
                                    {/* Icon */}
                                    <div
                                        className={`p-2 rounded-lg ${FEEDBACK_TYPE_COLORS[feedback.type]}`}
                                    >
                                        <TypeIcon className="w-4 h-4" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="font-medium text-white truncate">
                                                {feedback.title}
                                            </h4>
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4 text-white/40 flex-shrink-0" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
                                            )}
                                        </div>

                                        {/* Badges */}
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            <span
                                                className={`px-2 py-0.5 text-xs rounded-full border ${FEEDBACK_STATUS_COLORS[feedback.status]}`}
                                            >
                                                {FEEDBACK_STATUS_LABELS[feedback.status]}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 text-xs rounded-full border ${FEEDBACK_PRIORITY_COLORS[feedback.priority]}`}
                                            >
                                                {FEEDBACK_PRIORITY_LABELS[feedback.priority]}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-white/40">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(feedback.createdAt)}
                                            </span>
                                            {feedback.attachments?.length > 0 && (
                                                <span className="flex items-center gap-1 text-xs text-white/40">
                                                    <Paperclip className="w-3 h-3" />
                                                    {feedback.attachments.length}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded Content */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 pt-0 border-t border-white/5">
                                                <div className="pt-4">
                                                    <p className="text-sm text-white/60 whitespace-pre-wrap">
                                                        {feedback.description}
                                                    </p>

                                                    {/* Attachments */}
                                                    {feedback.attachments?.length > 0 && (
                                                        <div className="mt-4 space-y-3">
                                                            <p className="text-xs text-white/40 mb-2">
                                                                Allegati:
                                                            </p>
                                                            <div className="space-y-3">
                                                                {feedback.attachments.map((attachment, index) => {
                                                                    const isImage = attachment.mimetype?.startsWith('image/') || 
                                                                                   /\.(png|jpg|jpeg|gif|webp)$/i.test(attachment.originalName);
                                                                    const imageUrl = `/uploads/feedback/${attachment.filename}`;
                                                                    
                                                                    return (
                                                                        <div key={index} className="space-y-2">
                                                                            {isImage ? (
                                                                                <div className="space-y-2">
                                                                                    <a
                                                                                        href={imageUrl}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="block group"
                                                                                    >
                                                                                        <img
                                                                                            src={imageUrl}
                                                                                            alt={attachment.originalName}
                                                                                            className="w-full max-w-xl rounded-lg border border-white/10 bg-white/5 object-contain max-h-64 cursor-pointer hover:opacity-90 transition-opacity"
                                                                                            loading="lazy"
                                                                                        />
                                                                                    </a>
                                                                                    <a
                                                                                        href={imageUrl}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="inline-flex items-center gap-2 px-2 py-1 text-xs rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                                                                    >
                                                                                        <Paperclip className="w-3 h-3" />
                                                                                        {attachment.originalName}
                                                                                    </a>
                                                                                </div>
                                                                            ) : (
                                                                                <a
                                                                                    href={imageUrl}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="inline-flex items-center gap-2 px-2 py-1 text-xs rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                                                                >
                                                                                    <Paperclip className="w-3 h-3" />
                                                                                    {attachment.originalName}
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Resolution info */}
                                                    {feedback.resolvedAt && (
                                                        <p className="mt-4 text-xs text-emerald-400/80">
                                                            Risolto il {formatDate(feedback.resolvedAt)}
                                                        </p>
                                                    )}

                                                    {/* Comments */}
                                                    {(feedback.comments || []).length > 0 && (
                                                        <div className="mt-4">
                                                            <p className="text-xs text-white/40 mb-2">
                                                                Aggiornamenti dal team:
                                                            </p>
                                                            <div className="space-y-2">
                                                                {(feedback.comments || []).map((comment, index) => (
                                                                    <div
                                                                        key={`${comment.createdAt}-${index}`}
                                                                        className="p-2 rounded-lg bg-white/5 border border-white/10"
                                                                    >
                                                                        <p className="text-xs text-white/70 whitespace-pre-wrap">
                                                                            {comment.message}
                                                                        </p>
                                                                        <div className="mt-1 text-[10px] text-white/40">
                                                                            {getCommentAuthor(comment)} • {formatDate(comment.createdAt)}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Load More */}
            {hasMore && (
                <div className="flex justify-center pt-2">
                    <button
                        onClick={handleLoadMore}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
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
        </div>
    );
};
