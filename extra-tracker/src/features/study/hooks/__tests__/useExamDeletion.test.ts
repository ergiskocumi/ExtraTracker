import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Deck } from '../../services/studyService';
import type { Exam } from '../../types/exam';
import { useExamDeletion } from '../useExamDeletion';

const makeDeck = (overrides: Partial<Deck> = {}): Deck => ({
    id: overrides.id ?? 'deck-1',
    title: overrides.title ?? 'Deck',
    tags: overrides.tags ?? [],
    cards: overrides.cards ?? [],
    totalCards: overrides.totalCards ?? 0,
    dueCount: overrides.dueCount ?? 0,
    ...overrides,
});

const selectedExam: Exam = {
    id: 'exam-1',
    title: 'Analisi 1',
    deadline: '2026-07-10T09:00:00.000Z',
    status: 'active',
};

describe('useExamDeletion', () => {
    it('opens modal, computes affected decks/cards and confirms deletion', async () => {
        const onDeleteExam = vi.fn().mockResolvedValue(undefined);
        const onDeleted = vi.fn();
        const decks: Deck[] = [
            makeDeck({ id: 'deck-1', examId: 'exam-1', totalCards: 12 }),
            makeDeck({ id: 'deck-2', examId: 'exam-1', totalCards: 8 }),
            makeDeck({ id: 'deck-3', examId: 'exam-2', totalCards: 99 }),
        ];

        const { result } = renderHook(() =>
            useExamDeletion({
                selectedExam,
                decks,
                onDeleteExam,
                onDeleted,
            }),
        );

        expect(result.current.summary).toEqual({
            examTitle: 'Analisi 1',
            deckCount: 2,
            cardCount: 20,
        });
        expect(result.current.isDeleteModalOpen).toBe(false);

        act(() => {
            result.current.requestDelete();
        });
        expect(result.current.isDeleteModalOpen).toBe(true);

        await act(async () => {
            const deleted = await result.current.confirmDelete();
            expect(deleted).toBe(true);
        });

        expect(onDeleteExam).toHaveBeenCalledWith('exam-1');
        expect(onDeleted).toHaveBeenCalledTimes(1);
        expect(result.current.isDeleteModalOpen).toBe(false);
        expect(result.current.isDeleting).toBe(false);
    });

    it('keeps modal open when delete fails and does not call onDeleted', async () => {
        const onDeleteExam = vi.fn().mockRejectedValue(new Error('delete-failed'));
        const onDeleted = vi.fn();

        const { result } = renderHook(() =>
            useExamDeletion({
                selectedExam,
                decks: [makeDeck({ examId: 'exam-1', totalCards: 5 })],
                onDeleteExam,
                onDeleted,
            }),
        );

        act(() => {
            result.current.requestDelete();
        });
        expect(result.current.isDeleteModalOpen).toBe(true);

        await act(async () => {
            const deleted = await result.current.confirmDelete();
            expect(deleted).toBe(false);
        });

        expect(onDeleteExam).toHaveBeenCalledWith('exam-1');
        expect(onDeleted).not.toHaveBeenCalled();
        expect(result.current.isDeleteModalOpen).toBe(true);
        expect(result.current.isDeleting).toBe(false);
    });

    it('does nothing when no exam is selected', async () => {
        const onDeleteExam = vi.fn().mockResolvedValue(undefined);

        const { result } = renderHook(() =>
            useExamDeletion({
                selectedExam: null,
                decks: [],
                onDeleteExam,
            }),
        );

        expect(result.current.summary).toEqual({
            examTitle: 'questo esame',
            deckCount: 0,
            cardCount: 0,
        });

        act(() => {
            result.current.requestDelete();
        });
        expect(result.current.isDeleteModalOpen).toBe(false);

        await act(async () => {
            const deleted = await result.current.confirmDelete();
            expect(deleted).toBe(false);
        });
        expect(onDeleteExam).not.toHaveBeenCalled();
    });
});

