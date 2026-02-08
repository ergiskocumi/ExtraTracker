import { describe, expect, it } from 'vitest';
import type { Card } from '../../../services/studyService';
import {
    calculateInsertPosition,
    calculateReorderResult,
    findCardById,
    findCardIndex,
    haveCardIdsChanged,
    haveCardsChanged,
} from '../FlashcardList.utils';

const makeCard = (id: string, front = `Q-${id}`, back = `A-${id}`): Card => ({
    id,
    front,
    back,
    easinessFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString(),
    status: 'new',
});

describe('FlashcardList.utils', () => {
    describe('haveCardIdsChanged', () => {
        it('returns false when same IDs are present in different order', () => {
            const current = [makeCard('a'), makeCard('b')];
            const reordered = [makeCard('b'), makeCard('a')];
            expect(haveCardIdsChanged(current, reordered)).toBe(false);
        });

        it('returns true when cards are added/removed', () => {
            const current = [makeCard('a'), makeCard('b')];
            const changed = [makeCard('a'), makeCard('c')];
            expect(haveCardIdsChanged(current, changed)).toBe(true);
        });
    });

    describe('haveCardsChanged', () => {
        it('returns false when only order changes', () => {
            const current = [makeCard('a'), makeCard('b')];
            const reordered = [makeCard('b'), makeCard('a')];
            expect(haveCardsChanged(current, reordered)).toBe(false);
        });

        it('returns true when content changes for same card id', () => {
            const current = [makeCard('a', 'Front A', 'Back A')];
            const changed = [makeCard('a', 'Front A updated', 'Back A')];
            expect(haveCardsChanged(current, changed)).toBe(true);
        });

        it('returns true when ids change', () => {
            const current = [makeCard('a')];
            const changed = [makeCard('b')];
            expect(haveCardsChanged(current, changed)).toBe(true);
        });
    });

    describe('calculateReorderResult', () => {
        it('reorders normally when no filters are active', () => {
            const fullDeck = [makeCard('a'), makeCard('b'), makeCard('c')];
            const result = calculateReorderResult(fullDeck, 0, 2, fullDeck);

            expect(result.newOrder.map(c => c.id)).toEqual(['b', 'c', 'a']);
            expect(result.finalOrder).toEqual(['b', 'c', 'a']);
        });

        it('keeps hidden cards first when reordering filtered cards', () => {
            const fullDeck = [makeCard('a'), makeCard('b'), makeCard('c'), makeCard('d')];
            const filtered = [makeCard('b'), makeCard('d')];

            const result = calculateReorderResult(filtered, 0, 1, fullDeck, filtered);
            expect(result.newOrder.map(c => c.id)).toEqual(['d', 'b']);
            expect(result.finalOrder).toEqual(['a', 'c', 'd', 'b']);
        });
    });

    describe('calculateInsertPosition', () => {
        const fullDeck = [makeCard('a'), makeCard('b'), makeCard('c'), makeCard('d')];
        const filtered = [makeCard('b'), makeCard('d')];

        it('returns raw position when there is no active filter', () => {
            expect(calculateInsertPosition(2, undefined, fullDeck)).toBe(2);
        });

        it('returns 0 when inserting at beginning of filtered list', () => {
            expect(calculateInsertPosition(0, filtered, fullDeck)).toBe(0);
        });

        it('returns full deck length when inserting at end of filtered list', () => {
            expect(calculateInsertPosition(2, filtered, fullDeck)).toBe(4);
        });

        it('maps middle filtered position back to full deck position', () => {
            expect(calculateInsertPosition(1, filtered, fullDeck)).toBe(2);
        });
    });

    describe('find helpers', () => {
        const items = [makeCard('a'), makeCard('b'), makeCard('c')];

        it('findCardById returns matching card or undefined', () => {
            expect(findCardById(items, 'b')?.id).toBe('b');
            expect(findCardById(items, 'x')).toBeUndefined();
        });

        it('findCardIndex returns index or -1', () => {
            expect(findCardIndex(items, 'c')).toBe(2);
            expect(findCardIndex(items, 'x')).toBe(-1);
        });
    });
});

