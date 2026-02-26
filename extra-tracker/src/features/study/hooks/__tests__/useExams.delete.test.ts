import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Deck } from '../../services/studyService';
import type { Exam } from '../../types/exam';
import { useExams } from '../useExams';

const {
    mockGetAllExams,
    mockDeleteExam,
    mockUpdateExam,
    mockResetExamCards,
    mockGenerateRecoveryQuestions,
    mockToastSuccess,
    mockToastError,
    mockToastWarning,
} = vi.hoisted(() => ({
    mockGetAllExams: vi.fn(),
    mockDeleteExam: vi.fn(),
    mockUpdateExam: vi.fn(),
    mockResetExamCards: vi.fn(),
    mockGenerateRecoveryQuestions: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockToastWarning: vi.fn(),
}));

vi.mock('../../services/examService', () => ({
    default: {
        getAll: mockGetAllExams,
        delete: mockDeleteExam,
        update: mockUpdateExam,
    },
}));

vi.mock('../../services/studyService', () => ({
    studyService: {
        resetExamCards: mockResetExamCards,
        generateRecoveryQuestions: mockGenerateRecoveryQuestions,
    },
}));

vi.mock('../../../../shared/components/toast', () => ({
    emitToast: {
        success: mockToastSuccess,
        error: mockToastError,
        warning: mockToastWarning,
    },
}));

const makeDeck = (overrides: Partial<Deck> = {}): Deck => ({
    id: overrides.id ?? 'deck-1',
    title: overrides.title ?? 'Deck',
    tags: overrides.tags ?? [],
    cards: overrides.cards ?? [],
    totalCards: overrides.totalCards ?? 0,
    dueCount: overrides.dueCount ?? 0,
    ...overrides,
});

const baseExams: Exam[] = [
    {
        id: 'exam-1',
        title: 'Analisi 1',
        deadline: '2026-06-20T08:00:00.000Z',
        status: 'active',
    },
    {
        id: 'exam-2',
        title: 'Fisica 1',
        deadline: '2026-07-20T08:00:00.000Z',
        status: 'active',
    },
];

describe('useExams delete exam flow', () => {
    let examsDb: Exam[];

    beforeEach(() => {
        vi.clearAllMocks();
        examsDb = baseExams.map(exam => ({ ...exam }));

        mockGetAllExams.mockImplementation(async () => examsDb.map(exam => ({ ...exam })));
        mockDeleteExam.mockImplementation(async (examId: string) => {
            const previousLength = examsDb.length;
            examsDb = examsDb.filter(exam => exam.id !== examId);
            if (previousLength === examsDb.length) {
                throw new Error('Esame non trovato');
            }
        });
    });

    it('removes exam from backend state and refreshes exams + decks', async () => {
        const loadDecks = vi.fn().mockResolvedValue(undefined);
        const decks: Deck[] = [
            makeDeck({ id: 'deck-1', examId: 'exam-1', totalCards: 10 }),
            makeDeck({ id: 'deck-2', examId: 'exam-1', totalCards: 7 }),
            makeDeck({ id: 'deck-3', examId: 'exam-2', totalCards: 3 }),
        ];

        const { result } = renderHook(() => useExams({ decks, loadDecks }));

        await waitFor(() => {
            expect(result.current.exams).toHaveLength(2);
        });
        expect(result.current.exams.map(exam => exam.id)).toEqual(['exam-1', 'exam-2']);

        await act(async () => {
            await result.current.handleDeleteExam('exam-1');
        });

        expect(mockDeleteExam).toHaveBeenCalledWith('exam-1');
        expect(examsDb.map(exam => exam.id)).toEqual(['exam-2']);
        await waitFor(() => {
            expect(result.current.exams.map(exam => exam.id)).toEqual(['exam-2']);
        });

        expect(mockGetAllExams).toHaveBeenCalledTimes(2);
        expect(loadDecks).toHaveBeenCalledTimes(1);
        expect(mockToastSuccess).toHaveBeenCalledWith(
            expect.stringContaining('mazzi sono stati scollegati'),
            expect.objectContaining({ title: 'Eliminazione completata' }),
        );
    });

    it('shows error and keeps state unchanged when deletion fails', async () => {
        const loadDecks = vi.fn().mockResolvedValue(undefined);
        const decks: Deck[] = [makeDeck({ id: 'deck-1', examId: 'exam-1', totalCards: 10 })];

        mockDeleteExam.mockRejectedValueOnce(new Error('delete-failed'));

        const { result } = renderHook(() => useExams({ decks, loadDecks }));

        await waitFor(() => {
            expect(result.current.exams).toHaveLength(2);
        });

        await act(async () => {
            await expect(result.current.handleDeleteExam('exam-1')).rejects.toThrow('delete-failed');
        });

        expect(result.current.exams.map(exam => exam.id)).toEqual(['exam-1', 'exam-2']);
        expect(loadDecks).not.toHaveBeenCalled();
        expect(mockToastError).toHaveBeenCalledWith('delete-failed');
    });

    it('still resolves deletion and removes exam when decks refresh fails', async () => {
        const loadDecks = vi.fn().mockRejectedValue(new Error('decks-refresh-failed'));
        const decks: Deck[] = [makeDeck({ id: 'deck-1', examId: 'exam-1', totalCards: 10 })];

        const { result } = renderHook(() => useExams({ decks, loadDecks }));

        await waitFor(() => {
            expect(result.current.exams.map(exam => exam.id)).toEqual(['exam-1', 'exam-2']);
        });

        await act(async () => {
            await expect(result.current.handleDeleteExam('exam-1')).resolves.toBeUndefined();
        });

        expect(mockDeleteExam).toHaveBeenCalledWith('exam-1');
        expect(examsDb.map(exam => exam.id)).toEqual(['exam-2']);
        await waitFor(() => {
            expect(result.current.exams.map(exam => exam.id)).toEqual(['exam-2']);
        });
        expect(mockToastWarning).toHaveBeenCalledWith(
            'Esame eliminato, ma non sono riuscito ad aggiornare i mazzi. Ricarica la pagina.',
        );
        expect(mockToastSuccess).toHaveBeenCalled();
    });
});
