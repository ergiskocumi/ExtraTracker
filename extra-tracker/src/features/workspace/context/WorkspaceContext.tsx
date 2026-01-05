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
    WorkEntry,
    CreateWorkProjectDTO,
    UpdateWorkProjectDTO,
    CreateWorkEntryDTO,
    UpdateWorkEntryDTO,
} from '../types';
import {
    workspaceProjectsService,
    workspaceEntriesService,
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
    
    // Entries
    entries: WorkEntry[];
    entriesLoading: boolean;
    entriesError: string | null;
    refreshEntries: () => Promise<void>;
    addEntry: (data: CreateWorkEntryDTO) => Promise<void>;
    updateEntry: (id: string, data: UpdateWorkEntryDTO) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated } = useAuth();
    
    // Projects state
    const [projects, setProjects] = useState<WorkProject[]>([]);
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [projectsError, setProjectsError] = useState<string | null>(null);
    
    // Entries state
    const [entries, setEntries] = useState<WorkEntry[]>([]);
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
            console.error('Errore fetch projects:', err);
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
            console.error('Errore addProject:', err);
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
            console.error('Errore updateProject:', err);
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
            console.error('Errore deleteProject:', err);
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
            const data = await workspaceEntriesService.getAll();
            setEntries(data);
        } catch (err: any) {
            console.error('Errore fetch entries:', err);
            setEntriesError(err.message || 'Errore nel caricamento entries');
        } finally {
            setEntriesLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        refreshEntries();
    }, [refreshEntries]);

    const addEntry = useCallback(async (data: CreateWorkEntryDTO) => {
        try {
            const created = await workspaceEntriesService.create(data);
            setEntries((prev) => [...prev, created]);
            emitToast.success('Entry creata con successo!', {
                title: 'Entry Salvata',
            });
        } catch (err: any) {
            console.error('Errore addEntry:', err);
            throw err;
        }
    }, []);

    const updateEntry = useCallback(async (id: string, data: UpdateWorkEntryDTO) => {
        try {
            const updated = await workspaceEntriesService.update(id, data);
            setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
            emitToast.success('Entry aggiornata', {
                title: 'Aggiornato',
            });
        } catch (err: any) {
            console.error('Errore updateEntry:', err);
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
            console.error('Errore deleteEntry:', err);
            throw err;
        }
    }, []);

    // =========================================
    // CONTEXT VALUE
    // =========================================

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
