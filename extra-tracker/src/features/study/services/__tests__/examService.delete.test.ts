import { describe, expect, it, vi } from 'vitest';

const { mockApiDelete } = vi.hoisted(() => ({
    mockApiDelete: vi.fn(),
}));

vi.mock('../../../../shared/services/apiClient', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: mockApiDelete,
    },
}));

import examService from '../examService';

describe('examService.delete', () => {
    it('does not throw when backend returns success without data payload', async () => {
        mockApiDelete.mockResolvedValueOnce({
            success: true,
            message: 'Esame eliminato',
        });

        await expect(examService.delete('exam-1')).resolves.toBeUndefined();
        expect(mockApiDelete).toHaveBeenCalledWith('/exams/exam-1');
    });

    it('throws backend message when delete fails', async () => {
        mockApiDelete.mockResolvedValueOnce({
            success: false,
            error: { message: 'Esame non trovato', code: 'NOT_FOUND' },
        });

        await expect(examService.delete('missing-id')).rejects.toThrow('Esame non trovato');
    });
});

