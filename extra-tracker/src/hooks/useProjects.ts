import { useState,useEffect } from "react";
import type { Project } from "../features/projects/type";
import { MOCK_PROJECTS } from "../data";

export const useProjects = () => {

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

  return { projects, addProject};
};