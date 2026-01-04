/**
 * Tipi per il sistema di Goals (Obiettivi)
 * 
 * Supporta diversi tipi di obiettivi:
 * - TARGET: obiettivi con valore finale (es. "Risparmiare 1000€")
 * - HABIT: obiettivi basati su frequenza (es. "Palestra 3x settimana")
 * - MILESTONE: obiettivi con step progressivi (es. "Imparare a programmare")
 * - CHALLENGE: sfide a tempo limitato (es. "30 giorni di meditazione")
 * - PROJECT: progetti con deliverables (es. "Completare il corso")
 */

import { 
    FiDollarSign, 
    FiActivity, 
    FiBookOpen, 
    FiBriefcase, 
    FiUser, 
    FiHeart, 
    FiFeather, 
    FiSun,
    FiTarget,
    FiRepeat,
    FiFlag,
    FiZap,
    FiLayers
} from 'react-icons/fi';
import type { IconType } from 'react-icons';

// Categorie disponibili per gli obiettivi
export type GoalCategory = 'finance' | 'health' | 'learning' | 'career' | 'personal' | 'relationships' | 'creativity' | 'mindfulness';

// Tipo di obiettivo - espanso con più opzioni
export type GoalType = 'target' | 'habit' | 'milestone' | 'challenge' | 'project';

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
    // 🆕 AI-Generated Fields for Smart Goal Wizard
    deadline?: string | null;
    reasoning?: string;
    actionSteps?: ActionStep[];
    resources?: string[];
}

// DTO per creare una milestone (senza id e completedAt)
export interface CreateMilestoneDTO {
    title: string;
    weight?: number;
    // 🆕 AI-Generated Fields
    deadline?: string;
    reasoning?: string;
    actionSteps?: ActionStep[];
    resources?: string[];
}

// 🆕 AI Goal Plan Response from /api/goals/suggest
export interface AIGoalPlanResponse {
    title: string;
    description: string;
    type: GoalType;
    targetValue: number | null;
    unit: string;
    frequency: number | null;
    category: GoalCategory;
    deadline: string;
    milestones: AIMilestone[];
    metadata: {
        generatedAt: string;
        intensity: 'relax' | 'normal' | 'hardcore';
        aiModel: string;
    };
}

// 🆕 AI-Generated Milestone
export interface AIMilestone {
    title: string;
    deadline: string;
    reasoning: string;
    actionSteps: {
        title: string;
        isCompleted: boolean;
    }[];
    resources: string[];
    weight: number;
    isCompleted: boolean;
}

export interface ActionStep {
    title: string;
    isCompleted: boolean;
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
    completedMilestones?: number;
    totalMilestones?: number;
    actionSteps?: ActionStep[];
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
    // milestones e milestoneProgress sono già in Goal
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

// Risposta bulk delete goals
export interface BulkDeleteGoalsResult {
    deletedGoals: number;
    deletedCheckIns: number;
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
export const GOAL_CATEGORIES: Record<GoalCategory, { label: string; icon: IconType; color: string; bgColor: string }> = {
    finance: { label: 'Finanza', icon: FiDollarSign, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
    health: { label: 'Salute', icon: FiActivity, color: 'text-red-400', bgColor: 'bg-red-500/15' },
    learning: { label: 'Apprendimento', icon: FiBookOpen, color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
    career: { label: 'Carriera', icon: FiBriefcase, color: 'text-primary-400', bgColor: 'bg-primary-500/15' },
    personal: { label: 'Personale', icon: FiUser, color: 'text-amber-400', bgColor: 'bg-amber-500/15' },
    relationships: { label: 'Relazioni', icon: FiHeart, color: 'text-pink-400', bgColor: 'bg-pink-500/15' },
    creativity: { label: 'Creatività', icon: FiFeather, color: 'text-orange-400', bgColor: 'bg-orange-500/15' },
    mindfulness: { label: 'Mindfulness', icon: FiSun, color: 'text-cyan-400', bgColor: 'bg-cyan-500/15' },
};

// Helper per i tipi di goal (per UI)
export const GOAL_TYPES: Record<GoalType, { label: string; icon: IconType; description: string; color: string }> = {
    target: { 
        label: 'Obiettivo Target', 
        icon: FiTarget, 
        description: 'Raggiungi un valore specifico misurabile',
        color: 'from-blue-500 to-blue-600'
    },
    habit: { 
        label: 'Abitudine', 
        icon: FiRepeat, 
        description: 'Costruisci costanza con attività ricorrenti',
        color: 'from-green-500 to-green-600'
    },
    milestone: { 
        label: 'Milestone', 
        icon: FiFlag, 
        description: 'Dividi in step progressivi da completare',
        color: 'from-purple-500 to-purple-600'
    },
    challenge: { 
        label: 'Sfida', 
        icon: FiZap, 
        description: 'Sfida a tempo limitato con deadline',
        color: 'from-orange-500 to-orange-600'
    },
    project: { 
        label: 'Progetto', 
        icon: FiLayers, 
        description: 'Progetto con deliverables specifici',
        color: 'from-pink-500 to-pink-600'
    },
};

// Helper per i mood (per UI)
export const MOOD_OPTIONS: Record<Mood, { label: string; emoji: string }> = {
    1: { label: 'Difficile', emoji: '😓' },
    2: { label: 'Neutro', emoji: '😐' },
    3: { label: 'Ottimo', emoji: '😊' },
};
