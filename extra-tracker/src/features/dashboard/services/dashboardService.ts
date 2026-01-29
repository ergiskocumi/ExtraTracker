/**
 * 📊 DASHBOARD SERVICE
 * ====================
 * 
 * Servizio per comunicare con gli endpoint aggregati
 * della dashboard "Command Center".
 */

import apiClient from '../../../shared/services/apiClient';

// =========================================
// TYPES
// =========================================

export interface DeckInfo {
    id: string;
    title: string;
    dueCards: number;
    totalCards: number;
}

export interface StudySummary {
    dueCards: number;
    totalDecks: number;
    nextDeck: DeckInfo | null;
    allDone: boolean;
    cardsStudiedToday: number;
}

export interface WorkSummary {
    todayMinutes: number;
    todayFormatted: string;
    sessionsToday: number;
}

export interface DashboardSummary {
    greeting: string;
    study: StudySummary;
    work: WorkSummary;
}

export interface QuickAction {
    id: string;
    label: string;
    description: string;
    icon: string;
    color: string;
    link: string;
}

// =========================================
// API CALLS
// =========================================

/**
 * Recupera il riepilogo operativo della dashboard
 */
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<{ success: boolean; data: DashboardSummary }>('/dashboard/summary');
    return response.data.data;
};

/**
 * Recupera le azioni rapide contestuali
 */
export const getQuickActions = async (): Promise<QuickAction[]> => {
    const response = await apiClient.get<{ success: boolean; data: QuickAction[] }>('/dashboard/quick-actions');
    return response.data.data;
};

// =========================================
// EXPORT
// =========================================

export const dashboardService = {
    getSummary: getDashboardSummary,
    getQuickActions
};

export default dashboardService;
