import { useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bot, Flame, Sparkles, Sun, Target, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../shared/services/apiClient';

type InsightType = 'suggestion' | 'warning';

export interface AIInsight {
    type: InsightType;
    title: string;
    message: string;
    icon: string;
}

const normalizeInsights = (payload: unknown): AIInsight[] => {
    if (!Array.isArray(payload)) return [];

    return payload
        .filter((item) => item && typeof item === 'object')
        .map((item) => {
            const record = item as Record<string, unknown>;
            const type: InsightType = record.type === 'warning' ? 'warning' : 'suggestion';
            return {
                type,
                title: typeof record.title === 'string' ? record.title : 'Insight',
                message: typeof record.message === 'string' ? record.message : '',
                icon: typeof record.icon === 'string' ? record.icon : 'sparkles',
            };
        })
        .filter((insight) => insight.message.length > 0);
};

const getIcon = (key: string) => {
    switch (key) {
        case 'sun':
            return Sun;
        case 'target':
            return Target;
        case 'flame':
            return Flame;
        case 'warning':
            return AlertTriangle;
        default:
            return Sparkles;
    }
};

export const AIInsightsWidget = () => {
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [shouldLoad, setShouldLoad] = useState(false);

    // OTTIMIZZATO: Intersection Observer per caricare solo quando visibile
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setShouldLoad(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' } // Carica 200px prima che sia visibile
        );

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    // OTTIMIZZATO: Delay aggiuntivo per non competere con risorse critiche
    useEffect(() => {
        if (!shouldLoad) return;

        let isMounted = true;
        let timeoutId: ReturnType<typeof setTimeout>;

        const load = async () => {
            // Delay di 500ms per non competere con risorse critiche
            timeoutId = setTimeout(async () => {
                try {
                    setLoading(true);
                    setError(null);

                    const response = await apiClient.get<AIInsight[]>('/analytics/insights');
                    const normalized = normalizeInsights(response.data);

                    if (isMounted) setInsights(normalized);
                } catch {
                    if (isMounted) setError('Impossibile caricare i consigli in questo momento.');
                } finally {
                    if (isMounted) setLoading(false);
                }
            }, 500);
        };

        load();
        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [shouldLoad]);

    const content = useMemo(() => {
        if (loading) {
            return (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 animate-pulse"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-1/2 rounded bg-white/10" />
                                    <div className="h-3 w-4/5 rounded bg-white/10" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (error) {
            return (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-300 text-sm">
                    {error}
                </div>
            );
        }

        if (insights.length === 0) {
            return (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm text-white/70">
                        Nessun insight disponibile per ora. Continua così: più dati = consigli migliori.
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {insights.map((insight, index) => {
                    const Icon = getIcon(insight.icon);
                    const isWarning = insight.type === 'warning';

                    const borderClass = isWarning
                        ? 'border-amber-500/25 bg-amber-500/5'
                        : 'border-emerald-500/25 bg-emerald-500/5';

                    const iconWrapClass = isWarning ? 'bg-amber-500/15' : 'bg-emerald-500/15';
                    const iconClass = isWarning ? 'text-amber-300' : 'text-emerald-300';

                    return (
                        <motion.div
                            key={`${insight.title}-${index}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * index }}
                            className={`rounded-2xl border border-white/[0.1] p-5 backdrop-blur-sm ${borderClass}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconWrapClass}`}>
                                    <Icon className={`w-5 h-5 ${iconClass}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <h4 className="text-sm font-semibold text-white">
                                            {insight.title}
                                        </h4>
                                        <span
                                            className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                                isWarning
                                                    ? 'border-amber-500/30 text-amber-200 bg-amber-500/10'
                                                    : 'border-emerald-500/30 text-emerald-200 bg-emerald-500/10'
                                            }`}
                                        >
                                            {isWarning ? 'Warning' : 'Suggerimento'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-white/70 mt-1 leading-relaxed">
                                        {insight.message}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        );
    }, [error, insights, loading]);

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="rounded-3xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl p-6 card"
        >
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary-300" />
                    🤖 Il tuo Coach Virtuale
                </h3>
            </div>

            {content}
        </motion.div>
    );
};

export default AIInsightsWidget;
