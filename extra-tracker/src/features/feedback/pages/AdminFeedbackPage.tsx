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
    FileText,
    Activity,
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

const TYPE_ACCENTS: Record<FeedbackType, string> = {
    bug: 'bg-red-400/80',
    feature: 'bg-purple-400/80',
    improvement: 'bg-cyan-400/80',
    question: 'bg-yellow-400/80',
    other: 'bg-gray-400/70',
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

// Stati attivi (da mostrare di default nella board)
const ACTIVE_STATUSES: FeedbackStatus[] = ['open', 'in_progress'];

// Stati completati (da nascondere di default)
const COMPLETED_STATUSES: FeedbackStatus[] = ['resolved', 'closed', 'wont_fix'];

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
    const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
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
                
                // Se non c'è un filtro esplicito per status, escludi i ticket risolti/chiusi di default
                const effectiveFilters = { ...filters };
                if (!effectiveFilters.status) {
                    // Non passiamo un filtro status, ma filtriamo lato frontend dopo il caricamento
                    // Oppure potremmo usare un filtro negativo se il backend lo supporta
                    // Per ora filtriamo lato frontend
                }
                
                const response = await feedbackService.getAllFeedback({
                    ...effectiveFilters,
                    page: pageNum,
                    limit: pageLimit,
                });

                if (response.success && response.data) {
                    // Filtra lato frontend per escludere resolved/closed/wont_fix se non c'è filtro esplicito
                    let filteredData = response.data;
                    if (!filters.status) {
                        filteredData = response.data.filter(
                            (f) => !COMPLETED_STATUSES.includes(f.status)
                        );
                    }
                    
                    if (append) {
                        setFeedbacks((prev) => [...prev, ...filteredData]);
                    } else {
                        setFeedbacks(filteredData);
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

    // Determina quali colonne mostrare nella board
    const visibleStatuses = useMemo(() => {
        // Se c'è un filtro esplicito per uno stato completato, mostra tutte le colonne
        if (filters.status && COMPLETED_STATUSES.includes(filters.status)) {
            return STATUS_FLOW;
        }
        // Altrimenti mostra solo gli stati attivi
        return ACTIVE_STATUSES;
    }, [filters.status]);

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
        <div className="min-h-screen px-4 md:px-6 lg:px-8 py-6 lg:py-10">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto space-y-8"
            >
                {/* Header */}
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/dashboard"
                            className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                                Centro Admin
                            </p>
                            <h1 className="text-3xl sm:text-4xl font-semibold text-white mt-1">
                                Gestione Feedback
                            </h1>
                            <p className="text-white/60 text-sm mt-2 max-w-xl">
                                Assegna, aggiorna e chiudi i ticket con una vista piu ricca e
                                operativa.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl transition-colors ${
                                    viewMode === 'list'
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/50 hover:text-white'
                                }`}
                            >
                                <List className="w-4 h-4" />
                                Lista
                            </button>
                            <button
                                onClick={() => setViewMode('board')}
                                className={`flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl transition-colors ${
                                    viewMode === 'board'
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/50 hover:text-white'
                                }`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Board
                            </button>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Aggiorna
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-blue-500/15 blur-2xl" />
                        <div className="relative flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/15">
                                <MessageSquare className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-semibold text-white">
                                    {isLoadingStats ? '-' : stats?.total || 0}
                                </p>
                                <p className="text-xs uppercase tracking-wider text-white/40">
                                    Totale
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-yellow-500/15 blur-2xl" />
                        <div className="relative flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-yellow-500/15">
                                <Clock className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-semibold text-white">
                                    {isLoadingStats ? '-' : stats?.byStatus?.open || 0}
                                </p>
                                <p className="text-xs uppercase tracking-wider text-white/40">
                                    Aperti
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-purple-500/15 blur-2xl" />
                        <div className="relative flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-purple-500/15">
                                <Loader2 className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-semibold text-white">
                                    {isLoadingStats ? '-' : stats?.byStatus?.in_progress || 0}
                                </p>
                                <p className="text-xs uppercase tracking-wider text-white/40">
                                    In lavorazione
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-emerald-500/15 blur-2xl" />
                        <div className="relative flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-emerald-500/15">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-semibold text-white">
                                    {isLoadingStats ? '-' : stats?.byStatus?.resolved || 0}
                                </p>
                                <p className="text-xs uppercase tracking-wider text-white/40">
                                    Risolti
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-white/60">
                            <Filter className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-[0.2em]">Filtri</span>
                        </div>
                        <p className="text-xs text-white/40">{total} ticket</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                        <div className="flex flex-col gap-1">
                            <label className="text-[11px] uppercase text-white/40">Stato</label>
                            <select
                                value={filters.status || ''}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        status: (e.target.value as FeedbackStatus) || undefined,
                                    }))
                                }
                                className="px-3 py-2 text-sm rounded-xl bg-dark-400/70 border border-white/10 text-white"
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-dark-300">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[11px] uppercase text-white/40">Tipo</label>
                            <select
                                value={filters.type || ''}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        type: (e.target.value as FeedbackType) || undefined,
                                    }))
                                }
                                className="px-3 py-2 text-sm rounded-xl bg-dark-400/70 border border-white/10 text-white"
                            >
                                {TYPE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-dark-300">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[11px] uppercase text-white/40">Priorita</label>
                            <select
                                value={filters.priority || ''}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        priority: (e.target.value as FeedbackPriority) || undefined,
                                    }))
                                }
                                className="px-3 py-2 text-sm rounded-xl bg-dark-400/70 border border-white/10 text-white"
                            >
                                {PRIORITY_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-dark-300">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[11px] uppercase text-white/40">Assegnatario</label>
                            <select
                                value={filters.assignee || ''}
                                onChange={(e) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        assignee: e.target.value || undefined,
                                    }))
                                }
                                className="px-3 py-2 text-sm rounded-xl bg-dark-400/70 border border-white/10 text-white"
                            >
                                <option value="" className="bg-dark-300">Tutti</option>
                                <option value="unassigned" className="bg-dark-300">Non assegnato</option>
                                {adminUsers.map((admin) => (
                                    <option key={admin._id} value={admin._id} className="bg-dark-300">
                                        {getAssigneeLabel(admin)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[11px] uppercase text-white/40">Etichetta</label>
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
                                    placeholder="es. ui"
                                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-dark-400/70 border border-white/10 text-white placeholder:text-white/40"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 sm:col-span-2 xl:col-span-2">
                            <label className="text-[11px] uppercase text-white/40">Cerca</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    type="text"
                                    value={filters.search || ''}
                                    onChange={(e) =>
                                        setFilters((prev) => ({ ...prev, search: e.target.value }))
                                    }
                                    placeholder="Titolo, descrizione o utente"
                                    className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-dark-400/70 border border-white/10 text-white placeholder:text-white/40"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {viewMode === 'list' ? (
                        <div className="space-y-4">
                            {isLoading && feedbacks.length === 0 ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="w-6 h-6 animate-spin text-white/40" />
                                </div>
                            ) : feedbacks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-white/10 bg-white/[0.03]">
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

                                        return (
                                            <motion.div
                                                key={feedback._id}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="relative overflow-hidden rounded-xl border border-white/20 bg-white/[0.08] shadow-md shadow-black/5 p-5 cursor-pointer transition-all hover:border-white/30 hover:bg-white/[0.12] hover:shadow-lg hover:shadow-black/10 group"
                                                onClick={() => setSelectedFeedback(feedback)}
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
                                                onClick={handleLoadMore}
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
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {isLoading && feedbacks.length === 0 ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="w-6 h-6 animate-spin text-white/40" />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Indicatore colonne nascoste / Filtro attivo */}
                                    {visibleStatuses.length < STATUS_FLOW.length && !filters.status && (
                                        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/8 border border-white/20 text-xs text-white/70">
                                            <span className="flex items-center gap-2">
                                                <span>📋 Mostrando solo ticket attivi (Aperto, In lavorazione)</span>
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setFilters((prev) => ({ ...prev, status: 'resolved' }))}
                                                    className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                                                >
                                                    Mostra Risolti
                                                </button>
                                                <button
                                                    onClick={() => setFilters((prev) => ({ ...prev, status: 'closed' }))}
                                                    className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                                                >
                                                    Mostra Chiusi
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {filters.status && COMPLETED_STATUSES.includes(filters.status) && (
                                        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-white/80">
                                            <span className="flex items-center gap-2">
                                                <span>🔍 Filtro attivo: {FEEDBACK_STATUS_LABELS[filters.status]}</span>
                                            </span>
                                            <button
                                                onClick={() => setFilters((prev) => ({ ...prev, status: undefined }))}
                                                className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
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
                                                        setDragOverStatus(status);
                                                    }}
                                                    onDragLeave={() => setDragOverStatus(null)}
                                                    onDrop={(event) => handleDropOnStatus(event, status)}
                                                    className={`rounded-xl border bg-white/[0.08] shadow-lg shadow-black/10 transition-all ${
                                                        isDragOver
                                                            ? 'border-primary-500/50 bg-primary-500/15 shadow-primary-500/20'
                                                            : 'border-white/20 hover:border-white/30'
                                                    }`}
                                                >
                                                    {/* Header colonna migliorato */}
                                                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/20 bg-white/[0.12] rounded-t-xl">
                                                        <span className="text-xs font-bold uppercase tracking-[0.1em] text-white/90">
                                                            {FEEDBACK_STATUS_LABELS[status]}
                                                        </span>
                                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-lg bg-white/20 border border-white/30 text-white/80">
                                                            {items.length}
                                                        </span>
                                                    </div>
                                                    <div className="p-4 space-y-3 min-h-[200px] bg-gradient-to-b from-white/[0.04] to-transparent">
                                                        {items.length === 0 ? (
                                                            <div className="flex items-center justify-center py-8">
                                                                <p className="text-xs text-white/40 italic">Nessun ticket</p>
                                                            </div>
                                                        ) : (
                                                            items.map((feedback) => {
                                                                const TypeIcon = TYPE_ICONS[feedback.type];
                                                                return (
                                                                    <div
                                                                        key={feedback._id}
                                                                        draggable
                                                                        onDragStart={(event) => handleDragStart(event, feedback._id)}
                                                                        onDragEnd={handleDragEnd}
                                                                        onClick={() => setSelectedFeedback(feedback)}
                                                                        className={`rounded-lg border bg-white/[0.12] shadow-md shadow-black/5 p-3.5 cursor-pointer transition-all group ${
                                                                            draggingId === feedback._id
                                                                                ? 'opacity-50 border-primary-500/40 scale-95'
                                                                                : 'border-white/20 hover:border-primary-500/40 hover:bg-white/[0.18] hover:shadow-lg hover:shadow-primary-500/10 hover:scale-[1.02]'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span className={`h-2.5 w-2.5 rounded-full ${TYPE_ACCENTS[feedback.type]} flex-shrink-0`} />
                                                                            <span className="font-mono text-[10px] font-semibold text-white/70 tracking-wide">
                                                                                {formatIssueKey(feedback)}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm font-bold text-white leading-snug mb-2.5 line-clamp-2 group-hover:text-white/95 transition-colors">
                                                                            {feedback.title}
                                                                        </p>
                                                                        <div className="flex items-center gap-1.5 text-xs text-white/60 mb-2.5">
                                                                            <User className="w-3 h-3 text-white/50" />
                                                                            <span className="truncate">{getAssigneeLabel(feedback.assignee)}</span>
                                                                        </div>
                                                                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/10">
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
                                                                                    className="px-2 py-1 rounded-md bg-white/10 border border-white/20 text-[10px] text-white/70 font-medium"
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
                                        <p className="text-xs text-white/40">
                                            Mostrati {feedbacks.length} di {total} ticket. Affina i filtri o passa
                                            alla lista per caricare altro.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {selectedFeedback && (
                    <motion.div
                        key={selectedFeedback._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                            onClick={() => setSelectedFeedback(null)}
                        />

                        <motion.div
                            initial={{ scale: 0.96, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.96, y: 20, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                            role="dialog"
                            aria-modal="true"
                            className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-dark-400/95 shadow-2xl flex flex-col"
                        >
                            {/* Header migliorato in stile JIRA */}
                            <div className="p-6 border-b border-white/20 bg-white/[0.06] shadow-sm">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
                                            <span className="font-mono font-semibold tracking-wide text-white/80">
                                                {formatIssueKey(selectedFeedback)}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-white/40" />
                                            <span>{formatDate(selectedFeedback.createdAt)}</span>
                                        </div>
                                        <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                                            {selectedFeedback.title}
                                        </h2>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-sm ${FEEDBACK_STATUS_COLORS[selectedFeedback.status]}`}
                                        >
                                            {FEEDBACK_STATUS_LABELS[selectedFeedback.status]}
                                        </span>
                                        <span
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-sm ${FEEDBACK_PRIORITY_COLORS[selectedFeedback.priority]}`}
                                        >
                                            {FEEDBACK_PRIORITY_LABELS[selectedFeedback.priority]}
                                        </span>
                                        <span
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-sm ${FEEDBACK_TYPE_COLORS[selectedFeedback.type]}`}
                                        >
                                            {FEEDBACK_TYPE_LABELS[selectedFeedback.type]}
                                        </span>
                                        <button
                                            onClick={() => setSelectedFeedback(null)}
                                            className="p-2 rounded-lg hover:bg-white/15 text-white/60 hover:text-white transition-colors border border-transparent hover:border-white/20"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6">
                                    <div className="space-y-6">
                                        {/* DETTAGLI - Sezione principale con più contrasto */}
                                        <div className="rounded-xl border border-white/20 bg-white/[0.08] shadow-lg shadow-black/10 p-6 space-y-4">
                                            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                                                <FileText className="w-4 h-4 text-white/70" />
                                                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/80">
                                                    Dettagli
                                                </h3>
                                            </div>
                                            <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">
                                                {selectedFeedback.description}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5 text-xs text-white/60">
                                                <span className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5" />
                                                    {getUserDisplayName(selectedFeedback.user)}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDate(selectedFeedback.createdAt)}
                                                </span>
                                                {selectedFeedback.resolvedAt && (
                                                    <span className="flex items-center gap-1.5 text-emerald-400/90">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        Risolto il {formatDate(selectedFeedback.resolvedAt)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* ALLEGATI - Sezione principale con più contrasto */}
                                        {selectedFeedback.attachments?.length > 0 && (
                                            <div className="rounded-xl border border-white/20 bg-white/[0.08] shadow-lg shadow-black/10 p-6 space-y-4">
                                                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                                                    <Paperclip className="w-4 h-4 text-white/70" />
                                                    <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/80">
                                                        Allegati
                                                    </h3>
                                                </div>
                                                <div className="space-y-3">
                                                    {selectedFeedback.attachments.map((att, i) => {
                                                        const isImage = att.mimetype?.startsWith('image/') || 
                                                                       /\.(png|jpg|jpeg|gif|webp)$/i.test(att.originalName);
                                                        const imageUrl = `/uploads/feedback/${att.filename}`;
                                                        
                                                        return (
                                                            <div key={i} className="space-y-2">
                                                                {isImage ? (
                                                                    <div className="space-y-2">
                                                                        <a
                                                                            href={imageUrl}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="block group rounded-lg overflow-hidden border border-white/20 bg-white/5 shadow-md hover:shadow-lg transition-all"
                                                                        >
                                                                            <img
                                                                                src={imageUrl}
                                                                                alt={att.originalName}
                                                                                className="w-full max-w-2xl object-contain max-h-96 cursor-pointer group-hover:opacity-95 transition-opacity"
                                                                                loading="lazy"
                                                                            />
                                                                        </a>
                                                                        <a
                                                                            href={imageUrl}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-white/10 border border-white/20 text-white/70 hover:text-white hover:bg-white/15 hover:border-white/30 transition-all w-fit"
                                                                        >
                                                                            <Paperclip className="w-3.5 h-3.5" />
                                                                            {att.originalName}
                                                                        </a>
                                                                    </div>
                                                                ) : (
                                                                    <a
                                                                        href={imageUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                                                    >
                                                                        <Paperclip className="w-3.5 h-3.5" />
                                                                        {att.originalName}
                                                                    </a>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* COMMENTI PUBBLICI - Sezione principale */}
                                        <div className="rounded-xl border border-white/20 bg-white/[0.08] shadow-lg shadow-black/10 p-6 space-y-4">
                                            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                                                <MessageSquare className="w-4 h-4 text-white/70" />
                                                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/80">
                                                    Commenti pubblici
                                                </h3>
                                            </div>
                                            {commentList.length === 0 ? (
                                                <p className="text-xs text-white/50 italic">
                                                    Nessun commento ancora.
                                                </p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {commentList.map((comment, index) => (
                                                        <div
                                                            key={`${comment.createdAt}-${index}`}
                                                            className="p-4 rounded-lg bg-white/[0.04] border border-white/10 shadow-sm"
                                                        >
                                                            <p className="text-sm text-white/85 whitespace-pre-wrap leading-relaxed">
                                                                {comment.message}
                                                            </p>
                                                            <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-white/50">
                                                                {getCommentAuthor(comment)} • {formatDate(comment.createdAt)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* ATTIVITÀ - Sezione principale */}
                                        <div className="rounded-xl border border-white/20 bg-white/[0.08] shadow-lg shadow-black/10 p-6 space-y-4">
                                            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                                                <Activity className="w-4 h-4 text-white/70" />
                                                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/80">
                                                    Attività
                                                </h3>
                                            </div>
                                            <div className="space-y-3">
                                                {activityItems.map((activity, index) => {
                                                    const ActivityIcon = ACTIVITY_ICONS[activity.type] || Clock;
                                                    return (
                                                        <div
                                                            key={`${activity.type}-${activity.createdAt}-${index}`}
                                                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                                        >
                                                            <div className="p-2 rounded-lg bg-white/10 border border-white/10 text-white/60 flex-shrink-0">
                                                                <ActivityIcon className="w-3.5 h-3.5" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm text-white/80 leading-relaxed">
                                                                    {getActivityMessage(activity)}
                                                                </p>
                                                                <div className="flex items-center gap-2 text-[11px] text-white/50 mt-1.5">
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
                                    </div>

                                    <div className="space-y-6">
                                        {/* WORKFLOW - Sidebar con stile distintivo */}
                                        <div className="rounded-xl border border-white/20 bg-white/[0.08] shadow-lg shadow-black/10 p-5 space-y-4">
                                            <div className="pb-2 border-b border-white/10">
                                                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/80">
                                                    Workflow
                                                </h3>
                                            </div>
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
                                                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                                                                isActive
                                                                    ? 'bg-primary-500/25 text-primary-200 border-primary-500/40 shadow-md shadow-primary-500/20'
                                                                    : 'bg-white/8 text-white/70 border-white/15 hover:bg-white/15 hover:text-white hover:border-white/25 hover:shadow-sm'
                                                            } ${isUpdating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                                        >
                                                            {FEEDBACK_STATUS_LABELS[status]}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* GESTIONE - Sidebar con stile distintivo */}
                                        <div className="rounded-xl border border-white/20 bg-white/[0.08] shadow-lg shadow-black/10 p-5 space-y-4">
                                            <div className="pb-2 border-b border-white/10">
                                                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/80">
                                                    Gestione
                                                </h3>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-white/70 mb-2">
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
                                                    className="w-full px-3 py-2.5 text-sm rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15 hover:border-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500/30"
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
                                                <label className="block text-xs font-medium text-white/70 mb-2">
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
                                                    className="w-full px-3 py-2.5 text-sm rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15 hover:border-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500/30"
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
                                                <label className="block text-xs font-medium text-white/70 mb-2">
                                                    Priorità
                                                </label>
                                                <select
                                                    value={selectedFeedback.priority}
                                                    onChange={(e) =>
                                                        handleUpdateFeedback(
                                                            selectedFeedback._id,
                                                            { priority: e.target.value as FeedbackPriority },
                                                            'Priorita aggiornata'
                                                        )
                                                    }
                                                    disabled={isUpdating}
                                                    className="w-full px-3 py-2.5 text-sm rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15 hover:border-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500/30"
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

                                        {/* ETICHETTE - Sidebar */}
                                        <div className="rounded-xl border border-white/20 bg-white/[0.08] shadow-lg shadow-black/10 p-5 space-y-4">
                                            <div className="pb-2 border-b border-white/10">
                                                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/80">
                                                    Etichette
                                                </h3>
                                            </div>
                                            {labelList.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {labelList.map((label) => (
                                                        <button
                                                            key={label}
                                                            type="button"
                                                            onClick={() => handleRemoveLabel(label)}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white/70 hover:text-white hover:bg-white/15 hover:border-white/30 transition-all"
                                                        >
                                                            <Tag className="w-3 h-3" />
                                                            {label}
                                                            <span className="text-white/50 hover:text-white">×</span>
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
                                                    className="flex-1 px-3 py-2.5 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 hover:bg-white/15 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-colors"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddLabel}
                                                    disabled={!labelDraft.trim() || isUpdating}
                                                    className="px-4 py-2.5 text-xs font-medium rounded-lg bg-white/15 border border-white/20 text-white/80 hover:bg-white/25 hover:text-white hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                >
                                                    Aggiungi
                                                </button>
                                            </div>
                                        </div>

                                        {/* COMMENTO PUBBLICO - Sidebar */}
                                        <div className="rounded-xl border border-white/20 bg-white/[0.08] shadow-lg shadow-black/10 p-5 space-y-3">
                                            <div className="pb-2 border-b border-white/10">
                                                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/80">
                                                    Commento pubblico
                                                </h3>
                                            </div>
                                            <textarea
                                                value={commentDraft}
                                                onChange={(e) => setCommentDraft(e.target.value)}
                                                rows={3}
                                                maxLength={2000}
                                                className="w-full px-3 py-2.5 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 resize-none hover:bg-white/15 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-colors"
                                                placeholder="Scrivi un aggiornamento per l'utente..."
                                            />
                                            <div className="flex items-center justify-between text-[11px] text-white/50">
                                                <span>{commentDraft.length}/2000</span>
                                                <button
                                                    type="button"
                                                    onClick={handleSubmitComment}
                                                    disabled={!commentDraft.trim() || isUpdating}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 border border-white/20 text-white/80 hover:bg-white/25 hover:text-white hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                >
                                                    <Send className="w-3.5 h-3.5" />
                                                    Invia
                                                </button>
                                            </div>
                                        </div>

                                        {/* NOTE INTERNE - Sidebar */}
                                        <div className="rounded-xl border border-white/20 bg-white/[0.08] shadow-lg shadow-black/10 p-5 space-y-3">
                                            <div className="pb-2 border-b border-white/10">
                                                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/80">
                                                    Note interne
                                                </h3>
                                            </div>
                                            <textarea
                                                value={noteDraft}
                                                onChange={(e) => setNoteDraft(e.target.value)}
                                                rows={3}
                                                maxLength={2000}
                                                className="w-full px-3 py-2.5 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 resize-none hover:bg-white/15 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-colors"
                                                placeholder="Aggiungi dettagli tecnici, passi fatti, decisioni..."
                                            />
                                            <div className="flex items-center justify-between text-[11px] text-white/50">
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
                                                    className="px-3 py-1.5 rounded-lg bg-white/15 border border-white/20 text-white/80 hover:bg-white/25 hover:text-white hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-medium"
                                                >
                                                    Salva note
                                                </button>
                                            </div>
                                        </div>

                                        {/* ELIMINA - Sidebar con stile distintivo per azione pericolosa */}
                                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 shadow-lg shadow-red-500/10 p-4">
                                            <button
                                                onClick={() => handleDelete(selectedFeedback._id)}
                                                className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm font-medium rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 hover:text-red-200 hover:border-red-500/50 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Elimina feedback
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
