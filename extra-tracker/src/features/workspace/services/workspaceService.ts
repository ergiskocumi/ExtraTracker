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
 * Normalizza un progetto convertendo _id in id
 */
const normalizeProject = (raw: any): WorkProject => {
    const id = raw.id || raw._id;
    if (!id) {
        console.error('❌ Progetto senza ID!', raw);
        throw new Error('Progetto senza ID valido');
    }
    
    return {
        id: String(id),
        name: raw.name || '',
        description: raw.description,
        color: raw.color || '#6366f1',
        icon: raw.icon || '✨',
        status: raw.status || 'active',
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
        // Campi opzionali da aggregate
        entriesCount: raw.entriesCount || 0,
        lastEntryDate: raw.lastEntryDate || null,
    };
};

/**
 * Normalizza un'entry convertendo _id in id e project
 */
const normalizeEntry = (raw: any): WorkEntry => {
    const id = raw.id || raw._id;
    if (!id) {
        console.error('❌ Entry senza ID!', raw);
        throw new Error('Entry senza ID valido');
    }
    
    // Normalizza il progetto se presente
    let project: string | WorkProject;
    if (raw.project) {
        if (typeof raw.project === 'string') {
            project = raw.project;
        } else {
            // Se è un oggetto, normalizzalo
            project = normalizeProject(raw.project);
        }
    } else {
        throw new Error('Entry senza progetto');
    }
    
    return {
        id: String(id),
        project,
        date: raw.date || '',
        category: raw.category || 'freeform',
        title: raw.title || '',
        content: raw.content,
        templateData: raw.templateData || {},
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        duration: raw.duration || 0,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
    };
};

/**
 * WORK PROJECTS API
 */
export const workspaceProjectsService = {
    /**
     * Lista tutti i progetti
     */
    async getAll(includeStats = false): Promise<WorkProject[]> {
        const response = await apiClient.get<any[]>(
            `/workspace/projects${includeStats ? '?includeStats=true' : ''}`
        );
        const data = response.data || [];
        return data.map(normalizeProject);
    },

    /**
     * Lista solo i progetti attivi
     */
    async getActive(): Promise<WorkProject[]> {
        const response = await apiClient.get<any[]>('/workspace/projects/active');
        const data = response.data || [];
        return data.map(normalizeProject);
    },

    /**
     * Dettaglio singolo progetto
     */
    async getById(id: string): Promise<WorkProject> {
        const response = await apiClient.get<any>(`/workspace/projects/${id}`);
        if (!response.data) {
            throw new Error('Progetto non trovato');
        }
        return normalizeProject(response.data);
    },

    /**
     * Crea nuovo progetto
     */
    async create(data: CreateWorkProjectDTO): Promise<WorkProject> {
        const response = await apiClient.post<any>('/workspace/projects', data);
        if (!response.data) {
            throw new Error('Errore nella creazione del progetto');
        }
        return normalizeProject(response.data);
    },

    /**
     * Aggiorna progetto
     */
    async update(id: string, data: UpdateWorkProjectDTO): Promise<WorkProject> {
        const response = await apiClient.put<any>(`/workspace/projects/${id}`, data);
        if (!response.data) {
            throw new Error('Errore nell\'aggiornamento del progetto');
        }
        return normalizeProject(response.data);
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
        const response = await apiClient.get<any[]>(
            `/workspace/entries${queryString ? `?${queryString}` : ''}`
        );
        const data = response.data || [];
        return data.map(normalizeEntry);
    },

    /**
     * Timeline raggruppata per data
     */
    async getTimeline(limit = 30): Promise<TimelineEntry[]> {
        const response = await apiClient.get<any[]>(
            `/workspace/entries/timeline?limit=${limit}`
        );
        const data = response.data || [];
        // Normalizza le entries nella timeline
        return data.map((item: any) => ({
            date: item._id || item.date,
            entries: Array.isArray(item.entries) ? item.entries.map(normalizeEntry) : [],
            totalDuration: item.totalDuration || 0,
        }));
    },

    /**
     * Entries per mese
     */
    async getByMonth(year: number, month: number): Promise<WorkEntry[]> {
        const response = await apiClient.get<any[]>(
            `/workspace/entries/by-month/${year}/${month}`
        );
        const data = response.data || [];
        return data.map(normalizeEntry);
    },

    /**
     * Entries per progetto
     */
    async getByProject(projectId: string): Promise<WorkEntry[]> {
        const response = await apiClient.get<any[]>(
            `/workspace/entries/by-project/${projectId}`
        );
        const data = response.data || [];
        return data.map(normalizeEntry);
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
        const response = await apiClient.get<any>(`/workspace/entries/${id}`);
        if (!response.data) {
            throw new Error('Entry non trovata');
        }
        return normalizeEntry(response.data);
    },

    /**
     * Crea nuova entry
     */
    async create(data: CreateWorkEntryDTO): Promise<WorkEntry> {
        const response = await apiClient.post<any>('/workspace/entries', data);
        if (!response.data) {
            throw new Error('Errore nella creazione dell\'entry');
        }
        return normalizeEntry(response.data);
    },

    /**
     * Aggiorna entry
     */
    async update(id: string, data: UpdateWorkEntryDTO): Promise<WorkEntry> {
        const response = await apiClient.put<any>(`/workspace/entries/${id}`, data);
        if (!response.data) {
            throw new Error('Errore nell\'aggiornamento dell\'entry');
        }
        return normalizeEntry(response.data);
    },

    /**
     * Elimina entry
     */
    async delete(id: string): Promise<void> {
        await apiClient.delete(`/workspace/entries/${id}`);
    },
};
