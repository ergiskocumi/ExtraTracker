export type ProjectHealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface ProjectMetrics {
    totalMinutes: number;
    totalHours: number;
    totalEarnings: number;
    logCount: number;
    lastLog: string | null;
    progress: number;
    budgetUsagePercent: number;
    velocity: number | null;
    projectedHours: number | null;
    overrunHours: number | null;
    hoursRemaining: number | null;
    healthStatus: ProjectHealthStatus;
    velocityMessage: string;
    daysSinceLastLog: number | null;
}

export interface Project {
    id: string;
    name: string;
    code: string;
    description?: string;
    type: 'CLIENT' | 'PERSONAL';
    rate?: number; // Opzionale per PERSONAL, required per CLIENT
    budget?: number; // Opzionale
    icon?: string; // Icona per UI (emoji o nome)
    status?: 'active' | 'completed' | 'archived';
    color?: string;
    estimatedHours?: number;
    progress?: number;
    metrics?: ProjectMetrics;
    createdAt?: string;
    updatedAt?: string;
    // Opzionali (popolati via aggregate per Workspace)
    entriesCount?: number;
    lastEntryDate?: string;
    totalDuration?: number; // Durata totale in minuti
    streak?: number; // Giorni consecutivi con entries
}
