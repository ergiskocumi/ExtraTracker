import { useEffect, useMemo, useState } from 'react';
import { aiUsageDashboardService, type AIUsageSummary, type AIUsageEventsResponse, type AIUsageBreakdownItem } from '../services/aiUsageDashboardService';

const CURRENCY_FORMATTER = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
});

const INTEGER_FORMATTER = new Intl.NumberFormat('it-IT');

const formatInt = (value: number) => INTEGER_FORMATTER.format(value || 0);
const formatUsd = (value: number) => CURRENCY_FORMATTER.format(value || 0);
const formatDateTime = (value: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const BreakdownTable = ({ title, items }: { title: string; items: AIUsageBreakdownItem[] }) => (
    <div className="rounded-2xl border border-theme-default bg-theme-surface p-4 sm:p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-theme-muted mb-3">{title}</h3>
        <div className="space-y-2">
            {items.length === 0 && (
                <p className="text-sm text-theme-muted">Nessun dato</p>
            )}
            {items.slice(0, 8).map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-xl border border-theme-subtle bg-theme-card px-3 py-2">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-theme-primary">{item.key || 'unknown'}</p>
                        <p className="text-xs text-theme-secondary">{formatInt(item.requests)} richieste</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-semibold text-theme-primary">{formatInt(item.totalTokens || 0)} tok</p>
                        <p className="text-xs text-theme-secondary">{formatUsd(item.totalCostUsd || 0)}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const AIUsageDashboardPage = () => {
    const [days, setDays] = useState<number>(30);
    const [status, setStatus] = useState<string>('');
    const [page, setPage] = useState<number>(1);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [summary, setSummary] = useState<AIUsageSummary | null>(null);
    const [events, setEvents] = useState<AIUsageEventsResponse | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setError('');

            try {
                const [summaryData, eventsData] = await Promise.all([
                    aiUsageDashboardService.getSummary({ days }),
                    aiUsageDashboardService.getEvents({ days, status, page, pageSize: 25 }),
                ]);

                if (cancelled) return;
                setSummary(summaryData);
                setEvents(eventsData);
            } catch (err) {
                if (!cancelled) {
                    setError('Impossibile caricare la dashboard AI usage.');
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [days, status, page]);

    useEffect(() => {
        setPage(1);
    }, [days, status]);

    const errorRate = useMemo(() => {
        if (!summary?.totals?.requests) return 0;
        return (summary.totals.failedRequests / summary.totals.requests) * 100;
    }, [summary]);

    return (
        <div className="space-y-6">
            <section className="rounded-3xl border border-theme-default bg-theme-surface p-5 sm:p-7 shadow-theme-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary tracking-tight">AI Usage Dashboard</h1>
                        <p className="text-sm sm:text-base text-theme-secondary mt-1">
                            Monitoraggio completo di prompt, token, costi e errori AI.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        <label className="text-xs text-theme-muted uppercase tracking-wider">
                            Giorni
                            <select
                                value={days}
                                onChange={(e) => setDays(Number(e.target.value))}
                                className="ml-2 rounded-lg border border-theme-default bg-theme-card px-2 py-1 text-sm text-theme-primary"
                            >
                                <option value={7}>7</option>
                                <option value={30}>30</option>
                                <option value={90}>90</option>
                            </select>
                        </label>

                        <label className="text-xs text-theme-muted uppercase tracking-wider">
                            Stato
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="ml-2 rounded-lg border border-theme-default bg-theme-card px-2 py-1 text-sm text-theme-primary"
                            >
                                <option value="">Tutti</option>
                                <option value="success">Success</option>
                                <option value="error">Error</option>
                            </select>
                        </label>
                    </div>
                </div>
            </section>

            {error && (
                <section className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </section>
            )}

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
                <div className="rounded-2xl border border-theme-default bg-theme-surface p-4">
                    <p className="text-xs uppercase tracking-wider text-theme-muted">Richieste</p>
                    <p className="mt-1 text-2xl font-bold text-theme-primary">{formatInt(summary?.totals.requests || 0)}</p>
                </div>
                <div className="rounded-2xl border border-theme-default bg-theme-surface p-4">
                    <p className="text-xs uppercase tracking-wider text-theme-muted">Token Totali</p>
                    <p className="mt-1 text-2xl font-bold text-theme-primary">{formatInt(summary?.totals.totalTokens || 0)}</p>
                </div>
                <div className="rounded-2xl border border-theme-default bg-theme-surface p-4">
                    <p className="text-xs uppercase tracking-wider text-theme-muted">Costo Totale</p>
                    <p className="mt-1 text-2xl font-bold text-theme-primary">{formatUsd(summary?.totals.totalCostUsd || 0)}</p>
                </div>
                <div className="rounded-2xl border border-theme-default bg-theme-surface p-4">
                    <p className="text-xs uppercase tracking-wider text-theme-muted">Prompt Chars</p>
                    <p className="mt-1 text-2xl font-bold text-theme-primary">{formatInt(summary?.totals.promptChars || 0)}</p>
                </div>
                <div className="rounded-2xl border border-theme-default bg-theme-surface p-4">
                    <p className="text-xs uppercase tracking-wider text-theme-muted">Error Rate</p>
                    <p className="mt-1 text-2xl font-bold text-theme-primary">{errorRate.toFixed(1)}%</p>
                </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <BreakdownTable title="Per Mode" items={summary?.breakdowns.byMode || []} />
                <BreakdownTable title="Per Feature" items={summary?.breakdowns.byFeature || []} />
                <BreakdownTable title="Per Model" items={summary?.breakdowns.byModel || []} />
            </section>

            <section className="rounded-2xl border border-theme-default bg-theme-surface p-4 sm:p-5 overflow-auto">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-theme-muted">Eventi AI (ultimi)</h2>
                    <p className="text-xs text-theme-secondary">Pagina {events?.page || 1} / {events?.pages || 1}</p>
                </div>

                {isLoading && <p className="text-sm text-theme-muted">Caricamento...</p>}
                {!isLoading && (!events || events.items.length === 0) && (
                    <p className="text-sm text-theme-muted">Nessun evento nel periodo selezionato.</p>
                )}

                {!isLoading && events && events.items.length > 0 && (
                    <>
                        <table className="w-full min-w-[980px] text-sm">
                            <thead>
                                <tr className="text-left border-b border-theme-subtle text-theme-muted uppercase text-[11px] tracking-wider">
                                    <th className="py-2 pr-3">Quando</th>
                                    <th className="py-2 pr-3">Mode/Feature</th>
                                    <th className="py-2 pr-3">Model</th>
                                    <th className="py-2 pr-3">Prompt</th>
                                    <th className="py-2 pr-3">Input</th>
                                    <th className="py-2 pr-3">Output</th>
                                    <th className="py-2 pr-3">Tot</th>
                                    <th className="py-2 pr-3">Costo</th>
                                    <th className="py-2 pr-3">Stato</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.items.map((item) => (
                                    <tr key={item.id} className="border-b border-theme-subtle/70 text-theme-primary">
                                        <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(item.createdAt)}</td>
                                        <td className="py-2 pr-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{item.mode}</span>
                                                <span className="text-xs text-theme-secondary">{item.feature}</span>
                                            </div>
                                        </td>
                                        <td className="py-2 pr-3 whitespace-nowrap">{item.model || '-'}</td>
                                        <td className="py-2 pr-3">{formatInt(item.promptLengthChars)}</td>
                                        <td className="py-2 pr-3">{formatInt(item.inputTokens)}</td>
                                        <td className="py-2 pr-3">{formatInt(item.outputTokens)}</td>
                                        <td className="py-2 pr-3">{formatInt(item.totalTokens)}</td>
                                        <td className="py-2 pr-3">
                                            <div className="flex flex-col">
                                                <span>{formatUsd(item.totalCostUsd)}</span>
                                                {item.costEstimated && (
                                                    <span className="text-[11px] text-theme-secondary">stimato</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-2 pr-3">
                                            <span className={item.status === 'error' ? 'text-red-400' : 'text-emerald-400'}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                disabled={(events.page || 1) <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="rounded-lg border border-theme-default px-3 py-1 text-sm text-theme-primary disabled:opacity-50"
                            >
                                Precedente
                            </button>
                            <button
                                type="button"
                                disabled={(events.page || 1) >= (events.pages || 1)}
                                onClick={() => setPage((p) => p + 1)}
                                className="rounded-lg border border-theme-default px-3 py-1 text-sm text-theme-primary disabled:opacity-50"
                            >
                                Successiva
                            </button>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

export default AIUsageDashboardPage;
