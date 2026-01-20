/**
 * CONFIGURAZIONE COMPLETA SISTEMA GAMIFICATION
 *
 * Sistema con 30 livelli, XP progressivo, multipliers,
 * challenges, achievements, e penalità inattività.
 */

// ==========================================
// SISTEMA LIVELLI
// ==========================================

const XP_BASE = 100;
const GROWTH_FACTOR = 1.15;

/**
 * Calcola XP richiesti per raggiungere un livello
 * Formula: XP_BASE * (GROWTH_FACTOR ^ (level - 1))
 */
const getXpForLevel = (level) => {
    if (level <= 1) return 0;
    return Math.floor(XP_BASE * Math.pow(GROWTH_FACTOR, level - 1));
};

/**
 * Calcola livello da XP totali
 */
const getLevelFromXp = (xp) => {
    if (xp < XP_BASE) return 1;
    return Math.floor(Math.log(xp / XP_BASE) / Math.log(GROWTH_FACTOR)) + 1;
};

/**
 * Calcola XP cumulativi per raggiungere un livello
 */
const getCumulativeXpForLevel = (level) => {
    let total = 0;
    for (let i = 2; i <= level; i++) {
        total += getXpForLevel(i);
    }
    return total;
};

// Titoli per ogni livello
const LEVEL_TITLES = {
    1: 'Principiante',
    2: 'Curioso',
    3: 'Apprendista',
    4: 'Studente',
    5: 'Iniziato',
    6: 'Praticante',
    7: 'Dedicato',
    8: 'Competente',
    9: 'Abile',
    10: 'Esperto',
    11: 'Veterano',
    12: 'Specialista',
    13: 'Professionista',
    14: 'Maestro',
    15: 'Stratega',
    16: 'Virtuoso',
    17: 'Illuminato',
    18: 'Saggio',
    19: 'Guardiano',
    20: 'Campione',
    21: 'Leggenda',
    22: 'Eroe',
    23: 'Mitico',
    24: 'Celestiale',
    25: 'Divino',
    26: 'Trascendente',
    27: 'Cosmico',
    28: 'Immortale',
    29: 'Supremo',
    30: 'Onnisciente'
};

// Multiplier sbloccati per livello
const LEVEL_MULTIPLIERS = {
    6: 1.05,
    10: 1.10,
    15: 1.15,
    20: 1.20,
    25: 1.25,
    30: 1.30
};

/**
 * Ottiene il multiplier per un dato livello
 */
const getLevelMultiplier = (level) => {
    const thresholds = [30, 25, 20, 15, 10, 6];
    for (const threshold of thresholds) {
        if (level >= threshold) {
            return LEVEL_MULTIPLIERS[threshold];
        }
    }
    return 1.0;
};

// ==========================================
// RANK/TIER SYSTEM
// ==========================================

const RANKS = {
    UNRANKED: { name: 'Unranked', minLevel: 1, maxLevel: 4, color: '#808080' },
    BRONZE: { name: 'Bronze', minLevel: 5, maxLevel: 9, color: '#CD7F32' },
    SILVER: { name: 'Silver', minLevel: 10, maxLevel: 14, color: '#C0C0C0' },
    GOLD: { name: 'Gold', minLevel: 15, maxLevel: 19, color: '#FFD700' },
    PLATINUM: { name: 'Platinum', minLevel: 20, maxLevel: 24, color: '#E5E4E2' },
    DIAMOND: { name: 'Diamond', minLevel: 25, maxLevel: 28, color: '#B9F2FF' },
    MASTER: { name: 'Master', minLevel: 29, maxLevel: 30, color: '#FF4500' }
};

/**
 * Ottiene il rank per un dato livello
 */
const getRankForLevel = (level) => {
    for (const [key, rank] of Object.entries(RANKS)) {
        if (level >= rank.minLevel && level <= rank.maxLevel) {
            return { key, ...rank };
        }
    }
    return { key: 'UNRANKED', ...RANKS.UNRANKED };
};

// ==========================================
// XP PER AZIONE
// ==========================================

const XP_ACTIONS = {
    // STUDIO/FLASHCARD
    SESSION_COMPLETE: {
        base: 10,
        perCorrect: 2,
        speedBonus: { min: 0, max: 10 },
        accuracyBonus: { min: 0, max: 15 },
        dailyCap: 200
    },
    ACCURACY_BONUS: {
        perfect: 15,      // 100%
        excellent: 10,    // >= 90%
        good: 5           // >= 80%
    },

    // OBIETTIVI
    GOAL_CREATED: {
        base: 5,
        deadlineBonus: 2,
        milestonesBonus: 3
    },
    GOAL_COMPLETED: {
        target: { base: 25, earlyBonus: 10, difficultyBonus: 15 },
        habit: { base: 15, highFrequencyBonus: 5 },
        milestone: { base: 20, perMilestoneBonus: 5 },
        challenge: { base: 40, difficultyMultiplier: 1.5 },
        project: { base: 50, complexityBonus: 20 }
    },
    MILESTONE_COMPLETED: {
        base: 10,
        weightMultiplier: 2
    },

    // HABIT/CHECK-IN
    HABIT_CHECKIN: {
        daily: { base: 5, moodBonus: 2, notesBonus: 3 },
        weeklyComplete: { base: 15, allDaysBonus: 10 }
    },
    CONSISTENCY_BONUS: {
        days7: 15,
        days30: 75
    },

    // LAVORO/PRODUTTIVITÀ
    WORK_SESSION_LOGGED: {
        base: 5,
        perHour: 3,
        maxHours: 8,
        dailyCap: 50
    },
    WORK_NOTE_CREATED: {
        base: 3,
        longNoteBonus: 5,     // >= 500 chars
        dailyCap: 20
    },
    PROJECT_CREATED: {
        base: 10,
        descriptionBonus: 3,
        deadlineBonus: 2,
        dailyCap: 30
    },
    PROJECT_COMPLETED: {
        base: 75,
        perDayMultiplier: 2,
        perMilestoneBonus: 5
    },

    // ESAMI
    EXAM_PASSED: {
        base: 50,
        gradeBonus: {
            30: 100,
            28: 75,
            29: 75,
            25: 50, 26: 50, 27: 50,
            22: 25, 23: 25, 24: 25,
            18: 10, 19: 10, 20: 10, 21: 10
        },
        laudeBonus: 50
    }
};

// ==========================================
// STREAK MILESTONES
// ==========================================

const STREAK_MILESTONES = {
    3: 10,
    7: 25,
    14: 50,
    30: 125,
    60: 250,
    90: 400,
    180: 750,
    365: 1500
};

/**
 * Calcola bonus XP per streak milestone raggiunto
 */
const getStreakMilestoneBonus = (currentStreak, previousStreak) => {
    let bonus = 0;
    for (const [days, xp] of Object.entries(STREAK_MILESTONES)) {
        const daysNum = parseInt(days);
        if (currentStreak >= daysNum && previousStreak < daysNum) {
            bonus += xp;
        }
    }
    return bonus;
};

// ==========================================
// MOLTIPLICATORI XP
// ==========================================

const XP_MULTIPLIERS = {
    // Streak multipliers
    STREAK: {
        3: 1.05,
        7: 1.10,
        14: 1.15,
        30: 1.25,
        100: 1.50
    },

    // Weekend bonus (Sabato/Domenica)
    WEEKEND: 1.15,

    // Prima attività del giorno
    FIRST_OF_DAY: 1.25,

    // Combo: azioni nella stessa ora
    COMBO: {
        perAction: 0.05,  // +5% per azione
        maxActions: 5     // max 25% bonus
    },

    // Consistency: 7/7 giorni attivi nella settimana
    WEEKLY_CONSISTENCY: 1.20,

    // Cap massimo totale
    MAX_TOTAL: 3.0
};

/**
 * Ottiene multiplier streak basato sui giorni
 */
const getStreakMultiplier = (streakDays) => {
    const thresholds = [100, 30, 14, 7, 3];
    for (const threshold of thresholds) {
        if (streakDays >= threshold) {
            return XP_MULTIPLIERS.STREAK[threshold];
        }
    }
    return 1.0;
};

/**
 * Verifica se è weekend
 */
const isWeekend = (date = new Date()) => {
    const day = date.getDay();
    return day === 0 || day === 6;
};

/**
 * Calcola multiplier combo basato su azioni recenti
 */
const getComboMultiplier = (actionsInLastHour) => {
    const effectiveActions = Math.min(actionsInLastHour, XP_MULTIPLIERS.COMBO.maxActions);
    return 1 + (effectiveActions * XP_MULTIPLIERS.COMBO.perAction);
};

// ==========================================
// PENALITÀ INATTIVITÀ
// ==========================================

const INACTIVITY_PENALTY = {
    // Giorni prima dell'inizio del decay
    gracePeriodDays: 3,

    // Percentuale XP persa per giorno dopo il grace period
    decayPercentPerDay: 0.01,  // 1%

    // Massima perdita totale
    maxDecayPercent: 0.10      // 10%
};

/**
 * Calcola XP da perdere per inattività
 * Mai scende sotto XP del livello attuale -1
 */
const calculateXpDecay = (totalXp, currentLevel, daysInactive) => {
    if (daysInactive <= INACTIVITY_PENALTY.gracePeriodDays) {
        return 0;
    }

    const daysOver = daysInactive - INACTIVITY_PENALTY.gracePeriodDays;
    const decayPercent = Math.min(
        daysOver * INACTIVITY_PENALTY.decayPercentPerDay,
        INACTIVITY_PENALTY.maxDecayPercent
    );

    const potentialLoss = Math.floor(totalXp * decayPercent);

    // Protezione: non scendere sotto livello -1
    const minXp = currentLevel > 1 ? getCumulativeXpForLevel(currentLevel - 1) : 0;
    const maxLoss = Math.max(0, totalXp - minXp);

    return Math.min(potentialLoss, maxLoss);
};

// ==========================================
// STREAK FREEZE
// ==========================================

const STREAK_FREEZE = {
    cost: 100,            // XP per acquistare
    maxAvailable: 3,      // Massimo accumulabili
    cooldownHours: 24     // Ore tra acquisti
};

// ==========================================
// CHALLENGES
// ==========================================

// DAILY CHALLENGES (3 al giorno)
const DAILY_CHALLENGES = {
    STUDY_CARDS: {
        targets: [10, 20, 30, 50],
        rewards: [15, 30, 50, 80]
    },
    PERFECT_SESSION: {
        targets: [1],
        rewards: [40]
    },
    CHECKIN: {
        targets: [1, 2, 3],
        rewards: [10, 20, 35]
    },
    WORK_TIME: {
        targets: [1, 2, 3, 4],  // ore
        rewards: [15, 30, 45, 60]
    },
    GOAL_PROGRESS: {
        targets: [1],
        rewards: [25]
    },
    EARLY_BIRD: {
        targets: [1],  // Attività prima delle 8:00
        rewards: [30]
    },
    STREAK_KEEPER: {
        targets: [1],  // Mantieni streak
        rewards: [20]
    }
};

const DAILY_CHALLENGES_COUNT = 3;
const DAILY_ALL_COMPLETE_BONUS = 50;

// WEEKLY CHALLENGES (5 a settimana)
const WEEKLY_CHALLENGES = {
    WEEKLY_STUDY: {
        targets: [100, 200, 300, 500],
        rewards: [75, 150, 275, 400]
    },
    WEEKLY_SESSIONS: {
        targets: [5, 10, 15, 20],
        rewards: [50, 125, 200, 275]
    },
    WEEKLY_STREAK: {
        targets: [7],
        rewards: [150]
    },
    WEEKLY_GOALS: {
        targets: [1, 2, 3],
        rewards: [75, 150, 250]
    },
    WEEKLY_WORK: {
        targets: [10, 20, 30, 40],  // ore
        rewards: [50, 125, 200, 275]
    }
};

const WEEKLY_CHALLENGES_COUNT = 5;
const WEEKLY_ALL_COMPLETE_BONUS = 200;

// MONTHLY CHALLENGES (3 al mese)
const MONTHLY_CHALLENGES = {
    MONTHLY_STUDY: {
        targets: [500, 1000, 1500, 2000],
        rewards: [300, 500, 750, 1000]
    },
    MONTHLY_STREAK: {
        targets: [30],
        rewards: [500]
    },
    MONTHLY_GOALS: {
        targets: [5, 7, 10],
        rewards: [250, 400, 600]
    },
    MONTHLY_WORK: {
        targets: [50, 70, 100],  // ore
        rewards: [200, 350, 500]
    },
    MONTHLY_PERFECT: {
        targets: [20, 35, 50],  // sessioni perfette
        rewards: [400, 700, 1000]
    }
};

const MONTHLY_CHALLENGES_COUNT = 3;
const MONTHLY_ALL_COMPLETE_BONUS = 750;

// ==========================================
// ACHIEVEMENTS (40+ Badge)
// ==========================================

const ACHIEVEMENT_TIERS = {
    BRONZE: { name: 'Bronze', multiplier: 1.0, color: '#CD7F32' },
    SILVER: { name: 'Silver', multiplier: 1.5, color: '#C0C0C0' },
    GOLD: { name: 'Gold', multiplier: 2.0, color: '#FFD700' },
    PLATINUM: { name: 'Platinum', multiplier: 3.0, color: '#E5E4E2' },
    DIAMOND: { name: 'Diamond', multiplier: 5.0, color: '#B9F2FF' }
};

// XP base per achievement (moltiplicato per tier)
const ACHIEVEMENT_BASE_XP = 25;

const ACHIEVEMENTS = {
    // ========== STUDY (10) ==========
    flashcard_novice: {
        id: 'flashcard_novice',
        name: 'Novizio delle Card',
        description: 'Completa sessioni di studio',
        category: 'study',
        stat: 'totalStudySessions',
        tiers: { BRONZE: 1, SILVER: 25, GOLD: 100, PLATINUM: 500, DIAMOND: 1000 }
    },
    card_collector: {
        id: 'card_collector',
        name: 'Collezionista di Card',
        description: 'Rivedi flashcard',
        category: 'study',
        stat: 'totalFlashcardsReviewed',
        tiers: { BRONZE: 50, SILVER: 250, GOLD: 1000, PLATINUM: 5000, DIAMOND: 10000 }
    },
    accuracy_master: {
        id: 'accuracy_master',
        name: 'Maestro di Precisione',
        description: 'Ottieni sessioni perfette (100%)',
        category: 'study',
        stat: 'perfectSessions',
        tiers: { BRONZE: 1, SILVER: 10, GOLD: 50, PLATINUM: 200, DIAMOND: 500 }
    },
    night_owl: {
        id: 'night_owl',
        name: 'Gufo Notturno',
        description: 'Studia dopo le 22:00',
        category: 'study',
        stat: 'nightSessions',
        tiers: { BRONZE: 5, SILVER: 25, GOLD: 100, PLATINUM: 300, DIAMOND: 500 }
    },
    early_bird: {
        id: 'early_bird',
        name: 'Mattiniero',
        description: 'Studia prima delle 8:00',
        category: 'study',
        stat: 'earlySessions',
        tiers: { BRONZE: 5, SILVER: 25, GOLD: 100, PLATINUM: 300, DIAMOND: 500 }
    },
    marathon_runner: {
        id: 'marathon_runner',
        name: 'Maratoneta',
        description: 'Studia per più di 4 ore in un giorno',
        category: 'study',
        stat: 'marathonDays',
        tiers: { BRONZE: 1, SILVER: 10, GOLD: 30, PLATINUM: 100, DIAMOND: 200 }
    },
    deck_master: {
        id: 'deck_master',
        name: 'Maestro dei Mazzi',
        description: 'Completa deck al 100%',
        category: 'study',
        stat: 'decksCompleted',
        tiers: { BRONZE: 1, SILVER: 5, GOLD: 20, PLATINUM: 50, DIAMOND: 100 }
    },
    exam_champion: {
        id: 'exam_champion',
        name: 'Campione d\'Esame',
        description: 'Supera esami con voti alti (>=28)',
        category: 'study',
        stat: 'highGradeExams',
        tiers: { BRONZE: 1, SILVER: 5, GOLD: 15, PLATINUM: 30, DIAMOND: 50 }
    },
    laude_hunter: {
        id: 'laude_hunter',
        name: 'Cacciatore di Lodi',
        description: 'Ottieni 30 e Lode',
        category: 'study',
        stat: 'laudeCount',
        tiers: { BRONZE: 1, SILVER: 3, GOLD: 10, PLATINUM: 20, DIAMOND: 30 }
    },
    knowledge_seeker: {
        id: 'knowledge_seeker',
        name: 'Cercatore di Conoscenza',
        description: 'Risposte corrette totali',
        category: 'study',
        stat: 'correctAnswers',
        tiers: { BRONZE: 100, SILVER: 500, GOLD: 2000, PLATINUM: 10000, DIAMOND: 25000 }
    },

    // ========== GOALS (10) ==========
    goal_setter: {
        id: 'goal_setter',
        name: 'Pianificatore',
        description: 'Crea obiettivi',
        category: 'goals',
        stat: 'goalsCreated',
        tiers: { BRONZE: 1, SILVER: 10, GOLD: 50, PLATINUM: 150, DIAMOND: 300 }
    },
    achiever: {
        id: 'achiever',
        name: 'Realizzatore',
        description: 'Completa obiettivi',
        category: 'goals',
        stat: 'goalsCompleted',
        tiers: { BRONZE: 1, SILVER: 10, GOLD: 50, PLATINUM: 100, DIAMOND: 250 }
    },
    habit_builder: {
        id: 'habit_builder',
        name: 'Costruttore di Abitudini',
        description: 'Effettua check-in abitudini',
        category: 'goals',
        stat: 'habitCheckIns',
        tiers: { BRONZE: 7, SILVER: 30, GOLD: 100, PLATINUM: 365, DIAMOND: 1000 }
    },
    milestone_hunter: {
        id: 'milestone_hunter',
        name: 'Cacciatore di Milestone',
        description: 'Completa milestone',
        category: 'goals',
        stat: 'milestonesCompleted',
        tiers: { BRONZE: 5, SILVER: 25, GOLD: 100, PLATINUM: 300, DIAMOND: 500 }
    },
    early_finisher: {
        id: 'early_finisher',
        name: 'Finisher Anticipato',
        description: 'Completa obiettivi prima della deadline',
        category: 'goals',
        stat: 'earlyCompletions',
        tiers: { BRONZE: 1, SILVER: 10, GOLD: 30, PLATINUM: 75, DIAMOND: 150 }
    },
    project_master: {
        id: 'project_master',
        name: 'Maestro dei Progetti',
        description: 'Completa progetti',
        category: 'goals',
        stat: 'projectsCompleted',
        tiers: { BRONZE: 1, SILVER: 5, GOLD: 15, PLATINUM: 40, DIAMOND: 80 }
    },
    challenge_conqueror: {
        id: 'challenge_conqueror',
        name: 'Conquistatore di Sfide',
        description: 'Completa challenges',
        category: 'goals',
        stat: 'challengesCompleted',
        tiers: { BRONZE: 10, SILVER: 50, GOLD: 200, PLATINUM: 500, DIAMOND: 1000 }
    },
    daily_champion: {
        id: 'daily_champion',
        name: 'Campione Giornaliero',
        description: 'Completa tutte le daily challenges in un giorno',
        category: 'goals',
        stat: 'dailyAllCompleteCount',
        tiers: { BRONZE: 1, SILVER: 7, GOLD: 30, PLATINUM: 100, DIAMOND: 250 }
    },
    weekly_warrior: {
        id: 'weekly_warrior',
        name: 'Guerriero Settimanale',
        description: 'Completa tutte le weekly challenges',
        category: 'goals',
        stat: 'weeklyAllCompleteCount',
        tiers: { BRONZE: 1, SILVER: 4, GOLD: 12, PLATINUM: 30, DIAMOND: 52 }
    },
    monthly_master: {
        id: 'monthly_master',
        name: 'Maestro Mensile',
        description: 'Completa tutte le monthly challenges',
        category: 'goals',
        stat: 'monthlyAllCompleteCount',
        tiers: { BRONZE: 1, SILVER: 3, GOLD: 6, PLATINUM: 12, DIAMOND: 24 }
    },

    // ========== STREAK (8) ==========
    streak_starter: {
        id: 'streak_starter',
        name: 'Iniziatore di Streak',
        description: 'Raggiungi streak di 3 giorni',
        category: 'streak',
        stat: 'bestStreak',
        tiers: { BRONZE: 3 }
    },
    week_warrior: {
        id: 'week_warrior',
        name: 'Guerriero della Settimana',
        description: 'Raggiungi streak di 7 giorni',
        category: 'streak',
        stat: 'bestStreak',
        tiers: { BRONZE: 7 }
    },
    fortnight_fighter: {
        id: 'fortnight_fighter',
        name: 'Combattente del Quindicinale',
        description: 'Raggiungi streak di 14 giorni',
        category: 'streak',
        stat: 'bestStreak',
        tiers: { BRONZE: 14 }
    },
    month_master: {
        id: 'month_master',
        name: 'Maestro del Mese',
        description: 'Raggiungi streak di 30+ giorni',
        category: 'streak',
        stat: 'bestStreak',
        tiers: { BRONZE: 30, SILVER: 60, GOLD: 90, PLATINUM: 180, DIAMOND: 365 }
    },
    consistency_king: {
        id: 'consistency_king',
        name: 'Re della Consistenza',
        description: 'Completa settimane piene (7/7 giorni)',
        category: 'streak',
        stat: 'weekStreaksAchieved',
        tiers: { BRONZE: 1, SILVER: 4, GOLD: 12, PLATINUM: 30, DIAMOND: 52 }
    },
    comeback_kid: {
        id: 'comeback_kid',
        name: 'Ritornello',
        description: 'Ricostruisci streak dopo averla persa',
        category: 'streak',
        stat: 'comebacks',
        tiers: { BRONZE: 1, SILVER: 5, GOLD: 15, PLATINUM: 30, DIAMOND: 50 }
    },
    active_lifestyle: {
        id: 'active_lifestyle',
        name: 'Stile di Vita Attivo',
        description: 'Giorni totali di attività',
        category: 'streak',
        stat: 'totalActiveDays',
        tiers: { BRONZE: 7, SILVER: 30, GOLD: 100, PLATINUM: 365, DIAMOND: 1000 }
    },
    weekend_warrior: {
        id: 'weekend_warrior',
        name: 'Guerriero del Weekend',
        description: 'Attività nei weekend',
        category: 'streak',
        stat: 'weekendActiveDays',
        tiers: { BRONZE: 4, SILVER: 20, GOLD: 52, PLATINUM: 104, DIAMOND: 200 }
    },

    // ========== PRODUCTIVITY (7) ==========
    work_starter: {
        id: 'work_starter',
        name: 'Lavoratore in Erba',
        description: 'Registra sessioni di lavoro',
        category: 'productivity',
        stat: 'workSessionsLogged',
        tiers: { BRONZE: 5, SILVER: 25, GOLD: 100, PLATINUM: 300, DIAMOND: 500 }
    },
    time_tracker: {
        id: 'time_tracker',
        name: 'Tracker del Tempo',
        description: 'Ore totali di lavoro registrate',
        category: 'productivity',
        stat: 'totalWorkMinutes',
        isMinutes: true,  // Conversione ore
        tiers: { BRONZE: 600, SILVER: 3000, GOLD: 12000, PLATINUM: 30000, DIAMOND: 60000 }
    },
    note_taker: {
        id: 'note_taker',
        name: 'Prenditor di Note',
        description: 'Crea note di lavoro',
        category: 'productivity',
        stat: 'notesCreated',
        tiers: { BRONZE: 5, SILVER: 25, GOLD: 100, PLATINUM: 300, DIAMOND: 500 }
    },
    deadline_destroyer: {
        id: 'deadline_destroyer',
        name: 'Distruttore di Deadline',
        description: 'Rispetta deadline',
        category: 'productivity',
        stat: 'deadlinesMet',
        tiers: { BRONZE: 5, SILVER: 20, GOLD: 50, PLATINUM: 100, DIAMOND: 200 }
    },
    productivity_pro: {
        id: 'productivity_pro',
        name: 'Pro della Produttività',
        description: 'Giornate con 8+ ore di lavoro',
        category: 'productivity',
        stat: 'fullWorkDays',
        tiers: { BRONZE: 5, SILVER: 25, GOLD: 75, PLATINUM: 150, DIAMOND: 300 }
    },
    efficiency_expert: {
        id: 'efficiency_expert',
        name: 'Esperto di Efficienza',
        description: 'Completa task nei progetti',
        category: 'productivity',
        stat: 'projectTasksCompleted',
        tiers: { BRONZE: 10, SILVER: 50, GOLD: 200, PLATINUM: 500, DIAMOND: 1000 }
    },
    multi_tasker: {
        id: 'multi_tasker',
        name: 'Multi-Tasker',
        description: 'Lavora su più progetti nello stesso giorno',
        category: 'productivity',
        stat: 'multiProjectDays',
        tiers: { BRONZE: 5, SILVER: 20, GOLD: 50, PLATINUM: 100, DIAMOND: 200 }
    },

    // ========== SPECIAL (5) ==========
    level_up: {
        id: 'level_up',
        name: 'Level Up!',
        description: 'Raggiungi nuovi livelli',
        category: 'special',
        stat: 'level',
        tiers: { BRONZE: 5, SILVER: 10, GOLD: 20, PLATINUM: 25, DIAMOND: 30 }
    },
    xp_collector: {
        id: 'xp_collector',
        name: 'Collezionista XP',
        description: 'Accumula XP totali',
        category: 'special',
        stat: 'xp',
        tiers: { BRONZE: 1000, SILVER: 10000, GOLD: 50000, PLATINUM: 150000, DIAMOND: 333840 }
    },
    first_steps: {
        id: 'first_steps',
        name: 'Primi Passi',
        description: 'Completa la prima attività',
        category: 'special',
        stat: 'firstActivity',
        tiers: { BRONZE: 1 }
    },
    freeze_saver: {
        id: 'freeze_saver',
        name: 'Salvatore di Streak',
        description: 'Usa streak freeze',
        category: 'special',
        stat: 'freezesUsed',
        tiers: { BRONZE: 1, SILVER: 5, GOLD: 15, PLATINUM: 30, DIAMOND: 50 }
    },
    rank_climber: {
        id: 'rank_climber',
        name: 'Scalatore di Rank',
        description: 'Raggiungi nuovi rank',
        category: 'special',
        stat: 'highestRank',
        tiers: { BRONZE: 'BRONZE', SILVER: 'SILVER', GOLD: 'GOLD', PLATINUM: 'PLATINUM', DIAMOND: 'MASTER' }
    }
};

// ==========================================
// DAILY XP CAPS
// ==========================================

const DAILY_XP_CAPS = {
    study: 200,
    work: 50,
    notes: 20,
    projects: 30
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    // Costanti livelli
    XP_BASE,
    GROWTH_FACTOR,
    LEVEL_TITLES,
    LEVEL_MULTIPLIERS,

    // Funzioni livelli
    getXpForLevel,
    getLevelFromXp,
    getCumulativeXpForLevel,
    getLevelMultiplier,

    // Ranks
    RANKS,
    getRankForLevel,

    // XP Actions
    XP_ACTIONS,

    // Streak
    STREAK_MILESTONES,
    getStreakMilestoneBonus,

    // Multipliers
    XP_MULTIPLIERS,
    getStreakMultiplier,
    isWeekend,
    getComboMultiplier,

    // Penalità
    INACTIVITY_PENALTY,
    calculateXpDecay,

    // Streak Freeze
    STREAK_FREEZE,

    // Challenges
    DAILY_CHALLENGES,
    DAILY_CHALLENGES_COUNT,
    DAILY_ALL_COMPLETE_BONUS,
    WEEKLY_CHALLENGES,
    WEEKLY_CHALLENGES_COUNT,
    WEEKLY_ALL_COMPLETE_BONUS,
    MONTHLY_CHALLENGES,
    MONTHLY_CHALLENGES_COUNT,
    MONTHLY_ALL_COMPLETE_BONUS,

    // Achievements
    ACHIEVEMENT_TIERS,
    ACHIEVEMENT_BASE_XP,
    ACHIEVEMENTS,

    // Daily caps
    DAILY_XP_CAPS
};
