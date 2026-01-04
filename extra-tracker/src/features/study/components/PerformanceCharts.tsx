/**
 * 📈 PERFORMANCE CHARTS - Grafici Temporali per Analytics
 * 
 * Mostra l'evoluzione delle performance nel tempo:
 * - Retention Rate nel tempo
 * - Carte studiate per giorno
 * - Tempo medio per carta
 */

import { useMemo } from 'react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { FiTrendingUp, FiClock, FiTarget } from 'react-icons/fi';

interface PerformanceChartsProps {
    deckId: string;
    // Dati storici (da implementare nel backend)
    historicalData?: DailyPerformance[];
}

interface DailyPerformance {
    date: string;
    retentionRate: number;
    cardsStudied: number;
    averageTime: number;
    correct: number;
    incorrect: number;
}

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ 
    deckId,
    historicalData = []
}) => {
    // Genera dati mock se non disponibili (per demo)
    const chartData = useMemo(() => {
        if (historicalData.length > 0) {
            return historicalData;
        }

        // Genera dati mock per gli ultimi 30 giorni
        const today = new Date();
        const data: DailyPerformance[] = [];
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Simula dati realistici
            const baseRetention = 0.65 + Math.random() * 0.25; // 65-90%
            const cardsStudied = Math.floor(Math.random() * 15) + 5; // 5-20 carte
            const correct = Math.floor(cardsStudied * baseRetention);
            
            data.push({
                date: dateStr,
                retentionRate: baseRetention,
                cardsStudied,
                averageTime: 15 + Math.random() * 20, // 15-35 secondi
                correct,
                incorrect: cardsStudied - correct,
            });
        }
        
        return data;
    }, [historicalData]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;

        return (
            <div className="rounded-xl border border-white/10 bg-slate-950/95 px-4 py-3 text-xs text-white shadow-xl">
                <p className="text-white/70 mb-2 font-semibold">{formatDate(label)}</p>
                {payload.map((entry: any, idx: number) => (
                    <p key={idx} style={{ color: entry.color }} className="mt-1">
                        {entry.name}: {typeof entry.value === 'number' 
                            ? entry.dataKey === 'retentionRate' 
                                ? `${(entry.value * 100).toFixed(1)}%`
                                : entry.dataKey === 'averageTime'
                                    ? `${entry.value.toFixed(1)}s`
                                    : entry.value
                            : entry.value}
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Retention Rate Trend */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <FiTrendingUp className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-semibold text-white">Retention Rate nel Tempo</h3>
                </div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                                tickFormatter={formatDate}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                                domain={[0, 1]}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="retentionRate"
                                name="Retention Rate"
                                stroke="#10b981"
                                fill="url(#retentionGradient)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Cards Studied per Giorno */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <FiTarget className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Carte Studiate per Giorno</h3>
                </div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                                tickFormatter={formatDate}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="correct" name="Corrette" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="incorrect" name="Errate" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Tempo Medio */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <FiClock className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-semibold text-white">Tempo Medio per Carta</h3>
                </div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                                tickFormatter={formatDate}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => `${value.toFixed(0)}s`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="averageTime"
                                name="Tempo Medio (s)"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={{ fill: '#f59e0b', r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
