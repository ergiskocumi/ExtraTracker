/**
 * Tipi per il sistema di Goals (Obiettivi)
 * 
 * Supporta due tipi di obiettivi:
 * - TARGET: obiettivi con valore finale (es. "Risparmiare 1000€")
 * - HABIT: obiettivi basati su frequenza (es. "Palestra 3x settimana")
 */

// Categorie disponibili per gli obiettivi
export type GoalCategory = 'finance' | 'health' | 'learning' | 'career' | 'personal';

// Tipo di obiettivo
export type GoalType = 'target' | 'habit';

// Stato dell'obiettivo
export type GoalStatus = 'active' | 'completed' | 'abandoned';

// Mood per i check-in (1-3)
export type Mood = 1 | 2 | 3;

// =========================================
// MILESTONE (Micro-obiettivo)
// =========================================

export interface Milestone {
    id: string;
    title: string;
    isCompleted: boolean;
    weight: number;
    completedAt: string | null;
    notes?: string;
    notesUpdatedAt?: string | null;
    notesHistory?: Array<{ text: string; savedAt: string }>;
}

// DTO per creare una milestone (senza id e completedAt)
export interface CreateMilestoneDTO {
    title: string;
    weight?: number;
}

// Interfaccia principale Goal
export interface Goal {
    id: string;
    title: string;
    category: GoalCategory;
    type: GoalType;
    targetValue: number | null;     // Solo per type: 'target'
    unit: string;                   // €, ore, km, libri, sessioni, ecc.
    frequency: number | null;       // Solo per type: 'habit' (es. 3 = 3 volte a settimana)
    deadline: string;               // Data ISO
    status: GoalStatus;
    description: string;
    milestones: Milestone[];        // Array di micro-obiettivi
    milestoneProgress: number | null; // % calcolata dalle milestones (virtual)
    completedMilestones: number;    // Conteggio milestones completate (virtual)
    createdAt: string;
}

// DTO per creare un nuovo obiettivo
export interface CreateGoalDTO {
    title: string;
    category: GoalCategory;
    type: GoalType;
    targetValue?: number;
    unit?: string;
    frequency?: number;
    deadline: string;
    description?: string;
    milestones?: CreateMilestoneDTO[]; // Milestones opzionali in fase di creazione
}

// DTO per aggiornare un obiettivo
export interface UpdateGoalDTO {
    title?: string;
    category?: GoalCategory;
    targetValue?: number;
    unit?: string;
    frequency?: number;
    deadline?: string;
    status?: GoalStatus;
    description?: string;
}

// Interfaccia CheckIn (singolo progresso)
export interface CheckIn {
    id: string;
    goalId: string;
    date: string;
    value: number;
    mood: Mood;
    notes: string;
    createdAt: string;
}

// DTO per creare un check-in
export interface CreateCheckInDTO {
    value: number;
    mood?: Mood;
    notes?: string;
    date?: string;
}

// Statistiche progresso
export interface GoalStats {
    totalProgress: number;
    percentage: number;
    checkInsCount?: number;
    milestoneProgress?: number | null;
    completedMilestones?: number;
    totalMilestones?: number;
}

// Goal con statistiche calcolate (per la lista)
export interface GoalWithProgress extends Goal {
    totalProgress: number;
    percentage: number;
    currentValue?: number;  // Valore corrente per target goals
    streak?: number;        // Streak per habit goals
    // milestones, milestoneProgress e completedMilestones sono già in Goal
}

// Risposta toggle milestone
export interface MilestoneToggleResponse {
    goal: Goal;
    stats: GoalStats;
}

// Risposta dettaglio singolo goal
export interface GoalDetailResponse {
    goal: GoalWithProgress;  // Changed from Goal to GoalWithProgress
    checkIns: CheckIn[];
    stats: GoalStats;
}

// Risposta creazione check-in
export interface CheckInResponse {
    checkIn: CheckIn;
    stats: GoalStats;
}

// Statistiche dashboard
export interface GoalsDashboardStats {
    summary: {
        totalGoals: number;
        activeGoals: number;
        completedGoals: number;
        totalCheckIns: number;
    };
    activeGoalsWithProgress: GoalWithProgress[];
}

// Helper per le categorie (per UI)
export const GOAL_CATEGORIES: Record<GoalCategory, { label: string; emoji: string; color: string }> = {
    finance: { label: 'Finanza', emoji: '💰', color: 'text-green-400' },
    health: { label: 'Salute', emoji: '💪', color: 'text-red-400' },
    learning: { label: 'Apprendimento', emoji: '📚', color: 'text-blue-400' },
    career: { label: 'Carriera', emoji: '💼', color: 'text-purple-400' },
    personal: { label: 'Personale', emoji: '🎯', color: 'text-yellow-400' },
};

// Helper per i mood (per UI)
export const MOOD_OPTIONS: Record<Mood, { label: string; emoji: string }> = {
    1: { label: 'Difficile', emoji: '😓' },
    2: { label: 'Neutro', emoji: '😐' },
    3: { label: 'Ottimo', emoji: '😊' },
};
