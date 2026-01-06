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
    WorkTodo,
    WorkTodoStats,
    CreateWorkTodoDTO,
    UpdateWorkTodoDTO,
} from '../types';

/**
 * Normalizza un progetto convertendo _id in id
 * 
 * Supporta sia Project (unificato) che WorkProject (legacy)
 */
const normalizeProject = (raw: any): WorkProject => {
    const id = raw.id || raw._id;
    if (!id) {
        throw new Error('Progetto senza ID valido');
    }
    
    return {
        id: String(id),
        name: raw.name || '',
        description: raw.description,
        color: raw.color || '#6366f1',
        icon: raw.icon || '📂',
        status: raw.status || 'active',
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
        // Campi opzionali da aggregate (Workspace)
        entriesCount: raw.entriesCount || 0,
        lastEntryDate: raw.lastEntryDate || null,
        totalDuration: raw.totalDuration || 0,
        streak: raw.streak || 0,
        // Campi Project unificato (se presenti)
        code: raw.code,
        type: raw.type || 'CLIENT',
        rate: raw.rate,
        budget: raw.budget,
    };
};

/**
 * Normalizza un'entry - DEPRECATO
 * 
 * NOTA: Non più necessario perché il backend ritorna già WorkLog.
 * Mantenuto per compatibilità temporanea durante la migrazione.
 * 
 * @deprecated I dati dal backend sono già nel formato corretto
 */
const normalizeEntry = (raw: any): WorkEntry => {
    const id = raw.id || raw._id;
    if (!id) {
        throw new Error('Entry senza ID valido');
    }
    
    // Normalizza il progetto se presente
    let project: string | WorkProject;
    if (raw.project || raw.projectId) {
        const projectRef = raw.project || raw.projectId;
        if (typeof projectRef === 'string') {
            project = projectRef;
        } else {
            // Se è un oggetto, normalizzalo
            project = normalizeProject(projectRef);
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
        content: raw.content || raw.description, // Supporta sia 'content' che 'description'
        templateData: raw.templateData || {},
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        duration: raw.duration || raw.durationMinutes || 0,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
    };
};

/**
 * WORK PROJECTS API (Unificato - Usa /api/projects)
 * 
 * NOTA: Ora usa l'endpoint unificato /api/projects invece di /api/workspace/projects
 */
export const workspaceProjectsService = {
    /**
     * Lista tutti i progetti
     * 
     * Per Workspace, usa findWithEntryCount per ottenere statistiche
     */
    async getAll(includeStats = false): Promise<WorkProject[]> {
        if (includeStats) {
            // Usa endpoint workspace per statistiche
            const response = await apiClient.get<any[]>(
                `/workspace/projects?includeStats=true`
            );
            const data = response.data || [];
            return data.map(normalizeProject);
        } else {
            // Usa endpoint unificato
            const response = await apiClient.get<any[]>('/projects');
            const data = response.data || [];
            return data.map(normalizeProject);
        }
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
        const response = await apiClient.get<any>(`/projects/${id}`);
        if (!response.data) {
            throw new Error('Progetto non trovato');
        }
        return normalizeProject(response.data);
    },

    /**
     * Crea nuovo progetto
     * 
     * Supporta sia CLIENT che PERSONAL tramite campo 'type'
     */
    async create(data: CreateWorkProjectDTO & { type?: 'CLIENT' | 'PERSONAL'; code?: string; rate?: number }): Promise<WorkProject> {
        // Usa endpoint workspace per creare (supporta code auto-generato)
        const response = await apiClient.post<any>('/workspace/projects', {
            name: data.name,
            description: data.description,
            color: data.color,
            icon: data.icon,
            status: data.status || 'active',
            type: data.type || 'CLIENT',
            rate: data.rate,
            code: data.code, // Opzionale, verrà auto-generato se non fornito
        });
        if (!response.data) {
            throw new Error('Errore nella creazione del progetto');
        }
        return normalizeProject(response.data);
    },

    /**
     * Aggiorna progetto
     */
    async update(id: string, data: UpdateWorkProjectDTO): Promise<WorkProject> {
        const response = await apiClient.put<any>(`/projects/${id}`, data);
        if (!response.data) {
            throw new Error('Errore nell\'aggiornamento del progetto');
        }
        return normalizeProject(response.data);
    },

    /**
     * Elimina progetto
     */
    async delete(id: string): Promise<void> {
        await apiClient.delete(`/projects/${id}`);
    },
};

/**
 * WORK ENTRIES API (Aggiornato per usare WorkLog unificato)
 * 
 * NOTA: Tutti gli endpoint ora usano /api/worklogs invece di /api/workspace/entries
 */
export const workspaceEntriesService = {
    /**
     * Lista tutte le entries (ora usa WorkLog feed)
     */
    async getAll(filters?: {
        projectId?: string;
        date?: string;
        startDate?: string;
        endDate?: string;
        tags?: string | string[];
        limit?: number;
    }): Promise<any[]> {
        const params = new URLSearchParams();
        if (filters?.projectId) params.append('projectId', filters.projectId);
        if (filters?.date) params.append('date', filters.date);
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.tags) {
            const tagsStr = Array.isArray(filters.tags) 
                ? filters.tags.join(',') 
                : filters.tags;
            params.append('tags', tagsStr);
        }
        if (filters?.limit) params.append('limit', filters.limit.toString());

        const queryString = params.toString();
        const response = await apiClient.get<any[]>(
            `/worklogs/feed${queryString ? `?${queryString}` : ''}`
        );
        const data = response.data || [];
        // Normalizza i dati da WorkLog (il backend ritorna già nel formato corretto)
        return data.map((item: any) => {
            const id = item.id || item._id;
            return {
                id: String(id),
                projectId: item.projectId || item.project,
                date: item.date,
                title: item.title,
                description: item.description,
                tags: Array.isArray(item.tags) ? item.tags : [],
                mood: item.mood,
                isBillable: item.isBillable !== false, // default true
                startTime: item.startTime,
                endTime: item.endTime,
                durationMinutes: item.durationMinutes || 0,
                createdAt: item.createdAt || new Date().toISOString(),
                updatedAt: item.updatedAt || new Date().toISOString(),
            };
        });
    },

    /**
     * Timeline raggruppata per data (ora usa WorkLog feed)
     */
    async getTimeline(limit = 30): Promise<TimelineEntry[]> {
        const response = await apiClient.get<any[]>(
            `/worklogs/feed?limit=${limit}`
        );
        const data = response.data || [];
        
        // Raggruppa per data manualmente
        const grouped = data.reduce((acc: any, log: any) => {
            const date = log.date;
            if (!acc[date]) {
                acc[date] = {
                    _id: date,
                    logs: [],
                    totalMinutes: 0,
                };
            }
            // Normalizza log
            const normalizedLog = {
                id: String(log.id || log._id),
                projectId: log.projectId || log.project,
                date: log.date,
                title: log.title,
                description: log.description,
                tags: Array.isArray(log.tags) ? log.tags : [],
                mood: log.mood,
                isBillable: log.isBillable !== false,
                startTime: log.startTime,
                endTime: log.endTime,
                durationMinutes: log.durationMinutes || 0,
                createdAt: log.createdAt || new Date().toISOString(),
                updatedAt: log.updatedAt || new Date().toISOString(),
            };
            acc[date].logs.push(normalizedLog);
            acc[date].totalMinutes += normalizedLog.durationMinutes;
            return acc;
        }, {});
        
        return Object.values(grouped).sort((a: any, b: any) => 
            b._id.localeCompare(a._id)
        ) as TimelineEntry[];
    },

    /**
     * Entries per mese (ora usa WorkLog findByMonth)
     */
    async getByMonth(year: number, month: number): Promise<any[]> {
        const response = await apiClient.get<any[]>(
            `/worklogs/by-month/${year}/${month}`
        );
        const data = response.data || [];
        return data.map((item: any) => ({
            id: String(item.id || item._id),
            projectId: item.projectId || item.project,
            date: item.date,
            title: item.title,
            description: item.description,
            tags: Array.isArray(item.tags) ? item.tags : [],
            mood: item.mood,
            isBillable: item.isBillable !== false,
            startTime: item.startTime,
            endTime: item.endTime,
            durationMinutes: item.durationMinutes || 0,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
        }));
    },

    /**
     * Entries per progetto (ora usa WorkLog feed con filtro projectId)
     */
    async getByProject(projectId: string): Promise<any[]> {
        const response = await apiClient.get<any[]>(
            `/worklogs/feed?projectId=${projectId}`
        );
        const data = response.data || [];
        return data.map((item: any) => ({
            id: String(item.id || item._id),
            projectId: item.projectId || item.project,
            date: item.date,
            title: item.title,
            description: item.description,
            tags: Array.isArray(item.tags) ? item.tags : [],
            mood: item.mood,
            isBillable: item.isBillable !== false,
            startTime: item.startTime,
            endTime: item.endTime,
            durationMinutes: item.durationMinutes || 0,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
        }));
    },

    /**
     * Statistiche entries per progetto
     * 
     * NOTA: Endpoint rimosso dal backend. 
     * Calcola statistiche lato client se necessario.
     */
    async getStats(): Promise<Array<{
        _id: string;
        entriesCount: number;
        totalDuration: number;
        lastEntryDate: string;
        project: WorkProject;
    }>> {
        // Endpoint rimosso - ritorna array vuoto o implementa logica lato client
        console.warn('getStats() endpoint rimosso. Implementa logica lato client se necessario.');
        return [];
    },

    /**
     * Dettaglio singola entry (ora usa WorkLog)
     */
    async getById(id: string): Promise<any> {
        const response = await apiClient.get<any>(`/worklogs/${id}`);
        if (!response.data) {
            throw new Error('Entry non trovata');
        }
        const item = response.data;
        return {
            id: String(item.id || item._id),
            projectId: item.projectId || item.project,
            date: item.date,
            title: item.title,
            description: item.description,
            tags: Array.isArray(item.tags) ? item.tags : [],
            mood: item.mood,
            isBillable: item.isBillable !== false,
            startTime: item.startTime,
            endTime: item.endTime,
            durationMinutes: item.durationMinutes || 0,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
        };
    },

    /**
     * Crea nuova entry (Journal - senza orari)
     * 
     * NOTA: Ora usa POST /api/worklogs senza startTime/endTime
     */
    async create(data: CreateWorkLogDTO | any): Promise<any> {
        // Se è già CreateWorkLogDTO, usa direttamente
        // Altrimenti converti da formato legacy
        const workLogData: any = {
            projectId: data.projectId || data.project,
            date: data.date,
            title: data.title,
            description: data.description || data.content,
            tags: data.tags || [],
            mood: data.mood,
            isBillable: data.isBillable !== false,
            // Non includere startTime/endTime per creare una nota/journal
        };
        
        const response = await apiClient.post<any>('/worklogs', workLogData);
        if (!response.data) {
            throw new Error('Errore nella creazione dell\'entry');
        }
        const item = response.data;
        return {
            id: String(item.id || item._id),
            projectId: item.projectId || item.project,
            date: item.date,
            title: item.title,
            description: item.description,
            tags: Array.isArray(item.tags) ? item.tags : [],
            mood: item.mood,
            isBillable: item.isBillable !== false,
            startTime: item.startTime,
            endTime: item.endTime,
            durationMinutes: item.durationMinutes || 0,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
        };
    },

    /**
     * Aggiorna entry (ora usa WorkLog)
     */
    async update(id: string, data: UpdateWorkLogDTO | any): Promise<any> {
        // Converti a formato WorkLog
        const workLogData: any = {};
        if (data.projectId !== undefined) workLogData.projectId = data.projectId;
        if (data.project !== undefined) workLogData.projectId = data.project; // Supporta formato legacy
        if (data.date !== undefined) workLogData.date = data.date;
        if (data.title !== undefined) workLogData.title = data.title;
        if (data.description !== undefined) workLogData.description = data.description;
        if (data.content !== undefined) workLogData.description = data.content; // Supporta formato legacy
        if (data.tags !== undefined) workLogData.tags = data.tags;
        if (data.mood !== undefined) workLogData.mood = data.mood;
        if (data.isBillable !== undefined) workLogData.isBillable = data.isBillable;
        // Non includere startTime/endTime per mantenere come nota/journal
        
        const response = await apiClient.put<any>(`/worklogs/${id}`, workLogData);
        if (!response.data) {
            throw new Error('Errore nell\'aggiornamento dell\'entry');
        }
        const item = response.data;
        return {
            id: String(item.id || item._id),
            projectId: item.projectId || item.project,
            date: item.date,
            title: item.title,
            description: item.description,
            tags: Array.isArray(item.tags) ? item.tags : [],
            mood: item.mood,
            isBillable: item.isBillable !== false,
            startTime: item.startTime,
            endTime: item.endTime,
            durationMinutes: item.durationMinutes || 0,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
        };
    },

    /**
     * Elimina entry (ora usa WorkLog)
     */
    async delete(id: string): Promise<void> {
        await apiClient.delete(`/worklogs/${id}`);
    },
};

/**
 * WORK TODOS API
 */
export const workspaceTodosService = {
    /**
     * Lista tutti i TODO
     */
    async getAll(filters?: {
        project?: string;
        status?: string;
        priority?: string;
    }): Promise<WorkTodo[]> {
        const params = new URLSearchParams();
        if (filters?.project) params.append('project', filters.project);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.priority) params.append('priority', filters.priority);

        const queryString = params.toString();
        const response = await apiClient.get<any[]>(
            `/workspace/todos${queryString ? `?${queryString}` : ''}`
        );
        const data = response.data || [];
        return data.map(normalizeTodo);
    },

    /**
     * Lista TODO di un progetto
     */
    async getByProject(projectId: string): Promise<WorkTodo[]> {
        const response = await apiClient.get<any[]>(`/workspace/todos/project/${projectId}`);
        const data = response.data || [];
        return data.map(normalizeTodo);
    },

    /**
     * Lista TODO in scadenza
     */
    async getUpcoming(days = 7): Promise<WorkTodo[]> {
        const response = await apiClient.get<any[]>(`/workspace/todos/upcoming?days=${days}`);
        const data = response.data || [];
        return data.map(normalizeTodo);
    },

    /**
     * Statistiche TODO per progetto
     */
    async getStats(projectId: string): Promise<WorkTodoStats> {
        const response = await apiClient.get<WorkTodoStats>(`/workspace/todos/project/${projectId}/stats`);
        return response.data || { pending: 0, 'in-progress': 0, completed: 0, cancelled: 0 };
    },

    /**
     * Dettaglio singolo TODO
     */
    async getById(id: string): Promise<WorkTodo> {
        const response = await apiClient.get<any>(`/workspace/todos/${id}`);
        if (!response.data) {
            throw new Error('TODO non trovato');
        }
        return normalizeTodo(response.data);
    },

    /**
     * Crea nuovo TODO
     */
    async create(data: CreateWorkTodoDTO): Promise<WorkTodo> {
        const response = await apiClient.post<any>('/workspace/todos', data);
        if (!response.data) {
            throw new Error('Errore nella creazione del TODO');
        }
        return normalizeTodo(response.data);
    },

    /**
     * Aggiorna TODO
     */
    async update(id: string, data: UpdateWorkTodoDTO): Promise<WorkTodo> {
        const response = await apiClient.put<any>(`/workspace/todos/${id}`, data);
        if (!response.data) {
            throw new Error('Errore nell\'aggiornamento del TODO');
        }
        return normalizeTodo(response.data);
    },

    /**
     * Completa un TODO
     */
    async complete(id: string): Promise<WorkTodo> {
        const response = await apiClient.patch<any>(`/workspace/todos/${id}/complete`);
        if (!response.data) {
            throw new Error('Errore nel completamento del TODO');
        }
        return normalizeTodo(response.data);
    },

    /**
     * Riattiva un TODO completato
     */
    async reopen(id: string): Promise<WorkTodo> {
        const response = await apiClient.patch<any>(`/workspace/todos/${id}/reopen`);
        if (!response.data) {
            throw new Error('Errore nella riapertura del TODO');
        }
        return normalizeTodo(response.data);
    },

    /**
     * Elimina TODO
     */
    async delete(id: string): Promise<void> {
        await apiClient.delete(`/workspace/todos/${id}`);
    },
};

/**
 * Normalizza un TODO convertendo _id in id
 */
const normalizeTodo = (raw: any): WorkTodo => {
    const id = raw.id || raw._id;
    if (!id) {
        throw new Error('TODO senza ID valido');
    }
    
    return {
        id: String(id),
        project: raw.project || '',
        title: raw.title || '',
        description: raw.description,
        priority: raw.priority || 'medium',
        status: raw.status || 'pending',
        dueDate: raw.dueDate,
        completedAt: raw.completedAt,
        order: raw.order || 0,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
    };
};
