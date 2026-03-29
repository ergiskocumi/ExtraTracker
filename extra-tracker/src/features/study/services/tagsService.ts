import { apiClient, type ApiResponse } from '../../../shared/services/apiClient';

// ============================================
// HELPERS
// ============================================

const unwrap = <T>(response: ApiResponse<T>, fallbackMessage: string): T => {
    if (!response.success || response.data === undefined) {
        const errorMsg = response.error?.message || response.message || fallbackMessage;
        throw new Error(errorMsg);
    }
    return response.data;
};

// ============================================
// TYPES
// ============================================

export interface Tag {
    id: string;
    name: string;
    color: string;
    icon: string;
    order: number;
    count?: number; // Numero di deck con questo tag
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateTagPayload {
    name: string;
    color?: string;
    icon?: string;
}

export interface UpdateTagPayload {
    name?: string;
    color?: string;
    icon?: string;
    order?: number;
}

// ============================================
// SERVICE CLASS
// ============================================

class TagsService {
    private baseUrl = '/tags';

    /**
     * Recupera tutti i tag
     */
    async getAllTags(): Promise<Tag[]> {
        try {
            const response = await apiClient.get<Tag[]>(this.baseUrl);
            const data = unwrap(response, 'Errore nel caricamento dei tag');
            return Array.isArray(data) ? data : [];
        } catch (err: unknown) {
            throw err;
        }
    }

    /**
     * Crea un nuovo tag
     */
    async createTag(payload: CreateTagPayload): Promise<Tag> {
        try {
            const response = await apiClient.post<Tag>(this.baseUrl, payload);
            const data = unwrap(response, 'Errore nella creazione del tag');
            return data;
        } catch (err: unknown) {
            throw err;
        }
    }

    /**
     * Aggiorna un tag
     */
    async updateTag(tagId: string, payload: UpdateTagPayload): Promise<Tag> {
        const response = await apiClient.patch<Tag>(`${this.baseUrl}/${tagId}`, payload);
        if (!response.data) {
            throw new Error('Errore nell\'aggiornamento del tag');
        }
        return response.data;
    }

    /**
     * Elimina un tag
     */
    async deleteTag(tagId: string): Promise<void> {
        await apiClient.delete<void>(`${this.baseUrl}/${tagId}`);
    }
}

export const tagsService = new TagsService();
