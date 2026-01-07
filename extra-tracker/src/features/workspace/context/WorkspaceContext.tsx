/**
 * 🏠 WORKSPACE CONTEXT
 * ====================
 * 
 * Context per gestione stato globale del Workspace (Work Journal).
 * Gestisce progetti e entries con ottimizzazioni per performance.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { apiClient } from '../../../shared/services/apiClient';
import { emitToast } from '../../../shared/components/toast';
import type {
    WorkProject,
    WorkTodo,
    CreateWorkProjectDTO,
    UpdateWorkProjectDTO,
    CreateWorkLogDTO,
    UpdateWorkLogDTO,
    CreateWorkTodoDTO,
    UpdateWorkTodoDTO,
} from '../types';
import type { WorkLog } from '../../tracker/type';
import {
    workspaceProjectsService,
    workspaceEntriesService,
    workspaceTodosService,
} from '../services/workspaceService';

interface WorkspaceContextType {
    // Projects
    projects: WorkProject[];
    projectsLoading: boolean;
    projectsError: string | null;
    refreshProjects: () => Promise<void>;
    addProject: (data: CreateWorkProjectDTO) => Promise<void>;
    updateProject: (id: string, data: UpdateWorkProjectDTO) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    
    // Entries (ora WorkLog)
    entries: WorkLog[];
    entriesLoading: boolean;
    entriesError: string | null;
    refreshEntries: () => Promise<void>;
    addEntry: (data: CreateWorkLogDTO) => Promise<void>;
    updateEntry: (id: string, data: UpdateWorkLogDTO) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    
    // Todos (per progetto specifico, non globali)
    getTodosByProject: (projectId: string) => Promise<WorkTodo[]>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated } = useAuth();
    
    // Projects state
    const [projects, setProjects] = useState<WorkProject[]>([]);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [projectsError, setProjectsError] = useState<string | null>(null);
    
    // Entries state (ora WorkLog)
    const [entries, setEntries] = useState<WorkLog[]>([]);
    const [entriesLoading, setEntriesLoading] = useState(true);
    const [entriesError, setEntriesError] = useState<string | null>(null);

    // =========================================
    // PROJECTS METHODS
    // =========================================

    const refreshProjects = useCallback(async () => {
        if (!isAuthenticated) {
            setProjectsLoading(false);
            return;
        }
        try {
            setProjectsError(null);
            const data = await workspaceProjectsService.getAll(true); // include stats
            setProjects(data);
        } catch (err: any) {
            setProjectsError(err.message || 'Errore nel caricamento progetti');
        } finally {
            setProjectsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        refreshProjects();
    }, [refreshProjects]);

    const addProject = useCallback(async (data: CreateWorkProjectDTO) => {
        try {
            const created = await workspaceProjectsService.create(data);
            setProjects((prev) => [...prev, created]);
            emitToast.success(`Progetto "${data.name}" creato con successo!`, {
                title: 'Progetto Creato',
            });
        } catch (err: any) {
            throw err;
        }
    }, []);

    const updateProject = useCallback(async (id: string, data: UpdateWorkProjectDTO) => {
        try {
            const updated = await workspaceProjectsService.update(id, data);
            setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
            emitToast.success('Progetto aggiornato', {
                title: 'Aggiornato',
            });
        } catch (err: any) {
            throw err;
        }
    }, []);

    const deleteProject = useCallback(async (id: string) => {
        try {
            await workspaceProjectsService.delete(id);
            setProjects((prev) => prev.filter((p) => p.id !== id));
            emitToast.success('Progetto eliminato', {
                title: 'Eliminato',
            });
        } catch (err: any) {
            throw err;
        }
    }, []);

    // =========================================
    // ENTRIES METHODS
    // =========================================

    const refreshEntries = useCallback(async () => {
        if (!isAuthenticated) {
            setEntriesLoading(false);
            return;
        }
        try {
            setEntriesError(null);
            // Usa il nuovo endpoint feed per ottenere tutti i log
            const data = await workspaceEntriesService.getAll();
            // Normalizza i dati da WorkLog a formato compatibile
            setEntries(data as any[]);
        } catch (err: any) {
            setEntriesError(err.message || 'Errore nel caricamento entries');
        } finally {
            setEntriesLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        refreshEntries();
    }, [refreshEntries]);

    const addEntry = useCallback(async (data: CreateWorkLogDTO) => {
        try {
            const created = await workspaceEntriesService.create(data as any);
            setEntries((prev) => [...prev, created as WorkLog]);
            emitToast.success('Entry creata con successo!', {
                title: 'Entry Salvata',
            });
        } catch (err: any) {
            throw err;
        }
    }, []);

    const updateEntry = useCallback(async (id: string, data: UpdateWorkLogDTO) => {
        try {
            const updated = await workspaceEntriesService.update(id, data as any);
            setEntries((prev) => prev.map((e) => (e.id === id ? (updated as WorkLog) : e)));
            emitToast.success('Entry aggiornata', {
                title: 'Aggiornato',
            });
        } catch (err: any) {
            throw err;
        }
    }, []);

    const deleteEntry = useCallback(async (id: string) => {
        try {
            await workspaceEntriesService.delete(id);
            setEntries((prev) => prev.filter((e) => e.id !== id));
            emitToast.success('Entry eliminata', {
                title: 'Eliminato',
            });
        } catch (err: any) {
            throw err;
        }
    }, []);

    // =========================================
    // CONTEXT VALUE
    // =========================================

    const getTodosByProject = useCallback(async (projectId: string): Promise<WorkTodo[]> => {
        try {
            return await workspaceTodosService.getByProject(projectId);
        } catch (err: any) {
            return [];
        }
    }, []);

    const value = useMemo(() => ({
        // Projects
        projects,
        projectsLoading,
        projectsError,
        refreshProjects,
        addProject,
        updateProject,
        deleteProject,
        // Entries
        entries,
        entriesLoading,
        entriesError,
        refreshEntries,
        addEntry,
        updateEntry,
        deleteEntry,
        // Todos
        getTodosByProject,
    }), [
        projects,
        projectsLoading,
        projectsError,
        refreshProjects,
        addProject,
        updateProject,
        deleteProject,
        entries,
        entriesLoading,
        entriesError,
        refreshEntries,
        addEntry,
        updateEntry,
        deleteEntry,
        getTodosByProject,
    ]);

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspace deve essere usato dentro un WorkspaceProvider');
    }
    return context;
};
