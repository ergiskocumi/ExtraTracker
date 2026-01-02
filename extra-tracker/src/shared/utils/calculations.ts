import type { WorkLog } from "../../features/tracker/type";
import type { Project } from "../../features/projects/type";
import { calculateDurationInHours } from "./dateUtils";

export interface ProjectSummary {
    projectId: string;
    projectName: string;
    totalHours: number;
    totalAmount: number;
};

export const calculatesTotalsByProject = (logs: WorkLog[], projects: Project[]): ProjectSummary[] => {
    const summaryMap = new Map<string, ProjectSummary>();

    projects.forEach(p => {
        summaryMap.set(p.id, {
            projectId: p.id,
            projectName: p.name,
            totalHours: 0,
            totalAmount: 0
        });
    });

    logs.forEach(log => {
        const stats = summaryMap.get(log.projectId);
        const project = projects.find(p => p.id === log.projectId);

        if(stats && project) {
            // RIMOSSO IL BLOCCO: if(log.startTime > log.endTime) { throw ... }
            // Ora ci fidiamo di calculateDurationInHours che gestisce il 'Midnight Crossing'

            try {
                const hours = calculateDurationInHours(log.startTime, log.endTime);
                
                // Opzionale: Se vuoi evitare turni assurdi (es. > 24 ore), potresti mettere un controllo qui
                // ma per ora lasciamo che calcoli tutto.
                
                const amount = hours * project.rate;
                
                stats.totalHours += hours;
                stats.totalAmount += amount;
            } catch (error) {
                // Se dateUtils lancia un errore (es. formato invalido), lo ignoriamo o lo logghiamo
                // ma non blocchiamo l'intero report
                console.warn(`Skipping invalid log ${log.id}`, error);
            }
        }
    });

    return Array.from(summaryMap.values()).filter(s => s.totalHours > 0);
};