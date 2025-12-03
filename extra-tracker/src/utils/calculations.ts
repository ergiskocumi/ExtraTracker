import type { WorkLog } from "../features/tracker/type";
import type { Project } from "../features/projects/type";
import { calculateDurationInHours } from "./dateUtils";


// inizializzazione degli oggetti di calcolo che mi servono per questo file
export interface ProjectSummary {
    projectId: string;
    projectName: string;
    totalHours: number;
    totalAmount: number;
};

//! Funzione che calcola i totali per ogni progetto dato un array di log e progetti
export const calculatesTotalsByProject = (logs: WorkLog[], projects: Project[]): ProjectSummary[] => {
    // creo una mappa di oggetti ProjectSummary per tenere traccia dei totali
    const summaryMap = new Map<string, ProjectSummary>();

    // 1. inizializzazione il contatore per ogni progetto esistente
    projects.forEach(p => {
        summaryMap.set(p.id, {
            projectId: p.id,
            projectName: p.name,
            totalHours: 0,
            totalAmount: 0
            //questi dati sono quelli decisi da me per poter fare i calcoli successivi
        });
    });

    // 2. Scorriamo i log e sommiamo i valori al progetto giusto
    logs.forEach(log => {

        const stats = summaryMap.get(log.projectId); // pe rogni progetto nella mappa prendo ID
        const project = projects.find(p => p.id === log.projectId); // controllo se esiste o meno

        if(stats && project) { // se sono veri entrambi ID e stats 
            const hours = calculateDurationInHours(log.startTime, log.endTime); // per ogni log calcolo le ore 
            const amount = hours * project.rate; // calcolo gli euro in base alle ore e alla tariffa del progetto
            
            //aggiorno i vari contatori dell'oggetto stats
            stats.totalHours += hours;
            stats.totalAmount += amount;
        }
    });
    // 3. Convertionamo la mappa in un array e lo ritorniamo
    return Array.from(summaryMap.values()).filter(s => s.totalHours > 0);
};