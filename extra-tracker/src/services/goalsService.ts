import { apiClient, type ApiResponse } from './api/apiClient';
import type {
    Goal,
    CreateGoalDTO,
    UpdateGoalDTO,
    CheckIn,
    CreateCheckInDTO,
    GoalDetailResponse,
    CheckInResponse,
    GoalsDashboardStats,
    MilestoneToggleResponse,
    GoalWithProgress,
    GoalStats,
} from '../features/goals/types';

/**
 * Goals Service
 * Gestisce tutte le chiamate API per obiettivi e check-in
 */
const unwrap = <T>(response: ApiResponse<T>, fallbackMessage: string): T => {
    if (!response.success || response.data === undefined) {
        throw new Error(response.error?.message || response.message || fallbackMessage);
    }
    return response.data;
};

type GoalsStateSetter = (
    value: GoalWithProgress[] | ((prev: GoalWithProgress[]) => GoalWithProgress[])
) => void;

interface QuickCheckInOptions {
    setGoals?: GoalsStateSetter;
}

const getHabitPercentage = (goal: GoalWithProgress, totalProgress: number, now: Date): number => {
    const start = goal.createdAt ? new Date(goal.createdAt) : now;
    const weeksPassed = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)));
    const frequency = goal.frequency || 1;
    const expectedCheckIns = frequency * weeksPassed;
    if (!expectedCheckIns) return 0;
    return Math.min(100, Math.round((totalProgress / expectedCheckIns) * 100));
};

const applyQuickCheckInOptimistic = (goal: GoalWithProgress, now: Date): GoalWithProgress => {
    if (goal.type === 'habit') {
        const nextTotalProgress = (goal.totalProgress || 0) + 1;
        return {
            ...goal,
            totalProgress: nextTotalProgress,
            percentage: getHabitPercentage(goal, nextTotalProgress, now),
        };
    }

    if (goal.type === 'target') {
        const nextTotalProgress = (goal.totalProgress || 0) + 1;
        const targetValue = goal.targetValue ?? 0;
        const percentage = targetValue > 0
            ? Math.min(100, Math.round((nextTotalProgress / targetValue) * 100))
            : 0;
        return {
            ...goal,
            totalProgress: nextTotalProgress,
            currentValue: nextTotalProgress,
            percentage,
        };
    }

    return goal;
};

const applyQuickCheckInStats = (goal: GoalWithProgress, stats: GoalStats): GoalWithProgress => {
    const updated = {
        ...goal,
        totalProgress: stats.totalProgress,
        percentage: stats.percentage,
    };

    if (goal.type === 'target') {
        return {
            ...updated,
            currentValue: stats.totalProgress,
        };
    }

    return updated;
};

const goalsService = {
    // ==================== GOALS ====================

    /**
     * Recupera tutti gli obiettivi
     */
    async getAll(): Promise<Goal[]> {
        try {
            const response = await apiClient.get<Goal[]>('/goals');
            return unwrap(response, 'Errore nel recupero obiettivi');
        } catch (error) {
            console.error('Failed to fetch goals:', error);
            throw error;
        }
    },

    /**
     * Recupera un singolo obiettivo con check-in e statistiche
     */
    async getById(id: string): Promise<GoalDetailResponse> {
        try {
            const response = await apiClient.get<GoalDetailResponse>(`/goals/${id}`);
            return unwrap(response, `Errore nel recupero obiettivo ${id}`);
        } catch (error) {
            console.error(`Failed to fetch goal ${id}:`, error);
            throw error;
        }
    },

    /**
     * Crea un nuovo obiettivo
     */
    async create(goalData: CreateGoalDTO): Promise<Goal> {
        try {
            const response = await apiClient.post<Goal>('/goals', goalData);
            return unwrap(response, 'Errore nella creazione obiettivo');
        } catch (error) {
            console.error('Failed to create goal:', error);
            throw error;
        }
    },

    /**
     * Aggiorna un obiettivo esistente
     */
    async update(id: string, goalData: UpdateGoalDTO): Promise<Goal> {
        try {
            const response = await apiClient.put<Goal>(`/goals/${id}`, goalData);
            return unwrap(response, `Errore nell'aggiornamento obiettivo ${id}`);
        } catch (error) {
            console.error(`Failed to update goal ${id}:`, error);
            throw error;
        }
    },

    /**
     * Elimina un obiettivo e tutti i suoi check-in
     */
    async delete(id: string): Promise<void> {
        try {
            const response = await apiClient.delete<null>(`/goals/${id}`);
            if (!response.success) {
                throw new Error(response.error?.message || response.message || `Errore nell'eliminazione obiettivo ${id}`);
            }
        } catch (error) {
            console.error(`Failed to delete goal ${id}:`, error);
            throw error;
        }
    },

    // ==================== MILESTONES ====================

    /**
     * Toggle isCompleted di una specifica milestone
     */
    async toggleMilestone(goalId: string, milestoneId: string): Promise<MilestoneToggleResponse> {
        try {
            const response = await apiClient.patch<MilestoneToggleResponse>(
                `/goals/${goalId}/milestones/${milestoneId}/toggle`
            );
            return unwrap(response, `Errore nel toggle milestone ${milestoneId}`);
        } catch (error) {
            console.error(`Failed to toggle milestone ${milestoneId}:`, error);
            throw error;
        }
    },

    /**
     * Aggiorna le note di una specifica milestone
     */
    async updateMilestoneNotes(goalId: string, milestoneId: string, notes: string): Promise<MilestoneToggleResponse> {
        try {
            const response = await apiClient.patch<MilestoneToggleResponse>(
                `/goals/${goalId}/milestones/${milestoneId}`,
                { notes }
            );
            return unwrap(response, `Errore nel salvataggio note milestone ${milestoneId}`);
        } catch (error) {
            console.error(`Failed to update milestone notes ${milestoneId}:`, error);
            throw error;
        }
    },

    // ==================== CHECK-INS ====================

    /**
     * Recupera tutti i check-in di un obiettivo
     */
    async getCheckIns(goalId: string): Promise<CheckIn[]> {
        try {
            const response = await apiClient.get<CheckIn[]>(`/goals/${goalId}/checkins`);
            return unwrap(response, `Errore nel recupero check-in per obiettivo ${goalId}`);
        } catch (error) {
            console.error(`Failed to fetch check-ins for goal ${goalId}:`, error);
            throw error;
        }
    },

    /**
     * Crea un nuovo check-in (aggiorna il progresso)
     */
    async createCheckIn(goalId: string, checkInData: CreateCheckInDTO): Promise<CheckInResponse> {
        try {
            const response = await apiClient.post<CheckInResponse>(
                `/goals/${goalId}/checkins`,
                checkInData
            );
            return unwrap(response, `Errore nella creazione check-in per obiettivo ${goalId}`);
        } catch (error) {
            console.error(`Failed to create check-in for goal ${goalId}:`, error);
            throw error;
        }
    },

    /**
     * Elimina un check-in specifico
     */
    async deleteCheckIn(checkInId: string): Promise<void> {
        try {
            const response = await apiClient.delete<null>(`/checkins/${checkInId}`);
            if (!response.success) {
                throw new Error(response.error?.message || response.message || `Errore nell'eliminazione check-in ${checkInId}`);
            }
        } catch (error) {
            console.error(`Failed to delete check-in ${checkInId}:`, error);
            throw error;
        }
    },

    /**
     * Quick check-in senza body complesso (optimistic UI)
     */
    async quickCheckIn(goalId: string, options: QuickCheckInOptions = {}): Promise<CheckInResponse> {
        const { setGoals } = options;
        const now = new Date();
        let previousGoal: GoalWithProgress | null = null;

        if (setGoals) {
            setGoals(prevGoals => prevGoals.map(goal => {
                if (goal.id !== goalId) return goal;
                previousGoal = goal;
                return applyQuickCheckInOptimistic(goal, now);
            }));
        }

        try {
            const response = await apiClient.post<CheckInResponse>(`/goals/${goalId}/quick-checkin`, {});
            const data = unwrap(response, `Errore nel quick check-in per obiettivo ${goalId}`);

            if (setGoals) {
                setGoals(prevGoals => prevGoals.map(goal => (
                    goal.id === goalId ? applyQuickCheckInStats(goal, data.stats) : goal
                )));
            }

            return data;
        } catch (error) {
            if (setGoals && previousGoal) {
                setGoals(prevGoals => prevGoals.map(goal => (
                    goal.id === goalId ? previousGoal : goal
                )));
            }
            console.error(`Failed to quick check-in for goal ${goalId}:`, error);
            throw error;
        }
    },

    // ==================== DASHBOARD ====================

    /**
     * Recupera statistiche per la dashboard
     */
    async getDashboardStats(): Promise<GoalsDashboardStats> {
        try {
            const response = await apiClient.get<GoalsDashboardStats>('/goals-stats');
            return unwrap(response, 'Errore nel recupero statistiche dashboard');
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
            throw error;
        }
    },
};

export default goalsService;
