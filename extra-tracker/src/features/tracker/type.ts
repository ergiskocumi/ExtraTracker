export interface WorkLog {
    id: string;
    projectId: string;
    date: string;
    title?: string;
    startTime: string;
    endTime: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type WorkLogInput = Omit<WorkLog, 'id' | 'createdAt' | 'updatedAt'>;

export type WorkLogFormMode = 'new' | 'edit' | 'smartCopy';
