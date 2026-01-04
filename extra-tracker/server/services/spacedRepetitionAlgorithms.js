/**
 * 🧠 SPACED REPETITION ALGORITHMS
 * ================================
 * 
 * Implementazione di algoritmi multipli per spaced repetition:
 * - SM-2 (SuperMemo 2) - Default, semplice e efficace
 * - FSRS (Free Spaced Repetition Scheduler) - Moderno, adattivo
 * - Leitner System - Classico, a box
 * - Anki Algorithm - Derivato da SM-2 con modifiche
 */

const MIN_EASINESS_FACTOR = 1.3;
const DEFAULT_EASINESS_FACTOR = 2.5;

/**
 * SM-2 Algorithm (SuperMemo 2)
 * 
 * Classico algoritmo di SuperMemo, semplice e testato.
 */
class SM2Algorithm {
    static processReview(card, rating) {
        const quality = Number(rating);
        if (!Number.isFinite(quality) || quality < 1 || quality > 5) {
            throw new Error('Rating deve essere tra 1 e 5');
        }

        const previousEF = Number(card.easinessFactor ?? DEFAULT_EASINESS_FACTOR);
        const previousInterval = Number(card.interval ?? 0);
        const previousRepetitions = Number(card.repetitions ?? 0);

        // 1) Calcolo nuovo EF
        const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
        const updatedEF = Math.max(MIN_EASINESS_FACTOR, previousEF + efDelta);

        // 2) Calcolo nuovo interval + repetitions
        let updatedRepetitions = previousRepetitions;
        let updatedInterval = previousInterval;

        if (quality < 3) {
            updatedRepetitions = 0;
            updatedInterval = 1;
        } else {
            if (previousRepetitions === 0) {
                updatedInterval = 1;
            } else if (previousRepetitions === 1) {
                updatedInterval = 6;
            } else {
                updatedInterval = Math.max(1, Math.round(previousInterval * updatedEF));
            }
            updatedRepetitions = previousRepetitions + 1;
        }

        // 3) Prossima review
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + updatedInterval);

        return {
            easinessFactor: Number(updatedEF.toFixed(2)),
            interval: updatedInterval,
            repetitions: updatedRepetitions,
            nextReviewDate,
        };
    }
}

/**
 * FSRS Algorithm (Free Spaced Repetition Scheduler)
 * 
 * Algoritmo moderno e adattivo, più preciso di SM-2.
 * Versione semplificata per performance.
 */
class FSRSAlgorithm {
    static processReview(card, rating) {
        const quality = Number(rating);
        if (!Number.isFinite(quality) || quality < 1 || quality > 5) {
            throw new Error('Rating deve essere tra 1 e 5');
        }

        // FSRS usa stability (S) invece di easiness factor
        const previousStability = Number(card.stability ?? 0.4);
        const previousInterval = Number(card.interval ?? 0);
        const previousRepetitions = Number(card.repetitions ?? 0);

        // Mapping quality -> recall probability
        const recallProbability = {
            1: 0.0, // Forgot
            2: 0.3, // Hard
            3: 0.7, // Good
            4: 0.85, // Easy
            5: 0.95, // Very Easy
        }[quality] || 0.7;

        let updatedStability = previousStability;
        let updatedInterval = previousInterval;
        let updatedRepetitions = previousRepetitions;

        if (quality < 3) {
            // Reset se sbagliato
            updatedStability = 0.4;
            updatedInterval = 1;
            updatedRepetitions = 0;
        } else {
            // Aggiorna stability basato su recall
            const factor = recallProbability > 0.8 ? 1.3 : recallProbability > 0.6 ? 1.1 : 1.0;
            updatedStability = Math.max(0.4, previousStability * factor);

            if (previousRepetitions === 0) {
                updatedInterval = 1;
            } else if (previousRepetitions === 1) {
                updatedInterval = 3;
            } else {
                // FSRS calcola intervallo basato su stability
                updatedInterval = Math.max(1, Math.round(previousInterval * updatedStability));
            }
            updatedRepetitions = previousRepetitions + 1;
        }

        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + updatedInterval);

        return {
            stability: Number(updatedStability.toFixed(2)),
            interval: updatedInterval,
            repetitions: updatedRepetitions,
            nextReviewDate,
            // Mantieni compatibilità con SM-2
            easinessFactor: updatedStability * 0.8 + 1.5,
        };
    }
}

/**
 * Leitner System
 * 
 * Sistema a box: le carte si muovono tra box in base alle performance.
 */
class LeitnerAlgorithm {
    static processReview(card, rating) {
        const quality = Number(rating);
        if (!Number.isFinite(quality) || quality < 1 || quality > 5) {
            throw new Error('Rating deve essere tra 1 e 5');
        }

        const currentBox = Number(card.box ?? 1);
        const previousRepetitions = Number(card.repetitions ?? 0);

        // Intervalli per box (in giorni)
        const boxIntervals = [1, 2, 4, 8, 16, 32];

        let updatedBox = currentBox;
        let updatedRepetitions = previousRepetitions;
        let updatedInterval = 1;

        if (quality >= 3) {
            // Promuovi alla box successiva
            updatedBox = Math.min(currentBox + 1, boxIntervals.length);
            updatedRepetitions = previousRepetitions + 1;
        } else {
            // Retrocedi alla box 1
            updatedBox = 1;
            updatedRepetitions = 0;
        }

        updatedInterval = boxIntervals[updatedBox - 1] || 1;

        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + updatedInterval);

        return {
            box: updatedBox,
            interval: updatedInterval,
            repetitions: updatedRepetitions,
            nextReviewDate,
            // Compatibilità
            easinessFactor: DEFAULT_EASINESS_FACTOR,
        };
    }
}

/**
 * Anki Algorithm
 * 
 * Derivato da SM-2 con modifiche per gestire meglio le nuove carte.
 */
class AnkiAlgorithm {
    static processReview(card, rating) {
        const quality = Number(rating);
        if (!Number.isFinite(quality) || quality < 1 || quality > 5) {
            throw new Error('Rating deve essere tra 1 e 5');
        }

        const previousEF = Number(card.easinessFactor ?? DEFAULT_EASINESS_FACTOR);
        const previousInterval = Number(card.interval ?? 0);
        const previousRepetitions = Number(card.repetitions ?? 0);

        // Anki usa una formula leggermente diversa per EF
        const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
        let updatedEF = Math.max(MIN_EASINESS_FACTOR, previousEF + efDelta);

        // Anki ha intervalli più conservativi per nuove carte
        let updatedRepetitions = previousRepetitions;
        let updatedInterval = previousInterval;

        if (quality < 3) {
            updatedRepetitions = 0;
            updatedInterval = 1;
            // Anki riduce EF più aggressivamente
            updatedEF = Math.max(MIN_EASINESS_FACTOR, updatedEF - 0.2);
        } else {
            if (previousRepetitions === 0) {
                updatedInterval = 1;
            } else if (previousRepetitions === 1) {
                updatedInterval = 4; // Anki usa 4 invece di 6
            } else {
                updatedInterval = Math.max(1, Math.round(previousInterval * updatedEF));
            }
            updatedRepetitions = previousRepetitions + 1;
        }

        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + updatedInterval);

        return {
            easinessFactor: Number(updatedEF.toFixed(2)),
            interval: updatedInterval,
            repetitions: updatedRepetitions,
            nextReviewDate,
        };
    }
}

/**
 * Factory per selezionare l'algoritmo corretto
 */
class AlgorithmFactory {
    static getAlgorithm(algorithmName) {
        switch (algorithmName) {
            case 'sm2':
                return SM2Algorithm;
            case 'fsrs':
                return FSRSAlgorithm;
            case 'leitner':
                return LeitnerAlgorithm;
            case 'anki':
                return AnkiAlgorithm;
            default:
                return SM2Algorithm;
        }
    }

    static processReview(card, rating, algorithmName = 'sm2') {
        const Algorithm = this.getAlgorithm(algorithmName);
        return Algorithm.processReview(card, rating);
    }
}

module.exports = {
    SM2Algorithm,
    FSRSAlgorithm,
    LeitnerAlgorithm,
    AnkiAlgorithm,
    AlgorithmFactory,
};
