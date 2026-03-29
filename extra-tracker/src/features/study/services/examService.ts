import { apiClient } from '../../../shared/services/apiClient';
import { unwrap } from '../../../shared/services/apiHelpers';
import type { Exam, CreateExamPayload, UpdateExamPayload } from '../types/exam';

const examService = {
    async getAll(): Promise<Exam[]> {
        const response = await apiClient.get<Exam[]>('/exams');
        return unwrap(response, 'Errore nel recupero degli esami');
    },

    async getById(id: string): Promise<Exam> {
        const response = await apiClient.get<Exam>(`/exams/${id}`);
        return unwrap(response, `Errore nel recupero esame ${id}`);
    },

    async create(payload: CreateExamPayload): Promise<Exam> {
        const response = await apiClient.post<Exam>('/exams', payload);
        return unwrap(response, 'Errore nella creazione dell\'esame');
    },

    async update(id: string, payload: UpdateExamPayload): Promise<Exam> {
        const response = await apiClient.patch<Exam>(`/exams/${id}`, payload);
        return unwrap(response, `Errore nell'aggiornamento esame ${id}`);
    },

    async delete(id: string): Promise<void> {
        const response = await apiClient.delete<null>(`/exams/${id}`);
        if (!response.success) {
            throw new Error(
                response.error?.message ||
                response.message ||
                `Errore nell'eliminazione esame ${id}`,
            );
        }
    },
};

export default examService;
