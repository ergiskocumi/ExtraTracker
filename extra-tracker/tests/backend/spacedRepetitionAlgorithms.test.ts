// @vitest-environment node

import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
    SM2Algorithm,
    FSRSAlgorithm,
    LeitnerAlgorithm,
    AnkiAlgorithm,
    AlgorithmFactory,
} = require('../../server/services/spacedRepetitionAlgorithms');

describe('server/services/spacedRepetitionAlgorithms', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('SM2Algorithm', () => {
        it('throws for invalid ratings', () => {
            expect(() => SM2Algorithm.processReview({}, 0)).toThrow(/1 e 5/);
            expect(() => SM2Algorithm.processReview({}, 6)).toThrow(/1 e 5/);
        });

        it('schedules first successful review with interval 1 and repetitions +1', () => {
            const result = SM2Algorithm.processReview(
                { easinessFactor: 2.5, interval: 0, repetitions: 0 },
                5,
            );

            expect(result.interval).toBe(1);
            expect(result.repetitions).toBe(1);
            expect(result.easinessFactor).toBeGreaterThan(2.5);
            expect(result.nextReviewDate).toBeInstanceOf(Date);
        });

        it('sets second repetition interval to 6 days', () => {
            const result = SM2Algorithm.processReview(
                { easinessFactor: 2.5, interval: 1, repetitions: 1 },
                4,
            );

            expect(result.interval).toBe(6);
            expect(result.repetitions).toBe(2);
        });

        it('resets repetitions on failed recall (rating < 3)', () => {
            const result = SM2Algorithm.processReview(
                { easinessFactor: 2.5, interval: 10, repetitions: 4 },
                2,
            );

            expect(result.interval).toBe(1);
            expect(result.repetitions).toBe(0);
        });

        it('applies fuzz for long intervals', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0); // 0.95 multiplier
            const result = SM2Algorithm.processReview(
                { easinessFactor: 2.5, interval: 10, repetitions: 2 },
                5,
            );

            expect(result.interval).toBe(25);
        });
    });

    describe('FSRSAlgorithm', () => {
        it('throws for invalid ratings', () => {
            expect(() => FSRSAlgorithm.processReview({}, 0)).toThrow(/1 e 5/);
        });

        it('initializes stability and difficulty on first review', () => {
            const result = FSRSAlgorithm.processReview(
                { stability: 0.4, difficulty: 5, interval: 0, repetitions: 0 },
                3,
            );

            expect(result.repetitions).toBe(1);
            expect(result.stability).toBeGreaterThan(0);
            expect(result.difficulty).toBeGreaterThanOrEqual(1);
            expect(result.difficulty).toBeLessThanOrEqual(10);
            expect(result.interval).toBeGreaterThanOrEqual(1);
        });

        it('handles lapses by resetting repetitions and increasing difficulty', () => {
            const result = FSRSAlgorithm.processReview(
                { stability: 5, difficulty: 4, interval: 12, repetitions: 5 },
                1,
            );

            expect(result.repetitions).toBe(0);
            expect(result.difficulty).toBeGreaterThanOrEqual(4);
            expect(result.stability).toBeGreaterThan(0);
        });

        it('increases repetitions on successful reviews', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.5);
            const result = FSRSAlgorithm.processReview(
                { stability: 4, difficulty: 5, interval: 10, repetitions: 3 },
                4,
            );

            expect(result.repetitions).toBe(4);
            expect(result.interval).toBeGreaterThanOrEqual(1);
        });
    });

    describe('LeitnerAlgorithm', () => {
        it('resets to box 1 on low ratings', () => {
            const result = LeitnerAlgorithm.processReview({ box: 4, repetitions: 8 }, 2);
            expect(result.box).toBe(1);
            expect(result.repetitions).toBe(0);
            expect(result.interval).toBe(1);
        });

        it('keeps same box on rating 3 and increments repetitions', () => {
            const result = LeitnerAlgorithm.processReview({ box: 3, repetitions: 2 }, 3);
            expect(result.box).toBe(3);
            expect(result.repetitions).toBe(3);
        });

        it('promotes box on high ratings without exceeding max box', () => {
            const promoted = LeitnerAlgorithm.processReview({ box: 2, repetitions: 1 }, 5);
            const capped = LeitnerAlgorithm.processReview({ box: 6, repetitions: 9 }, 5);

            expect(promoted.box).toBe(3);
            expect(capped.box).toBe(6);
        });
    });

    describe('AnkiAlgorithm', () => {
        it('uses first learning step on "again" for new cards', () => {
            const result = AnkiAlgorithm.processReview(
                { easinessFactor: 2.5, interval: 0, repetitions: 0 },
                1,
            );

            expect(result.repetitions).toBe(0);
            expect(result.interval).toBeCloseTo(0.001, 3);
        });

        it('uses easy interval for easy rating in learning phase', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const result = AnkiAlgorithm.processReview(
                { easinessFactor: 2.5, interval: 0, repetitions: 0 },
                5,
            );

            expect(result.interval).toBe(4);
            expect(result.repetitions).toBeGreaterThanOrEqual(2);
        });

        it('applies hard interval factor for graduated cards', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.5); // no net fuzz
            const result = AnkiAlgorithm.processReview(
                { easinessFactor: 2.5, interval: 10, repetitions: 3 },
                2,
            );

            expect(result.interval).toBe(12);
            expect(result.repetitions).toBe(4);
        });

        it('applies lapse factor instead of full reset for graduated cards', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.5); // no net fuzz
            const result = AnkiAlgorithm.processReview(
                { easinessFactor: 2.5, interval: 20, repetitions: 4 },
                1,
            );

            expect(result.interval).toBe(10);
            expect(result.repetitions).toBe(0);
        });
    });

    describe('AlgorithmFactory', () => {
        it('resolves algorithms by name and defaults to SM2', () => {
            expect(AlgorithmFactory.getAlgorithm('sm2')).toBe(SM2Algorithm);
            expect(AlgorithmFactory.getAlgorithm('fsrs')).toBe(FSRSAlgorithm);
            expect(AlgorithmFactory.getAlgorithm('leitner')).toBe(LeitnerAlgorithm);
            expect(AlgorithmFactory.getAlgorithm('anki')).toBe(AnkiAlgorithm);
            expect(AlgorithmFactory.getAlgorithm('unknown')).toBe(SM2Algorithm);
        });

        it('delegates processReview to the selected algorithm', () => {
            const result = AlgorithmFactory.processReview({ box: 2, repetitions: 1 }, 4, 'leitner');
            expect(result).toEqual(
                expect.objectContaining({
                    box: 3,
                    repetitions: 2,
                }),
            );
        });
    });
});

