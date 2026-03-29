import { useMemo, useState } from 'react';
import {
  Activity, Euro, Hash, FileText, AlertTriangle,
  TrendingDown, RotateCw, BarChart3, Zap, Filter,
  ChevronLeft, ChevronRight, Download,
} from 'lucide-react';
import { useAIUsageData } from '../hooks/useAIUsageData';
import { StatCard } from '../components/ai-usage/StatCard';
import { TokenTrendChart } from '../components/ai-usage/TokenTrendChart';
import { CostDistributionChart } from '../components/ai-usage/CostDistributionChart';
import { EventRow } from '../components/ai-usage/EventRow';
import { formatInt, formatCompact, formatEurCompact } from '../utils/aiUsageFormatters';
import { cn } from '../../../lib/utils';

export const AIUsageDashboardPage = () => {
  const [days, setDays] = useState<number>(30);
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const { isLoading, error, summary, events, refetch } = useAIUsageData(days, status, page);

  const stats = useMemo(() => {
    if (!summary) return null;
    const errorRate = summary.totals.requests
      ? (summary.totals.failedRequests / summary.totals.requests) * 100
      : 0;
    const avgCost = summary.totals.requests
      ? summary.totals.totalCostUsd / summary.totals.requests
      : 0;
    const ioRatio = summary.totals.inputTokens
      ? summary.totals.outputTokens / summary.totals.inputTokens
      : 0;
    return { errorRate, avgCost, ioRatio };
  }, [summary]);

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
      {/* TOP TOOLBAR */}
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
            <div className="flex items-center bg-theme-card rounded-lg border border-theme-default p-0.5">
              {[7, 30, 90].map(d => (
                <button
                  key={d}
                  onClick={() => { setDays(d); setPage(1); }}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                    days === d ? 'bg-primary-600 text-white' : 'text-theme-secondary hover:text-theme-primary'
                  )}
                >
                  {d}g
                </button>
              ))}
            </div>

            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="bg-theme-card border border-theme-default rounded-lg px-3 py-1.5 text-xs text-theme-primary focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tutti</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>

            <button
              onClick={refetch}
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

      <main className="p-4 space-y-6 lg:p-6">
        {/* ERROR STATE */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertTriangle size={16} />
            <span className="text-sm">{error}</span>
            <button onClick={refetch} className="ml-auto text-xs underline hover:no-underline">Riprova</button>
          </div>
        )}

        {/* STATS GRID */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard title="Richieste Totali" value={formatInt(summary?.totals.requests || 0)} subvalue={`${formatInt(summary?.totals.successRequests || 0)} ok`} icon={<Activity size={18} />} color="blue" loading={isLoading} />
          <StatCard title="Costo Totale" value={formatEurCompact(summary?.totals.totalCostUsd || 0)} subvalue={`avg ${formatEurCompact(stats?.avgCost || 0)}/req`} icon={<Euro size={18} />} color="amber" loading={isLoading} />
          <StatCard title="Input Tokens" value={formatCompact(summary?.totals.inputTokens || 0)} subvalue="tokens in ingresso" icon={<Hash size={18} />} color="blue" loading={isLoading} />
          <StatCard title="Output Tokens" value={formatCompact(summary?.totals.outputTokens || 0)} subvalue={`ratio ${(stats?.ioRatio || 0).toFixed(2)}x`} icon={<Zap size={18} />} color="green" loading={isLoading} />
          <StatCard title="Prompt Chars" value={formatCompact(summary?.totals.promptChars || 0)} subvalue="caratteri totali" icon={<FileText size={18} />} color="purple" loading={isLoading} />
          <StatCard title="Error Rate" value={`${(stats?.errorRate || 0).toFixed(1)}%`} subvalue={`${Math.round(summary?.totals.avgLatencyMs || 0)}ms avg`} icon={<TrendingDown size={18} />} color={(stats?.errorRate || 0) > 5 ? 'red' : 'green'} loading={isLoading} />
        </section>

        {/* CHARTS */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TokenTrendChart data={summary?.daily || []} loading={isLoading} />
          </div>
          <CostDistributionChart data={costByModel} title="Costi per Modello" loading={isLoading} />
        </section>

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

        {/* EVENTS TABLE */}
        <section className="overflow-hidden border bg-theme-surface border-theme-default rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-theme-default bg-theme-subtle/20">
            <div className="flex items-center gap-3">
              <Filter size={16} className="text-theme-muted" />
              <h3 className="text-sm font-semibold text-theme-primary">Eventi AI</h3>
              <span className="text-xs text-theme-muted">{formatInt(events?.total || 0)} totali</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || isLoading} className="p-1.5 rounded-lg border border-theme-default bg-theme-card hover:bg-theme-subtle disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-theme-primary min-w-[4rem] text-center">{page} / {events?.pages || 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= (events?.pages || 1) || isLoading} className="p-1.5 rounded-lg border border-theme-default bg-theme-card hover:bg-theme-subtle disabled:opacity-50">
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
