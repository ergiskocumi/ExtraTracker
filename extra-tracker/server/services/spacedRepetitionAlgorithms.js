/**
 * SPACED REPETITION ALGORITHMS
 * ================================
 *
 * Implementazione di algoritmi multipli per spaced repetition:
 * - SM-2 (SuperMemo 2) - Default, semplice e efficace + fuzz factor
 * - FSRS (Free Spaced Repetition Scheduler) - Moderno, con forgetting curve reale
 * - Leitner System - Classico, a box con rating granulare
 * - Anki Algorithm - Learning steps, lapse handling, easy bonus
 */

const MIN_EASINESS_FACTOR = 1.3;
const DEFAULT_EASINESS_FACTOR = 2.5;

/**
 * Applica un fuzz factor ±5% all'intervallo calcolato (solo per intervalli > 2 giorni).
 * Previene che carte studiate lo stesso giorno tornino dovute tutte insieme.
 */
const applyFuzz = (interval) => {
    if (interval <= 2) return interval;
    return Math.max(1, Math.round(interval * (0.95 + Math.random() * 0.10)));
};

/**
 * SM-2 Algorithm (SuperMemo 2)
 *
 * Classico algoritmo di SuperMemo con fuzz factor per distribuire le review.
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

        // 3) Fuzz factor per distribuire le review
        updatedInterval = applyFuzz(updatedInterval);

        // 4) Prossima review
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
 * Modello con forgetting curve reale: R(t) = (1 + t / (9 * S))^(-1)
 * Usa stability (S) e difficulty (D) come parametri principali.
 */
class FSRSAlgorithm {
    // FSRS weights (tuned defaults)
    static W = {
        w0: 0.4,   // Initial stability for again
        w1: 0.6,   // Initial stability for hard
        w2: 2.4,   // Initial stability for good
        w3: 5.8,   // Initial stability for easy
        w4: 4.93,  // Stability growth factor
        w5: 0.94,  // Stability decay after lapse
        w6: 0.86,  // Difficulty adjustment rate
        w7: 0.01,  // Stability penalty from retrievability
        w8: 1.49,  // Lapse stability decay factor
        w9: 0.14,  // Lapse stability modifier from difficulty
        w10: 0.94, // Lapse base modifier
    };

    static DESIRED_RETENTION = 0.9;

    /**
     * Forgetting curve: R(t) = (1 + t / (9 * S))^(-1)
     */
    static retrievability(elapsedDays, stability) {
        if (stability <= 0) return 0;
        return Math.pow(1 + elapsedDays / (9 * stability), -1);
    }

    /**
     * Calcola intervallo ottimale dalla stability e desired retention.
     * t = S * ((1/R) - 1) * 9
     */
    static optimalInterval(stability, desiredRetention) {
        if (stability <= 0) return 1;
        return Math.max(1, Math.round(stability * ((1 / desiredRetention) - 1) * 9));
    }

    static processReview(card, rating) {
        const quality = Number(rating);
        if (!Number.isFinite(quality) || quality < 1 || quality > 5) {
            throw new Error('Rating deve essere tra 1 e 5');
        }

        const W = this.W;
        const previousStability = Number(card.stability ?? 0.4);
        const previousDifficulty = Number(card.difficulty ?? 5);
        const previousInterval = Number(card.interval ?? 0);
        const previousRepetitions = Number(card.repetitions ?? 0);

        // Elapsed days since last review
        const elapsedDays = previousInterval > 0 ? previousInterval : 0;

        // Current retrievability
        const R = previousRepetitions === 0
            ? 0
            : this.retrievability(elapsedDays, previousStability);

        let updatedStability;
        let updatedDifficulty;
        let updatedRepetitions;

        if (previousRepetitions === 0) {
            // First review: initial stability depends on rating
            const initialStabilities = {
                1: W.w0,
                2: W.w1,
                3: W.w2,
                4: (W.w2 + W.w3) / 2,
                5: W.w3,
            };
            updatedStability = initialStabilities[quality] || W.w2;
            updatedDifficulty = Math.max(1, Math.min(10, 5 - W.w6 * (quality - 3)));
            updatedRepetitions = 1;
        } else if (quality < 3) {
            // Lapse (fail): stability decays
            // S' = w5 * D^(-w9) * ((S+1)^w10 - 1) * e^(w8 * (1-R))
            updatedStability = Math.max(
                0.1,
                W.w5 * Math.pow(previousDifficulty, -W.w9) *
                (Math.pow(previousStability + 1, W.w10) - 1) *
                Math.exp(W.w8 * (1 - R))
            );
            // Difficulty increases on lapse
            updatedDifficulty = Math.max(1, Math.min(10, previousDifficulty + W.w6 * (3 - quality)));
            updatedRepetitions = 0;
        } else {
            // Successful review: stability grows
            // S' = S * (1 + e^(w4) * (11 - D) * S^(-0.2) * (e^(w7 * (1-R)) - 1))
            updatedStability = previousStability * (
                1 + Math.exp(W.w4) * (11 - previousDifficulty) *
                Math.pow(previousStability, -0.2) *
                (Math.exp(W.w7 * (1 - R)) - 1)
            );
            updatedStability = Math.max(0.1, updatedStability);
            // Difficulty update: D' = D - w6 * (quality - 3)
            updatedDifficulty = Math.max(1, Math.min(10, previousDifficulty - W.w6 * (quality - 3)));
            updatedRepetitions = previousRepetitions + 1;
        }

        // Calculate optimal interval from stability
        let updatedInterval = this.optimalInterval(updatedStability, this.DESIRED_RETENTION);
        updatedInterval = applyFuzz(updatedInterval);

        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + updatedInterval);

        return {
            stability: Number(updatedStability.toFixed(2)),
            difficulty: Number(updatedDifficulty.toFixed(1)),
            interval: updatedInterval,
            repetitions: updatedRepetitions,
            nextReviewDate,
            // Mantieni compatibilità con SM-2
            easinessFactor: Number((updatedStability * 0.8 + 1.5).toFixed(2)),
        };
    }
}

/**
 * Leitner System
 *
 * Sistema a box con rating granulare:
 * - Rating 1-2: Retrocedi alla box 1
 * - Rating 3: Rimani nella stessa box
 * - Rating 4-5: Promuovi alla box successiva
 * Fuzz ±1 giorno per box > 3.
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

        if (quality <= 2) {
            // Retrocedi alla box 1
            updatedBox = 1;
            updatedRepetitions = 0;
        } else if (quality === 3) {
            // Rimani nella stessa box (non promuovere, non retrocedere)
            updatedRepetitions = previousRepetitions + 1;
        } else {
            // Rating 4-5: Promuovi alla box successiva
            updatedBox = Math.min(currentBox + 1, boxIntervals.length);
            updatedRepetitions = previousRepetitions + 1;
        }

        let updatedInterval = boxIntervals[updatedBox - 1] || 1;

        // Fuzz ±1 giorno per box > 3
        if (updatedBox > 3) {
            const fuzz = Math.random() < 0.5 ? -1 : 1;
            updatedInterval = Math.max(1, updatedInterval + fuzz);
        }

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
 * SM-2 derivato con:
 * - Learning steps: [1min, 10min] simulati come frazioni di giorno
 * - Graduating interval: 1 giorno
 * - Easy interval: 4 giorni (salta learning)
 * - Lapse handling: interval *= 0.5 invece di reset a 1
 * - Easy bonus: rating 5 → interval *= 1.3
 * - Hard interval: rating 2 → interval *= 1.2 (più lento ma non reset)
 */
class AnkiAlgorithm {
    // Learning steps in days (1 min ≈ 0.001 day, 10 min ≈ 0.007 day)
    static LEARNING_STEPS = [0.001, 0.007];
    static GRADUATING_INTERVAL = 1;
    static EASY_INTERVAL = 4;
    static LAPSE_NEW_INTERVAL_FACTOR = 0.5;
    static EASY_BONUS = 1.3;
    static HARD_INTERVAL_FACTOR = 1.2;

    static processReview(card, rating) {
        const quality = Number(rating);
        if (!Number.isFinite(quality) || quality < 1 || quality > 5) {
            throw new Error('Rating deve essere tra 1 e 5');
        }

        const previousEF = Number(card.easinessFactor ?? DEFAULT_EASINESS_FACTOR);
        const previousInterval = Number(card.interval ?? 0);
        const previousRepetitions = Number(card.repetitions ?? 0);

        // EF update (standard SM-2 formula)
        const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
        let updatedEF = Math.max(MIN_EASINESS_FACTOR, previousEF + efDelta);

        let updatedRepetitions = previousRepetitions;
        let updatedInterval = previousInterval;

        const isInLearning = previousRepetitions < this.LEARNING_STEPS.length;

        if (quality === 1) {
            // Again: lapse handling
            if (isInLearning || previousInterval <= 1) {
                // In learning phase or new card: reset to step 0
                updatedRepetitions = 0;
                updatedInterval = this.LEARNING_STEPS[0];
            } else {
                // Graduated card: reduce interval instead of full reset
                updatedInterval = Math.max(1, Math.round(previousInterval * this.LAPSE_NEW_INTERVAL_FACTOR));
                updatedRepetitions = 0;
            }
            updatedEF = Math.max(MIN_EASINESS_FACTOR, updatedEF - 0.2);
        } else if (quality === 2) {
            // Hard
            if (isInLearning) {
                // Stay at current learning step (don't advance)
                updatedInterval = this.LEARNING_STEPS[previousRepetitions] || this.LEARNING_STEPS[this.LEARNING_STEPS.length - 1];
            } else {
                // Graduated: grow slower than "good"
                updatedInterval = Math.max(1, Math.round(previousInterval * this.HARD_INTERVAL_FACTOR));
                updatedRepetitions = previousRepetitions + 1;
            }
        } else if (quality === 3) {
            // Good
            if (isInLearning) {
                const nextStep = previousRepetitions + 1;
                if (nextStep >= this.LEARNING_STEPS.length) {
                    // Graduate
                    updatedInterval = this.GRADUATING_INTERVAL;
                    updatedRepetitions = this.LEARNING_STEPS.length;
                } else {
                    updatedInterval = this.LEARNING_STEPS[nextStep];
                    updatedRepetitions = nextStep;
                }
            } else {
                // Graduated card: normal SM-2 growth
                if (previousRepetitions === this.LEARNING_STEPS.length) {
                    // First review after graduating
                    updatedInterval = this.GRADUATING_INTERVAL;
                } else {
                    updatedInterval = Math.max(1, Math.round(previousInterval * updatedEF));
                }
                updatedRepetitions = previousRepetitions + 1;
            }
        } else if (quality === 4) {
            // Good+
            if (isInLearning) {
                // Graduate immediately
                updatedInterval = this.GRADUATING_INTERVAL;
                updatedRepetitions = this.LEARNING_STEPS.length;
            } else {
                updatedInterval = Math.max(1, Math.round(previousInterval * updatedEF));
                updatedRepetitions = previousRepetitions + 1;
            }
        } else {
            // Easy (rating 5): skip learning, easy bonus
            if (isInLearning) {
                updatedInterval = this.EASY_INTERVAL;
                updatedRepetitions = this.LEARNING_STEPS.length;
            } else {
                updatedInterval = Math.max(1, Math.round(previousInterval * updatedEF * this.EASY_BONUS));
                updatedRepetitions = previousRepetitions + 1;
            }
        }

        // Fuzz per intervalli graduated (> 1 giorno)
        if (updatedInterval >= 1) {
            updatedInterval = applyFuzz(updatedInterval);
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
