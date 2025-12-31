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
