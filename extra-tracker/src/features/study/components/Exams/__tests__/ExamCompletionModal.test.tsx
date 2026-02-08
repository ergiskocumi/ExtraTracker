import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExamCompletionModal } from '../ExamCompletionModal';
import type { Exam } from '../../../types/exam';
import { emitToast } from '../../../../../shared/components/toast';

vi.mock('canvas-confetti', () => ({
    default: vi.fn(),
}));

vi.mock('../../../../../shared/components/toast', () => ({
    emitToast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

const mockExam: Exam = {
    id: 'exam-1',
    title: 'Test Exam',
    deadline: new Date().toISOString(),
    status: 'active',
    description: 'Test description',
    createdAt: new Date().toISOString(),
};

const buildProps = () => ({
    isOpen: true,
    exam: mockExam,
    onClose: vi.fn(),
    onComplete: vi.fn().mockResolvedValue(undefined),
    onResetCards: vi.fn().mockResolvedValue(undefined),
    onGenerateAIQuestions: vi.fn().mockResolvedValue(undefined),
});

const renderModal = (overrides: Partial<ReturnType<typeof buildProps>> = {}) => {
    const props = { ...buildProps(), ...overrides };
    render(<ExamCompletionModal {...props} />);
    return props;
};

const goToPassedFlow = async () => {
    fireEvent.click(screen.getByRole('button', { name: /^SUPERATO$/i }));
    await screen.findByText(/Ottimo lavoro! Hai completato questo percorso\./i);
};

const getSystemSelect = () => screen.getAllByRole('combobox')[0] as HTMLSelectElement;

const goToFailedFlow = async () => {
    fireEvent.click(screen.getByRole('button', { name: /^NON SUPERATO$/i }));
    await screen.findByRole('button', { name: /Concetti difficili/i });
};

const goToRecoveryActions = async () => {
    await goToFailedFlow();
    fireEvent.click(screen.getByRole('button', { name: /Concetti difficili/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continua/i }));
    await screen.findByRole('button', { name: /Reset Mirato/i });
};

describe('ExamCompletionModal', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('accepts valid grades in 30 system', async () => {
        renderModal();
        await goToPassedFlow();

        const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);

        fireEvent.change(gradeInput, { target: { value: '0' } });
        await waitFor(() => {
            expect(screen.queryByText(/Il voto minimo è/i)).not.toBeInTheDocument();
        });

        fireEvent.change(gradeInput, { target: { value: '30' } });
        await waitFor(() => {
            expect(screen.queryByText(/Il voto massimo è/i)).not.toBeInTheDocument();
        });

        fireEvent.change(gradeInput, { target: { value: '28.5' } });
        await waitFor(() => {
            expect(screen.getByText(/28\.5\/30/i)).toBeInTheDocument();
        });
    });

    it('rejects out-of-range grades in 30 system', async () => {
        renderModal();
        await goToPassedFlow();

        const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
        fireEvent.change(gradeInput, { target: { value: '-1' } });
        await waitFor(() => {
            expect(screen.getByText(/Il voto minimo è 0/i)).toBeInTheDocument();
        });

        fireEvent.change(gradeInput, { target: { value: '31' } });
        await waitFor(() => {
            expect(screen.getByText(/Il voto massimo è 30/i)).toBeInTheDocument();
        });
    });

    it('accepts and validates grades in 100 system', async () => {
        renderModal();
        await goToPassedFlow();

        fireEvent.change(getSystemSelect(), { target: { value: '100' } });

        const gradeInput = screen.getByPlaceholderText(/Es\. 85/i);
        fireEvent.change(gradeInput, { target: { value: '85' } });
        await waitFor(() => {
            expect(screen.getByText(/85\/100/i)).toBeInTheDocument();
        });

        fireEvent.change(gradeInput, { target: { value: '101' } });
        await waitFor(() => {
            expect(screen.getByText(/Il voto massimo è 100/i)).toBeInTheDocument();
        });
    });

    it('supports letter grading flow', async () => {
        renderModal();
        await goToPassedFlow();

        fireEvent.change(getSystemSelect(), { target: { value: 'letter' } });
        const selects = screen.getAllByRole('combobox');
        const gradeSelect = selects[1];

        fireEvent.change(gradeSelect, { target: { value: '4' } });
        await waitFor(() => {
            expect(screen.getByText(/Voto formattato:\s*A/i)).toBeInTheDocument();
        });

        fireEvent.change(gradeSelect, { target: { value: '0' } });
        await waitFor(() => {
            expect(screen.getByText(/Voto formattato:\s*F/i)).toBeInTheDocument();
        });
    });

    it('allows empty optional grade', async () => {
        renderModal();
        await goToPassedFlow();

        const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
        fireEvent.change(gradeInput, { target: { value: '' } });

        await waitFor(() => {
            expect(screen.queryByText(/Il voto minimo/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/Il voto massimo/i)).not.toBeInTheDocument();
        });
    });

    it('blocks submit when grade is invalid', async () => {
        const props = renderModal();
        await goToPassedFlow();

        const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
        fireEvent.change(gradeInput, { target: { value: '35' } });
        fireEvent.click(screen.getByRole('button', { name: /Completa Esame/i }));

        await waitFor(() => {
            expect(props.onComplete).not.toHaveBeenCalled();
        });
    });

    it('resets grade when grading system changes', async () => {
        renderModal();
        await goToPassedFlow();

        const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
        fireEvent.change(gradeInput, { target: { value: '28' } });

        fireEvent.change(getSystemSelect(), { target: { value: '100' } });
        const newInput = screen.getByPlaceholderText(/Es\. 85/i) as HTMLInputElement;
        expect(newInput.value).toBe('');
    });

    it('shows insufficient visual warning for 30 system', async () => {
        renderModal();
        await goToPassedFlow();

        const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
        fireEvent.change(gradeInput, { target: { value: '15' } });

        await waitFor(() => {
            expect(screen.getByText(/Voto insufficiente/i)).toBeInTheDocument();
            expect(screen.getByText(/18\/30/i)).toBeInTheDocument();
        });
    });

    it('asks confirmation for insufficient passing grade in 30 system', async () => {
        const props = renderModal();
        await goToPassedFlow();

        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        fireEvent.change(screen.getByPlaceholderText(/Es\. 28/i), { target: { value: '15' } });
        fireEvent.click(screen.getByRole('button', { name: /Completa Esame/i }));

        await waitFor(() => {
            expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Attenzione:'));
            expect(props.onComplete).not.toHaveBeenCalled();
        });

        confirmSpy.mockRestore();
    });

    it('asks confirmation for insufficient passing grade in 100 system', async () => {
        const props = renderModal();
        await goToPassedFlow();

        fireEvent.change(getSystemSelect(), { target: { value: '100' } });
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
        fireEvent.change(screen.getByPlaceholderText(/Es\. 85/i), { target: { value: '50' } });
        fireEvent.click(screen.getByRole('button', { name: /Completa Esame/i }));

        await waitFor(() => {
            expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('60/100'));
            expect(props.onComplete).not.toHaveBeenCalled();
        });

        confirmSpy.mockRestore();
    });

    it('completes passed flow with grade, notes and confetti side effects', async () => {
        const props = renderModal();

        await goToPassedFlow();

        fireEvent.change(screen.getByPlaceholderText(/Es\. 28/i), { target: { value: '28' } });
        fireEvent.change(screen.getByPlaceholderText(/Come ti sei sentito/i), {
            target: { value: 'Mi sono preparato bene' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Completa Esame/i }));

        await waitFor(() => {
            expect(props.onComplete).toHaveBeenCalledTimes(1);
            expect(props.onClose).toHaveBeenCalledTimes(1);
        });

        const [examId, outcome, status] = props.onComplete.mock.calls[0];
        expect(examId).toBe('exam-1');
        expect(status).toBe('passed');
        expect(outcome).toMatchObject({
            grade: 28,
            notes: 'Mi sono preparato bene',
        });
        expect(outcome.date).toEqual(expect.any(String));
        expect(emitToast.success).toHaveBeenCalledWith(expect.stringContaining('Ottimo lavoro'));
    });

    it('blocks invalid grade in custom grading system', async () => {
        const props = renderModal();
        await goToPassedFlow();

        fireEvent.change(getSystemSelect(), { target: { value: 'custom' } });
        fireEvent.change(screen.getByPlaceholderText(/Inserisci il voto/i), { target: { value: '1001' } });
        fireEvent.click(screen.getByRole('button', { name: /Completa Esame/i }));

        await waitFor(() => {
            expect(props.onComplete).not.toHaveBeenCalled();
            expect(emitToast.error).toHaveBeenCalledWith('Il voto massimo è 1000');
        });
    });

    it('allows insufficient letter grade when user confirms warning', async () => {
        const props = renderModal();

        await goToPassedFlow();
        fireEvent.change(getSystemSelect(), { target: { value: 'letter' } });
        const gradeSelect = screen.getAllByRole('combobox')[1];
        fireEvent.change(gradeSelect, { target: { value: '0' } });

        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        fireEvent.click(screen.getByRole('button', { name: /Completa Esame/i }));

        await waitFor(() => {
            expect(confirmSpy).toHaveBeenCalled();
            expect(props.onComplete).toHaveBeenCalledTimes(1);
            expect(props.onClose).toHaveBeenCalledTimes(1);
        });

        const [, outcome, status] = props.onComplete.mock.calls[0];
        expect(status).toBe('passed');
        expect(outcome.grade).toBe(0);
        confirmSpy.mockRestore();
    });

    it('shows passed-flow save error when completion fails', async () => {
        const props = renderModal({
            onComplete: vi.fn().mockRejectedValue(new Error('failed-save')),
        });

        await goToPassedFlow();
        fireEvent.change(screen.getByPlaceholderText(/Es\. 28/i), { target: { value: '26' } });
        fireEvent.click(screen.getByRole('button', { name: /Completa Esame/i }));

        await waitFor(() => {
            expect(props.onComplete).toHaveBeenCalledTimes(1);
            expect(emitToast.error).toHaveBeenCalledWith('failed-save');
            expect(props.onClose).not.toHaveBeenCalled();
        });
    });

    it('completes failed flow and maps selected difficulties', async () => {
        const props = renderModal();
        await goToFailedFlow();

        fireEvent.click(screen.getByRole('button', { name: /Concetti difficili/i }));
        fireEvent.click(screen.getByRole('button', { name: /Mancanza di tempo/i }));
        fireEvent.change(screen.getByPlaceholderText(/Racconta la tua esperienza/i), {
            target: { value: 'ho gestito male i tempi' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Continua/i }));

        await waitFor(() => {
            expect(props.onComplete).toHaveBeenCalledTimes(1);
        });

        const [examId, outcome, status] = props.onComplete.mock.calls[0];
        expect(examId).toBe('exam-1');
        expect(status).toBe('failed');
        expect(outcome.notes).toBe('ho gestito male i tempi');
        expect(outcome.difficulties).toEqual(
            expect.arrayContaining(['Concetti difficili', 'Mancanza di tempo'])
        );
        expect(await screen.findByText(/Piano di Recupero/i)).toBeInTheDocument();
    });

    it('shows recovery save error when failed outcome cannot be saved', async () => {
        const props = renderModal({
            onComplete: vi.fn().mockRejectedValue(new Error('failed-outcome-save')),
        });
        await goToFailedFlow();

        fireEvent.click(screen.getByRole('button', { name: /Ansia\/Vuoto di memoria/i }));
        fireEvent.click(screen.getByRole('button', { name: /Continua/i }));

        await waitFor(() => {
            expect(props.onComplete).toHaveBeenCalledTimes(1);
            expect(emitToast.error).toHaveBeenCalledWith('failed-outcome-save');
        });

        expect(screen.queryByText(/Piano di Recupero/i)).not.toBeInTheDocument();
    });

    it('keeps continue disabled when all difficulties are deselected', async () => {
        renderModal();
        await goToFailedFlow();

        const difficultyButton = screen.getByRole('button', { name: /Concetti difficili/i });
        fireEvent.click(difficultyButton);
        fireEvent.click(difficultyButton);

        expect(screen.getByRole('button', { name: /Continua/i })).toBeDisabled();
    });

    it('runs reset actions from recovery plan (hard-only and full reset)', async () => {
        const props = renderModal();
        await goToRecoveryActions();

        fireEvent.click(screen.getByRole('button', { name: /Reset Mirato/i }));
        await waitFor(() => {
            expect(props.onResetCards).toHaveBeenCalledWith('exam-1', 'hard-only');
            expect(emitToast.success).toHaveBeenCalledWith(expect.stringContaining('carte difficili'));
            expect(props.onClose).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByRole('button', { name: /Ricomincia/i }));
        await waitFor(() => {
            expect(props.onResetCards).toHaveBeenCalledWith('exam-1', 'all');
            expect(emitToast.success).toHaveBeenCalledWith(expect.stringContaining('Tutte le carte'));
        });
    });

    it('shows reset/AI errors and supports successful AI generation', async () => {
        const props = renderModal({
            onResetCards: vi.fn().mockRejectedValue(new Error('reset-failed')),
            onGenerateAIQuestions: vi.fn().mockResolvedValue(undefined),
        });
        await goToRecoveryActions();

        fireEvent.click(screen.getByRole('button', { name: /Reset Mirato/i }));
        await waitFor(() => {
            expect(emitToast.error).toHaveBeenCalledWith('reset-failed');
        });

        fireEvent.click(screen.getByRole('button', { name: /Analisi AI/i }));
        await waitFor(() => {
            expect(props.onGenerateAIQuestions).toHaveBeenCalledWith('exam-1', ['concepts']);
            expect(emitToast.success).toHaveBeenCalledWith('Domande AI generate con successo!');
            expect(props.onClose).toHaveBeenCalled();
        });
    });

    it('shows AI generation error when question generation fails', async () => {
        const props = renderModal({
            onGenerateAIQuestions: vi.fn().mockRejectedValue(new Error('ai-failed')),
        });
        await goToRecoveryActions();

        fireEvent.click(screen.getByRole('button', { name: /Analisi AI/i }));
        await waitFor(() => {
            expect(props.onGenerateAIQuestions).toHaveBeenCalledWith('exam-1', ['concepts']);
            expect(emitToast.error).toHaveBeenCalledWith('ai-failed');
        });

        expect(props.onClose).not.toHaveBeenCalled();
    });

    it('returns null when modal is closed', () => {
        renderModal({ isOpen: false });
        expect(screen.queryByText(/Com'è andato l'esame/i)).not.toBeInTheDocument();
    });
});
