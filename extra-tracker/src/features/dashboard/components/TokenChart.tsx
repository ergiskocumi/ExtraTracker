import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { AIUsageDailyItem } from '../services/aiUsageDashboardService';
import { cn } from '../../../lib/utils';
import { Skeleton } from '../../../shared/components/ui/skeleton';

interface TokenChartProps {
  data: AIUsageDailyItem[];
  loading?: boolean;
  className?: string;
}

interface ChartDataPoint {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export const TokenChart = ({ data, loading = false, className }: TokenChartProps) => {
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => ({
      date: new Date(item.date).toLocaleDateString('it-IT', { 
        month: 'short', 
        day: 'numeric' 
      }),
      inputTokens: item.inputTokens || 0,
      outputTokens: item.outputTokens || 0,
      totalTokens: item.totalTokens || 0,
      cost: item.totalCostUsd || 0,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className={cn('rounded-2xl border border-theme-default bg-theme-surface p-5', className)}>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className={cn('rounded-2xl border border-theme-default bg-theme-surface p-8 text-center', className)}>
        <p className="text-theme-muted">Nessun dato disponibile per il periodo selezionato</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border border-theme-default bg-theme-surface p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-theme-primary">Andamento Token e Costi</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-theme-secondary">Input Tokens</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-theme-secondary">Output Tokens</span>
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="inputTokensGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="outputTokensGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              width={80}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid rgba(75, 85, 99, 0.5)',
                borderRadius: '8px',
                color: '#F9FAFB',
              }}
              formatter={(value: number | undefined, name: string | undefined) => {
                const v = value ?? 0;
                if (name === 'Costo (USD)') {
                  return [`$${v.toFixed(4)}`, name ?? ''];
                }
                return [v.toLocaleString('it-IT'), name ?? ''];
              }}
            />
            <Area
              type="monotone"
              dataKey="inputTokens"
              name="Input Tokens"
              stroke="#3B82F6"
              fillOpacity={1}
              fill="url(#inputTokensGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="outputTokens"
              name="Output Tokens"
              stroke="#10B981"
              fillOpacity={1}
              fill="url(#outputTokensGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
