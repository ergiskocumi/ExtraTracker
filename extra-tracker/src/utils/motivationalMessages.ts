import type { GoalWithProgress } from '../features/goals/types';

interface MotivationalContext {
    percentage: number;
    daysRemaining: number;
    checkInsCount: number;
    streak?: number;
    type: 'target' | 'habit';
}

/**
 * Sistema motivazionale - Genera frasi dinamiche basate sul contesto
 * Applica la Nudge Theory per indurre l'utente all'azione
 */
export const getMotivationalMessage = (context: MotivationalContext): {
    message: string;
    emoji: string;
    type: 'success' | 'warning' | 'info' | 'challenge';
} => {
    const { percentage, daysRemaining, checkInsCount, streak } = context;
    
    const isExpired = daysRemaining < 0;
    const isUrgent = daysRemaining <= 7 && daysRemaining >= 0;
    const isAlmostDone = percentage >= 90;
    const isBehind = percentage < 30 && daysRemaining < 30;
    const isAhead = percentage > 50 && daysRemaining > 30;
    
    // Obiettivo completato
    if (percentage >= 100) {
        return {
            message: '🎉 Incredibile! Hai raggiunto il tuo obiettivo! Prenditi un momento per celebrare.',
            emoji: '🎉',
            type: 'success',
        };
    }
    
    // Quasi completato
    if (isAlmostDone) {
        return {
            message: 'Mancano solo pochi passi! Puoi farcela, sei quasi arrivato!',
            emoji: '🔥',
            type: 'challenge',
        };
    }
    
    // Scaduto
    if (isExpired) {
        return {
            message: 'L\'obiettivo è scaduto, ma non è mai troppo tardi per ricominciare. Rinnova la deadline!',
            emoji: '⚠️',
            type: 'warning',
        };
    }
    
    // Urgente
    if (isUrgent) {
        return {
            message: `Ultima settimana! Concentrati, hai solo ${daysRemaining} giorni per completare.`,
            emoji: '⏰',
            type: 'warning',
        };
    }
    
    // In ritardo
    if (isBehind) {
        return {
            message: 'Accelera il ritmo! Sei un po\' indietro rispetto alla tabella di marcia.',
            emoji: '💪',
            type: 'challenge',
        };
    }
    
    // In anticipo
    if (isAhead) {
        return {
            message: 'Stai andando alla grande! Continua così e potresti finire in anticipo.',
            emoji: '🚀',
            type: 'success',
        };
    }
    
    // Streak attiva
    if (streak && streak >= 7) {
        return {
            message: `Wow! ${streak} giorni di streak! Non spezzare la catena.`,
            emoji: '🔥',
            type: 'success',
        };
    }
    
    // Primo check-in
    if (checkInsCount === 0) {
        return {
            message: 'Inizia oggi! Il primo passo è sempre il più importante.',
            emoji: '🎯',
            type: 'info',
        };
    }
    
    // Pochi check-in
    if (checkInsCount < 3) {
        return {
            message: 'Ottimo inizio! La costanza è la chiave del successo.',
            emoji: '✨',
            type: 'info',
        };
    }
    
    // Default: incoraggiamento generico
    return {
        message: `Stai facendo progressi! ${checkInsCount} check-in completati. Continua così!`,
        emoji: '💯',
        type: 'info',
    };
};

/**
 * Genera un messaggio di "challenge" per spingere l'utente
 */
export const getChallengeMessage = (goal: GoalWithProgress, daysRemaining: number): string | null => {
    const { percentage, type, frequency } = goal;
    
    // Per obiettivi target
    if (type === 'target' && percentage < 100) {
        if (daysRemaining <= 14 && percentage < 50) {
            return `🎯 Challenge: Riesci a raggiungere il 50% entro questa settimana?`;
        }
        if (percentage >= 75 && percentage < 100) {
            return `🚀 Sprint finale: Riesci a completare l'obiettivo oggi?`;
        }
    }
    
    // Per abitudini
    if (type === 'habit' && frequency) {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Dom, 1 = Lun, ...
        
        if (dayOfWeek === 1) { // Lunedì
            return `🔄 Nuova settimana! Obiettivo: ${frequency} volte questa settimana.`;
        }
        if (dayOfWeek === 5) { // Venerdì
            return `⚡ Week-end in arrivo! Hai fatto tutti i check-in della settimana?`;
        }
    }
    
    return null;
};

/**
 * Determina il "tono" della frase in base al progresso
 */
export const getMotivationalTone = (percentage: number, daysRemaining: number): 'celebrate' | 'encourage' | 'push' | 'warn' => {
    if (percentage >= 90) return 'celebrate';
    if (percentage >= 60) return 'encourage';
    if (daysRemaining <= 7) return 'warn';
    return 'push';
};

/**
 * Suggerimenti personalizzati basati sul pattern di check-in
 */
export const getPersonalizedTip = (_goal: GoalWithProgress, checkIns: any[]): string | null => {
    if (checkIns.length === 0) return null;
    
    // Analizza il pattern
    const lastCheckIn = new Date(checkIns[0].date);
    const daysSinceLastCheckIn = Math.floor(
        (new Date().getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Nessun check-in da tempo
    if (daysSinceLastCheckIn >= 7) {
        return '💡 Tip: Sono passati alcuni giorni dall\'ultimo check-in. Anche un piccolo progresso conta!';
    }
    
    // Cerca il mood prevalente
    const moodCounts = checkIns.reduce((acc: any, ci: any) => {
        acc[ci.mood] = (acc[ci.mood] || 0) + 1;
        return acc;
    }, {});
    
    const dominantMood = Object.keys(moodCounts).reduce((a, b) => 
        moodCounts[a] > moodCounts[b] ? a : b
    );
    
    // Se la maggior parte dei check-in sono "difficili" (mood 1)
    if (dominantMood === '1' && checkIns.length >= 5) {
        return '💡 Tip: Sembra faticoso? Prova a ridurre le aspettative o a spezzare l\'obiettivo in step più piccoli.';
    }
    
    // Se sei costante
    if (checkIns.length >= 10 && daysSinceLastCheckIn <= 2) {
        return '🌟 Tip: La tua costanza è impressionante! Mantieni questo ritmo.';
    }
    
    return null;
};
