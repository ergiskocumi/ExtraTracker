/**
 * 📝 ADMIN FEEDBACK PAGE - Dashboard gestione ticket
 *
 * Features:
 * - Cards statistiche
 * - Filtro per status
 * - Tabella tickets
 * - Dettagli e azioni
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
    Tag,
    Send,
    LayoutGrid,
    List,
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
    FeedbackActivity,
    FeedbackActivityType,
    UpdateFeedbackDTO,
    FeedbackComment,
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

const STATUS_FLOW: FeedbackStatus[] = [
    'open',
    'in_progress',
    'resolved',
    'closed',
    'wont_fix',
];

const ACTIVITY_ICONS: Record<FeedbackActivityType, typeof MessageSquare> = {
    created: MessageSquare,
    status_change: CheckCircle,
    priority_change: AlertTriangle,
    assignee_change: User,
    labels_update: Tag,
    comment_added: MessageSquare,
    note_added: MessageSquare,
    note_updated: MessageSquare,
    note_cleared: MessageSquare,
};

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
    const [noteDraft, setNoteDraft] = useState('');
    const [commentDraft, setCommentDraft] = useState('');
    const [labelDraft, setLabelDraft] = useState('');
    const [adminUsers, setAdminUsers] = useState<FeedbackUser[]>([]);
    const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<FeedbackStatus | null>(null);

    // Filters
    const [filters, setFilters] = useState<FeedbackFilters>({
        status: undefined,
        type: undefined,
        priority: undefined,
        search: '',
        assignee: undefined,
        labels: [],
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

    const loadAdminUsers = useCallback(async () => {
        try {
            setIsLoadingAdmins(true);
            const response = await feedbackService.getAdminUsers();
            if (response.success && response.data) {
                setAdminUsers(response.data);
            }
        } catch (error) {
            console.error('Errore caricamento admin:', error);
        } finally {
            setIsLoadingAdmins(false);
        }
    }, []);

    const loadFeedbacks = useCallback(
        async (pageNum: number, append = false) => {
            try {
                setIsLoading(true);
                const pageLimit = viewMode === 'board' ? 100 : 20;
                const response = await feedbackService.getAllFeedback({
                    ...filters,
                    page: pageNum,
                    limit: pageLimit,
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
        [filters, viewMode]
    );

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        loadAdminUsers();
    }, [loadAdminUsers]);

    useEffect(() => {
        setPage(1);
        loadFeedbacks(1, false);
    }, [filters, loadFeedbacks]);

    useEffect(() => {
        if (selectedFeedback) {
            setNoteDraft(selectedFeedback.adminNotes || '');
            setCommentDraft('');
            setLabelDraft('');
        } else {
            setNoteDraft('');
            setCommentDraft('');
            setLabelDraft('');
        }
    }, [selectedFeedback?._id, selectedFeedback?.adminNotes]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadFeedbacks(nextPage, true);
    };

    const handleRefresh = () => {
        setPage(1);
        loadFeedbacks(1, false);
        loadStats();
        loadAdminUsers();
    };

    const handleUpdateFeedback = async (
        id: string,
        updates: UpdateFeedbackDTO,
        successMessage = 'Aggiornamento salvato'
    ) => {
        try {
            setIsUpdating(true);
            const response = await feedbackService.updateFeedback(id, updates);
            const localUpdates = { ...updates };
            delete (localUpdates as Partial<UpdateFeedbackDTO>).comment;

            if (response.success && response.data) {
                setFeedbacks((prev) =>
                    prev.map((f) => (f._id === id ? response.data : f))
                );
                if (selectedFeedback?._id === id) {
                    setSelectedFeedback(response.data);
                }
            } else {
                setFeedbacks((prev) =>
                    prev.map((f) => (f._id === id ? { ...f, ...localUpdates } : f))
                );
                if (selectedFeedback?._id === id) {
                    setSelectedFeedback((prev) => (prev ? { ...prev, ...localUpdates } : null));
                }
            }

            emitToast.success(successMessage);
            loadStats();
        } catch (error) {
            console.error('Errore aggiornamento feedback:', error);
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

    const formatIssueKey = (feedback: Feedback): string =>
        `FB-${feedback._id.slice(-6).toUpperCase()}`;

    const getUserDisplayName = (user: FeedbackUser | string): string => {
        if (typeof user === 'string') return user;
        if (user.profile?.displayName) return user.profile.displayName;
        if (user.profile?.firstName || user.profile?.lastName) {
            return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
        }
        return user.email;
    };

    const getAssigneeLabel = (assignee?: FeedbackUser | string | null): string => {
        if (!assignee) return 'Non assegnato';
        if (typeof assignee === 'string') return assignee;
        if (assignee.profile?.displayName) return assignee.profile.displayName;
        if (assignee.profile?.firstName || assignee.profile?.lastName) {
            return `${assignee.profile.firstName || ''} ${assignee.profile.lastName || ''}`.trim();
        }
        return assignee.email;
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

    const normalizeLabel = (label: string): string => label.trim().toLowerCase();

    const getActivityItems = (feedback: Feedback): FeedbackActivity[] => {
        const items = Array.isArray(feedback.activity) ? [...feedback.activity] : [];

        if (items.length === 0) {
            return [{
                type: 'created',
                message: 'Ticket creato',
                createdAt: feedback.createdAt,
                performedBy: feedback.user,
            }];
        }

        return items.sort(
            (a, b) => new Date(b.createdAt || feedback.createdAt).getTime()
                - new Date(a.createdAt || feedback.createdAt).getTime()
        );
    };

    const getActivityActor = (activity: FeedbackActivity, feedback: Feedback): string => {
        const performedBy = activity.performedBy;
        if (!performedBy) return 'Sistema';

        if (typeof performedBy === 'string') {
            const feedbackUserId =
                typeof feedback.user === 'string' ? feedback.user : feedback.user._id;
            return performedBy === feedbackUserId ? 'Utente' : 'Admin';
        }

        if (performedBy.profile?.displayName) return performedBy.profile.displayName;
        if (performedBy.profile?.firstName || performedBy.profile?.lastName) {
            return `${performedBy.profile.firstName || ''} ${performedBy.profile.lastName || ''}`.trim();
        }
        return performedBy.email || 'Admin';
    };

    const getActivityMessage = (activity: FeedbackActivity): string => {
        if (activity.message) return activity.message;

        if (activity.type === 'status_change') {
            const fromLabel = FEEDBACK_STATUS_LABELS[activity.from as FeedbackStatus] || activity.from;
            const toLabel = FEEDBACK_STATUS_LABELS[activity.to as FeedbackStatus] || activity.to;
            return `Stato aggiornato: ${fromLabel || '-'} → ${toLabel || '-'}`;
        }

        if (activity.type === 'priority_change') {
            const fromLabel = FEEDBACK_PRIORITY_LABELS[activity.from as FeedbackPriority] || activity.from;
            const toLabel = FEEDBACK_PRIORITY_LABELS[activity.to as FeedbackPriority] || activity.to;
            return `Priorità aggiornata: ${fromLabel || '-'} → ${toLabel || '-'}`;
        }

        if (activity.type === 'assignee_change') {
            return 'Assegnazione aggiornata';
        }

        if (activity.type === 'labels_update') {
            return 'Etichette aggiornate';
        }

        if (activity.type === 'comment_added') {
            return 'Commento inviato all\'utente';
        }

        return 'Aggiornamento ticket';
    };

    const handleAddLabel = () => {
        if (!selectedFeedback) return;
        const nextLabel = normalizeLabel(labelDraft);
        if (!nextLabel) return;

        const nextLabels = Array.from(new Set([...(selectedFeedback.labels || []), nextLabel]));
        setLabelDraft('');
        handleUpdateFeedback(selectedFeedback._id, { labels: nextLabels }, 'Etichette aggiornate');
    };

    const handleRemoveLabel = (label: string) => {
        if (!selectedFeedback) return;
        const nextLabels = (selectedFeedback.labels || []).filter((item) => item !== label);
        handleUpdateFeedback(selectedFeedback._id, { labels: nextLabels }, 'Etichette aggiornate');
    };

    const handleSubmitComment = () => {
        if (!selectedFeedback) return;
        const trimmed = commentDraft.trim();
        if (!trimmed) return;
        setCommentDraft('');
        handleUpdateFeedback(selectedFeedback._id, { comment: trimmed }, 'Commento inviato');
    };

    const handleDragStart = (event: React.DragEvent<HTMLDivElement>, feedbackId: string) => {
        event.dataTransfer.setData('feedbackId', feedbackId);
        event.dataTransfer.effectAllowed = 'move';
        setDraggingId(feedbackId);
    };

    const handleDragEnd = () => {
        setDraggingId(null);
        setDragOverStatus(null);
    };

    const handleDropOnStatus = (event: React.DragEvent<HTMLDivElement>, status: FeedbackStatus) => {
        event.preventDefault();
        const feedbackId = event.dataTransfer.getData('feedbackId');
        if (!feedbackId) return;
        const current = feedbacks.find((item) => item._id === feedbackId);
        if (current?.status === status) {
            setDragOverStatus(null);
            return;
        }
        setDragOverStatus(null);
        handleUpdateFeedback(feedbackId, { status }, 'Stato aggiornato');
    };

    const noteSnapshot = selectedFeedback?.adminNotes || '';
    const isNoteDirty = selectedFeedback ? noteDraft.trim() !== noteSnapshot : false;
    const activityItems = selectedFeedback ? getActivityItems(selectedFeedback) : [];
    const commentList = selectedFeedback?.comments || [];
    const labelList = selectedFeedback?.labels || [];
    const assigneeId = selectedFeedback
        ? (typeof selectedFeedback.assignee === 'string'
            ? selectedFeedback.assignee
            : selectedFeedback.assignee?._id || '')
        : '';

    const feedbackByStatus = useMemo(() => {
        const grouped: Record<FeedbackStatus, Feedback[]> = {
            open: [],
            in_progress: [],
            resolved: [],
            closed: [],
            wont_fix: [],
        };

        feedbacks.forEach((item) => {
            grouped[item.status]?.push(item);
        });

        return grouped;
    }, [feedbacks]);

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
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                    viewMode === 'list'
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/50 hover:text-white'
                                }`}
                            >
                                <List className="w-3.5 h-3.5" />
                                Lista
                            </button>
                            <button
                                onClick={() => setViewMode('board')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                    viewMode === 'board'
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/50 hover:text-white'
                                }`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                Board
                            </button>
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

                        {/* Assignee Filter */}
                        <select
                            value={filters.assignee || ''}
                            onChange={(e) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    assignee: e.target.value || undefined,
                                }))
                            }
                            className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white"
                        >
                            <option value="" className="bg-dark-300">Tutti gli assegnatari</option>
                            <option value="unassigned" className="bg-dark-300">Non assegnato</option>
                            {adminUsers.map((admin) => (
                                <option key={admin._id} value={admin._id} className="bg-dark-300">
                                    {getAssigneeLabel(admin)}
                                </option>
                            ))}
                        </select>

                        {/* Label Filter */}
                        <div className="min-w-[160px]">
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    type="text"
                                    value={filters.labels?.[0] || ''}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            labels: e.target.value ? [normalizeLabel(e.target.value)] : [],
                                        }))
                                    }
                                    placeholder="Etichetta"
                                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40"
                                />
                            </div>
                        </div>

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
                        {viewMode === 'list' ? (
                            <>
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
                                                                <span className="text-[10px] text-white/40">
                                                                    {formatIssueKey(feedback)}
                                                                </span>
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

                                                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-white/50">
                                                                <span className="flex items-center gap-1">
                                                                    <User className="w-3 h-3" />
                                                                    {getAssigneeLabel(feedback.assignee)}
                                                                </span>
                                                                {(feedback.labels || []).map((label) => (
                                                                    <span
                                                                        key={`${feedback._id}-${label}`}
                                                                        className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60"
                                                                    >
                                                                        {label}
                                                                    </span>
                                                                ))}
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
                            </>
                        ) : (
                            <>
                                {isLoading && feedbacks.length === 0 ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                                            {STATUS_FLOW.map((status) => {
                                                const items = feedbackByStatus[status] || [];
                                                const isDragOver = dragOverStatus === status;

                                                return (
                                                    <div
                                                        key={status}
                                                        onDragOver={(event) => {
                                                            event.preventDefault();
                                                            setDragOverStatus(status);
                                                        }}
                                                        onDragLeave={() => setDragOverStatus(null)}
                                                        onDrop={(event) => handleDropOnStatus(event, status)}
                                                        className={`rounded-xl border bg-white/[0.02] ${
                                                            isDragOver ? 'border-primary-500/40 bg-primary-500/10' : 'border-white/10'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                                                            <span className="text-xs font-semibold text-white/70">
                                                                {FEEDBACK_STATUS_LABELS[status]}
                                                            </span>
                                                            <span className="text-xs text-white/40">{items.length}</span>
                                                        </div>
                                                        <div className="p-3 space-y-3 min-h-[120px]">
                                                            {items.length === 0 ? (
                                                                <p className="text-xs text-white/30">Nessun ticket</p>
                                                            ) : (
                                                                items.map((feedback) => (
                                                                    <div
                                                                        key={feedback._id}
                                                                        draggable
                                                                        onDragStart={(event) => handleDragStart(event, feedback._id)}
                                                                        onDragEnd={handleDragEnd}
                                                                        onClick={() => setSelectedFeedback(feedback)}
                                                                        className={`rounded-lg border px-3 py-2 bg-white/[0.03] cursor-pointer transition-all ${
                                                                            draggingId === feedback._id
                                                                                ? 'opacity-50 border-primary-500/30'
                                                                                : 'border-white/10 hover:border-primary-500/30 hover:bg-white/[0.05]'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="text-[10px] text-white/40">
                                                                                {formatIssueKey(feedback)}
                                                                            </span>
                                                                            <span
                                                                                className={`px-2 py-0.5 text-[10px] rounded-full border ${FEEDBACK_PRIORITY_COLORS[feedback.priority]}`}
                                                                            >
                                                                                {FEEDBACK_PRIORITY_LABELS[feedback.priority]}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm font-medium text-white mt-1">
                                                                            {feedback.title}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 text-xs text-white/50 mt-2">
                                                                            <User className="w-3 h-3" />
                                                                            <span>{getAssigneeLabel(feedback.assignee)}</span>
                                                                        </div>
                                                                        {(feedback.labels || []).length > 0 && (
                                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                                {(feedback.labels || []).slice(0, 3).map((label) => (
                                                                                    <span
                                                                                        key={`${feedback._id}-${label}`}
                                                                                        className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/60"
                                                                                    >
                                                                                        {label}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {hasMore && (
                                            <p className="text-xs text-white/40">
                                                Mostrati {feedbacks.length} di {total} ticket. Affina i filtri o passa alla lista per caricare altro.
                                            </p>
                                        )}
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
                                    className="sticky top-4 p-5 rounded-xl border border-white/10 bg-white/[0.03] space-y-5"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase tracking-wide text-white/40">
                                                {formatIssueKey(selectedFeedback)}
                                            </p>
                                            <h3 className="font-semibold text-white break-words">
                                                {selectedFeedback.title}
                                            </h3>
                                        </div>
                                        <button
                                            onClick={() => setSelectedFeedback(null)}
                                            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <span
                                            className={`px-2 py-0.5 rounded-full border ${FEEDBACK_STATUS_COLORS[selectedFeedback.status]}`}
                                        >
                                            {FEEDBACK_STATUS_LABELS[selectedFeedback.status]}
                                        </span>
                                        <span
                                            className={`px-2 py-0.5 rounded-full border ${FEEDBACK_PRIORITY_COLORS[selectedFeedback.priority]}`}
                                        >
                                            {FEEDBACK_PRIORITY_LABELS[selectedFeedback.priority]}
                                        </span>
                                        <span
                                            className={`px-2 py-0.5 rounded-full border ${FEEDBACK_TYPE_COLORS[selectedFeedback.type]}`}
                                        >
                                            {FEEDBACK_TYPE_LABELS[selectedFeedback.type]}
                                        </span>
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
                                        {selectedFeedback.resolvedAt && (
                                            <div className="flex items-center gap-2 text-white/60">
                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                <span>Risolto il {formatDate(selectedFeedback.resolvedAt)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Workflow */}
                                    <div className="pt-2 border-t border-white/10">
                                        <p className="text-xs text-white/40 mb-2">Workflow</p>
                                        <div className="flex flex-wrap gap-2">
                                            {STATUS_FLOW.map((status) => {
                                                const isActive = selectedFeedback.status === status;
                                                return (
                                                    <button
                                                        key={status}
                                                        type="button"
                                                        disabled={isUpdating || isActive}
                                                        onClick={() =>
                                                            handleUpdateFeedback(
                                                                selectedFeedback._id,
                                                                { status },
                                                                'Stato aggiornato'
                                                            )
                                                        }
                                                        className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                                                            isActive
                                                                ? 'bg-primary-500/20 text-primary-300 border-primary-500/30'
                                                                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                                                        } ${isUpdating ? 'opacity-60' : ''}`}
                                                    >
                                                        {FEEDBACK_STATUS_LABELS[status]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="pt-2 border-t border-white/10">
                                        <p className="text-sm text-white/70 whitespace-pre-wrap">
                                            {selectedFeedback.description}
                                        </p>
                                    </div>

                                    {/* Public Comments */}
                                    {commentList.length > 0 && (
                                        <div className="pt-2 border-t border-white/10">
                                            <p className="text-xs text-white/40 mb-2">Commenti pubblici</p>
                                            <div className="space-y-2">
                                                {commentList.map((comment, index) => (
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

                                    {/* Attachments */}
                                    {selectedFeedback.attachments?.length > 0 && (
                                        <div className="pt-2 border-t border-white/10">
                                            <p className="text-xs text-white/40 mb-2">Allegati:</p>
                                            <div className="space-y-1">
                                                {selectedFeedback.attachments.map((att, i) => (
                                                    <a
                                                        key={i}
                                                        href={`/uploads/feedback/${att.filename}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                                    >
                                                        <Paperclip className="w-3 h-3" />
                                                        {att.originalName}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="pt-3 border-t border-white/10 space-y-3">
                                        <div className="grid gap-3">
                                            <div>
                                                <label className="block text-xs text-white/40 mb-1">
                                                    Assegnatario
                                                </label>
                                                <select
                                                    value={assigneeId || ''}
                                                    onChange={(e) =>
                                                        handleUpdateFeedback(
                                                            selectedFeedback._id,
                                                            { assignee: e.target.value || null },
                                                            'Assegnazione aggiornata'
                                                        )
                                                    }
                                                    disabled={isUpdating || isLoadingAdmins}
                                                    className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50"
                                                >
                                                    <option value="" className="bg-dark-300">Non assegnato</option>
                                                    {adminUsers.map((admin) => (
                                                        <option key={admin._id} value={admin._id} className="bg-dark-300">
                                                            {getAssigneeLabel(admin)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-white/40 mb-1">
                                                    Cambia stato
                                                </label>
                                                <select
                                                    value={selectedFeedback.status}
                                                    onChange={(e) =>
                                                        handleUpdateFeedback(
                                                            selectedFeedback._id,
                                                            { status: e.target.value as FeedbackStatus },
                                                            'Stato aggiornato'
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

                                            <div>
                                                <label className="block text-xs text-white/40 mb-1">
                                                    Priorità
                                                </label>
                                                <select
                                                    value={selectedFeedback.priority}
                                                    onChange={(e) =>
                                                        handleUpdateFeedback(
                                                            selectedFeedback._id,
                                                            { priority: e.target.value as FeedbackPriority },
                                                            'Priorità aggiornata'
                                                        )
                                                    }
                                                    disabled={isUpdating}
                                                    className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50"
                                                >
                                                    {PRIORITY_OPTIONS.filter((o) => o.value).map((opt) => (
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
                                        </div>

                                        <div>
                                            <label className="block text-xs text-white/40 mb-1">
                                                Etichette
                                            </label>
                                            {labelList.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {labelList.map((label) => (
                                                        <button
                                                            key={label}
                                                            type="button"
                                                            onClick={() => handleRemoveLabel(label)}
                                                            className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/60 hover:text-white hover:border-white/30 transition-colors"
                                                        >
                                                            <Tag className="w-3 h-3" />
                                                            {label}
                                                            <span className="text-white/40">×</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={labelDraft}
                                                    onChange={(e) => setLabelDraft(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ',') {
                                                            e.preventDefault();
                                                            handleAddLabel();
                                                        }
                                                    }}
                                                    placeholder="Aggiungi etichetta"
                                                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddLabel}
                                                    disabled={!labelDraft.trim() || isUpdating}
                                                    className="px-3 py-2 text-xs rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white disabled:opacity-50 transition-colors"
                                                >
                                                    Aggiungi
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs text-white/40 mb-1">
                                                Commento pubblico
                                            </label>
                                            <textarea
                                                value={commentDraft}
                                                onChange={(e) => setCommentDraft(e.target.value)}
                                                rows={3}
                                                maxLength={2000}
                                                className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white resize-none"
                                                placeholder="Scrivi un aggiornamento per l'utente..."
                                            />
                                            <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                                                <span>{commentDraft.length}/2000</span>
                                                <button
                                                    type="button"
                                                    onClick={handleSubmitComment}
                                                    disabled={!commentDraft.trim() || isUpdating}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-white/70 hover:bg-white/20 hover:text-white disabled:opacity-50 transition-colors"
                                                >
                                                    <Send className="w-3 h-3" />
                                                    Invia commento
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs text-white/40 mb-1">
                                                Note interne
                                            </label>
                                            <textarea
                                                value={noteDraft}
                                                onChange={(e) => setNoteDraft(e.target.value)}
                                                rows={3}
                                                maxLength={2000}
                                                className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white resize-none"
                                                placeholder="Aggiungi dettagli tecnici, passi fatti, decisioni..."
                                            />
                                            <div className="flex items-center justify-between text-[10px] text-white/40 mt-1">
                                                <span>{noteDraft.length}/2000</span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleUpdateFeedback(
                                                            selectedFeedback._id,
                                                            { adminNotes: noteDraft.trim() },
                                                            'Note aggiornate'
                                                        )
                                                    }
                                                    disabled={!isNoteDirty || isUpdating}
                                                    className="px-2.5 py-1 rounded-md bg-white/10 text-white/70 hover:bg-white/20 hover:text-white disabled:opacity-50 transition-colors"
                                                >
                                                    Salva note
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Activity */}
                                    <div className="pt-3 border-t border-white/10">
                                        <p className="text-xs text-white/40 mb-2">Attività</p>
                                        <div className="space-y-3">
                                            {activityItems.map((activity, index) => {
                                                const ActivityIcon = ACTIVITY_ICONS[activity.type] || Clock;
                                                return (
                                                    <div
                                                        key={`${activity.type}-${activity.createdAt}-${index}`}
                                                        className="flex items-start gap-3"
                                                    >
                                                        <div className="p-1.5 rounded-lg bg-white/5 text-white/50">
                                                            <ActivityIcon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-white/70">
                                                                {getActivityMessage(activity)}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-[10px] text-white/40 mt-1">
                                                                <span>{getActivityActor(activity, selectedFeedback)}</span>
                                                                <span>•</span>
                                                                <span>
                                                                    {formatDate(
                                                                        activity.createdAt || selectedFeedback.createdAt
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-white/10">
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
