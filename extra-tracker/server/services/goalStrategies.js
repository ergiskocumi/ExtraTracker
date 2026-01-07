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
 * Strategy per obiettivi MILESTONE (step progressivi)
 * Il progresso è basato sulle milestones completate
 */
class MilestoneGoalStrategy extends ProgressStrategy {
    calculateProgress(checkIns, goal) {
        // Il progresso è il numero di milestones completate
        if (!goal.milestones || goal.milestones.length === 0) {
            return checkIns.reduce((sum, ci) => sum + ci.value, 0);
        }
        // If actionSteps are present, progress is completed steps (fallback to milestone completion)
        const hasAnySteps = goal.milestones.some(m => Array.isArray(m.actionSteps) && m.actionSteps.length > 0);
        if (!hasAnySteps) {
            return goal.milestones.filter(m => m.isCompleted).length;
        }

        return goal.milestones.reduce((sum, m) => {
            const steps = Array.isArray(m.actionSteps) ? m.actionSteps : [];
            if (steps.length === 0) return sum + (m.isCompleted ? 1 : 0);
            return sum + steps.filter(s => s && s.isCompleted).length;
        }, 0);
    }

    calculatePercentage(checkIns, goal) {
        // Se ci sono milestones, usa quelle
        if (goal.milestones && goal.milestones.length > 0) {
            // Weighted progress with partial actionSteps completion
            const totals = goal.milestones.reduce(
                (acc, m) => {
                    const weight = Number(m.weight) || 1;
                    const steps = Array.isArray(m.actionSteps) ? m.actionSteps : [];
                    const hasSteps = steps.length > 0;

                    acc.total += weight;

                    if (hasSteps) {
                        const completedSteps = steps.filter(s => s && s.isCompleted).length;
                        acc.completed += weight * (completedSteps / steps.length);
                    } else {
                        acc.completed += m.isCompleted ? weight : 0;
                    }

                    return acc;
                },
                { total: 0, completed: 0 }
            );

            return totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;
        }
        // Altrimenti comportati come target
        if (!goal.targetValue || goal.targetValue === 0) return 0;
        const progress = checkIns.reduce((sum, ci) => sum + ci.value, 0);
        return Math.min(100, Math.round((progress / goal.targetValue) * 100));
    }

    isCompleted(checkIns, goal) {
        return this.calculatePercentage(checkIns, goal) >= 100;
    }
}

/**
 * Strategy per obiettivi CHALLENGE (sfide a tempo limitato)
 * Simile a target ma con enfasi sulla deadline
 */
class ChallengeGoalStrategy extends ProgressStrategy {
    calculateProgress(checkIns, goal) {
        return checkIns.reduce((sum, ci) => sum + ci.value, 0);
    }

    calculatePercentage(checkIns, goal) {
        if (!goal.targetValue || goal.targetValue === 0) return 0;
        const progress = this.calculateProgress(checkIns, goal);
        return Math.min(100, Math.round((progress / goal.targetValue) * 100));
    }

    isCompleted(checkIns, goal) {
        const progressComplete = this.calculatePercentage(checkIns, goal) >= 100;
        // Per le sfide, verifica anche se è entro la deadline
        const now = new Date();
        const deadline = new Date(goal.deadline);
        const withinDeadline = now <= deadline;
        return progressComplete && withinDeadline;
    }
}

/**
 * Strategy per obiettivi PROJECT (progetti con deliverables)
 * Basato principalmente sulle milestones
 */
class ProjectGoalStrategy extends ProgressStrategy {
    calculateProgress(checkIns, goal) {
        // Il progresso è basato sulle milestones
        if (goal.milestones && goal.milestones.length > 0) {
            return goal.milestones.filter(m => m.isCompleted).length;
        }
        // Fallback ai check-in
        return checkIns.reduce((sum, ci) => sum + ci.value, 0);
    }

    calculatePercentage(checkIns, goal) {
        // Se ci sono milestones, usa quelle
        if (goal.milestones && goal.milestones.length > 0) {
            const totals = goal.milestones.reduce(
                (acc, m) => {
                    const weight = Number(m.weight) || 1;
                    const steps = Array.isArray(m.actionSteps) ? m.actionSteps : [];
                    const hasSteps = steps.length > 0;

                    acc.total += weight;

                    if (hasSteps) {
                        const completedSteps = steps.filter(s => s && s.isCompleted).length;
                        acc.completed += weight * (completedSteps / steps.length);
                    } else {
                        acc.completed += m.isCompleted ? weight : 0;
                    }

                    return acc;
                },
                { total: 0, completed: 0 }
            );

            return totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;
        }
        // Se c'è un targetValue, usa quello
        if (goal.targetValue && goal.targetValue > 0) {
            const progress = checkIns.reduce((sum, ci) => sum + ci.value, 0);
            return Math.min(100, Math.round((progress / goal.targetValue) * 100));
        }
        return 0;
    }

    isCompleted(checkIns, goal) {
        return this.calculatePercentage(checkIns, goal) >= 100;
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
            case 'milestone':
                return new MilestoneGoalStrategy();
            case 'challenge':
                return new ChallengeGoalStrategy();
            case 'project':
                return new ProjectGoalStrategy();
            default:
                // Fallback a target per tipi sconosciuti
                console.warn(`Unknown goal type: ${goalType}, using TargetGoalStrategy`);
                return new TargetGoalStrategy();
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
    MilestoneGoalStrategy,
    ChallengeGoalStrategy,
    ProjectGoalStrategy,
    GoalStrategyFactory,
    calculateGoalStats,
};
