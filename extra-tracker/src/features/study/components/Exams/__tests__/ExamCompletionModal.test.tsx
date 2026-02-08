import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExamCompletionModal } from '../ExamCompletionModal';
import type { Exam } from '../../../types/exam';

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
    await screen.findByText(/Sistema di Valutazione/i);
};

const getSystemSelect = () => screen.getAllByRole('combobox')[0] as HTMLSelectElement;

describe('ExamCompletionModal', () => {
    beforeEach(() => {
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
});
