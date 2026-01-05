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
 * WorkProject - Progetto del Workspace
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
 * WorkEntry - Entry del Work Journal
 */
export interface WorkEntry {
    id: string;
    project: string | WorkProject; // String se non popolato, WorkProject se popolato
    date: string; // YYYY-MM-DD
    category: WorkEntryCategory;
    title: string;
    content?: string;
    templateData?: 
        | DevelopmentTemplateData 
        | TicketTemplateData 
        | DocumentationTemplateData 
        | GenericTemplateData;
    tags?: string[];
    duration?: number; // minuti
    createdAt: string;
    updatedAt: string;
}

/**
 * Timeline Entry - Entry raggruppata per data
 */
export interface TimelineEntry {
    _id: string; // data (YYYY-MM-DD)
    entries: WorkEntry[];
    totalDuration: number; // minuti totali
}

/**
 * Create WorkProject DTO
 */
export interface CreateWorkProjectDTO {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    status?: WorkProjectStatus;
}

/**
 * Update WorkProject DTO
 */
export interface UpdateWorkProjectDTO extends Partial<CreateWorkProjectDTO> {}

/**
 * Create WorkEntry DTO
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
 * Update WorkEntry DTO
 */
export interface UpdateWorkEntryDTO extends Partial<CreateWorkEntryDTO> {}
