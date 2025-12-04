import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Project } from "../features/projects/type";

interface ProjectsContextType {
  projects: Project[];
  // CORREZIONE 1: Scambia 'rate' e 'description' per matchare il Form
  // Metti description alla fine col ? perché è opzionale
  addProject: (name: string, code: string, rate: number, description?: string) => void;
  loading: boolean;
  error: string | null;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const ProjectsProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/projects')
      .then(res => {
        if (!res.ok) throw new Error('Errore nel caricamento progetti');
        return res.json();
      })
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // CORREZIONE 2: Allinea l'ordine dei parametri (name, code, rate, description)
  const addProject = async (name: string, code: string, rate: number, description?: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          code, 
          // Assicuriamoci che sia un numero
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
    <ProjectsContext.Provider value={{ projects, addProject, loading, error }}>
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