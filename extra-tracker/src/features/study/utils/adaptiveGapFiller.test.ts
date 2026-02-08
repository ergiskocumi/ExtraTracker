import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Card } from '../services/studyService';
import { selectCardsForQuiz } from './adaptiveGapFiller';

const now = new Date('2026-02-08T00:00:00.000Z');

const makeCard = (
    id: string,
    status: Card['status'],
    overrides: Partial<Card> = {},
): Card => ({
    id,
    front: `front-${id}`,
    back: `back-${id}`,
    easinessFactor: 2.5,
    interval: 1,
    repetitions: 1,
    nextReviewDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    status,
    ...overrides,
});

describe('adaptiveGapFiller.selectCardsForQuiz', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns empty result for empty input', () => {
        const result = selectCardsForQuiz([], 10);
        expect(result.cards).toEqual([]);
        expect(result.debug).toEqual({
            urgentCount: 0,
            newCount: 0,
            safeCount: 0,
            totalRequested: 10,
            totalAvailable: 0,
        });
    });

    it('returns all cards shuffled when available <= target', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const cards = [makeCard('1', 'new'), makeCard('2', 'learning')];
        const result = selectCardsForQuiz(cards, 5);

        expect(result.cards).toHaveLength(2);
        expect(result.cards.map(c => c.id).sort()).toEqual(['1', '2']);
        expect(result.debug.totalAvailable).toBe(2);
        expect(result.debug.totalRequested).toBe(5);
    });

    it('uses the expected 50/30/20 mix when pools are sufficient', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        vi.useFakeTimers();
        vi.setSystemTime(now);

        const urgent = [
            makeCard('u1', 'learning'),
            makeCard('u2', 'learning'),
            makeCard('u3', 'review', { easinessFactor: 2.0 }),
            makeCard('u4', 'review', { easinessFactor: 2.1 }),
            makeCard('u5', 'review', { easinessFactor: 2.2 }),
        ];
        const fresh = [makeCard('n1', 'new'), makeCard('n2', 'new'), makeCard('n3', 'new')];
        const safe = [
            makeCard('s1', 'mastered'),
            makeCard('s2', 'mastered'),
            makeCard('s3', 'review', {
                easinessFactor: 2.7,
                nextReviewDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            }),
        ];

        const result = selectCardsForQuiz([...urgent, ...fresh, ...safe], 10);

        expect(result.cards).toHaveLength(10);
        expect(result.debug.urgentCount).toBe(5);
        expect(result.debug.newCount).toBe(3);
        expect(result.debug.safeCount).toBe(2);
        expect(new Set(result.cards.map(c => c.id)).size).toBe(10);

        vi.useRealTimers();
    });

    it('fills deficits using fallback pools without duplicates', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const cards = [
            makeCard('n1', 'new'),
            makeCard('n2', 'new'),
            makeCard('s1', 'mastered'),
            makeCard('s2', 'mastered'),
            makeCard('s3', 'mastered'),
        ];

        const result = selectCardsForQuiz(cards, 5);
        expect(result.cards).toHaveLength(5);
        expect(new Set(result.cards.map(c => c.id)).size).toBe(5);
        expect(result.debug.urgentCount).toBe(0);
        expect(result.debug.newCount).toBe(2);
    });

    it('handles overdue review cards as urgent', () => {
        vi.useFakeTimers();
        vi.setSystemTime(now);

        const overdueReview = makeCard('r1', 'review', {
            nextReviewDate: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        });
        const futureReview = makeCard('r2', 'review', {
            nextReviewDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            easinessFactor: 2.7,
        });

        const result = selectCardsForQuiz([overdueReview, futureReview], 2);
        const ids = result.cards.map(c => c.id);

        expect(ids).toContain('r1');
        expect(result.debug.urgentCount).toBeGreaterThanOrEqual(1);

        vi.useRealTimers();
    });
});
