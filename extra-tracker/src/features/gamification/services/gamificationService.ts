/**
 * GAMIFICATION SERVICE
 *
 * Servizio per le chiamate API del sistema di gamification.
 * Gestisce: status, streak, challenges, achievements, levels.
 */

import { apiClient } from '../../../shared/services/apiClient';

// ==========================================
// TYPES
// ==========================================

export interface GamificationStatus {
    level: number;
    title: string;
    rank: string;
    xp: number;
    xpForCurrentLevel: number;
    xpForNextLevel: number;
    xpInCurrentLevel: number;
    xpNeededForNext: number;
    totalXp: number;
    streak: {
        current: number;
        longest: number;
        lastActivityDate: string | null;
        freezesAvailable: number;
        isAtRisk: boolean;
    };
    multipliers: {
        total: number;
        breakdown: {
            base: number;
            streak?: number;
            level?: number;
            firstOfDay?: number;
        };
    };
    stats: {
        totalStudyTime: number;
        totalSessions: number;
        totalCards: number;
        goalsCompleted: number;
    };
}

export interface StreakInfoResponse {
    current: number;
    best: number;
    lastActivityDate: string | null;
    isActiveToday: boolean;
    nextMilestone: number | null;
    xpAtNextMilestone: number;
    daysToNextMilestone: number | null;
    freezes: {
        available: number;
        maxAvailable: number;
        cost: number;
        canPurchase: boolean;
        cooldownHoursRemaining: number;
    };
}

export interface StreakInfo {
    current: number;
    longest: number;
    lastActivityDate: string | null;
    freezesAvailable: number;
    isAtRisk: boolean;
    freezeCost: number;
    maxFreezes: number;
    daysUntilReset: number;
}

export interface ChallengeRaw {
    type: string;
    target: number;
    progress: number;
    reward: number;
    completed: boolean;
    completedAt: string | null;
}

export interface Challenge {
    id: string;
    type: string;
    title: string;
    description: string;
    targetValue: number;
    currentValue: number;
    xpReward: number;
    status: 'active' | 'completed' | 'failed' | 'expired';
    expiresAt: string;
    completedAt?: string;
    progress: number;
    icon?: string;
}

export interface ChallengesDataRaw {
    daily: {
        date: string;
        challenges: ChallengeRaw[];
        timeRemaining: number;
        allComplete: boolean;
        allCompleteBonus: number;
    };
    weekly: {
        weekStart: string;
        challenges: ChallengeRaw[];
        timeRemaining: number;
        allComplete: boolean;
        allCompleteBonus: number;
    };
    monthly: {
        monthStart: string;
        challenges: ChallengeRaw[];
        timeRemaining: number;
        allComplete: boolean;
        allCompleteBonus: number;
    };
}

export interface ChallengesData {
    daily: Challenge[];
    weekly: Challenge[];
    monthly: Challenge[];
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    category: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    xpReward: number;
    icon: string;
    requirement: {
        type: string;
        value: number;
    };
    progress: {
        current: number;
        target: number;
        percentage: number;
    };
    unlockedAt?: string;
    isUnlocked: boolean;
}

export interface AchievementsData {
    all: Achievement[];
    unlocked: Achievement[];
    inProgress: Achievement[];
    byCategory: Record<string, Achievement[]>;
    stats: {
        total: number;
        unlocked: number;
        percentage: number;
    };
}

export interface LevelInfo {
    level: number;
    title: string;
    xpRequired: number;
    cumulativeXp: number;
    multiplier?: number;
}

export interface LevelsData {
    levels: LevelInfo[];
    ranks: Record<string, { minLevel: number; maxLevel: number; name: string }>;
}

export interface MultipliersData {
    total: number;
    breakdown: {
        base: number;
        streak?: number;
        level?: number;
        firstOfDay?: number;
    };
}

export interface StreakFreezeResult {
    success: boolean;
    reason?: string;
    freezesRemaining?: number;
    coinsSpent?: number;
}

// ==========================================
// API CALLS
// ==========================================

interface GamificationStatusRaw {
    xp: number;
    level: number;
    title: string;
    rank: string;
    rankColor?: string;
    rankName?: string;
    progression: {
        xpInCurrentLevel: number;
        xpNeededForNext: number;
        progressPercent: number;
        currentLevelXp: number;
        nextLevelXp: number;
    };
    streak: {
        current: number;
        best: number;
        lastActivityDate: string | null;
    };
    activeMultipliers: Array<{
        type: string;
        value: number;
        description: string;
    }>;
    totalMultiplier: number;
    streakFreezes: {
        available: number;
        lastPurchased: string | null;
    };
    stats: Record<string, number>;
    extendedStats: Record<string, number>;
    achievementsCount: number;
    dailyXpCaps: Record<string, unknown>;
}

/**
 * Ottiene lo status completo della gamification per l'utente
 */
export const getGamificationStatus = async (): Promise<GamificationStatus> => {
    const response = await apiClient.get<GamificationStatusRaw>('/gamification/status');
    if (!response.data) {
        throw new Error('Nessun dato di gamification ricevuto');
    }

    const data = response.data;

    return {
        level: data.level,
        title: data.title,
        rank: data.rank,
        xp: data.xp,
        xpForCurrentLevel: data.progression?.currentLevelXp || 0,
        xpForNextLevel: data.progression?.nextLevelXp || 100,
        xpInCurrentLevel: data.progression?.xpInCurrentLevel || 0,
        xpNeededForNext: data.progression?.xpNeededForNext || 100,
        totalXp: data.xp,
        streak: {
            current: data.streak?.current || 0,
            longest: data.streak?.best || 0,
            lastActivityDate: data.streak?.lastActivityDate || null,
            freezesAvailable: data.streakFreezes?.available || 0,
            isAtRisk: !data.streak?.lastActivityDate || (
                new Date().getTime() - new Date(data.streak.lastActivityDate).getTime() > 24 * 60 * 60 * 1000
            ),
        },
        multipliers: {
            total: data.totalMultiplier || 1,
            breakdown: {
                base: 1,
                streak: data.activeMultipliers?.find(m => m.type === 'streak')?.value,
                level: data.activeMultipliers?.find(m => m.type === 'level')?.value,
                firstOfDay: data.activeMultipliers?.find(m => m.type === 'first_of_day')?.value,
            },
        },
        stats: {
            totalStudyTime: data.stats?.totalStudyTime || data.extendedStats?.totalStudyTime || 0,
            totalSessions: data.stats?.totalSessions || data.extendedStats?.totalSessions || 0,
            totalCards: data.stats?.totalCards || data.extendedStats?.cardsStudied || 0,
            goalsCompleted: data.stats?.goalsCompleted || data.extendedStats?.goalsCompleted || 0,
        },
    };
};

/**
 * Ottiene i multipliers attivi per l'utente
 */
export const getMultipliers = async (): Promise<MultipliersData> => {
    const response = await apiClient.get<MultipliersData>('/gamification/multipliers');
    if (!response.data) {
        throw new Error('Nessun dato multipliers ricevuto');
    }
    return response.data;
};

/**
 * Ottiene informazioni dettagliate sulla streak
 */
export const getStreakInfo = async (): Promise<StreakInfo> => {
    const response = await apiClient.get<StreakInfoResponse>('/gamification/streak');
    if (!response.data) {
        throw new Error('Nessun dato streak ricevuto');
    }

    // Converti dal formato backend al formato frontend
    const data = response.data;
    return {
        current: data.current,
        longest: data.best,
        lastActivityDate: data.lastActivityDate,
        freezesAvailable: data.freezes?.available || 0,
        isAtRisk: !data.isActiveToday && data.current > 0,
        freezeCost: data.freezes?.cost || 100,
        maxFreezes: data.freezes?.maxAvailable || 3,
        daysUntilReset: data.isActiveToday ? 24 : (data.daysToNextMilestone || 0),
    };
};

/**
 * Acquista uno streak freeze
 */
export const purchaseStreakFreeze = async (): Promise<StreakFreezeResult> => {
    const response = await apiClient.post<StreakFreezeResult>('/gamification/streak/freeze', {});
    if (!response.data) {
        throw new Error('Errore nell\'acquisto dello streak freeze');
    }
    return response.data;
};

// Mappa i tipi di challenge a titoli e descrizioni leggibili
const CHALLENGE_INFO: Record<string, { title: string; description: string }> = {
    STUDY_CARDS: { title: 'Studia Carte', description: 'Studia un certo numero di flashcard' },
    STUDY: { title: 'Sessione Studio', description: 'Completa sessioni di studio' },
    PERFECT_SESSION: { title: 'Sessione Perfetta', description: 'Completa una sessione con il 100% di accuratezza' },
    EARLY_BIRD: { title: 'Mattiniero', description: 'Studia prima delle 9:00' },
    CHECKIN: { title: 'Check-in', description: 'Effettua il check-in giornaliero' },
    WORK_TIME: { title: 'Tempo Lavoro', description: 'Registra ore di lavoro' },
    GOAL_PROGRESS: { title: 'Progresso Obiettivi', description: 'Fai progressi sui tuoi obiettivi' },
    STREAK_KEEPER: { title: 'Mantieni Streak', description: 'Mantieni la tua serie attiva' },
};

const transformChallenge = (raw: ChallengeRaw, index: number, expiresAt: string): Challenge => {
    const info = CHALLENGE_INFO[raw.type] || { title: raw.type, description: '' };
    const progressPercent = raw.target > 0 ? (raw.progress / raw.target) * 100 : 0;

    return {
        id: `${raw.type}-${index}`,
        type: raw.type,
        title: info.title,
        description: info.description,
        targetValue: raw.target,
        currentValue: raw.progress,
        xpReward: raw.reward,
        status: raw.completed ? 'completed' : 'active',
        expiresAt,
        completedAt: raw.completedAt || undefined,
        progress: Math.min(100, progressPercent),
    };
};

/**
 * Ottiene tutte le challenges (daily, weekly, monthly)
 */
export const getChallenges = async (): Promise<ChallengesData> => {
    const response = await apiClient.get<ChallengesDataRaw>('/gamification/challenges');
    if (!response.data) {
        throw new Error('Nessun dato challenges ricevuto');
    }

    const data = response.data;
    const now = new Date();

    // Calcola date di scadenza
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return {
        daily: (data.daily?.challenges || []).map((c, i) =>
            transformChallenge(c, i, endOfDay.toISOString())
        ),
        weekly: (data.weekly?.challenges || []).map((c, i) =>
            transformChallenge(c, i, endOfWeek.toISOString())
        ),
        monthly: (data.monthly?.challenges || []).map((c, i) =>
            transformChallenge(c, i, endOfMonth.toISOString())
        ),
    };
};

/**
 * Ottiene solo le challenges giornaliere
 */
export const getDailyChallenges = async (): Promise<Challenge[]> => {
    const response = await apiClient.get<Challenge[]>('/gamification/challenges/daily');
    if (!response.data) {
        throw new Error('Nessun dato challenges giornaliere ricevuto');
    }
    return response.data;
};

/**
 * Ottiene solo le challenges settimanali
 */
export const getWeeklyChallenges = async (): Promise<Challenge[]> => {
    const response = await apiClient.get<Challenge[]>('/gamification/challenges/weekly');
    if (!response.data) {
        throw new Error('Nessun dato challenges settimanali ricevuto');
    }
    return response.data;
};

/**
 * Ottiene solo le challenges mensili
 */
export const getMonthlyChallenges = async (): Promise<Challenge[]> => {
    const response = await apiClient.get<Challenge[]>('/gamification/challenges/monthly');
    if (!response.data) {
        throw new Error('Nessun dato challenges mensili ricevuto');
    }
    return response.data;
};

/**
 * Rigenera le challenges (force refresh)
 */
export const refreshChallenges = async (period?: 'daily' | 'weekly' | 'monthly'): Promise<ChallengesData> => {
    const response = await apiClient.post<ChallengesData>('/gamification/challenges/refresh', { period });
    if (!response.data) {
        throw new Error('Errore nel refresh delle challenges');
    }
    return response.data;
};

interface AchievementRaw {
    id: string;
    name: string;
    description: string;
    category: string;
    stat: string;
    currentValue: number;
    currentTier: string | null;
    unlockedAt: string | null;
    totalXpEarned: number;
    tiers: Array<{
        tier: string;
        requirement: number | string;
        isUnlocked: boolean;
        progress: number;
        xpReward: number;
        color: string;
    }>;
    nextTier: {
        tier: string;
        requirement: number | string;
        progress: number;
        xpReward: number;
    } | null;
    isFullyCompleted: boolean;
}

interface AchievementsRawResponse {
    achievements: AchievementRaw[];
    byCategory: Record<string, AchievementRaw[]>;
    stats: {
        total: number;
        unlocked: number;
        fullyCompleted: number;
        tierCounts: Record<string, number>;
        completionPercent: number;
    };
}

const transformAchievement = (raw: AchievementRaw): Achievement => {
    const currentTier = raw.currentTier?.toLowerCase() as Achievement['tier'] || 'bronze';
    const nextTier = raw.nextTier;

    return {
        id: raw.id,
        name: raw.name,
        description: raw.description,
        category: raw.category,
        tier: currentTier,
        xpReward: raw.totalXpEarned || nextTier?.xpReward || 0,
        icon: raw.category,
        requirement: {
            type: raw.stat,
            value: typeof nextTier?.requirement === 'number' ? nextTier.requirement : raw.currentValue,
        },
        progress: {
            current: raw.currentValue,
            target: typeof nextTier?.requirement === 'number' ? nextTier.requirement : raw.currentValue,
            percentage: nextTier?.progress || (raw.isFullyCompleted ? 100 : 0),
        },
        unlockedAt: raw.unlockedAt || undefined,
        isUnlocked: raw.currentTier !== null,
    };
};

/**
 * Ottiene tutti gli achievements con stato per l'utente
 */
export const getAchievements = async (): Promise<AchievementsData> => {
    const response = await apiClient.get<AchievementsRawResponse>('/gamification/achievements');
    if (!response.data) {
        throw new Error('Nessun dato achievements ricevuto');
    }

    const data = response.data;
    const allAchievements = (data.achievements || []).map(transformAchievement);
    const unlocked = allAchievements.filter(a => a.isUnlocked);
    const inProgress = allAchievements.filter(a => !a.isUnlocked && a.progress.percentage > 0);

    // Transform byCategory
    const byCategory: Record<string, Achievement[]> = {};
    for (const [cat, achievements] of Object.entries(data.byCategory || {})) {
        byCategory[cat] = achievements.map(transformAchievement);
    }

    return {
        all: allAchievements,
        unlocked,
        inProgress,
        byCategory,
        stats: {
            total: data.stats?.total || allAchievements.length,
            unlocked: data.stats?.unlocked || unlocked.length,
            percentage: data.stats?.completionPercent || 0,
        },
    };
};

/**
 * Ottiene gli achievements sbloccati di recente
 */
export const getRecentAchievements = async (limit: number = 5): Promise<Achievement[]> => {
    const response = await apiClient.get<Achievement[]>(`/gamification/achievements/recent?limit=${limit}`);
    if (!response.data) {
        throw new Error('Nessun dato achievements recenti ricevuto');
    }
    return response.data;
};

/**
 * Ottiene dettagli di un singolo achievement
 */
export const getAchievementDetails = async (id: string): Promise<Achievement> => {
    const response = await apiClient.get<Achievement>(`/gamification/achievements/${id}`);
    if (!response.data) {
        throw new Error('Achievement non trovato');
    }
    return response.data;
};

/**
 * Ottiene achievements per categoria
 */
export const getAchievementsByCategory = async (category: string): Promise<Achievement[]> => {
    const response = await apiClient.get<Achievement[]>(`/gamification/achievements/category/${category}`);
    if (!response.data) {
        throw new Error('Nessun achievement trovato per questa categoria');
    }
    return response.data;
};

/**
 * Ottiene informazioni sui livelli e rank
 */
export const getLevelsInfo = async (): Promise<LevelsData> => {
    const response = await apiClient.get<LevelsData>('/gamification/levels');
    if (!response.data) {
        throw new Error('Nessun dato livelli ricevuto');
    }
    return response.data;
};

// ==========================================
// EXPORT SERVICE OBJECT
// ==========================================

export const gamificationService = {
    getStatus: getGamificationStatus,
    getMultipliers,
    getStreakInfo,
    purchaseStreakFreeze,
    getChallenges,
    getDailyChallenges,
    getWeeklyChallenges,
    getMonthlyChallenges,
    refreshChallenges,
    getAchievements,
    getRecentAchievements,
    getAchievementDetails,
    getAchievementsByCategory,
    getLevelsInfo,
};

export default gamificationService;
