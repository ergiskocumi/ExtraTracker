/**
 * 📝 FEEDBACK TYPES
 *
 * TypeScript types for feedback/ticketing system
 */

// ==========================================
// ENUMS
// ==========================================

export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'question' | 'other';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';

// ==========================================
// MODELS
// ==========================================

export interface FeedbackAttachment {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
}

export interface FeedbackUser {
    _id: string;
    email: string;
    profile?: {
        firstName?: string;
        lastName?: string;
        displayName?: string;
    };
}

export interface Feedback {
    _id: string;
    id: string;
    user: FeedbackUser | string;
    title: string;
    description: string;
    type: FeedbackType;
    priority: FeedbackPriority;
    status: FeedbackStatus;
    attachments: FeedbackAttachment[];
    adminNotes?: string;
    resolvedAt?: string;
    createdAt: string;
    updatedAt: string;
}

// ==========================================
// DTOs
// ==========================================

export interface CreateFeedbackDTO {
    title: string;
    description: string;
    type: FeedbackType;
    priority?: FeedbackPriority;
}

export interface UpdateFeedbackDTO {
    status?: FeedbackStatus;
    priority?: FeedbackPriority;
    adminNotes?: string;
}

// ==========================================
// API RESPONSES
// ==========================================

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
}

export interface FeedbackListResponse {
    success: boolean;
    data: Feedback[];
    meta: PaginationMeta;
}

export interface FeedbackResponse {
    success: boolean;
    data: Feedback;
    message?: string;
}

export interface FeedbackStats {
    total: number;
    recentWeek: number;
    byStatus: Record<FeedbackStatus, number>;
    byType: Record<FeedbackType, number>;
    byPriority: Record<FeedbackPriority, number>;
}

export interface FeedbackStatsResponse {
    success: boolean;
    data: FeedbackStats;
}

// ==========================================
// FILTERS
// ==========================================

export interface FeedbackFilters {
    status?: FeedbackStatus;
    type?: FeedbackType;
    priority?: FeedbackPriority;
    search?: string;
    page?: number;
    limit?: number;
}

// ==========================================
// CONSTANTS
// ==========================================

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
    bug: 'Bug',
    feature: 'Nuova funzionalità',
    improvement: 'Miglioramento',
    question: 'Domanda',
    other: 'Altro',
};

export const FEEDBACK_PRIORITY_LABELS: Record<FeedbackPriority, string> = {
    low: 'Bassa',
    medium: 'Media',
    high: 'Alta',
    critical: 'Critica',
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
    open: 'Aperto',
    in_progress: 'In lavorazione',
    resolved: 'Risolto',
    closed: 'Chiuso',
    wont_fix: 'Non verrà risolto',
};

export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, string> = {
    open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    resolved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    wont_fix: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const FEEDBACK_PRIORITY_COLORS: Record<FeedbackPriority, string> = {
    low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const FEEDBACK_TYPE_COLORS: Record<FeedbackType, string> = {
    bug: 'bg-red-500/20 text-red-400 border-red-500/30',
    feature: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    improvement: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    question: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};
