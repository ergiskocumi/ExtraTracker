import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import type { Project } from "../type";
import { useAuth } from "../../auth/context/AuthContext";
import { apiClient } from "../../../shared/services/apiClient";
import { emitToast } from "../../../shared/components/toast";

interface ProjectsContextType {
  projects: Project[];
  addProject: (params: {
    name: string;
    code: string;
    type: 'CLIENT' | 'PERSONAL';
    rate?: number;
    budget?: number;
    description?: string;
    estimatedHours?: number;
    progress?: number;
  }) => void;
  loading: boolean;
  error: string | null;
  refreshProjects: () => void;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const ProjectsProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Funzione per caricare i progetti
  const refreshProjects = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const response = await apiClient.get<Project[]>('/projects');
      if (response.success && response.data) {
        setProjects(response.data);
      } else {
        setError(response.error?.message || 'Errore nel caricamento progetti');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Aggiungi progetto - OTTIMIZZATO: Memoizzato con useCallback
  const addProject = useCallback(async ({ name, code, type, rate, budget, description, estimatedHours, progress }: {
    name: string;
    code: string;
    type: 'CLIENT' | 'PERSONAL';
    rate?: number;
    budget?: number;
    description?: string;
    estimatedHours?: number;
    progress?: number;
  }) => {
    try {
      const projectData: any = {
        name,
        code,
        type,
        description,
        estimatedHours,
        progress,
      };
      
      // Rate e Budget solo per CLIENT
      if (type === 'CLIENT') {
        if (rate) {
          projectData.rate = Number(rate);
        }
        if (budget) {
          projectData.budget = Number(budget);
        }
      }
      
      const response = await apiClient.post<Project>('/projects', projectData);

      if (!response.success) {
        throw new Error(response.error?.message || 'Errore salvataggio progetto');
      }

      await refreshProjects();
      
      // ✅ Toast di successo
      emitToast.success(`Progetto "${name}" creato con successo!`, {
        title: 'Progetto Creato',
      });
      
    } catch (err: any) {
      console.error(err);
      // Gli errori API sono già gestiti automaticamente dal toast
    }
  }, [refreshProjects]);

  // OTTIMIZZATO: Memoizza il value per evitare re-render inutili
  const value = useMemo(() => ({
    projects,
    addProject,
    loading,
    error,
    refreshProjects,
  }), [projects, loading, error, refreshProjects]);

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects deve essere usato dentro un ProjectsProvider");
  }
  return context;
};
