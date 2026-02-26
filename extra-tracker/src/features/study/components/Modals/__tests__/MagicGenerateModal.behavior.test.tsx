import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MagicGenerateModal } from '../MagicGenerateModal';
import { studyService } from '../../../services/studyService';
import { emitToast } from '../../../../../shared/components/toast';

const startJobMock = vi.fn();
const updateJobMock = vi.fn();
const completeJobMock = vi.fn();
const failJobMock = vi.fn();
const dismissToBackgroundMock = vi.fn();

vi.mock('../../../services/studyService', () => ({
    studyService: {
        generateFromPDF: vi.fn(),
    },
}));

vi.mock('../../../../../shared/components/toast', () => ({
    emitToast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

vi.mock('../../../../../hooks/useSSE', () => ({
    useSSE: vi.fn(),
}));

vi.mock('../../../context/FlashcardGenerationContext', () => ({
    useFlashcardGeneration: () => ({
        activeJob: null,
        startJob: startJobMock,
        updateJob: updateJobMock,
        completeJob: completeJobMock,
        failJob: failJobMock,
        dismissToBackground: dismissToBackgroundMock,
    }),
}));

const baseProps = () => ({
    isOpen: true,
    onClose: vi.fn(),
    deckId: 'deck-abc',
    deckTitle: 'Analisi 1',
    onSuccess: vi.fn().mockResolvedValue(undefined),
});

const getFileInput = (container: HTMLElement): HTMLInputElement => {
    const input = container.querySelector('input[type="file"]');
    if (!input) {
        throw new Error('File input non trovato');
    }
    return input as HTMLInputElement;
};

describe('MagicGenerateModal behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        startJobMock.mockReturnValue('job-123');
    });

    it('starts generation flow with automatic maxCards estimate and calls service', async () => {
        vi.mocked(studyService.generateFromPDF).mockResolvedValue(undefined as never);
        const props = baseProps();
        const { container } = render(<MagicGenerateModal {...props} />);

        const pdfFile = new File([new Uint8Array(1024 * 1024 * 2)], 'dispensa.pdf', {
            type: 'application/pdf',
        });
        fireEvent.change(getFileInput(container), { target: { files: [pdfFile] } });
        fireEvent.click(screen.getByRole('button', { name: /avvia generazione/i }));

        await waitFor(() => {
            expect(startJobMock).toHaveBeenCalledWith({
                deckId: 'deck-abc',
                deckTitle: 'Analisi 1',
                fileName: 'dispensa.pdf',
                maxCards: 32,
            });
            expect(studyService.generateFromPDF).toHaveBeenCalledWith('deck-abc', pdfFile);
        });

        expect(failJobMock).not.toHaveBeenCalled();
        expect(emitToast.error).not.toHaveBeenCalled();
    });

    it('fails job with the started job id when generateFromPDF throws', async () => {
        startJobMock.mockReturnValue('job-fail-9');
        vi.mocked(studyService.generateFromPDF).mockRejectedValue(new Error('backend down'));
        const props = baseProps();
        const { container } = render(<MagicGenerateModal {...props} />);

        const pdfFile = new File([new Uint8Array(128)], 'errore.pdf', {
            type: 'application/pdf',
        });
        fireEvent.change(getFileInput(container), { target: { files: [pdfFile] } });
        fireEvent.click(screen.getByRole('button', { name: /avvia generazione/i }));

        await waitFor(() => {
            expect(failJobMock).toHaveBeenCalledWith('job-fail-9', 'backend down');
            expect(emitToast.error).toHaveBeenCalledWith('backend down', { title: 'Generazione fallita' });
        });

        expect(screen.getByText(/backend down/i)).toBeInTheDocument();
    });
});

