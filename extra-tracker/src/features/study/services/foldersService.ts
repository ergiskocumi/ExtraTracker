import { apiClient, type ApiResponse } from '../../../shared/services/apiClient';
export type { Tag } from './tagsService';

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

export interface Folder {
    id: string;
    name: string;
    parentId: string | null;
    icon: string;
    color: string;
    order: number;
    count?: number; // Numero di deck nella cartella
    children?: Folder[]; // Per albero gerarchico
    createdAt?: string;
    updatedAt?: string;
    // Statistiche aggiuntive
    totalCards?: number;
    dueCards?: number;
    masteryPercent?: number;
    deadline?: string;
    targetMastery?: number;
}

export interface CreateFolderPayload {
    name: string;
    parentId?: string | null;
    icon?: string;
    color?: string;
}

export interface UpdateFolderPayload {
    name?: string;
    parentId?: string | null;
    icon?: string;
    color?: string;
    order?: number;
}

// ============================================
// SERVICE CLASS
// ============================================

class FoldersService {
    private baseUrl = '/folders';

    /**
     * Recupera tutte le cartelle
     */
    async getAllFolders(): Promise<Folder[]> {
        try {
            const response = await apiClient.get<Folder[]>(this.baseUrl);
            const data = unwrap(response, 'Errore nel caricamento delle cartelle');
            return Array.isArray(data) ? data : [];
        } catch (err: unknown) {
            throw err;
        }
    }

    /**
     * Recupera l'albero gerarchico delle cartelle
     */
    async getFolderTree(): Promise<Folder[]> {
        try {
            const response = await apiClient.get<Folder[]>(`${this.baseUrl}/tree`);
            const data = unwrap(response, 'Errore nel caricamento dell\'albero delle cartelle');
            return Array.isArray(data) ? data : [];
        } catch (err: unknown) {
            throw err;
        }
    }

    /**
     * Crea una nuova cartella
     */
    async createFolder(payload: CreateFolderPayload): Promise<Folder> {
        try {
            const response = await apiClient.post<Folder>(this.baseUrl, payload);
            const data = unwrap(response, 'Errore nella creazione della cartella');
            return data;
        } catch (err: unknown) {
            throw err;
        }
    }

    /**
     * Aggiorna una cartella
     */
    async updateFolder(folderId: string, payload: UpdateFolderPayload): Promise<Folder> {
        const response = await apiClient.patch<Folder>(`${this.baseUrl}/${folderId}`, payload);
        if (!response.data) {
            throw new Error('Errore nell\'aggiornamento della cartella');
        }
        return response.data;
    }

    /**
     * Elimina una cartella
     */
    async deleteFolder(folderId: string): Promise<void> {
        await apiClient.delete<void>(`${this.baseUrl}/${folderId}`);
    }

    /**
     * Sposta uno o più deck in una cartella
     */
    async moveDecksToFolder(folderId: string | null, deckIds: string[]): Promise<void> {
        const targetId = folderId === null ? 'root' : folderId;
        await apiClient.post<void>(`${this.baseUrl}/${targetId}/move-decks`, { deckIds });
    }
}

export const foldersService = new FoldersService();
