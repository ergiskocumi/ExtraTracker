export type ExamStatus = 'active' | 'passed' | 'failed' | 'archived' | 'completed';

export interface ExamOutcome {
    grade?: number;
    date: string;
    notes?: string;
    difficulties?: string[];
}

export interface Exam {
    id: string;
    title: string;
    description?: string;
    deadline: string;
    status: ExamStatus;
    outcome?: ExamOutcome | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateExamPayload {
    title: string;
    description?: string;
    deadline: string;
}

export interface UpdateExamPayload {
    title?: string;
    description?: string;
    deadline?: string;
    status?: ExamStatus;
    outcome?: ExamOutcome | null;
}
