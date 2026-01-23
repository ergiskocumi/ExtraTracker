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
    CreateFeedbackDTO,
    UpdateFeedbackDTO,
} from '../types';

/**
 * Servizio Feedback
 */
class FeedbackService {
    private baseUrl = '/feedback';
    private adminUrl = '/admin/feedback';

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

        return apiClient.post<Feedback>(this.baseUrl, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }

    /**
     * Ottieni lista dei propri feedback
     */
    async getMyFeedback(page = 1, limit = 20): Promise<FeedbackListResponse> {
        return apiClient.get<Feedback[]>(`${this.baseUrl}/my`, {
            params: { page, limit },
        });
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

        return apiClient.get<Feedback[]>(this.adminUrl, { params });
    }

    /**
     * Ottieni singolo feedback (admin only)
     */
    async getFeedbackById(id: string): Promise<FeedbackResponse> {
        return apiClient.get<Feedback>(`${this.adminUrl}/${id}`);
    }

    /**
     * Ottieni statistiche feedback (admin only)
     */
    async getStats(): Promise<FeedbackStatsResponse> {
        return apiClient.get<FeedbackStats>(`${this.adminUrl}/stats`);
    }

    /**
     * Aggiorna feedback (admin only)
     */
    async updateFeedback(id: string, data: UpdateFeedbackDTO): Promise<FeedbackResponse> {
        return apiClient.patch<Feedback>(`${this.adminUrl}/${id}`, data);
    }

    /**
     * Elimina feedback (admin only)
     */
    async deleteFeedback(id: string): Promise<ApiResponse<void>> {
        return apiClient.delete<void>(`${this.adminUrl}/${id}`);
    }
}

export const feedbackService = new FeedbackService();
