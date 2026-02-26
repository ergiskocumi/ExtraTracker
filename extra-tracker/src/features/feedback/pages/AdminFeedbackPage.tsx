import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { motion } from 'framer-motion';
import { feedbackService } from '../services/feedbackService';
import { emitToast } from '../../../shared/components/toast';
import type {
    Feedback,
    FeedbackActivity,
    FeedbackComment,
    FeedbackFilters,
    FeedbackStats,
    FeedbackStatus,
    FeedbackUser,
    UpdateFeedbackDTO,
} from '../types';
import {
    ACTIVE_STATUSES,
    COMPLETED_STATUSES,
    STATUS_FLOW,
} from './adminFeedback/constants';
import { getActivityItems, normalizeLabel } from './adminFeedback/utils';
import { AdminFeedbackBoardView } from './adminFeedback/AdminFeedbackBoardView';
import { AdminFeedbackDetailModal } from './adminFeedback/AdminFeedbackDetailModal';
import { AdminFeedbackFilters } from './adminFeedback/AdminFeedbackFilters';
import { AdminFeedbackHeader } from './adminFeedback/AdminFeedbackHeader';
import { AdminFeedbackListView } from './adminFeedback/AdminFeedbackListView';
import { AdminFeedbackStats } from './adminFeedback/AdminFeedbackStats';

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
                    let filteredData = response.data;
                    if (!filters.status) {
                        filteredData = response.data.filter(
                            (feedback) => !COMPLETED_STATUSES.includes(feedback.status)
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
            return;
        }
        setNoteDraft('');
        setCommentDraft('');
        setLabelDraft('');
    }, [selectedFeedback]);

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
                    prev.map((feedback) => (feedback._id === id ? response.data : feedback))
                );
                if (selectedFeedback?._id === id) {
                    setSelectedFeedback(response.data);
                }
            } else {
                setFeedbacks((prev) =>
                    prev.map((feedback) => (feedback._id === id ? { ...feedback, ...localUpdates } : feedback))
                );
                if (selectedFeedback?._id === id) {
                    setSelectedFeedback((prev) => (prev ? { ...prev, ...localUpdates } : null));
                }
            }

            emitToast.success(successMessage);
            loadStats();
        } catch (error) {
            console.error('Errore aggiornamento feedback:', error);
            emitToast.error("Errore durante l'aggiornamento");
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

            setFeedbacks((prev) => prev.filter((feedback) => feedback._id !== id));
            if (selectedFeedback?._id === id) {
                setSelectedFeedback(null);
            }

            loadStats();
        } catch (error) {
            console.error('Errore eliminazione:', error);
            emitToast.error("Errore durante l'eliminazione");
        }
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

    const handleDragStart = (event: DragEvent<HTMLDivElement>, feedbackId: string) => {
        event.dataTransfer.setData('feedbackId', feedbackId);
        event.dataTransfer.effectAllowed = 'move';
        setDraggingId(feedbackId);
    };

    const handleDragEnd = () => {
        setDraggingId(null);
        setDragOverStatus(null);
    };

    const handleDropOnStatus = (event: DragEvent<HTMLDivElement>, status: FeedbackStatus) => {
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
    const activityItems: FeedbackActivity[] = selectedFeedback ? getActivityItems(selectedFeedback) : [];
    const commentList: FeedbackComment[] = selectedFeedback?.comments || [];
    const labelList = selectedFeedback?.labels || [];
    const assigneeId = selectedFeedback
        ? (typeof selectedFeedback.assignee === 'string'
            ? selectedFeedback.assignee
            : selectedFeedback.assignee?._id || '')
        : '';

    const visibleStatuses = useMemo(() => {
        if (filters.status && COMPLETED_STATUSES.includes(filters.status)) {
            return STATUS_FLOW;
        }
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

        feedbacks.forEach((feedback) => {
            grouped[feedback.status]?.push(feedback);
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
                <AdminFeedbackHeader
                    viewMode={viewMode}
                    isLoading={isLoading}
                    onRefresh={handleRefresh}
                    onViewModeChange={setViewMode}
                />

                <AdminFeedbackStats
                    stats={stats}
                    isLoading={isLoadingStats}
                />

                <AdminFeedbackFilters
                    filters={filters}
                    total={total}
                    adminUsers={adminUsers}
                    onFiltersChange={setFilters}
                />

                <div className="space-y-4">
                    {viewMode === 'list' ? (
                        <AdminFeedbackListView
                            feedbacks={feedbacks}
                            isLoading={isLoading}
                            hasMore={hasMore}
                            onLoadMore={handleLoadMore}
                            onSelectFeedback={setSelectedFeedback}
                        />
                    ) : (
                        <AdminFeedbackBoardView
                            filters={filters}
                            feedbacks={feedbacks}
                            feedbackByStatus={feedbackByStatus}
                            visibleStatuses={visibleStatuses}
                            total={total}
                            hasMore={hasMore}
                            draggingId={draggingId}
                            dragOverStatus={dragOverStatus}
                            onSelectFeedback={setSelectedFeedback}
                            onSetStatusFilter={(status) =>
                                setFilters((prev) => ({ ...prev, status }))
                            }
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDropOnStatus={handleDropOnStatus}
                            onDragOverStatus={setDragOverStatus}
                        />
                    )}
                </div>
            </motion.div>

            <AdminFeedbackDetailModal
                feedback={selectedFeedback}
                adminUsers={adminUsers}
                isUpdating={isUpdating}
                isLoadingAdmins={isLoadingAdmins}
                noteDraft={noteDraft}
                commentDraft={commentDraft}
                labelDraft={labelDraft}
                assigneeId={assigneeId}
                isNoteDirty={isNoteDirty}
                activityItems={activityItems}
                commentList={commentList}
                labelList={labelList}
                onClose={() => setSelectedFeedback(null)}
                onDelete={handleDelete}
                onAddLabel={handleAddLabel}
                onRemoveLabel={handleRemoveLabel}
                onSubmitComment={handleSubmitComment}
                onUpdateFeedback={handleUpdateFeedback}
                onNoteDraftChange={setNoteDraft}
                onCommentDraftChange={setCommentDraft}
                onLabelDraftChange={setLabelDraft}
            />
        </div>
    );
};
