/**
 * 🎯 useGoalsManager Hook
 * 
 * Custom hook che gestisce tutta la logica di business per la pagina Goals:
 * - Fetch e stato dei goals
 * - Filtri e ordinamento
 * - Quick check-in con optimistic UI
 * - Smart logic (suggested goal, daily score, motivational messages)
 * - Helper functions per calcoli UI
 * 
 * Separazione delle responsabilità:
 * - Questo hook → LOGICA DI BUSINESS
 * - GoalsPage.tsx → PRESENTAZIONE UI
 */

import { useState, useMemo, useCallback } from 'react';
import { useGoals } from '../context/GoalsContext';
import type { GoalWithProgress } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export type SortOption = 'percentage' | 'deadline' | 'recent';
export type StatusFilter = 'all' | 'active' | 'completed';

export interface GoalsFilters {
    searchQuery: string;
    category: string;
    status: StatusFilter;
    sortBy: SortOption;
}

export interface SmartLogicResult {
    dailyScore: number;
    suggestedGoal: GoalWithProgress | null;
    motivationalMessage: MotivationalMessage;
    habitsDoneToday: number;
    habitsTotal: number;
}

export interface MotivationalMessage {
    message: string;
    emoji: string;
    type: 'start' | 'progress' | 'success';
}

export interface QuickCheckInState {
    checkingInGoals: Set<string>;
    checkedInGoals: Set<string>;
    pulsingGoals: Set<string>;
}

export interface GoalUIHelpers {
    getDaysRemaining: (deadline: string) => number;
    getProgressColor: (percentage: number) => string;
    isGoalExpired: (deadline: string) => boolean;
    isGoalUrgent: (deadline: string) => boolean;
    canQuickCheckIn: (goal: GoalWithProgress) => boolean;
}

export interface UseGoalsManagerReturn {
    // Data
    goals: GoalWithProgress[];
    filteredGoals: GoalWithProgress[];
    stats: {
        totalGoals: number;
        activeGoals: number;
        completedGoals: number;
        totalCheckIns: number;
    };
    
    // Loading states
    loading: boolean;
    error: string | null;
    
    // Filters
    filters: GoalsFilters;
    setSearchQuery: (query: string) => void;
    setFilterCategory: (category: string) => void;
    setFilterStatus: (status: StatusFilter) => void;
    setSortBy: (sort: SortOption) => void;
    clearFilters: () => void;
    hasActiveFilters: boolean;
    
    // Quick Check-in
    quickCheckInState: QuickCheckInState;
    handleQuickCheckIn: (e: React.MouseEvent, goalId: string) => Promise<void>;

    // Bulk delete
    bulkDeleteGoals: (goalIds: string[]) => Promise<void>;

    // Single delete
    deleteGoal: (id: string) => Promise<void>;
    
    // Smart Logic
    smartLogic: SmartLogicResult;
    
    // UI Helpers
    helpers: GoalUIHelpers;
}

// ============================================================================
// SMART LOGIC - Algoritmo di Suggerimenti Intelligenti
// ============================================================================

const calculateSmartLogic = (goals: GoalWithProgress[]): SmartLogicResult => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtra solo obiettivi attivi
    const activeGoals = goals.filter(g => g.status !== 'completed');
    
    // Identifica abitudini (habit goals)
    const habitGoals = activeGoals.filter(g => g.type === 'habit');
    
    // Calcola quanti habit hanno uno streak attivo
    const habitsWithProgress = habitGoals.filter(g => (g.streak || 0) > 0 || g.percentage > 0);
    
    const habitsDoneToday = habitsWithProgress.length;
    const habitsTotal = habitGoals.length;
    
    // Daily Score: media ponderata + bonus streak
    let dailyScore = 0;
    if (activeGoals.length > 0) {
        const avgProgress = activeGoals.reduce((sum, g) => sum + g.percentage, 0) / activeGoals.length;
        const streakBonus = activeGoals.filter(g => (g.streak || 0) >= 3).length * 5;
        dailyScore = Math.min(100, Math.round(avgProgress + streakBonus));
    } else {
        dailyScore = 100;
    }

    // === LOGICA PRIORITÀ SUGGESTED GOAL ===
    let suggestedGoal: GoalWithProgress | null = null;

    // 1. Habit con streak alto (rischio di perderlo)
    const habitsWithStreak = habitGoals
        .filter(g => (g.streak || 0) > 0)
        .sort((a, b) => (b.streak || 0) - (a.streak || 0));
    
    if (habitsWithStreak.length > 0) {
        suggestedGoal = habitsWithStreak[0];
    }

    // 2. Obiettivo con scadenza vicina (< 3 giorni)
    if (!suggestedGoal) {
        const urgentGoals = activeGoals
            .filter(g => {
                const deadline = new Date(g.deadline);
                const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 3 && g.percentage < 100;
            })
            .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        
        if (urgentGoals.length > 0) {
            suggestedGoal = urgentGoals[0];
        }
    }

    // 3. Habit senza streak (per iniziare)
    if (!suggestedGoal) {
        const habitsWithoutStreak = habitGoals.filter(g => (g.streak || 0) === 0);
        if (habitsWithoutStreak.length > 0) {
            suggestedGoal = habitsWithoutStreak[0];
        }
    }

    // 4. Fallback: obiettivo con percentuale più bassa
    if (!suggestedGoal && activeGoals.length > 0) {
        suggestedGoal = [...activeGoals].sort((a, b) => a.percentage - b.percentage)[0];
    }

    // === MOTIVATIONAL MESSAGE ===
    const motivationalMessage = getMotivationalMessage(dailyScore);

    return {
        dailyScore,
        suggestedGoal,
        motivationalMessage,
        habitsDoneToday,
        habitsTotal,
    };
};

const getMotivationalMessage = (dailyScore: number): MotivationalMessage => {
    if (dailyScore < 30) {
        const startMessages: MotivationalMessage[] = [
            { message: "Ogni grande viaggio inizia con un piccolo passo. Inizia ora!", emoji: "🚀", type: 'start' },
            { message: "Il momento migliore per iniziare è adesso. Sei pronto?", emoji: "⭐", type: 'start' },
            { message: "Non aspettare la motivazione, crea l'azione!", emoji: "💪", type: 'start' },
            { message: "Oggi è il giorno perfetto per fare progressi.", emoji: "🎯", type: 'start' },
        ];
        return startMessages[Math.floor(Math.random() * startMessages.length)];
    } 
    
    if (dailyScore >= 80) {
        const successMessages: MotivationalMessage[] = [
            { message: "Straordinario! Stai dominando i tuoi obiettivi!", emoji: "🏆", type: 'success' },
            { message: "Che giornata produttiva! Continua così!", emoji: "🔥", type: 'success' },
            { message: "Sei una macchina! I risultati parlano da soli.", emoji: "⚡", type: 'success' },
            { message: "Eccellente lavoro! La costanza paga sempre.", emoji: "🌟", type: 'success' },
        ];
        return successMessages[Math.floor(Math.random() * successMessages.length)];
    }
    
    const progressMessages: MotivationalMessage[] = [
        { message: "Buon lavoro finora! Continua a spingere.", emoji: "💫", type: 'progress' },
        { message: "Stai costruendo abitudini vincenti!", emoji: "📈", type: 'progress' },
        { message: "Ogni check-in ti avvicina al successo.", emoji: "✨", type: 'progress' },
        { message: "Sei sulla strada giusta, non fermarti!", emoji: "🎯", type: 'progress' },
    ];
    return progressMessages[Math.floor(Math.random() * progressMessages.length)];
};

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

const createHelpers = (): GoalUIHelpers => ({
    getDaysRemaining: (deadline: string): number => {
        const today = new Date();
        const deadlineDate = new Date(deadline);
        return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    },

    getProgressColor: (percentage: number): string => {
        if (percentage >= 75) return 'from-emerald-500 to-green-600';
        if (percentage >= 50) return 'from-blue-500 to-indigo-600';
        if (percentage >= 25) return 'from-yellow-500 to-orange-600';
        return 'from-gray-500 to-slate-600';
    },

    isGoalExpired: (deadline: string): boolean => {
        const today = new Date();
        const deadlineDate = new Date(deadline);
        return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) < 0;
    },

    isGoalUrgent: (deadline: string): boolean => {
        const today = new Date();
        const deadlineDate = new Date(deadline);
        const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysRemaining <= 7 && daysRemaining >= 0;
    },

    canQuickCheckIn: (goal: GoalWithProgress): boolean => {
        return goal.type === 'habit' || (goal.type === 'target' && typeof goal.targetValue === 'number');
    },
});

// ============================================================================
// MAIN HOOK
// ============================================================================

export const useGoalsManager = (): UseGoalsManagerReturn => {
    // Context data
    const { goals, loading, error, stats, quickCheckIn, bulkDeleteGoals, deleteGoal } = useGoals();
    
    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<StatusFilter>('active');
    const [sortBy, setSortBy] = useState<SortOption>('percentage');
    
    // Quick check-in state
    const [checkingInGoals, setCheckingInGoals] = useState<Set<string>>(new Set());
    const [checkedInGoals, setCheckedInGoals] = useState<Set<string>>(new Set());
    const [pulsingGoals, setPulsingGoals] = useState<Set<string>>(new Set());

    // Memoized helpers (stable reference)
    const helpers = useMemo(() => createHelpers(), []);

    // Smart logic calculation
    const smartLogic = useMemo(() => calculateSmartLogic(goals), [goals]);

    // Filter & Sort logic
    const filteredGoals = useMemo(() => {
        return goals
            .filter(goal => {
                const matchesSearch = searchQuery === '' || 
                    goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (goal.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
                
                const matchesCategory = filterCategory === 'all' || goal.category === filterCategory;
                
                const matchesStatus = filterStatus === 'all' || 
                    (filterStatus === 'completed' && goal.status === 'completed') ||
                    (filterStatus === 'active' && goal.status !== 'completed');
                
                return matchesSearch && matchesCategory && matchesStatus;
            })
            .sort((a, b) => {
                switch(sortBy) {
                    case 'percentage':
                        return b.percentage - a.percentage;
                    case 'deadline':
                        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                    case 'recent':
                        return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
                    default:
                        return 0;
                }
            });
    }, [goals, searchQuery, filterCategory, filterStatus, sortBy]);

    // Check if filters are active
    const hasActiveFilters = searchQuery !== '' || filterCategory !== 'all' || filterStatus !== 'active';

    // Clear all filters
    const clearFilters = useCallback(() => {
        setSearchQuery('');
        setFilterCategory('all');
        setFilterStatus('active');
    }, []);

    // Quick check-in handler with optimistic UI feedback
    const handleQuickCheckIn = useCallback(async (e: React.MouseEvent, goalId: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (checkingInGoals.has(goalId)) return;
        
        // Start loading state
        setCheckingInGoals(prev => new Set(prev).add(goalId));
        
        // Pulse animation
        setPulsingGoals(prev => new Set(prev).add(goalId));
        setTimeout(() => {
            setPulsingGoals(prev => {
                const next = new Set(prev);
                next.delete(goalId);
                return next;
            });
        }, 350);

        try {
            await quickCheckIn(goalId);
            
            // Success feedback
            setCheckedInGoals(prev => new Set(prev).add(goalId));
            
            // Clear success feedback after 2s
            setTimeout(() => {
                setCheckedInGoals(prev => {
                    const next = new Set(prev);
                    next.delete(goalId);
                    return next;
                });
            }, 2000);
        } catch (err) {
            console.error('Quick check-in failed:', err);
        } finally {
            setCheckingInGoals(prev => {
                const next = new Set(prev);
                next.delete(goalId);
                return next;
            });
        }
    }, [checkingInGoals, quickCheckIn]);

    // Compose filters object
    const filters: GoalsFilters = {
        searchQuery,
        category: filterCategory,
        status: filterStatus,
        sortBy,
    };

    // Compose quick check-in state
    const quickCheckInState: QuickCheckInState = {
        checkingInGoals,
        checkedInGoals,
        pulsingGoals,
    };

    return {
        // Data
        goals,
        filteredGoals,
        stats,
        
        // Loading states
        loading,
        error,
        
        // Filters
        filters,
        setSearchQuery,
        setFilterCategory,
        setFilterStatus,
        setSortBy,
        clearFilters,
        hasActiveFilters,
        
        // Quick Check-in
        quickCheckInState,
        handleQuickCheckIn,

        // Bulk delete
        bulkDeleteGoals,

        // Single delete
        deleteGoal,
        
        // Smart Logic
        smartLogic,
        
        // UI Helpers
        helpers,
    };
};

export default useGoalsManager;
