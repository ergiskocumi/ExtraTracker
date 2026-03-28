import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Activity,
  Euro,
  Hash,
  FileText,
  AlertTriangle,
  TrendingDown,
  RotateCw,
  BarChart3,
  Zap,
  Filter,

  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { aiUsageDashboardService, type AIUsageSummary, type AIUsageEventsResponse, type AIUsageEvent, type AIUsageDailyItem } from '../services/aiUsageDashboardService';
import { cn } from '../../../lib/utils';

const CURRENCY_FORMATTER = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const INTEGER_FORMATTER = new Intl.NumberFormat('it-IT');
const COMPACT_FORMATTER = new Intl.NumberFormat('it-IT', { notation: 'compact', maximumFractionDigits: 1 });

const formatInt = (value: number) => INTEGER_FORMATTER.format(value || 0);
const formatCompact = (value: number) => COMPACT_FORMATTER.format(value || 0);
const formatEur = (value: number) => CURRENCY_FORMATTER.format(value || 0);
const formatEurCompact = (value: number) => {
  if (value === 0) return '€0';
  if (value < 0.01) return `€${(value * 100).toFixed(2)}`;
  if (value < 1) return `€${value.toFixed(4)}`;
  return `€${value.toFixed(2)}`;
};

const formatDateTime = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ============================================
// COMPONENT: Stat Card Compatta
// ============================================
interface StatCardProps {
  title: string;
  value: string;
  subvalue?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  trend?: number;
  loading?: boolean;
}

const colorMap = {
  blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
  green: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
  amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400',
  red: 'from-red-500/20 to-red-600/5 border-red-500/30 text-red-400',
  purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
};

const bgColorMap = {
  blue: 'bg-blue-500/10',
  green: 'bg-emerald-500/10',
  amber: 'bg-amber-500/10',
  red: 'bg-red-500/10',
  purple: 'bg-purple-500/10',
};

const StatCard = ({ title, value, subvalue, icon, color, trend, loading }: StatCardProps) => {
  if (loading) {
    return (
      <div className="p-4 border bg-theme-surface border-theme-default rounded-xl animate-pulse">
        <div className="w-1/2 h-4 mb-2 rounded bg-theme-subtle" />
        <div className="w-3/4 h-8 rounded bg-theme-subtle" />
      </div>
    );
  }

  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 transition-all hover:scale-[1.02]',
      colorMap[color]
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="mb-1 text-xs font-medium tracking-wider uppercase text-theme-muted">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-theme-primary">{value}</p>
          {subvalue && <p className="mt-1 text-xs truncate text-theme-secondary">{subvalue}</p>}
        </div>
        <div className={cn('p-2 rounded-lg', bgColorMap[color])}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className={cn(
          'mt-2 text-xs font-medium inline-flex items-center gap-1',
          trend >= 0 ? 'text-emerald-400' : 'text-red-400'
        )}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          <span className="font-normal text-theme-muted">vs periodo prec.</span>
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPONENT: Token Trend Chart
// ============================================
const TokenTrendChart = ({ data, loading }: { data: AIUsageDailyItem[]; loading?: boolean }) => {
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
    total: item.totalTokens,
    cost: item.totalCostUsd,
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
            <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => formatCompact(v)} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const inputTokens = payload.find(p => p.dataKey === 'input')?.value as number || 0;
                  const outputTokens = payload.find(p => p.dataKey === 'output')?.value as number || 0;
                  const totalTokens = inputTokens + outputTokens;
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
                            <span className="font-bold text-theme-primary tabular-nums">{formatInt(totalTokens)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
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

// ============================================
// COMPONENT: Cost Distribution Chart (Modern Donut)
// ============================================
const CostDistributionChart = ({ data, title, loading }: { data: { name: string; value: number; count: number }[]; title: string; loading?: boolean }) => {
  if (loading) {
    return (
      <div className="p-6 border bg-theme-surface border-theme-default rounded-xl h-80 animate-pulse">
        <div className="w-1/2 h-4 mb-4 rounded bg-theme-subtle" />
        <div className="h-56 rounded bg-theme-subtle" />
      </div>
    );
  }

  // Modern color palette - works well in both light and dark themes
  const COLORS = [
    '#3B82F6', // Blue 500
    '#10B981', // Emerald 500
    '#F59E0B', // Amber 500
    '#EF4444', // Red 500
    '#8B5CF6', // Violet 500
    '#06B6D4', // Cyan 500
    '#EC4899', // Pink 500
    '#84CC16', // Lime 500
  ];

  const totalValue = data.reduce((acc, item) => acc + item.value, 0);
  const hasData = data.length > 0 && totalValue > 0;

  return (
    <div className="h-full p-5 border bg-theme-surface border-theme-default rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-theme-primary">{title}</h3>
          <p className="text-xs text-theme-muted">Distribuzione costi</p>
        </div>
        {hasData && (
          <span className="text-xs font-medium text-theme-secondary">
            {data.length} categorie
          </span>
        )}
      </div>
      
      <div className="relative h-56">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                cornerRadius={6}
                stroke="none"
              >
                {data.map((_entry, i) => (
                  <Cell 
                    key={i} 
                    fill={COLORS[i % COLORS.length]} 
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    const percentage = ((item.value / totalValue) * 100).toFixed(1);
                    return (
                      <div className="bg-theme-surface border border-theme-default rounded-lg shadow-lg p-3 min-w-[180px]">
                        <p className="mb-1 text-sm font-semibold text-theme-primary">{item.name}</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-theme-secondary">Costo:</span>
                            <span className="font-medium text-theme-primary">{formatEur(item.value)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-theme-secondary">Richieste:</span>
                            <span className="font-medium text-theme-primary">{formatInt(item.count)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-theme-secondary">Percentuale:</span>
                            <span className="font-medium text-primary-400">{percentage}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-theme-muted">
            <div className="w-16 h-16 mb-3 border-4 rounded-full border-theme-subtle border-t-primary-500 animate-spin" />
            <span className="text-sm">Nessun dato disponibile</span>
          </div>
        )}
        
        {/* Center label with total */}
        {hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-theme-muted uppercase tracking-wider">Totale</span>
            <span className="text-lg font-bold text-theme-primary">{formatEurCompact(totalValue)}</span>
          </div>
        )}
      </div>
      
      {/* Legend */}
      {hasData && (
        <div className="mt-3 grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto">
          {data.slice(0, 6).map((item, i) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <span 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="truncate text-theme-secondary" title={item.name}>
                {item.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPONENT: Event Row
// ============================================
const EventRow = ({ event }: { event: AIUsageEvent }) => {
  const isError = event.status === 'error';
  
  return (
    <tr className="text-sm transition-colors border-b border-theme-subtle/50 hover:bg-theme-subtle/20">
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="font-medium text-theme-primary">{formatDateTime(event.createdAt)}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-col">
          <span className="font-medium text-theme-primary">{event.mode}</span>
          <span className="text-xs text-theme-secondary">{event.feature}</span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-theme-card border border-theme-default text-theme-primary">
          {event.model?.slice(0, 20) || '-'}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        <span className="text-theme-secondary">{formatInt(event.promptLengthChars)}</span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex flex-col items-end">
          <span className="font-medium text-blue-400 tabular-nums">{formatInt(event.inputTokens)}</span>
          <span className="text-[10px] text-theme-muted">€{event.inputCostUsd.toFixed(4)}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex flex-col items-end">
          <span className="font-medium text-emerald-400 tabular-nums">{formatInt(event.outputTokens)}</span>
          <span className="text-[10px] text-theme-muted">€{event.outputCostUsd.toFixed(4)}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className="font-semibold text-theme-primary tabular-nums">{formatInt(event.totalTokens)}</span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex flex-col items-end">
          <span className="font-semibold text-theme-primary tabular-nums">{formatEurCompact(event.totalCostUsd)}</span>
          {event.costEstimated && <span className="text-[10px] text-amber-400">est.</span>}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
          isError 
            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        )}>
          {isError ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
          {event.status}
        </span>
      </td>
    </tr>
  );
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export const AIUsageDashboardPage = () => {
  const [days, setDays] = useState<number>(30);
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<AIUsageSummary | null>(null);
  const [events, setEvents] = useState<AIUsageEventsResponse | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryData, eventsData] = await Promise.all([
        aiUsageDashboardService.getSummary({ days, status }),
        aiUsageDashboardService.getEvents({ days, status, page, pageSize: 50 }),
      ]);
      setSummary(summaryData);
      setEvents(eventsData);
    } finally {
      setIsLoading(false);
    }
  }, [days, status, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Stats calculations
  const stats = useMemo(() => {
    if (!summary) return null;
    const errorRate = summary.totals.requests ? (summary.totals.failedRequests / summary.totals.requests) * 100 : 0;
    const avgCost = summary.totals.requests ? summary.totals.totalCostUsd / summary.totals.requests : 0;
    const ioRatio = summary.totals.inputTokens ? (summary.totals.outputTokens / summary.totals.inputTokens) : 0;
    return { errorRate, avgCost, ioRatio };
  }, [summary]);

  // Chart data preparation
  const costByModel = useMemo(() => {
    if (!summary?.breakdowns.byModel) return [];
    return summary.breakdowns.byModel
      .filter(i => i.totalCostUsd && i.totalCostUsd > 0)
      .sort((a, b) => (b.totalCostUsd || 0) - (a.totalCostUsd || 0))
      .slice(0, 6)
      .map(i => ({ name: i.key, value: i.totalCostUsd || 0, count: i.requests }));
  }, [summary]);

  const hasEstimations = useMemo(() => events?.items?.some(i => i.costEstimated), [events]);

  return (
    <div className="min-h-screen bg-theme-base">
      {/* TOP TOOLBAR - Fixed full width */}
      <header className="sticky top-0 z-50 border-b bg-theme-surface/95 backdrop-blur border-theme-default">
        <div className="flex items-center justify-between px-4 h-14 lg:px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary-500" />
              <h1 className="text-lg font-bold text-theme-primary">AI Usage Dashboard</h1>
            </div>
            {hasEstimations && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                <AlertTriangle size={12} />
                Alcuni costi stimati
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Period Selector */}
            <div className="flex items-center bg-theme-card rounded-lg border border-theme-default p-0.5">
              {[7, 30, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                    days === d 
                      ? 'bg-primary-600 text-white' 
                      : 'text-theme-secondary hover:text-theme-primary'
                  )}
                >
                  {d}g
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-theme-card border border-theme-default rounded-lg px-3 py-1.5 text-xs text-theme-primary focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tutti</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>

            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 border rounded-lg border-theme-default bg-theme-card hover:bg-theme-subtle disabled:opacity-50"
            >
              <RotateCw className={cn('w-4 h-4 text-theme-primary', isLoading && 'animate-spin')} />
            </button>

            <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-theme-default bg-theme-card hover:bg-theme-subtle text-xs text-theme-primary">
              <Download size={14} />
              Export
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT - Full width, no constraints */}
      <main className="p-4 space-y-6 lg:p-6">
        {/* STATS GRID - 6 columns on large screens */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            title="Richieste Totali"
            value={formatInt(summary?.totals.requests || 0)}
            subvalue={`${formatInt(summary?.totals.successRequests || 0)} ok`}
            icon={<Activity size={18} />}
            color="blue"
            loading={isLoading}
          />
          <StatCard
            title="Costo Totale"
            value={formatEurCompact(summary?.totals.totalCostUsd || 0)}
            subvalue={`avg ${formatEurCompact(stats?.avgCost || 0)}/req`}
            icon={<Euro size={18} />}
            color="amber"
            loading={isLoading}
          />
          <StatCard
            title="Input Tokens"
            value={formatCompact(summary?.totals.inputTokens || 0)}
            subvalue="tokens in ingresso"
            icon={<Hash size={18} />}
            color="blue"
            loading={isLoading}
          />
          <StatCard
            title="Output Tokens"
            value={formatCompact(summary?.totals.outputTokens || 0)}
            subvalue={`ratio ${(stats?.ioRatio || 0).toFixed(2)}x`}
            icon={<Zap size={18} />}
            color="green"
            loading={isLoading}
          />
          <StatCard
            title="Prompt Chars"
            value={formatCompact(summary?.totals.promptChars || 0)}
            subvalue="caratteri totali"
            icon={<FileText size={18} />}
            color="purple"
            loading={isLoading}
          />
          <StatCard
            title="Error Rate"
            value={`${(stats?.errorRate || 0).toFixed(1)}%`}
            subvalue={`${Math.round(summary?.totals.avgLatencyMs || 0)}ms avg`}
            icon={<TrendingDown size={18} />}
            color={(stats?.errorRate || 0) > 5 ? 'red' : 'green'}
            loading={isLoading}
          />
        </section>

        {/* CHARTS ROW - 3 columns */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TokenTrendChart data={summary?.daily || []} loading={isLoading} />
          </div>
          <CostDistributionChart 
            data={costByModel} 
            title="Costi per Modello" 
            loading={isLoading} 
          />
        </section>

        {/* SECOND CHARTS ROW */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CostDistributionChart 
            data={summary?.breakdowns.byMode.slice(0, 6).map(i => ({ name: i.key, value: i.totalCostUsd || 0, count: i.requests })) || []}
            title="Costi per Modalità" 
            loading={isLoading} 
          />
          <CostDistributionChart 
            data={summary?.breakdowns.byFeature.slice(0, 6).map(i => ({ name: i.key, value: i.totalCostUsd || 0, count: i.requests })) || []}
            title="Costi per Feature" 
            loading={isLoading} 
          />
        </section>

        {/* EVENTS TABLE - Full width */}
        <section className="overflow-hidden border bg-theme-surface border-theme-default rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-theme-default bg-theme-subtle/20">
            <div className="flex items-center gap-3">
              <Filter size={16} className="text-theme-muted" />
              <h3 className="text-sm font-semibold text-theme-primary">Eventi AI</h3>
              <span className="text-xs text-theme-muted">
                {formatInt(events?.total || 0)} totali
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="p-1.5 rounded-lg border border-theme-default bg-theme-card hover:bg-theme-subtle disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-theme-primary min-w-[4rem] text-center">
                {page} / {events?.pages || 1}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= (events?.pages || 1) || isLoading}
                className="p-1.5 rounded-lg border border-theme-default bg-theme-card hover:bg-theme-subtle disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-theme-subtle/30 border-b border-theme-default text-left text-[11px] font-semibold text-theme-muted uppercase tracking-wider">
                  <th className="px-3 py-2 w-28">Data/Ora</th>
                  <th className="px-3 py-2">Mode/Feature</th>
                  <th className="w-32 px-3 py-2">Modello</th>
                  <th className="w-20 px-3 py-2 text-right">Prompt</th>
                  <th className="w-24 px-3 py-2 text-right">Input</th>
                  <th className="w-24 px-3 py-2 text-right">Output</th>
                  <th className="w-20 px-3 py-2 text-right">Total</th>
                  <th className="w-24 px-3 py-2 text-right">Costo</th>
                  <th className="w-24 px-3 py-2">Stato</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 rounded-full border-primary-500 border-t-transparent animate-spin" />
                        <span className="text-sm text-theme-muted">Caricamento...</span>
                      </div>
                    </td>
                  </tr>
                ) : !events?.items?.length ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-theme-muted">
                      Nessun evento trovato
                    </td>
                  </tr>
                ) : (
                  events.items.map(event => <EventRow key={event.id} event={event} />)
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AIUsageDashboardPage;
