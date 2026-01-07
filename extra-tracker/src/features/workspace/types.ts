/**
 * 📝 WORKSPACE TYPES
 * ==================
 * 
 * Tipi TypeScript per Work Journal (Workspace)
 */

export type WorkProjectStatus = 'active' | 'archived';

export type WorkEntryCategory = 
    | 'development' 
    | 'documentation' 
    | 'ticket' 
    | 'meeting' 
    | 'research' 
    | 'freeform';

/**
 * WorkProject - DEPRECATO: Usa Project da '../projects/type'
 * 
 * @deprecated WorkProject è stato unificato in Project.
 * Usa Project da '../projects/type' invece.
 */
export interface WorkProject {
    id: string;
    name: string;
    description?: string;
    color: string;
    icon: string;
    status: WorkProjectStatus;
    createdAt: string;
    updatedAt: string;
    // Opzionali (popolati via aggregate)
    entriesCount?: number;
    lastEntryDate?: string;
    totalDuration?: number; // Durata totale in minuti
    streak?: number; // Giorni consecutivi con entries
}

/**
 * TemplateData per categoria Development
 */
export interface DevelopmentTemplateData {
    branch?: string;
    commits?: string[];
    filesChanged?: string[];
    status?: 'draft' | 'in-progress' | 'completed' | 'blocked';
}

/**
 * TemplateData per categoria Ticket
 */
export interface TicketTemplateData {
    ticketId?: string;
    ticketUrl?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    resolution?: 'fixed' | 'wont-fix' | 'duplicate' | 'invalid';
}

/**
 * TemplateData per categoria Documentation
 */
export interface DocumentationTemplateData {
    docType?: 'technical' | 'user-guide' | 'api';
    sections?: string[];
}

/**
 * TemplateData per altre categorie (meeting, research, freeform)
 */
export interface GenericTemplateData {
    [key: string]: unknown;
}

/**
 * WorkEntry - DEPRECATO: Usa WorkLog invece
 * 
 * NOTA: WorkEntry è stato unificato in WorkLog.
 * Mantenuto temporaneamente per compatibilità durante la migrazione.
 * 
 * @deprecated Usa WorkLog da '../tracker/type'
 */
export interface WorkEntry {
    id: string;
    project: string | WorkProject;
    date: string;
    category: WorkEntryCategory;
    title: string;
    content?: string;
    templateData?: 
        | DevelopmentTemplateData 
        | TicketTemplateData 
        | DocumentationTemplateData 
        | GenericTemplateData;
    tags?: string[];
    duration?: number;
    createdAt: string;
    updatedAt: string;
}

/**
 * Timeline Entry - Entry raggruppata per data
 * 
 * NOTA: Aggiornato per usare WorkLog invece di WorkEntry
 */
export interface TimelineEntry {
    _id: string; // data (YYYY-MM-DD)
    logs: Array<{
        id: string;
        projectId: string | WorkProject;
        date: string;
        title: string;
        description?: string;
        tags?: string[];
        mood?: 'high' | 'neutral' | 'low';
        isBillable?: boolean;
        startTime?: string;
        endTime?: string;
        durationMinutes?: number;
        createdAt: string;
        updatedAt: string;
    }>;
    totalMinutes: number; // minuti totali (cambiato da totalDuration)
}

/**
 * Create WorkProject DTO (Unificato - Usa Project)
 * 
 * NOTA: Ora supporta type CLIENT/PERSONAL e rate opzionale
 */
export interface CreateWorkProjectDTO {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    status?: WorkProjectStatus;
    type?: 'CLIENT' | 'PERSONAL'; // Default: 'CLIENT'
    rate?: number; // Opzionale per PERSONAL, required per CLIENT
    code?: string; // Opzionale, auto-generato se non fornito
}

/**
 * Update WorkProject DTO
 */
export interface UpdateWorkProjectDTO extends Partial<CreateWorkProjectDTO> {}

/**
 * Create WorkEntry DTO - DEPRECATO
 * 
 * @deprecated Usa CreateWorkLogDTO da '../tracker/type' o direttamente WorkLog
 */
export interface CreateWorkEntryDTO {
    project: string;
    date: string;
    category: WorkEntryCategory;
    title: string;
    content?: string;
    templateData?: Record<string, unknown>;
    tags?: string[];
    duration?: number;
}

/**
 * Update WorkEntry DTO - DEPRECATO
 * 
 * @deprecated Usa Partial<WorkLog> da '../tracker/type'
 */
export interface UpdateWorkEntryDTO extends Partial<CreateWorkEntryDTO> {}

/**
 * Create WorkLog DTO (per Journal - senza orari)
 */
export interface CreateWorkLogDTO {
    projectId: string;
    date: string;
    title: string;
    description?: string;
    tags?: string[];
    mood?: 'high' | 'neutral' | 'low';
    isBillable?: boolean;
    startTime?: string; // Opzionale - se presente, endTime è required
    endTime?: string; // Opzionale - se presente, startTime è required
}

/**
 * Update WorkLog DTO
 */
export interface UpdateWorkLogDTO extends Partial<CreateWorkLogDTO> {}

/**
 * WorkTodo - TODO/Promemoria per progetto
 */
export interface WorkTodo {
    id: string;
    project: string | WorkProject;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
    dueDate?: string; // YYYY-MM-DD
    completedAt?: string;
    order: number;
    createdAt: string;
    updatedAt: string;
}

/**
 * Statistiche TODO per progetto
 */
export interface WorkTodoStats {
    pending: number;
    'in-progress': number;
    completed: number;
    cancelled: number;
}

/**
 * DTO per creare un TODO
 */
export interface CreateWorkTodoDTO {
    project: string;
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    status?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
    dueDate?: string; // YYYY-MM-DD
    order?: number;
}

/**
 * DTO per aggiornare un TODO
 */
export interface UpdateWorkTodoDTO extends Partial<CreateWorkTodoDTO> {}
