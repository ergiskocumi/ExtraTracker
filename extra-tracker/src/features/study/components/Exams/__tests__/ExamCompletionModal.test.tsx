/**
 * 🧪 TEST - ExamCompletionModal
 * 
 * Test per validazione voto e sistemi di valutazione
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExamCompletionModal } from '../ExamCompletionModal';
import type { Goal } from '../../../../goals/types';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
    default: vi.fn(),
}));

// Mock toast
vi.mock('../../../../../shared/components/toast', () => ({
    emitToast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

const mockExam: Goal = {
    id: 'exam-1',
    title: 'Test Exam',
    category: 'learning',
    type: 'milestone',
    deadline: new Date().toISOString(),
    status: 'active',
    description: 'Test description',
    milestones: [],
    createdAt: new Date().toISOString(),
};

const defaultProps = {
    isOpen: true,
    exam: mockExam,
    onClose: vi.fn(),
    onComplete: vi.fn().mockResolvedValue(undefined),
    onResetCards: vi.fn().mockResolvedValue(undefined),
    onGenerateAIQuestions: vi.fn().mockResolvedValue(undefined),
};

describe('ExamCompletionModal - Validazione Voto', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Sistema 30 (Trentesimi)', () => {
        it('dovrebbe accettare voti validi da 0 a 30', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            // Clicca su "SUPERATO"
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            // Seleziona sistema 30
            const systemSelect = screen.getByLabelText(/Sistema di Valutazione/i);
            fireEvent.change(systemSelect, { target: { value: '30' } });

            // Test voto minimo (0)
            const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
            fireEvent.change(gradeInput, { target: { value: '0' } });
            await waitFor(() => {
                expect(screen.queryByText(/Il voto minimo è/i)).not.toBeInTheDocument();
            });

            // Test voto massimo (30)
            fireEvent.change(gradeInput, { target: { value: '30' } });
            await waitFor(() => {
                expect(screen.queryByText(/Il voto massimo è/i)).not.toBeInTheDocument();
            });

            // Test voto valido (28)
            fireEvent.change(gradeInput, { target: { value: '28' } });
            await waitFor(() => {
                expect(screen.getByText(/28\/30/i)).toBeInTheDocument();
            });
        });

        it('dovrebbe rifiutare voti minori di 0', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
            fireEvent.change(gradeInput, { target: { value: '-1' } });
            
            await waitFor(() => {
                expect(screen.getByText(/Il voto minimo è 0/i)).toBeInTheDocument();
            });
        });

        it('dovrebbe rifiutare voti maggiori di 30', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
            fireEvent.change(gradeInput, { target: { value: '31' } });
            
            await waitFor(() => {
                expect(screen.getByText(/Il voto massimo è 30/i)).toBeInTheDocument();
            });
        });

        it('dovrebbe accettare decimali (step 0.5)', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
            fireEvent.change(gradeInput, { target: { value: '28.5' } });
            
            await waitFor(() => {
                expect(screen.getByText(/28\.5\/30/i)).toBeInTheDocument();
            });
        });
    });

    describe('Sistema 100 (Centesimi)', () => {
        it('dovrebbe accettare voti validi da 0 a 100', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            const systemSelect = screen.getByLabelText(/Sistema di Valutazione/i);
            fireEvent.change(systemSelect, { target: { value: '100' } });

            const gradeInput = screen.getByPlaceholderText(/Es\. 85/i);
            fireEvent.change(gradeInput, { target: { value: '85' } });
            
            await waitFor(() => {
                expect(screen.getByText(/85\/100/i)).toBeInTheDocument();
            });
        });

        it('dovrebbe rifiutare voti maggiori di 100', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            const systemSelect = screen.getByLabelText(/Sistema di Valutazione/i);
            fireEvent.change(systemSelect, { target: { value: '100' } });

            const gradeInput = screen.getByPlaceholderText(/Es\. 85/i);
            fireEvent.change(gradeInput, { target: { value: '101' } });
            
            await waitFor(() => {
                expect(screen.getByText(/Il voto massimo è 100/i)).toBeInTheDocument();
            });
        });
    });

    describe('Sistema Lettere', () => {
        it('dovrebbe accettare valori da 0 a 5', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            const systemSelect = screen.getByLabelText(/Sistema di Valutazione/i);
            fireEvent.change(systemSelect, { target: { value: 'letter' } });

            const gradeSelect = screen.getByText(/Seleziona voto/i).closest('select');
            expect(gradeSelect).toBeInTheDocument();
            
            fireEvent.change(gradeSelect!, { target: { value: '4' } });
            
            await waitFor(() => {
                expect(screen.getByText(/A \(Ottimo\)/i)).toBeInTheDocument();
            });
        });

        it('dovrebbe formattare correttamente le lettere', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            const systemSelect = screen.getByLabelText(/Sistema di Valutazione/i);
            fireEvent.change(systemSelect, { target: { value: 'letter' } });

            const gradeSelect = screen.getByText(/Seleziona voto/i).closest('select');
            
            // Test F
            fireEvent.change(gradeSelect!, { target: { value: '0' } });
            await waitFor(() => {
                expect(screen.getByText(/F/i)).toBeInTheDocument();
            });

            // Test A+
            fireEvent.change(gradeSelect!, { target: { value: '5' } });
            await waitFor(() => {
                expect(screen.getByText(/A\+/i)).toBeInTheDocument();
            });
        });
    });

    describe('Validazione Input', () => {
        it('dovrebbe rifiutare valori non numerici', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
            fireEvent.change(gradeInput, { target: { value: 'abc' } });
            
            await waitFor(() => {
                expect(screen.getByText(/Il voto deve essere un numero valido/i)).toBeInTheDocument();
            });
        });

        it('dovrebbe permettere voto vuoto (opzionale)', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
            fireEvent.change(gradeInput, { target: { value: '' } });
            
            await waitFor(() => {
                expect(screen.queryByText(/Il voto/i)).not.toBeInTheDocument();
            });
        });

        it('dovrebbe validare prima del submit', async () => {
            const onComplete = vi.fn();
            render(<ExamCompletionModal {...defaultProps} onComplete={onComplete} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            // Inserisci voto invalido
            const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
            fireEvent.change(gradeInput, { target: { value: '35' } });

            // Prova a completare
            const completeButton = screen.getByText(/Completa Esame/i);
            fireEvent.click(completeButton);

            // onComplete non dovrebbe essere chiamato
            await waitFor(() => {
                expect(onComplete).not.toHaveBeenCalled();
            });
        });
    });

    describe('Cambio Sistema di Valutazione', () => {
        it('dovrebbe resettare il voto quando cambia sistema', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            // Inserisci voto nel sistema 30
            const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
            fireEvent.change(gradeInput, { target: { value: '28' } });

            // Cambia sistema
            const systemSelect = screen.getByLabelText(/Sistema di Valutazione/i);
            fireEvent.change(systemSelect, { target: { value: '100' } });

            // Il voto dovrebbe essere resettato
            const newGradeInput = screen.getByPlaceholderText(/Es\. 85/i);
            expect(newGradeInput).toHaveValue('');
        });
    });

    describe('Validazione Logica - Controllo Sufficienza', () => {
        it('dovrebbe avvisare se voto < 18 in trentesimi con SUPERATO', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
            fireEvent.change(gradeInput, { target: { value: '15' } });

            // Prova a completare
            const completeButton = screen.getByText(/Completa Esame/i);
            
            // Mock window.confirm per testare il comportamento
            const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
            
            fireEvent.click(completeButton);

            await waitFor(() => {
                expect(confirmSpy).toHaveBeenCalledWith(
                    expect.stringContaining('Attenzione:')
                );
            });

            confirmSpy.mockRestore();
        });

        it('dovrebbe avvisare se voto < 60 in centesimi con SUPERATO', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            const systemSelect = screen.getByLabelText(/Sistema di Valutazione/i);
            fireEvent.change(systemSelect, { target: { value: '100' } });

            const gradeInput = screen.getByPlaceholderText(/Es\. 85/i);
            fireEvent.change(gradeInput, { target: { value: '50' } });

            const completeButton = screen.getByText(/Completa Esame/i);
            const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
            
            fireEvent.click(completeButton);

            await waitFor(() => {
                expect(confirmSpy).toHaveBeenCalledWith(
                    expect.stringContaining('60/100')
                );
            });

            confirmSpy.mockRestore();
        });

        it('dovrebbe mostrare indicatore visivo per voto insufficiente', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
            fireEvent.change(gradeInput, { target: { value: '15' } });

            await waitFor(() => {
                expect(screen.getByText(/Voto insufficiente/i)).toBeInTheDocument();
                expect(screen.getByText(/La sufficienza è 18\/30/i)).toBeInTheDocument();
            });
        });

        it('dovrebbe permettere voto sufficiente senza warning', async () => {
            render(<ExamCompletionModal {...defaultProps} />);
            
            const passedButton = screen.getByText('SUPERATO');
            fireEvent.click(passedButton);

            const gradeInput = screen.getByPlaceholderText(/Es\. 28/i);
            fireEvent.change(gradeInput, { target: { value: '25' } });

            await waitFor(() => {
                expect(screen.queryByText(/Voto insufficiente/i)).not.toBeInTheDocument();
                expect(screen.getByText(/25\/30/i)).toBeInTheDocument();
            });
        });
    });
});
