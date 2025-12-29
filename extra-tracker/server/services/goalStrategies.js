/**
 * Strategy Pattern per Goal Progress Calculation
 * 
 * Ogni tipo di obiettivo ha una logica diversa per calcolare il progresso.
 * Questo pattern ci permette di estendere facilmente con nuovi tipi.
 */

class ProgressStrategy {
    /**
     * Calcola il progresso totale
     */
    calculateProgress(checkIns, goal) {
        throw new Error('calculateProgress must be implemented');
    }

    /**
     * Calcola la percentuale di completamento
     */
    calculatePercentage(checkIns, goal) {
        throw new Error('calculatePercentage must be implemented');
    }

    /**
     * Verifica se l'obiettivo è completato
     */
    isCompleted(checkIns, goal) {
        throw new Error('isCompleted must be implemented');
    }
}

/**
 * Strategy per obiettivi TARGET (valore finale da raggiungere)
 */
class TargetGoalStrategy extends ProgressStrategy {
    calculateProgress(checkIns, goal) {
        return checkIns.reduce((sum, ci) => sum + ci.value, 0);
    }

    calculatePercentage(checkIns, goal) {
        if (!goal.targetValue || goal.targetValue === 0) return 0;
        const progress = this.calculateProgress(checkIns, goal);
        return Math.min(100, Math.round((progress / goal.targetValue) * 100));
    }

    isCompleted(checkIns, goal) {
        return this.calculatePercentage(checkIns, goal) >= 100;
    }
}

/**
 * Strategy per obiettivi HABIT (frequenza settimanale)
 */
class HabitGoalStrategy extends ProgressStrategy {
    calculateProgress(checkIns, goal) {
        // Per le abitudini, il progresso è il numero di check-in
        return checkIns.length;
    }

    calculatePercentage(checkIns, goal) {
        // Calcola quante settimane sono passate dall'inizio
        const start = new Date(goal.createdAt);
        const now = new Date();
        const weeksPassed = Math.max(1, Math.ceil((now - start) / (1000 * 60 * 60 * 24 * 7)));
        
        // Calcola quanti check-in dovrebbero esserci (frequenza * settimane)
        const expectedCheckIns = goal.frequency * weeksPassed;
        
        // Calcola la percentuale
        const actualCheckIns = checkIns.length;
        const percentage = Math.min(100, Math.round((actualCheckIns / expectedCheckIns) * 100));
        
        return percentage;
    }

    isCompleted(checkIns, goal) {
        // Le abitudini non si "completano", ma possiamo verificare se la streak è mantenuta
        // Ritorna true se l'utente ha fatto almeno 1 check-in nell'ultima settimana
        if (checkIns.length === 0) return false;
        
        const lastCheckIn = new Date(checkIns[0].date);
        const now = new Date();
        const daysSinceLastCheckIn = (now - lastCheckIn) / (1000 * 60 * 60 * 24);
        
        return daysSinceLastCheckIn <= 7;
    }

    /**
     * Calcola la "streak" (giorni consecutivi)
     */
    calculateStreak(checkIns) {
        if (checkIns.length === 0) return 0;
        
        // Crea set di date uniche (per gestire multipli check-in nello stesso giorno)
        const uniqueDates = new Set(
            checkIns.map(ci => new Date(ci.date).toISOString().split('T')[0])
        );
        
        let streak = 0;
        const today = new Date();
        let currentDate = new Date(today);
        
        // Verifica che ci sia attività oggi o ieri
        const todayStr = today.toISOString().split('T')[0];
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (!uniqueDates.has(todayStr) && !uniqueDates.has(yesterdayStr)) {
            return 0;
        }
        
        // Conta i giorni consecutivi
        while (true) {
            const dateStr = currentDate.toISOString().split('T')[0];
            if (uniqueDates.has(dateStr)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    }
}

/**
 * Factory per ottenere la strategy giusta
 */
class GoalStrategyFactory {
    static getStrategy(goalType) {
        switch (goalType) {
            case 'target':
                return new TargetGoalStrategy();
            case 'habit':
                return new HabitGoalStrategy();
            default:
                throw new Error(`Unknown goal type: ${goalType}`);
        }
    }
}

/**
 * Service per calcolare statistiche usando le strategy
 */
const calculateGoalStats = (goal, checkIns) => {
    const strategy = GoalStrategyFactory.getStrategy(goal.type);
    
    const totalProgress = strategy.calculateProgress(checkIns, goal);
    const percentage = strategy.calculatePercentage(checkIns, goal);
    const isCompleted = strategy.isCompleted(checkIns, goal);
    
    // Dati specifici per habit
    let streak = 0;
    if (goal.type === 'habit') {
        streak = strategy.calculateStreak(checkIns);
    }
    
    return {
        totalProgress,
        percentage,
        isCompleted,
        checkInsCount: checkIns.length,
        ...(goal.type === 'habit' && { streak }),
    };
};

module.exports = {
    ProgressStrategy,
    TargetGoalStrategy,
    HabitGoalStrategy,
    GoalStrategyFactory,
    calculateGoalStats,
};
