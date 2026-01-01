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
     * Aggiorna istantaneamente la UI, poi sincronizza col backend
     */
    const quickCheckIn = async (goalId: string): Promise<void> => {
        setStats(prevStats => ({
            ...prevStats,
            totalCheckIns: prevStats.totalCheckIns + 1,
        }));

        try {
            await goalsService.quickCheckIn(goalId, { setGoals });
        } catch (err: any) {
            console.error('Errore quick check-in:', err);
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
