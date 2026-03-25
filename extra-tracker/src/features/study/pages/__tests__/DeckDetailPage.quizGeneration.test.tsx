import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DeckDetailPage } from '../DeckDetailPage';
import { studyService } from '../../services/studyService';
import type { Deck } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';

vi.mock('../../services/studyService', () => ({
    studyService: {
        getDeckById: vi.fn(),
        getSession: vi.fn(),
        saveQuizSnapshot: vi.fn(),
        deleteDeck: vi.fn(),
        resetDeckProgress: vi.fn(),
    },
}));

vi.mock('../../components/Deck/DeckDetailContent', () => ({
    DeckDetailContent: ({ onGenerateQuiz }: { onGenerateQuiz: () => void }) => (
        <button type="button" onClick={onGenerateQuiz}>Apri genera quiz</button>
    ),
}));

vi.mock('../../components/Modals/GenerateQuizModal', () => ({
    GenerateQuizModal: ({
        isOpen,
        onGenerate,
    }: {
        isOpen: boolean;
        onGenerate: (config: { questionCount: number; quizType: 'true_false' }) => void;
    }) => isOpen ? (
        <button type="button" onClick={() => onGenerate({ questionCount: 10, quizType: 'true_false' })}>
            Conferma vero falso
        </button>
    ) : null,
}));

vi.mock('../../components/Modals/MagicGenerateModal', () => ({
    MagicGenerateModal: () => null,
}));

vi.mock('../../components/Modals/ExamSolver', () => ({
    ExamSolverModal: () => null,
}));

vi.mock('../../../../shared/components/ConfirmationModal', () => ({
    ConfirmationModal: () => null,
}));

vi.mock('../../../../shared/components/toast', () => ({
    emitToast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

const mockUseParams = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: () => mockUseParams(),
        useNavigate: () => mockNavigate,
    };
});

const renderWithRouter = () => render(
    <BrowserRouter>
        <DeckDetailPage />
    </BrowserRouter>
);

const buildDeck = (overrides: Partial<Deck> = {}): Deck => ({
    id: 'deck-1',
    title: 'Deck quiz',
    cards: [
        {
            id: 'card-1',
            front: 'Q1',
            back: 'A1',
            easinessFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReviewDate: new Date().toISOString(),
            status: 'new',
        },
        {
            id: 'card-2',
            front: 'Q2',
            back: 'A2',
            easinessFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReviewDate: new Date().toISOString(),
            status: 'new',
        },
    ],
    totalCards: 2,
    dueCount: 0,
    tags: [],
    ...overrides,
});

describe('DeckDetailPage quiz generation gate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseParams.mockReturnValue({ id: 'deck-1' });
        (studyService.saveQuizSnapshot as any).mockResolvedValue({
            id: 'saved-1',
            deckId: 'deck-1',
            deckTitle: 'Deck quiz',
            examId: null,
            name: 'Quiz',
            quizType: 'true_false',
            questionCount: 2,
            sourceCardIds: ['quiz_tf_1'],
            source: 'chapter',
        });
        (studyService.getSession as any).mockResolvedValue({
            deck: { id: 'deck-1', title: 'Deck quiz', cards: [], totalCards: 2, dueCount: 0, tags: [] },
            cards: [
                { id: 'quiz_tf_1', front: 'S1', back: 'Vero', easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString(), status: 'new' },
                { id: 'quiz_tf_2', front: 'S2', back: 'Falso', easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date().toISOString(), status: 'new' },
            ],
            remaining: 2,
            total: 2,
            mode: 'quiz',
        });
    });

    it('allows true/false generation with few cards when a PDF is available', async () => {
        (studyService.getDeckById as any).mockResolvedValue(buildDeck({ pdfUrl: '/uploads/chapter.pdf' }));

        renderWithRouter();

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Apri genera quiz' })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Apri genera quiz' }));
        fireEvent.click(screen.getByRole('button', { name: 'Conferma vero falso' }));

        await waitFor(() => {
            expect(studyService.getSession).toHaveBeenCalledWith('deck-1', expect.objectContaining({
                mode: 'quiz',
                quizType: 'true_false',
            }));
        });
        expect(emitToast.info).not.toHaveBeenCalledWith(expect.stringMatching(/Crea almeno 10 flashcard/i));
    });

    it('still blocks true/false generation without PDF when there are too few cards', async () => {
        (studyService.getDeckById as any).mockResolvedValue(buildDeck({ pdfUrl: null }));

        renderWithRouter();

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Apri genera quiz' })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Apri genera quiz' }));
        fireEvent.click(screen.getByRole('button', { name: 'Conferma vero falso' }));

        await waitFor(() => {
            expect(emitToast.info).toHaveBeenCalledWith('Crea almeno 10 flashcard per sbloccare la generazione del quiz');
        });
        expect(studyService.getSession).not.toHaveBeenCalled();
    });
});
