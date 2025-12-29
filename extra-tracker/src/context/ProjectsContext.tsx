import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { Project } from "../features/projects/type";
import { useAuth } from "./AuthContext";

const API_BASE = 'http://localhost:3001/api';

interface ProjectsContextType {
  projects: Project[];
  addProject: (name: string, code: string, rate: number, description?: string) => void;
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
      const res = await fetch(`${API_BASE}/projects`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
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
  const addProject = async (name: string, code: string, rate: number, description?: string) => {
    try {
      const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          name, 
          code, 
          rate: Number(rate), 
          description 
        }) 
      });

      if (!response.ok) {
        // Leggiamo l'errore specifico dal server se c'è
        const errorData = await response.json(); 
        throw new Error(errorData.message || 'Errore salvataggio progetto');
      }

      const newProject = await response.json();
      setProjects((prev) => [...prev, newProject]);
      
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
