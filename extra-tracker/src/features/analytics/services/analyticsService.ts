import { apiClient } from '../../../shared/services/apiClient';

export interface AnalyticsOverview {
    totalXP: number;
    currentStreak: number;
    level: number;
}

export interface DailyActivity {
    date: string;
    study: number;
    work: number;
    xp: number;
}

export interface RecentActivity {
    id: string;
    type: string;
    title: string | null;
    date: string;
    xp?: number;
    mode?: string | null;
}

export interface WeeklyAnalyticsResponse {
    overview: AnalyticsOverview;
    dailyActivity: DailyActivity[];
    recentActivities: RecentActivity[];
}

const emptyResponse: WeeklyAnalyticsResponse = {
    overview: {
        totalXP: 0,
        currentStreak: 0,
        level: 1,
    },
    dailyActivity: [],
    recentActivities: [],
};

const normalizeWeekly = (payload: WeeklyAnalyticsResponse | undefined) => {
    if (!payload) return emptyResponse;

    return {
        overview: {
            totalXP: Number(payload.overview?.totalXP ?? 0),
            currentStreak: Number(payload.overview?.currentStreak ?? 0),
            level: Number(payload.overview?.level ?? 1),
        },
        dailyActivity: Array.isArray(payload.dailyActivity) ? payload.dailyActivity : [],
        recentActivities: Array.isArray(payload.recentActivities) ? payload.recentActivities : [],
    };
};

export const analyticsService = {
    async getWeekly(): Promise<WeeklyAnalyticsResponse> {
        const response = await apiClient.get<WeeklyAnalyticsResponse>('/analytics/weekly');
        return normalizeWeekly(response.data);
    },
};
