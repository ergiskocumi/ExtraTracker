/**
 * 🏠 WORKSPACE SERVICE (Frontend)
 * ================================
 * 
 * Service layer per chiamate API del Workspace.
 * Astrae le chiamate HTTP dal resto dell'applicazione.
 */

import { apiClient } from '../../../shared/services/apiClient';
import type {
    WorkProject,
    WorkEntry,
    TimelineEntry,
    CreateWorkProjectDTO,
    UpdateWorkProjectDTO,
    CreateWorkEntryDTO,
    UpdateWorkEntryDTO,
} from '../types';

/**
 * WORK PROJECTS API
 */
export const workspaceProjectsService = {
    /**
     * Lista tutti i progetti
     */
    async getAll(includeStats = false): Promise<WorkProject[]> {
        const response = await apiClient.get<WorkProject[]>(
            `/workspace/projects${includeStats ? '?includeStats=true' : ''}`
        );
        return response.data || [];
    },

    /**
     * Lista solo i progetti attivi
     */
    async getActive(): Promise<WorkProject[]> {
        const response = await apiClient.get<WorkProject[]>('/workspace/projects/active');
        return response.data || [];
    },

    /**
     * Dettaglio singolo progetto
     */
    async getById(id: string): Promise<WorkProject> {
        const response = await apiClient.get<WorkProject>(`/workspace/projects/${id}`);
        if (!response.data) {
            throw new Error('Progetto non trovato');
        }
        return response.data;
    },

    /**
     * Crea nuovo progetto
     */
    async create(data: CreateWorkProjectDTO): Promise<WorkProject> {
        const response = await apiClient.post<WorkProject>('/workspace/projects', data);
        if (!response.data) {
            throw new Error('Errore nella creazione del progetto');
        }
        return response.data;
    },

    /**
     * Aggiorna progetto
     */
    async update(id: string, data: UpdateWorkProjectDTO): Promise<WorkProject> {
        const response = await apiClient.put<WorkProject>(`/workspace/projects/${id}`, data);
        if (!response.data) {
            throw new Error('Errore nell\'aggiornamento del progetto');
        }
        return response.data;
    },

    /**
     * Elimina progetto
     */
    async delete(id: string): Promise<void> {
        await apiClient.delete(`/workspace/projects/${id}`);
    },
};

/**
 * WORK ENTRIES API
 */
export const workspaceEntriesService = {
    /**
     * Lista tutte le entries
     */
    async getAll(filters?: {
        project?: string;
        category?: string;
        date?: string;
        limit?: number;
    }): Promise<WorkEntry[]> {
        const params = new URLSearchParams();
        if (filters?.project) params.append('project', filters.project);
        if (filters?.category) params.append('category', filters.category);
        if (filters?.date) params.append('date', filters.date);
        if (filters?.limit) params.append('limit', filters.limit.toString());

        const queryString = params.toString();
        const response = await apiClient.get<WorkEntry[]>(
            `/workspace/entries${queryString ? `?${queryString}` : ''}`
        );
        return response.data || [];
    },

    /**
     * Timeline raggruppata per data
     */
    async getTimeline(limit = 30): Promise<TimelineEntry[]> {
        const response = await apiClient.get<TimelineEntry[]>(
            `/workspace/entries/timeline?limit=${limit}`
        );
        return response.data || [];
    },

    /**
     * Entries per mese
     */
    async getByMonth(year: number, month: number): Promise<WorkEntry[]> {
        const response = await apiClient.get<WorkEntry[]>(
            `/workspace/entries/by-month/${year}/${month}`
        );
        return response.data || [];
    },

    /**
     * Entries per progetto
     */
    async getByProject(projectId: string): Promise<WorkEntry[]> {
        const response = await apiClient.get<WorkEntry[]>(
            `/workspace/entries/by-project/${projectId}`
        );
        return response.data || [];
    },

    /**
     * Statistiche entries per progetto
     */
    async getStats(): Promise<Array<{
        _id: string;
        entriesCount: number;
        totalDuration: number;
        lastEntryDate: string;
        project: WorkProject;
    }>> {
        const response = await apiClient.get('/workspace/entries/stats');
        return response.data || [];
    },

    /**
     * Dettaglio singola entry
     */
    async getById(id: string): Promise<WorkEntry> {
        const response = await apiClient.get<WorkEntry>(`/workspace/entries/${id}`);
        if (!response.data) {
            throw new Error('Entry non trovata');
        }
        return response.data;
    },

    /**
     * Crea nuova entry
     */
    async create(data: CreateWorkEntryDTO): Promise<WorkEntry> {
        const response = await apiClient.post<WorkEntry>('/workspace/entries', data);
        if (!response.data) {
            throw new Error('Errore nella creazione dell\'entry');
        }
        return response.data;
    },

    /**
     * Aggiorna entry
     */
    async update(id: string, data: UpdateWorkEntryDTO): Promise<WorkEntry> {
        const response = await apiClient.put<WorkEntry>(`/workspace/entries/${id}`, data);
        if (!response.data) {
            throw new Error('Errore nell\'aggiornamento dell\'entry');
        }
        return response.data;
    },

    /**
     * Elimina entry
     */
    async delete(id: string): Promise<void> {
        await apiClient.delete(`/workspace/entries/${id}`);
    },
};
