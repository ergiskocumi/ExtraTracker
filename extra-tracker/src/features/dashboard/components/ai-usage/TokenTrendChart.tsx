import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { AIUsageDailyItem } from '../../services/aiUsageDashboardService';
import { formatCompact, formatInt } from '../../utils/aiUsageFormatters';

interface TokenTrendChartProps {
  data: AIUsageDailyItem[];
  loading?: boolean;
}

export const TokenTrendChart = ({ data, loading }: TokenTrendChartProps) => {
  if (loading) {
    return (
      <div className="p-6 border bg-theme-surface border-theme-default rounded-xl h-80 animate-pulse">
        <div className="w-1/3 h-4 mb-4 rounded bg-theme-subtle" />
        <div className="h-64 rounded bg-theme-subtle" />
      </div>
    );
  }

  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
    input: item.inputTokens,
    output: item.outputTokens,
  }));

  return (
    <div className="h-full p-5 border bg-theme-surface border-theme-default rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-theme-primary">Andamento Token</h3>
          <p className="text-xs text-theme-muted">Input vs Output nel tempo</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Input
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Output
          </span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.1)" vertical={false} />
            <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => formatCompact(v as number)} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const inputTokens = (payload.find(p => p.dataKey === 'input')?.value as number) || 0;
                const outputTokens = (payload.find(p => p.dataKey === 'output')?.value as number) || 0;
                return (
                  <div className="bg-theme-surface border border-theme-default rounded-lg shadow-lg p-3 min-w-[200px]">
                    <p className="mb-2 text-sm font-semibold text-theme-primary">{label}</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-blue-500 rounded-full" />
                          <span className="text-theme-secondary">Input:</span>
                        </div>
                        <span className="font-medium text-theme-primary tabular-nums">{formatInt(inputTokens)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-theme-secondary">Output:</span>
                        </div>
                        <span className="font-medium text-theme-primary tabular-nums">{formatInt(outputTokens)}</span>
                      </div>
                      <div className="border-t border-theme-subtle my-1.5 pt-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-theme-secondary">Totale:</span>
                          <span className="font-bold text-theme-primary tabular-nums">{formatInt(inputTokens + outputTokens)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="input" stroke="#3B82F6" strokeWidth={2} fill="url(#inputGrad)" />
            <Area type="monotone" dataKey="output" stroke="#10B981" strokeWidth={2} fill="url(#outputGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
