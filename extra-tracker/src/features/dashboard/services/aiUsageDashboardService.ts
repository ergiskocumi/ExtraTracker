import apiClient from '../../../shared/services/apiClient';

export interface AIUsageBreakdownItem {
    key: string;
    requests: number;
    totalTokens?: number;
    totalCostUsd?: number;
}

export interface AIUsageDailyItem {
    date: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCostUsd: number;
}

export interface AIUsageSummary {
    range: {
        from: string | null;
        to: string | null;
        days: number;
    };
    totals: {
        requests: number;
        successRequests: number;
        failedRequests: number;
        promptChars: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        totalCostUsd: number;
        avgLatencyMs: number;
    };
    breakdowns: {
        byMode: AIUsageBreakdownItem[];
        byFeature: AIUsageBreakdownItem[];
        byModality: AIUsageBreakdownItem[];
        byModel: AIUsageBreakdownItem[];
        byStatus: AIUsageBreakdownItem[];
    };
    daily: AIUsageDailyItem[];
}

export interface AIUsageEvent {
    id: string;
    provider: string;
    modality: string;
    mode: string;
    feature: string;
    model: string;
    promptLengthChars: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCostUsd: number;
    outputCostUsd: number;
    totalCostUsd: number;
    costEstimated: boolean;
    status: 'success' | 'error';
    latencyMs: number;
    errorMessage: string;
    metadata: Record<string, unknown>;
    createdAt: string;
}

export interface AIUsageEventsResponse {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
    items: AIUsageEvent[];
}

export interface AIUsageFilters {
    days?: number;
    page?: number;
    pageSize?: number;
    mode?: string;
    feature?: string;
    modality?: string;
    model?: string;
    status?: string;
}

const cleanParams = (params: AIUsageFilters = {}) => {
    return Object.entries(params).reduce<Record<string, string | number>>((acc, [key, value]) => {
        if (value === undefined || value === null || value === '') return acc;
        acc[key] = value;
        return acc;
    }, {});
};

export const getAIUsageSummary = async (filters: AIUsageFilters = {}): Promise<AIUsageSummary> => {
    const response = await apiClient.get<{ success: boolean; data: AIUsageSummary }>('/dashboard/ai-usage/summary', {
        params: cleanParams(filters),
    });
    return response.data.data;
};

export const getAIUsageEvents = async (filters: AIUsageFilters = {}): Promise<AIUsageEventsResponse> => {
    const response = await apiClient.get<{ success: boolean; data: AIUsageEventsResponse }>('/dashboard/ai-usage/events', {
        params: cleanParams(filters),
    });
    return response.data.data;
};

export const aiUsageDashboardService = {
    getSummary: getAIUsageSummary,
    getEvents: getAIUsageEvents,
};

export default aiUsageDashboardService;
