import { useState, useCallback, useEffect } from 'react';
import type { AIUsageSummary, AIUsageEventsResponse } from '../services/aiUsageDashboardService';
import { aiUsageDashboardService } from '../services/aiUsageDashboardService';
import { getErrorMessage } from '../../../utils/errorMessage';

interface UseAIUsageDataState {
  isLoading: boolean;
  error: string | null;
  summary: AIUsageSummary | null;
  events: AIUsageEventsResponse | null;
}

export function useAIUsageData(days: number, status: string, page: number) {
  const [state, setState] = useState<UseAIUsageDataState>({
    isLoading: true,
    error: null,
    summary: null,
    events: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const [summaryData, eventsData] = await Promise.all([
        aiUsageDashboardService.getSummary({ days, status }),
        aiUsageDashboardService.getEvents({ days, status, page, pageSize: 50 }),
      ]);
      setState({ isLoading: false, error: null, summary: summaryData, events: eventsData });
    } catch (err: unknown) {
      setState(prev => ({ ...prev, isLoading: false, error: getErrorMessage(err) }));
    }
  }, [days, status, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { ...state, refetch: fetchData };
}
