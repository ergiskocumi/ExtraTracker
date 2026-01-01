import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import goalsService from '../services/goalsService';
import type {
    Goal,
    GoalWithProgress,
    CreateGoalDTO,
    UpdateGoalDTO,
    CreateCheckInDTO,
    GoalStats,
} from '../features/goals/types';

// ==================== OPTIMISTIC UI HELPERS ====================

/**
 * Calcola la percentuale per un goal di tipo "habit"
 * basandosi sulle settimane trascorse dalla creazione
 */
const getHabitPercentage = (goal: GoalWithProgress, totalProgress: number, now: Date): number => {
    const start = goal.createdAt ? new Date(goal.createdAt) : now;
    const weeksPassed = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)));
    const frequency = goal.frequency || 1;
    const expectedCheckIns = frequency * weeksPassed;
    if (!expectedCheckIns) return 0;
    return Math.min(100, Math.round((totalProgress / expectedCheckIns) * 100));
};

/**
 * Applica l'aggiornamento optimistico prima della risposta API
 */
const applyQuickCheckInOptimistic = (goal: GoalWithProgress, now: Date): GoalWithProgress => {
    if (goal.type === 'habit') {
        const nextTotalProgress = (goal.totalProgress || 0) + 1;
        return {
            ...goal,
            totalProgress: nextTotalProgress,
            percentage: getHabitPercentage(goal, nextTotalProgress, now),
        };
    }

    if (goal.type === 'target') {
        const nextTotalProgress = (goal.totalProgress || 0) + 1;
        const percentage = goal.targetValue
            ? Math.min(100, Math.round((nextTotalProgress / goal.targetValue) * 100))
            : goal.percentage;
        return {
            ...goal,
            totalProgress: nextTotalProgress,
            currentValue: nextTotalProgress,
            percentage,
        };
    }

    return goal;
};

/**
 * Applica le statistiche reali dal server dopo la risposta API
 */
const applyQuickCheckInStats = (goal: GoalWithProgress, stats: GoalStats): GoalWithProgress => {
    const updated = {
        ...goal,
        totalProgress: stats.totalProgress,
        percentage: stats.percentage,
    };

    if (goal.type === 'target') {
        return {
            ...updated,
            currentValue: stats.totalProgress,
        };
    }

    return updated;
};

// ==================== CONTEXT TYPES ====================

// Tipo del contesto
interface GoalsContextType {
    // Stato
    goals: GoalWithProgress[];
    loading: boolean;
    error: string | null;

    // Statistiche dashboard
    stats: {
        totalGoals: number;
        activeGoals: number;
        completedGoals: number;
        totalCheckIns: number;
    };

    // Azioni Goals
    addGoal: (goalData: CreateGoalDTO) => Promise<Goal>;
    updateGoal: (id: string, goalData: UpdateGoalDTO) => Promise<void>;
    deleteGoal: (id: string) => Promise<void>;

    // Azioni Check-ins
    addCheckIn: (goalId: string, checkInData: CreateCheckInDTO) => Promise<GoalStats>;
    quickCheckIn: (goalId: string) => Promise<void>;

    // Refresh
    refreshGoals: () => Promise<void>;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

export const GoalsProvider = ({ children }: { children: ReactNode }) => {
    const [goals, setGoals] = useState<GoalWithProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        totalCheckIns: 0,
    });

    // Carica goals e statistiche dal server
    const refreshGoals = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const dashboardData = await goalsService.getDashboardStats();
            
            setGoals(dashboardData.activeGoalsWithProgress);
            setStats(dashboardData.summary);
        } catch (err: any) {
            console.error('Errore caricamento goals:', err);
            setError(err.message || 'Errore nel caricamento degli obiettivi');
        } finally {
            setLoading(false);
        }
    }, []);

    // Caricamento iniziale
    useEffect(() => {
        refreshGoals();
    }, [refreshGoals]);

    // Crea un nuovo obiettivo
    const addGoal = async (goalData: CreateGoalDTO): Promise<Goal> => {
        try {
            const newGoal = await goalsService.create(goalData);
            // Refresh per aggiornare le statistiche
            await refreshGoals();
            return newGoal;
        } catch (err: any) {
            console.error('Errore creazione goal:', err);
            throw new Error(err.message || 'Impossibile creare obiettivo');
        }
    };

    // Aggiorna un obiettivo esistente
    const updateGoal = async (id: string, goalData: UpdateGoalDTO): Promise<void> => {
        try {
            await goalsService.update(id, goalData);
            await refreshGoals();
        } catch (err: any) {
            console.error('Errore aggiornamento goal:', err);
            throw new Error(err.message || 'Impossibile aggiornare obiettivo');
        }
    };

    // Elimina un obiettivo
    const deleteGoal = async (id: string): Promise<void> => {
        try {
            await goalsService.delete(id);
            await refreshGoals();
        } catch (err: any) {
            console.error('Errore eliminazione goal:', err);
            throw new Error(err.message || 'Impossibile eliminare obiettivo');
        }
    };

    // Aggiungi un check-in (progresso)
    const addCheckIn = async (goalId: string, checkInData: CreateCheckInDTO): Promise<GoalStats> => {
        try {
            const response = await goalsService.createCheckIn(goalId, checkInData);
            // Aggiorna lo stato locale immediatamente
            setGoals(prevGoals =>
                prevGoals.map(goal =>
                    goal.id === goalId
                        ? {
                              ...goal,
                              totalProgress: response.stats.totalProgress,
                              percentage: response.stats.percentage,
                          }
                        : goal
                )
            );
            return response.stats;
        } catch (err: any) {
            console.error('Errore creazione check-in:', err);
            throw new Error(err.message || 'Impossibile registrare il progresso');
        }
    };

    /**
     * Quick Check-in con Optimistic UI
     * 1. Aggiorna istantaneamente la UI (optimistic)
     * 2. Chiama il backend
     * 3. Applica la risposta reale del server
     * 4. Rollback in caso di errore
     */
    const quickCheckIn = async (goalId: string): Promise<void> => {
        const now = new Date();
        let previousGoal: GoalWithProgress | null = null;

        // 1. Optimistic update su goals
        setGoals(prevGoals =>
            prevGoals.map(goal => {
                if (goal.id !== goalId) return goal;
                previousGoal = goal;
                return applyQuickCheckInOptimistic(goal, now);
            })
        );

        // 2. Optimistic update su stats
        setStats(prevStats => ({
            ...prevStats,
            totalCheckIns: prevStats.totalCheckIns + 1,
        }));

        try {
            // 3. Chiamata API (service è ora UI-agnostico)
            const response = await goalsService.quickCheckIn(goalId);

            // 4. Applica i dati reali dal server
            setGoals(prevGoals =>
                prevGoals.map(goal =>
                    goal.id === goalId ? applyQuickCheckInStats(goal, response.stats) : goal
                )
            );
        } catch (err: any) {
            console.error('Errore quick check-in:', err);

            // 5. Rollback goals
            if (previousGoal) {
                setGoals(prevGoals =>
                    prevGoals.map(goal => (goal.id === goalId ? previousGoal! : goal))
                );
            }

            // 6. Rollback stats
            setStats(prevStats => ({
                ...prevStats,
                totalCheckIns: Math.max(0, prevStats.totalCheckIns - 1),
            }));

            throw new Error(err.message || 'Impossibile registrare il progresso');
        }
    };

    return (
        <GoalsContext.Provider
            value={{
                goals,
                loading,
                error,
                stats,
                addGoal,
                updateGoal,
                deleteGoal,
                addCheckIn,
                quickCheckIn,
                refreshGoals,
            }}
        >
            {children}
        </GoalsContext.Provider>
    );
};

// Hook custom per usare il context
export const useGoals = () => {
    const context = useContext(GoalsContext);
    if (!context) {
        throw new Error('useGoals deve essere usato dentro un GoalsProvider');
    }
    return context;
};
