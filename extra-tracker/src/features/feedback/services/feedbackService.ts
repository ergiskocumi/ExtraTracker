/**
 * 📝 FEEDBACK SERVICE - Frontend
 *
 * API client per gestione feedback/ticket
 */

import { apiClient, type ApiResponse } from '../../../shared/services/apiClient';
import type {
    Feedback,
    FeedbackListResponse,
    FeedbackResponse,
    FeedbackStats,
    FeedbackStatsResponse,
    FeedbackFilters,
    FeedbackUser,
    CreateFeedbackDTO,
    UpdateFeedbackDTO,
    PaginationMeta,
} from '../types';

/**
 * Servizio Feedback
 */
class FeedbackService {
    private baseUrl = '/feedback';
    private adminUrl = '/admin/feedback';

    private requireData<T>(response: ApiResponse<T>, fallbackMessage: string): T {
        if (response.data === undefined || response.data === null) {
            throw new Error(response.message || fallbackMessage);
        }
        return response.data;
    }

    private normalizeListResponse(
        response: ApiResponse<Feedback[]>,
        defaults: { page: number; limit: number }
    ): FeedbackListResponse {
        const data = response.data ?? [];
        const responseMeta = (response as ApiResponse<Feedback[]> & { meta?: PaginationMeta }).meta;

        return {
            success: response.success,
            data,
            meta: responseMeta ?? {
                page: defaults.page,
                limit: defaults.limit,
                total: data.length,
                totalPages: data.length > 0 ? 1 : 0,
                hasMore: false,
            },
        };
    }

    // ==========================================
    // USER METHODS
    // ==========================================

    /**
     * Crea un nuovo feedback con allegati opzionali
     */
    async create(data: CreateFeedbackDTO, files?: File[]): Promise<FeedbackResponse> {
        const formData = new FormData();

        // Aggiungi campi
        formData.append('title', data.title);
        formData.append('description', data.description);
        formData.append('type', data.type);
        if (data.priority) {
            formData.append('priority', data.priority);
        }

        // Aggiungi file
        if (files && files.length > 0) {
            files.forEach((file) => {
                formData.append('attachments', file);
            });
        }

        const response = await apiClient.post<Feedback>(this.baseUrl, formData);
        return {
            success: response.success,
            data: this.requireData(response, 'Feedback creato senza payload valido'),
            message: response.message,
        };
    }

    /**
     * Ottieni lista dei propri feedback
     */
    async getMyFeedback(page = 1, limit = 20): Promise<FeedbackListResponse> {
        const response = await apiClient.get<Feedback[]>(`${this.baseUrl}/my`, {
            params: { page, limit },
        });
        return this.normalizeListResponse(response, { page, limit });
    }

    // ==========================================
    // ADMIN METHODS
    // ==========================================

    /**
     * Ottieni lista di tutti i feedback (admin only)
     */
    async getAllFeedback(filters: FeedbackFilters = {}): Promise<FeedbackListResponse> {
        const params: Record<string, string | number> = {};

        if (filters.page) params.page = filters.page;
        if (filters.limit) params.limit = filters.limit;
        if (filters.status) params.status = filters.status;
        if (filters.type) params.type = filters.type;
        if (filters.priority) params.priority = filters.priority;
        if (filters.search) params.search = filters.search;
        if (filters.assignee) params.assignee = filters.assignee;
        if (filters.labels && filters.labels.length > 0) {
            params.labels = filters.labels.join(',');
        }

        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        const response = await apiClient.get<Feedback[]>(this.adminUrl, { params });
        return this.normalizeListResponse(response, { page, limit });
    }

    /**
     * Ottieni singolo feedback (admin only)
     */
    async getFeedbackById(id: string): Promise<FeedbackResponse> {
        const response = await apiClient.get<Feedback>(`${this.adminUrl}/${id}`);
        return {
            success: response.success,
            data: this.requireData(response, 'Feedback non trovato'),
            message: response.message,
        };
    }

    /**
     * Ottieni statistiche feedback (admin only)
     */
    async getStats(): Promise<FeedbackStatsResponse> {
        const response = await apiClient.get<FeedbackStats>(`${this.adminUrl}/stats`);
        return {
            success: response.success,
            data: this.requireData(response, 'Statistiche feedback non disponibili'),
        };
    }

    /**
     * Aggiorna feedback (admin only)
     */
    async updateFeedback(id: string, data: UpdateFeedbackDTO): Promise<FeedbackResponse> {
        const response = await apiClient.patch<Feedback>(`${this.adminUrl}/${id}`, data);
        return {
            success: response.success,
            data: this.requireData(response, 'Aggiornamento feedback non riuscito'),
            message: response.message,
        };
    }

    /**
     * Elimina feedback (admin only)
     */
    async deleteFeedback(id: string): Promise<ApiResponse<void>> {
        return apiClient.delete<void>(`${this.adminUrl}/${id}`);
    }

    /**
     * Lista utenti admin per assegnazione ticket
     */
    async getAdminUsers(): Promise<ApiResponse<FeedbackUser[]>> {
        return apiClient.get<FeedbackUser[]>('/admin/users', {
            params: { role: 'admin', limit: 50 },
        });
    }
}

export const feedbackService = new FeedbackService();
