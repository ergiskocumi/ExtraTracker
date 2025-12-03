import { createContext, useContext, useState, useEffect, ReactNode} from "react";
import type { Project } from "../features/projects/type";
import { MOCK_PROJECTS } from "../data";

//! 1. Dobbiamo scegliere che DATI e funzioni vogliamo rendere disponibili a tutti ?!
interface ProjectsContextType {
    projects: Project[];
    addProject: (name: string, rate: number) => void;
}

//! 2. Creiamo il CONTEXT con i valori di default (vuoti)
const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

//! 3. Creiamo il PROVIDER che avvolgerà l'app e fornirà i dati
export const ProjectsProvider = ({ children }: { children: ReactNode }) => {
    
    const [projects,setProjects] = useState<Project[]>(() => {
    const savedProjects = localStorage.getItem('work-tracker-projects');
    return savedProjects ? JSON.parse(savedProjects) : MOCK_PROJECTS;
  });

  
  useEffect(() => {
    localStorage.setItem('work-tracker-projects', JSON.stringify(projects));
  }, [projects]);

  const addProject = ( name: string,rate: number) => {
    const newPoject: Project = {
        id: Date.now().toString(),
        name,
        code: name.substring(0,3).toUpperCase(), // prendo le prime 3 lettere del nome e le metto in maiuscolo
        rate
        };
        setProjects([...projects,newPoject]);
  };
  return (
    <ProjectsContext.Provider value={{ projects, addProject }}>
      {children}
    </ProjectsContext.Provider>
  );
};

//! 4. Creiamo un custom hook per usare il context più facilmente
export const useProjects = () => {
    const context = useContext(ProjectsContext);
    if (!context ) {
        throw new Error("useProjects must be used within a ProjectsProvider");
    }
    return context;
};
