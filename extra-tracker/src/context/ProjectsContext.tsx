import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { Project } from "../features/projects/type";
import { useAuth } from "./AuthContext";
import { apiClient } from "../services/api/apiClient";

interface ProjectsContextType {
  projects: Project[];
  addProject: (params: {
    name: string;
    code: string;
    rate: number;
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

  // Aggiungi progetto
  const addProject = async ({ name, code, rate, description, estimatedHours, progress }: {
    name: string;
    code: string;
    rate: number;
    description?: string;
    estimatedHours?: number;
    progress?: number;
  }) => {
    try {
      const response = await apiClient.post<Project>('/projects', {
        name,
        code,
        rate: Number(rate),
        description,
        estimatedHours,
        progress,
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Errore salvataggio progetto');
      }

      await refreshProjects();
      
    } catch (err: any) {
      console.error(err);
      alert(`Impossibile salvare: ${err.message}`);
    }
  };

  return (
    <ProjectsContext.Provider value={{ projects, addProject, loading, error, refreshProjects }}>
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
