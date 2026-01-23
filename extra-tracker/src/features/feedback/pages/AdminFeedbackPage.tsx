/**
 * 📝 ADMIN FEEDBACK PAGE - Dashboard gestione ticket
 *
 * Features:
 * - Cards statistiche
 * - Filtro per status
 * - Tabella tickets
 * - Dettagli e azioni
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Bug,
    Lightbulb,
    HelpCircle,
    Sparkles,
    MoreHorizontal,
    Clock,
    Paperclip,
    User,
    ChevronDown,
    ChevronUp,
    Loader2,
    RefreshCw,
    Inbox,
    Filter,
    Search,
    Trash2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { feedbackService } from '../services/feedbackService';
import { emitToast } from '../../../shared/components/toast';
import type {
    Feedback,
    FeedbackType,
    FeedbackStatus,
    FeedbackPriority,
    FeedbackStats,
    FeedbackFilters,
    FeedbackUser,
} from '../types';
import {
    FEEDBACK_TYPE_LABELS,
    FEEDBACK_STATUS_LABELS,
    FEEDBACK_STATUS_COLORS,
    FEEDBACK_PRIORITY_LABELS,
    FEEDBACK_PRIORITY_COLORS,
    FEEDBACK_TYPE_COLORS,
} from '../types';

const TYPE_ICONS: Record<FeedbackType, typeof Bug> = {
    bug: Bug,
    feature: Lightbulb,
    improvement: Sparkles,
    question: HelpCircle,
    other: MoreHorizontal,
};

const STATUS_OPTIONS: { value: FeedbackStatus | ''; label: string }[] = [
    { value: '', label: 'Tutti gli stati' },
    { value: 'open', label: FEEDBACK_STATUS_LABELS.open },
    { value: 'in_progress', label: FEEDBACK_STATUS_LABELS.in_progress },
    { value: 'resolved', label: FEEDBACK_STATUS_LABELS.resolved },
    { value: 'closed', label: FEEDBACK_STATUS_LABELS.closed },
    { value: 'wont_fix', label: FEEDBACK_STATUS_LABELS.wont_fix },
];

const TYPE_OPTIONS: { value: FeedbackType | ''; label: string }[] = [
    { value: '', label: 'Tutti i tipi' },
    { value: 'bug', label: FEEDBACK_TYPE_LABELS.bug },
    { value: 'feature', label: FEEDBACK_TYPE_LABELS.feature },
    { value: 'improvement', label: FEEDBACK_TYPE_LABELS.improvement },
    { value: 'question', label: FEEDBACK_TYPE_LABELS.question },
    { value: 'other', label: FEEDBACK_TYPE_LABELS.other },
];

const PRIORITY_OPTIONS: { value: FeedbackPriority | ''; label: string }[] = [
    { value: '', label: 'Tutte le priorità' },
    { value: 'critical', label: FEEDBACK_PRIORITY_LABELS.critical },
    { value: 'high', label: FEEDBACK_PRIORITY_LABELS.high },
    { value: 'medium', label: FEEDBACK_PRIORITY_LABELS.medium },
    { value: 'low', label: FEEDBACK_PRIORITY_LABELS.low },
];

export const AdminFeedbackPage: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [stats, setStats] = useState<FeedbackStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);

    // Filters
    const [filters, setFilters] = useState<FeedbackFilters>({
        status: undefined,
        type: undefined,
        priority: undefined,
        search: '',
    });

    const loadStats = useCallback(async () => {
        try {
            setIsLoadingStats(true);
            const response = await feedbackService.getStats();
            if (response.success && response.data) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Errore caricamento statistiche:', error);
        } finally {
            setIsLoadingStats(false);
        }
    }, []);

    const loadFeedbacks = useCallback(
        async (pageNum: number, append = false) => {
            try {
                setIsLoading(true);
                const response = await feedbackService.getAllFeedback({
                    ...filters,
                    page: pageNum,
                    limit: 20,
                });

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
        },
        [filters]
    );

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        setPage(1);
        loadFeedbacks(1, false);
    }, [filters, loadFeedbacks]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadFeedbacks(nextPage, true);
    };

    const handleRefresh = () => {
        setPage(1);
        loadFeedbacks(1, false);
        loadStats();
    };

    const handleUpdateStatus = async (id: string, status: FeedbackStatus) => {
        try {
            setIsUpdating(true);
            await feedbackService.updateFeedback(id, { status });
            emitToast.success('Stato aggiornato');

            // Update local state
            setFeedbacks((prev) =>
                prev.map((f) => (f._id === id ? { ...f, status } : f))
            );
            if (selectedFeedback?._id === id) {
                setSelectedFeedback((prev) => (prev ? { ...prev, status } : null));
            }

            loadStats();
        } catch (error) {
            console.error('Errore aggiornamento stato:', error);
            emitToast.error('Errore durante l\'aggiornamento');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Sei sicuro di voler eliminare questo feedback?')) {
            return;
        }

        try {
            await feedbackService.deleteFeedback(id);
            emitToast.success('Feedback eliminato');

            setFeedbacks((prev) => prev.filter((f) => f._id !== id));
            if (selectedFeedback?._id === id) {
                setSelectedFeedback(null);
            }

            loadStats();
        } catch (error) {
            console.error('Errore eliminazione:', error);
            emitToast.error('Errore durante l\'eliminazione');
        }
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

    const getUserDisplayName = (user: FeedbackUser | string): string => {
        if (typeof user === 'string') return user;
        if (user.profile?.displayName) return user.profile.displayName;
        if (user.profile?.firstName || user.profile?.lastName) {
            return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
        }
        return user.email;
    };

    return (
        <div className="min-h-screen p-4 md:p-6 lg:p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto space-y-6"
            >
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/dashboard"
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">
                                Gestione Feedback
                            </h1>
                            <p className="text-white/60 text-sm mt-1">
                                Dashboard amministrazione ticket
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Aggiorna
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/15">
                                <MessageSquare className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {isLoadingStats ? '-' : stats?.total || 0}
                                </p>
                                <p className="text-xs text-white/50">Totale</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-yellow-500/15">
                                <Clock className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {isLoadingStats ? '-' : stats?.byStatus?.open || 0}
                                </p>
                                <p className="text-xs text-white/50">Aperti</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/15">
                                <Loader2 className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {isLoadingStats ? '-' : stats?.byStatus?.in_progress || 0}
                                </p>
                                <p className="text-xs text-white/50">In lavorazione</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/15">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {isLoadingStats ? '-' : stats?.byStatus?.resolved || 0}
                                </p>
                                <p className="text-xs text-white/50">Risolti</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-white/60">
                            <Filter className="w-4 h-4" />
                            <span className="text-sm font-medium">Filtri:</span>
                        </div>

                        {/* Status Filter */}
                        <select
                            value={filters.status || ''}
                            onChange={(e) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    status: (e.target.value as FeedbackStatus) || undefined,
                                }))
                            }
                            className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white"
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-dark-300">
                                    {opt.label}
                                </option>
                            ))}
                        </select>

                        {/* Type Filter */}
                        <select
                            value={filters.type || ''}
                            onChange={(e) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    type: (e.target.value as FeedbackType) || undefined,
                                }))
                            }
                            className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white"
                        >
                            {TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-dark-300">
                                    {opt.label}
                                </option>
                            ))}
                        </select>

                        {/* Priority Filter */}
                        <select
                            value={filters.priority || ''}
                            onChange={(e) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    priority: (e.target.value as FeedbackPriority) || undefined,
                                }))
                            }
                            className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white"
                        >
                            {PRIORITY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-dark-300">
                                    {opt.label}
                                </option>
                            ))}
                        </select>

                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    type="text"
                                    value={filters.search || ''}
                                    onChange={(e) =>
                                        setFilters((prev) => ({ ...prev, search: e.target.value }))
                                    }
                                    placeholder="Cerca..."
                                    className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40"
                                />
                            </div>
                        </div>

                        <p className="text-sm text-white/40 ml-auto">{total} risultati</p>
                    </div>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Feedback List */}
                    <div className="lg:col-span-2 space-y-3">
                        {isLoading && feedbacks.length === 0 ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-white/40" />
                            </div>
                        ) : feedbacks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-white/10 bg-white/[0.03]">
                                <div className="p-4 rounded-full bg-white/5 mb-4">
                                    <Inbox className="w-8 h-8 text-white/30" />
                                </div>
                                <p className="text-white/60 font-medium">Nessun feedback trovato</p>
                                <p className="text-white/40 text-sm mt-1">
                                    Prova a modificare i filtri
                                </p>
                            </div>
                        ) : (
                            <>
                                {feedbacks.map((feedback) => {
                                    const TypeIcon = TYPE_ICONS[feedback.type];
                                    const isSelected = selectedFeedback?._id === feedback._id;

                                    return (
                                        <motion.div
                                            key={feedback._id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                                isSelected
                                                    ? 'border-primary-500/50 bg-primary-500/10'
                                                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                                            }`}
                                            onClick={() => setSelectedFeedback(feedback)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={`p-2 rounded-lg flex-shrink-0 ${FEEDBACK_TYPE_COLORS[feedback.type]}`}
                                                >
                                                    <TypeIcon className="w-4 h-4" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="font-medium text-white truncate">
                                                            {feedback.title}
                                                        </h4>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-1 text-xs text-white/50">
                                                        <User className="w-3 h-3" />
                                                        <span>
                                                            {getUserDisplayName(feedback.user)}
                                                        </span>
                                                        <span>•</span>
                                                        <Clock className="w-3 h-3" />
                                                        <span>{formatDate(feedback.createdAt)}</span>
                                                    </div>

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
                                                        {feedback.attachments?.length > 0 && (
                                                            <span className="flex items-center gap-1 text-xs text-white/40">
                                                                <Paperclip className="w-3 h-3" />
                                                                {feedback.attachments.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}

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
                            </>
                        )}
                    </div>

                    {/* Detail Panel */}
                    <div className="lg:col-span-1">
                        <AnimatePresence mode="wait">
                            {selectedFeedback ? (
                                <motion.div
                                    key={selectedFeedback._id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="sticky top-4 p-5 rounded-xl border border-white/10 bg-white/[0.03] space-y-4"
                                >
                                    <div className="flex items-start justify-between">
                                        <h3 className="font-semibold text-white">
                                            {selectedFeedback.title}
                                        </h3>
                                        <button
                                            onClick={() => setSelectedFeedback(null)}
                                            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Meta */}
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-white/60">
                                            <User className="w-4 h-4" />
                                            <span>{getUserDisplayName(selectedFeedback.user)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-white/60">
                                            <Clock className="w-4 h-4" />
                                            <span>{formatDate(selectedFeedback.createdAt)}</span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="pt-2 border-t border-white/10">
                                        <p className="text-sm text-white/70 whitespace-pre-wrap">
                                            {selectedFeedback.description}
                                        </p>
                                    </div>

                                    {/* Attachments */}
                                    {selectedFeedback.attachments?.length > 0 && (
                                        <div className="pt-2 border-t border-white/10">
                                            <p className="text-xs text-white/40 mb-2">Allegati:</p>
                                            <div className="space-y-1">
                                                {selectedFeedback.attachments.map((att, i) => (
                                                    <div
                                                        key={i}
                                                        className="px-2 py-1.5 text-xs rounded-lg bg-white/5 text-white/60"
                                                    >
                                                        {att.originalName}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="pt-4 border-t border-white/10 space-y-3">
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1">
                                                Cambia stato
                                            </label>
                                            <select
                                                value={selectedFeedback.status}
                                                onChange={(e) =>
                                                    handleUpdateStatus(
                                                        selectedFeedback._id,
                                                        e.target.value as FeedbackStatus
                                                    )
                                                }
                                                disabled={isUpdating}
                                                className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50"
                                            >
                                                {STATUS_OPTIONS.filter((o) => o.value).map((opt) => (
                                                    <option
                                                        key={opt.value}
                                                        value={opt.value}
                                                        className="bg-dark-300"
                                                    >
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <button
                                            onClick={() => handleDelete(selectedFeedback._id)}
                                            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Elimina feedback
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="sticky top-4 p-8 rounded-xl border border-white/10 bg-white/[0.03] text-center"
                                >
                                    <div className="p-4 rounded-full bg-white/5 inline-block mb-3">
                                        <MessageSquare className="w-6 h-6 text-white/30" />
                                    </div>
                                    <p className="text-white/50 text-sm">
                                        Seleziona un feedback per vedere i dettagli
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
