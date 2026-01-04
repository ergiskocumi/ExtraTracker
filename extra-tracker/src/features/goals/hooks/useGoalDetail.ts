import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import goalsService from '../services/goalsService';
import { useFormat } from '../../../shared/hooks/useFormat';
import { useSelection } from '../../../shared/hooks/useSelection';
import { emitToast } from '../../../shared/components/toast';
import type {
    GoalDetailResponse,
    CreateCheckInDTO,
    Mood,
    CheckIn,
    GoalWithProgress,
    GoalType,
} from '../types';

// ========================================
// TYPES
// ========================================

export interface EncouragementContext {
    percentage: number;
    daysRemaining: number;
    streak: number;
    lastCheckInDaysAgo: number;
    checkInsThisWeek: number;
    averageMood: number;
    type: GoalType;
}

export interface EncouragementMessage {
    message: string;
    type: 'motivation' | 'reminder' | 'celebration' | 'gentle';
}

export interface JournalFormState {
    isOpen: boolean;
    value: string;
    mood: Mood;
    notes: string;
    isSubmitting: boolean;
}

export interface MilestoneUIState {
    togglingId: string | null;
    expandedIds: Record<string, boolean>;
    notesDraft: Record<string, string>;
    savingNotesId: string | null;
    savedFlash: Record<string, boolean>;
}

export type ActiveTab = 'overview' | 'history' | 'insights';

// ========================================
// HELPER FUNCTIONS - Encouragement System
// ========================================

export const getEncouragementMessage = (ctx: EncouragementContext): EncouragementMessage => {
    // Celebration - Goal quasi completato
    if (ctx.percentage >= 90) {
        return {
            message: "You're almost there! Just a final push to reach your goal. You've got this!",
            type: 'celebration'
        };
    }

    // Celebration - Grande progresso
    if (ctx.percentage >= 75) {
        return {
            message: "Incredible progress! You've completed more than 3/4 of your goal. Keep the momentum!",
            type: 'celebration'
        };
    }

    // Reminder - Non hai fatto check-in da un po'
    if (ctx.lastCheckInDaysAgo > 3) {
        return {
            message: `It's been ${ctx.lastCheckInDaysAgo} days since your last update. Every small step counts - let's get back on track!`,
            type: 'reminder'
        };
    }

    // Celebration - Buona streak
    if (ctx.streak >= 7) {
        return {
            message: `Amazing! ${ctx.streak} day streak! Consistency is the key to success, and you're proving it.`,
            type: 'celebration'
        };
    }

    // Gentle - Mood basso
    if (ctx.averageMood < 1.5 && ctx.checkInsThisWeek > 0) {
        return {
            message: "I notice things have been tough lately. Remember: progress isn't always linear, but every effort matters.",
            type: 'gentle'
        };
    }

    // Motivation - Metà strada
    if (ctx.percentage >= 50) {
        return {
            message: "Halfway there! You've proven you can do this. The second half is where champions are made.",
            type: 'motivation'
        };
    }

    // Motivation - Urgenza
    if (ctx.daysRemaining <= 7 && ctx.daysRemaining > 0) {
        return {
            message: `${ctx.daysRemaining} days left! Time to focus and accelerate. You can do more than you think.`,
            type: 'motivation'
        };
    }

    // Default motivation
    const motivations = [
        "Every step forward is progress. Keep moving!",
        "Small daily improvements lead to stunning results.",
        "Your future self will thank you for the effort you put in today.",
        "Success is the sum of small efforts repeated day in and day out.",
        "You're building something great, one day at a time."
    ];

    return {
        message: motivations[Math.floor(Math.random() * motivations.length)],
        type: 'motivation'
    };
};

export const getWhereYouLeftOff = (checkIns: CheckIn[], goal: GoalWithProgress): string | null => {
    if (checkIns.length === 0) return null;

    const lastCheckIn = checkIns[0];
    const lastDate = new Date(lastCheckIn.date);
    const daysAgo = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysAgo === 0) return null;

    const dateStr = lastDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    let context = `On ${dateStr}`;
    if (lastCheckIn.notes) {
        context += `: "${lastCheckIn.notes}"`;
    } else {
        context += ` you logged ${lastCheckIn.value} ${goal.unit || 'units'}`;
    }

    return context;
};

export const getDailyTip = (category: string): string => {
    const tips: Record<string, string[]> = {
        finance: [
            "Tip: Review your expenses at the end of each day to stay aware of spending patterns.",
            "Tip: Set up automatic transfers to make saving effortless.",
            "Tip: Track small purchases - they add up faster than you think."
        ],
        health: [
            "Tip: Start with just 10 minutes of exercise - small wins build momentum.",
            "Tip: Prepare your workout clothes the night before.",
            "Tip: Find a workout buddy or accountability partner."
        ],
        learning: [
            "Tip: Use the Pomodoro technique - 25 min focus, 5 min break.",
            "Tip: Teach what you learn to someone else to reinforce knowledge.",
            "Tip: Review material before bed - sleep helps consolidate memory."
        ],
        career: [
            "Tip: Block focused work time in your calendar daily.",
            "Tip: Network with one new person each week.",
            "Tip: Document your achievements - you'll need them for reviews."
        ],
        personal: [
            "Tip: Journal for 5 minutes each morning to set intentions.",
            "Tip: Celebrate small wins to maintain motivation.",
            "Tip: Review your goals weekly to stay aligned."
        ]
    };

    const categoryTips = tips[category] || tips.personal;
    return categoryTips[Math.floor(Math.random() * categoryTips.length)];
};

// ========================================
// HELPER FUNCTIONS - Date & Formatting
// ========================================

export const getDaysRemaining = (deadline: string): number => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const getProgressColor = (percentage: number): string => {
    if (percentage >= 75) return 'from-emerald-500 to-green-600';
    if (percentage >= 50) return 'from-blue-500 to-indigo-600';
    if (percentage >= 25) return 'from-yellow-500 to-orange-600';
    return 'from-gray-500 to-slate-600';
};

export const getMoodLabel = (mood: Mood): string => {
    if (mood === 3) return 'Great';
    if (mood === 2) return 'Okay';
    return 'Tough';
};

export const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatFullDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
    const hours = new Date().getHours();
    if (hours < 12) return 'morning';
    if (hours < 17) return 'afternoon';
    return 'evening';
};

export const getTodayFormatted = (): string => {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// ========================================
// MAIN HOOK
// ========================================

export const useGoalDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { showMotivationalMessages } = useFormat();

    // Core state
    const [data, setData] = useState<GoalDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Journal form state
    const [journalForm, setJournalForm] = useState<JournalFormState>({
        isOpen: false,
        value: '',
        mood: 2 as Mood,
        notes: '',
        isSubmitting: false,
    });

    // Milestone UI state
    const [milestoneUI, setMilestoneUI] = useState<MilestoneUIState>({
        togglingId: null,
        expandedIds: {},
        notesDraft: {},
        savingNotesId: null,
        savedFlash: {},
    });

    // Milestone selection + delete state
    const milestoneSelection = useSelection();
    const [pendingDeleteMilestoneId, setPendingDeleteMilestoneId] = useState<string | null>(null);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [isDeletingMilestone, setIsDeletingMilestone] = useState(false);
    const [isBulkDeletingMilestones, setIsBulkDeletingMilestones] = useState(false);

    // Active tab
    const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

    // Derived values
    const today = new Date();
    const timeOfDay = getTimeOfDay();
    const todayFormatted = getTodayFormatted();

    // ========================================
    // DATA FETCHING
    // ========================================

    const loadData = useCallback(async () => {
        if (!id) return;

        try {
            setLoading(true);
            setError(null);
            const response = await goalsService.getById(id);
            setData(response);
        } catch (err) {
            setError('Error loading goal details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ========================================
    // COMPUTED VALUES
    // ========================================

    const encouragementCtx = useMemo((): EncouragementContext | null => {
        if (!data) return null;

        const { goal, checkIns } = data;
        const lastCheckIn = checkIns[0];
        const lastCheckInDaysAgo = lastCheckIn
            ? Math.floor((Date.now() - new Date(lastCheckIn.date).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const checkInsThisWeek = checkIns.filter(ci => new Date(ci.date) >= weekAgo).length;

        const averageMood = checkIns.length > 0
            ? checkIns.reduce((sum, ci) => sum + ci.mood, 0) / checkIns.length
            : 2;

        const daysRemaining = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        return {
            percentage: goal.percentage || 0,
            daysRemaining,
            streak: goal.streak || 0,
            lastCheckInDaysAgo,
            checkInsThisWeek,
            averageMood,
            type: goal.type
        };
    }, [data]);

    const encouragement = useMemo(() => {
        return encouragementCtx ? getEncouragementMessage(encouragementCtx) : null;
    }, [encouragementCtx]);

    const whereYouLeftOff = useMemo(() => {
        if (!data) return null;
        return getWhereYouLeftOff(data.checkIns, data.goal as GoalWithProgress);
    }, [data]);

    const dailyTip = useMemo(() => {
        return data ? getDailyTip(data.goal.category) : '';
    }, [data]);

    const todayCheckIn = useMemo(() => {
        return data?.checkIns.find(ci => {
            const checkInDate = new Date(ci.date);
            return checkInDate.toDateString() === today.toDateString();
        });
    }, [data, today]);

    const goalStatus = useMemo(() => {
        if (!data) return null;
        const daysRemaining = getDaysRemaining(data.goal.deadline);
        return {
            daysRemaining,
            isExpired: daysRemaining < 0,
            isUrgent: daysRemaining <= 7 && daysRemaining >= 0,
        };
    }, [data]);

    // ========================================
    // JOURNAL HANDLERS
    // ========================================

    const openJournalForm = useCallback(() => {
        setJournalForm(prev => ({ ...prev, isOpen: true }));
    }, []);

    const closeJournalForm = useCallback(() => {
        setJournalForm({
            isOpen: false,
            value: '',
            mood: 2 as Mood,
            notes: '',
            isSubmitting: false,
        });
    }, []);

    const updateJournalForm = useCallback((updates: Partial<JournalFormState>) => {
        setJournalForm(prev => ({ ...prev, ...updates }));
    }, []);

    const submitJournal = useCallback(async () => {
        if (!id || !journalForm.value || isNaN(Number(journalForm.value))) return;

        const checkInData: CreateCheckInDTO = {
            value: Number(journalForm.value),
            mood: journalForm.mood,
            notes: journalForm.notes || undefined,
        };

        setJournalForm(prev => ({ ...prev, isSubmitting: true }));

        try {
            await goalsService.createCheckIn(id, checkInData);
            const response = await goalsService.getById(id);
            setData(response);
            closeJournalForm();
        } catch (err) {
            alert('Error saving progress');
            setJournalForm(prev => ({ ...prev, isSubmitting: false }));
        }
    }, [id, journalForm.value, journalForm.mood, journalForm.notes, closeJournalForm]);

    // ========================================
    // MILESTONE HANDLERS
    // ========================================

    const computeWeightedMilestoneProgress = useCallback((milestones: any[] | undefined): number | null => {
        if (!Array.isArray(milestones) || milestones.length === 0) return null;

        const totals = milestones.reduce(
            (acc, m) => {
                const weight = Number(m?.weight) || 1;
                const steps = Array.isArray(m?.actionSteps) ? m.actionSteps : [];
                const hasSteps = steps.length > 0;

                acc.total += weight;

                if (hasSteps) {
                    const completedSteps = steps.filter((s: any) => s && s.isCompleted).length;
                    acc.completed += weight * (completedSteps / steps.length);
                } else {
                    acc.completed += m?.isCompleted ? weight : 0;
                }

                return acc;
            },
            { total: 0, completed: 0 }
        );

        return totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;
    }, []);

    const toggleMilestoneStepMutation = useMutation({
        mutationFn: async (vars: { milestoneId: string; stepIndex: number; isCompleted: boolean }) => {
            if (!id) throw new Error('Missing goal id');
            return goalsService.toggleMilestoneStep(id, vars.milestoneId, vars.stepIndex, vars.isCompleted);
        },
        onMutate: async (vars) => {
            const previousData = data;

            setData((prev) => {
                if (!prev) return prev;
                const prevGoal: any = prev.goal;
                const prevMilestones: any[] = Array.isArray(prevGoal?.milestones) ? prevGoal.milestones : [];

                const nextMilestones = prevMilestones.map((m) => {
                    if (m.id !== vars.milestoneId) return m;

                    const prevSteps: any[] = Array.isArray(m.actionSteps) ? m.actionSteps : [];
                    if (vars.stepIndex < 0 || vars.stepIndex >= prevSteps.length) return m;

                    const nextSteps = prevSteps.map((s, idx) =>
                        idx === vars.stepIndex
                            ? { ...s, isCompleted: vars.isCompleted }
                            : s
                    );

                    const allCompleted = nextSteps.length > 0 && nextSteps.every((s) => Boolean(s?.isCompleted));

                    return {
                        ...m,
                        actionSteps: nextSteps,
                        isCompleted: allCompleted,
                        completedAt: allCompleted ? (m.completedAt || new Date().toISOString()) : null,
                    };
                });

                const milestoneProgress = computeWeightedMilestoneProgress(nextMilestones);
                const completedMilestones = nextMilestones.filter((m) => m.isCompleted).length;

                const shouldUseMilestonePercentage = prevGoal?.type === 'milestone' || prevGoal?.type === 'project';
                const nextPercentage = shouldUseMilestonePercentage && milestoneProgress != null
                    ? milestoneProgress
                    : prevGoal?.percentage;

                const nextGoal = {
                    ...prevGoal,
                    milestones: nextMilestones,
                    milestoneProgress,
                    completedMilestones,
                    percentage: nextPercentage,
                };

                return {
                    ...prev,
                    goal: nextGoal,
                    stats: {
                        ...(prev as any).stats,
                        milestoneProgress,
                        completedMilestones,
                        percentage: nextPercentage,
                    },
                };
            });

            return { previousData };
        },
        onError: (err, _vars, ctx) => {
            console.error('Error toggling milestone step:', err);
            if (ctx?.previousData) {
                setData(ctx.previousData);
            }
            emitToast.error('Errore aggiornando lo step', { title: 'Errore' });
        },
        onSuccess: (response) => {
            setData((prev) => prev ? {
                ...prev,
                goal: {
                    ...prev.goal,
                    ...response.goal,
                    percentage: response.stats.percentage,
                    totalProgress: response.stats.totalProgress,
                },
                stats: response.stats,
            } : null);
        },
    });

    const toggleMilestoneStep = useCallback((milestoneId: string, stepIndex: number, isCompleted: boolean) => {
        if (!id) return;
        toggleMilestoneStepMutation.mutate({ milestoneId, stepIndex, isCompleted });
    }, [id, toggleMilestoneStepMutation]);

    const toggleMilestone = useCallback(async (milestoneId: string) => {
        if (!id || milestoneUI.togglingId) return;

        setMilestoneUI(prev => ({ ...prev, togglingId: milestoneId }));

        try {
            const response = await goalsService.toggleMilestone(id, milestoneId);
            setData(prev => prev ? {
                ...prev,
                goal: {
                    ...prev.goal,
                    ...response.goal,
                    percentage: response.stats.percentage,
                    totalProgress: response.stats.totalProgress,
                }
            } : null);
        } catch (err) {
            console.error('Error toggling milestone:', err);
            alert('Error updating milestone');
        } finally {
            setMilestoneUI(prev => ({ ...prev, togglingId: null }));
        }
    }, [id, milestoneUI.togglingId]);

    const toggleMilestoneExpanded = useCallback((milestoneId: string) => {
        setMilestoneUI(prev => ({
            ...prev,
            expandedIds: {
                ...prev.expandedIds,
                [milestoneId]: !prev.expandedIds[milestoneId]
            }
        }));
    }, []);

    const updateMilestoneNotesDraft = useCallback((milestoneId: string, value: string) => {
        setMilestoneUI(prev => ({
            ...prev,
            notesDraft: {
                ...prev.notesDraft,
                [milestoneId]: value
            }
        }));
    }, []);

    const saveMilestoneNotes = useCallback(async (milestoneId: string) => {
        if (!id || milestoneUI.savingNotesId) return;

        const notes = (milestoneUI.notesDraft[milestoneId] ?? '').trim();
        if (!notes) return;

        setMilestoneUI(prev => ({ ...prev, savingNotesId: milestoneId }));

        try {
            await goalsService.updateMilestoneNotes(id, milestoneId, notes);

            // Clear input
            setMilestoneUI(prev => ({
                ...prev,
                notesDraft: { ...prev.notesDraft, [milestoneId]: '' },
                savedFlash: { ...prev.savedFlash, [milestoneId]: true },
            }));

            // Clear flash after delay
            setTimeout(() => {
                setMilestoneUI(prev => ({
                    ...prev,
                    savedFlash: { ...prev.savedFlash, [milestoneId]: false },
                }));
            }, 1500);

            // Refresh data
            const refreshed = await goalsService.getById(id);
            setData(refreshed);
        } catch (err) {
            console.error('Error saving milestone notes:', err);
            alert('Error saving milestone notes');
        } finally {
            setMilestoneUI(prev => ({ ...prev, savingNotesId: null }));
        }
    }, [id, milestoneUI.savingNotesId, milestoneUI.notesDraft]);

    const pruneMilestoneUIState = useCallback((milestoneIds: string[]) => {
        if (milestoneIds.length === 0) return;

        setMilestoneUI(prev => {
            const nextExpanded = { ...prev.expandedIds };
            const nextNotesDraft = { ...prev.notesDraft };
            const nextSavedFlash = { ...prev.savedFlash };

            milestoneIds.forEach(milestoneId => {
                delete nextExpanded[milestoneId];
                delete nextNotesDraft[milestoneId];
                delete nextSavedFlash[milestoneId];
            });

            return {
                ...prev,
                expandedIds: nextExpanded,
                notesDraft: nextNotesDraft,
                savedFlash: nextSavedFlash,
            };
        });
    }, []);

    const requestDeleteMilestone = useCallback((milestoneId: string) => {
        setPendingDeleteMilestoneId(milestoneId);
    }, []);

    const cancelDeleteMilestone = useCallback(() => {
        setPendingDeleteMilestoneId(null);
    }, []);

    const confirmDeleteMilestone = useCallback(async () => {
        if (!id || !pendingDeleteMilestoneId) return;

        setIsDeletingMilestone(true);
        try {
            const response = await goalsService.deleteMilestone(id, pendingDeleteMilestoneId);

            setData(prev => prev ? {
                ...prev,
                goal: {
                    ...prev.goal,
                    ...response.goal,
                    percentage: response.stats.percentage,
                    totalProgress: response.stats.totalProgress,
                },
                stats: response.stats,
            } : null);

            pruneMilestoneUIState([pendingDeleteMilestoneId]);

            if (milestoneSelection.isSelected(pendingDeleteMilestoneId)) {
                milestoneSelection.toggleSelection(pendingDeleteMilestoneId);
            }

            emitToast.success('Milestone eliminata', { title: 'Eliminata' });
            setPendingDeleteMilestoneId(null);
        } catch (err) {
            console.error('Error deleting milestone:', err);
        } finally {
            setIsDeletingMilestone(false);
        }
    }, [
        id,
        pendingDeleteMilestoneId,
        milestoneSelection,
        pruneMilestoneUIState,
    ]);

    const requestBulkDeleteMilestones = useCallback(() => {
        setIsBulkDeleteOpen(true);
    }, []);

    const cancelBulkDeleteMilestones = useCallback(() => {
        setIsBulkDeleteOpen(false);
    }, []);

    const confirmBulkDeleteMilestones = useCallback(async () => {
        if (!id) return;

        const milestoneIds = Array.from(milestoneSelection.selectedIds);
        if (milestoneIds.length === 0) return;

        setIsBulkDeletingMilestones(true);
        try {
            const response = await goalsService.bulkDeleteMilestones(id, milestoneIds);

            setData(prev => prev ? {
                ...prev,
                goal: {
                    ...prev.goal,
                    ...response.goal,
                    percentage: response.stats.percentage,
                    totalProgress: response.stats.totalProgress,
                },
                stats: response.stats,
            } : null);

            pruneMilestoneUIState(milestoneIds);
            milestoneSelection.clearSelection();
            milestoneSelection.setSelectionMode(false);

            const count = milestoneIds.length;
            emitToast.success(
                count === 1 ? '1 milestone eliminata' : `${count} milestones eliminate`,
                { title: 'Eliminazione completata' }
            );

            setIsBulkDeleteOpen(false);
        } catch (err) {
            console.error('Error bulk deleting milestones:', err);
        } finally {
            setIsBulkDeletingMilestones(false);
        }
    }, [id, milestoneSelection, pruneMilestoneUIState]);

    // ========================================
    // RETURN VALUE
    // ========================================

    return {
        // Core state
        id,
        data,
        loading,
        error,
        goal: data?.goal ?? null,
        checkIns: data?.checkIns ?? [],

        // Computed values
        encouragement,
        whereYouLeftOff,
        dailyTip,
        todayCheckIn,
        goalStatus,
        showMotivationalMessages,

        // Time info
        today,
        timeOfDay,
        todayFormatted,

        // Journal
        journalForm,
        openJournalForm,
        closeJournalForm,
        updateJournalForm,
        submitJournal,

        // Milestones
        milestoneUI,
        milestoneSelection,
        toggleMilestone,
        toggleMilestoneStep,
        toggleMilestoneExpanded,
        updateMilestoneNotesDraft,
        saveMilestoneNotes,
        requestDeleteMilestone,
        cancelDeleteMilestone,
        confirmDeleteMilestone,
        pendingDeleteMilestoneId,
        requestBulkDeleteMilestones,
        cancelBulkDeleteMilestones,
        confirmBulkDeleteMilestones,
        isBulkDeleteOpen,
        isDeletingMilestone,
        isBulkDeletingMilestones,

        // Tabs
        activeTab,
        setActiveTab,

        // Refresh
        refreshData: loadData,
    };
};

export type UseGoalDetailReturn = ReturnType<typeof useGoalDetail>;
