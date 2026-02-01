/**
 * ADAPTIVE GAP-FILLER ALGORITHM
 *
 * Algoritmo intelligente per la selezione delle carte in modalità Quiz.
 * Obiettivo: Costruire il quiz perfetto bilanciando difficoltà e gratificazione.
 *
 * 4 Fasi:
 * 1. Input e Preparazione Pool
 * 2. Calcolo del Mix (La "Ricetta")
 * 3. Selezione e Ponderazione
 * 4. Assemblaggio e Mascheramento (Fisher-Yates shuffle)
 */

import type { Card } from '../services/studyService';

// ============================================
// TYPES
// ============================================

interface BucketConfig {
    /** Percentuale target (0-1) */
    percentage: number;
    /** Nome del bucket per debug */
    name: string;
}

interface SelectionResult {
    /** Carte selezionate e mescolate */
    cards: Card[];
    /** Debug info */
    debug: {
        urgentCount: number;
        newCount: number;
        safeCount: number;
        totalRequested: number;
        totalAvailable: number;
    };
}

// ============================================
// BUCKET CONFIGURATION
// ============================================

/**
 * Ricetta del mix:
 * - 50% Criticità (Urgent): Carte difficili o con errori
 * - 30% Nuove (New): Carte mai viste
 * - 20% Consolidate (Safe): Carte già padroneggiate
 */
const BUCKET_CONFIG: Record<'urgent' | 'new' | 'safe', BucketConfig> = {
    urgent: { percentage: 0.50, name: 'Criticità' },
    new: { percentage: 0.30, name: 'Nuove' },
    safe: { percentage: 0.20, name: 'Consolidate' },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fisher-Yates Shuffle - O(n) time, O(1) space
 * Mescola l'array in-place in modo uniforme
 */
const fisherYatesShuffle = <T>(array: T[]): T[] => {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

/**
 * Determina se una carta è "urgente" (da ripassare con priorità)
 *
 * Criteri:
 * - status === 'learning' (sta ancora imparando)
 * - easinessFactor < 2.3 (ha sbagliato spesso, default è 2.5)
 * - nextReviewDate passata E non mastered
 */
const isUrgentCard = (card: Card): boolean => {
    // In fase di apprendimento
    if (card.status === 'learning') return true;

    // EasinessFactor basso indica difficoltà
    if (card.easinessFactor < 2.3) return true;

    // Data di ripasso passata ma non ancora padroneggiata
    if (card.status !== 'mastered' && card.status !== 'new') {
        const now = new Date();
        const nextReview = new Date(card.nextReviewDate);
        if (nextReview <= now) return true;
    }

    return false;
};

/**
 * Determina se una carta è "nuova" (mai vista)
 */
const isNewCard = (card: Card): boolean => {
    return card.status === 'new';
};

/**
 * Determina se una carta è "safe" (consolidata)
 *
 * Criteri:
 * - status === 'mastered'
 * - status === 'review' con easinessFactor alto (> 2.5)
 */
const isSafeCard = (card: Card): boolean => {
    if (card.status === 'mastered') return true;
    if (card.status === 'review' && card.easinessFactor >= 2.5) return true;
    return false;
};

// ============================================
// SORTING FUNCTIONS
// ============================================

/**
 * Ordina carte urgenti per priorità:
 * 1. EasinessFactor più basso prima (più difficili)
 * 2. A parità, nextReviewDate più vecchia prima
 */
const sortUrgentCards = (cards: Card[]): Card[] => {
    return [...cards].sort((a, b) => {
        // Prima per easinessFactor (ascending - più basso = più urgente)
        const efDiff = a.easinessFactor - b.easinessFactor;
        if (Math.abs(efDiff) > 0.1) return efDiff;

        // Poi per nextReviewDate (ascending - più vecchia = più urgente)
        const dateA = new Date(a.nextReviewDate).getTime();
        const dateB = new Date(b.nextReviewDate).getTime();
        return dateA - dateB;
    });
};

/**
 * Ordina carte nuove per ordine naturale (index/id)
 * Preserva la propedeuticità del corso
 */
const sortNewCards = (cards: Card[]): Card[] => {
    // Le carte nuove mantengono l'ordine originale (già ordinato per id)
    return [...cards];
};

/**
 * Ordina carte safe per "anzianità":
 * Le più vecchie (non viste da tempo) prima
 */
const sortSafeCards = (cards: Card[]): Card[] => {
    return [...cards].sort((a, b) => {
        const dateA = new Date(a.nextReviewDate).getTime();
        const dateB = new Date(b.nextReviewDate).getTime();
        // Ascending - date più vecchie prima
        return dateA - dateB;
    });
};

// ============================================
// MAIN ALGORITHM
// ============================================

/**
 * Adaptive Gap-Filler Algorithm
 *
 * Seleziona le carte per un quiz bilanciando:
 * - Difficoltà (non troppo frustrante)
 * - Apprendimento (non troppo facile)
 * - Motivazione (gratificazione garantita)
 *
 * @param allCards - Tutte le carte disponibili nel deck
 * @param targetSize - Numero di carte desiderate per il quiz
 * @returns Carte selezionate e mescolate con debug info
 */
export const selectCardsForQuiz = (
    allCards: Card[],
    targetSize: number
): SelectionResult => {
    // Edge case: nessuna carta
    if (allCards.length === 0) {
        return {
            cards: [],
            debug: {
                urgentCount: 0,
                newCount: 0,
                safeCount: 0,
                totalRequested: targetSize,
                totalAvailable: 0,
            },
        };
    }

    // Edge case: meno carte del target
    if (allCards.length <= targetSize) {
        return {
            cards: fisherYatesShuffle(allCards),
            debug: {
                urgentCount: allCards.filter(isUrgentCard).length,
                newCount: allCards.filter(isNewCard).length,
                safeCount: allCards.filter(isSafeCard).length,
                totalRequested: targetSize,
                totalAvailable: allCards.length,
            },
        };
    }

    // ========================================
    // FASE 1: Dividi in bucket
    // ========================================
    const urgentPool = allCards.filter(isUrgentCard);
    const newPool = allCards.filter(isNewCard);
    const safePool = allCards.filter(isSafeCard);

    // Carte che non rientrano in nessun bucket (fallback)
    const otherPool = allCards.filter(
        (card) => !isUrgentCard(card) && !isNewCard(card) && !isSafeCard(card)
    );

    // ========================================
    // FASE 2: Calcola quote target
    // ========================================
    let urgentTarget = Math.round(targetSize * BUCKET_CONFIG.urgent.percentage);
    let newTarget = Math.round(targetSize * BUCKET_CONFIG.new.percentage);
    let safeTarget = Math.round(targetSize * BUCKET_CONFIG.safe.percentage);

    // Assicura che la somma sia esattamente targetSize
    const totalTarget = urgentTarget + newTarget + safeTarget;
    if (totalTarget < targetSize) {
        urgentTarget += targetSize - totalTarget;
    } else if (totalTarget > targetSize) {
        safeTarget -= totalTarget - targetSize;
    }

    // ========================================
    // FASE 3: Selezione con fallback
    // ========================================

    // Ordina ogni pool
    const sortedUrgent = sortUrgentCards(urgentPool);
    const sortedNew = sortNewCards(newPool);
    const sortedSafe = sortSafeCards(safePool);

    // Seleziona da ogni bucket
    const selectedUrgent = sortedUrgent.slice(0, urgentTarget);
    const selectedNew = sortedNew.slice(0, newTarget);
    const selectedSafe = sortedSafe.slice(0, safeTarget);

    // Calcola deficit (carte mancanti)
    const urgentDeficit = urgentTarget - selectedUrgent.length;
    const newDeficit = newTarget - selectedNew.length;
    const safeDeficit = safeTarget - selectedSafe.length;
    const totalDeficit = urgentDeficit + newDeficit + safeDeficit;

    // Raccogli IDs delle carte già selezionate
    const selectedIds = new Set([
        ...selectedUrgent.map((c) => c.id),
        ...selectedNew.map((c) => c.id),
        ...selectedSafe.map((c) => c.id),
    ]);

    // ========================================
    // LOGICA DI FALLBACK
    // ========================================
    const fillFromPool = (pool: Card[], count: number): Card[] => {
        const available = pool.filter((c) => !selectedIds.has(c.id));
        const selected = available.slice(0, count);
        selected.forEach((c) => selectedIds.add(c.id));
        return selected;
    };

    const fallbackCards: Card[] = [];

    if (totalDeficit > 0) {
        let remaining = totalDeficit;

        // Priorità fallback:
        // 1. Se mancano urgenti -> prendi da nuove
        // 2. Se mancano nuove -> prendi da urgenti
        // 3. Se mancano entrambe -> prendi da safe
        // 4. Ultima risorsa -> prendi da other

        if (urgentDeficit > 0) {
            const fromNew = fillFromPool(sortedNew, Math.min(remaining, urgentDeficit));
            fallbackCards.push(...fromNew);
            remaining -= fromNew.length;
        }

        if (remaining > 0 && newDeficit > 0) {
            const fromUrgent = fillFromPool(sortedUrgent, Math.min(remaining, newDeficit));
            fallbackCards.push(...fromUrgent);
            remaining -= fromUrgent.length;
        }

        if (remaining > 0) {
            const fromSafe = fillFromPool(sortedSafe, remaining);
            fallbackCards.push(...fromSafe);
            remaining -= fromSafe.length;
        }

        if (remaining > 0) {
            const fromOther = fillFromPool(otherPool, remaining);
            fallbackCards.push(...fromOther);
        }
    }

    // ========================================
    // FASE 4: Assemblaggio e shuffle
    // ========================================
    const finalSelection = [
        ...selectedUrgent,
        ...selectedNew,
        ...selectedSafe,
        ...fallbackCards,
    ];

    // Fisher-Yates shuffle per mascherare i pattern
    const shuffledCards = fisherYatesShuffle(finalSelection);

    return {
        cards: shuffledCards,
        debug: {
            urgentCount: selectedUrgent.length,
            newCount: selectedNew.length,
            safeCount: selectedSafe.length,
            totalRequested: targetSize,
            totalAvailable: allCards.length,
        },
    };
};

export default selectCardsForQuiz;
