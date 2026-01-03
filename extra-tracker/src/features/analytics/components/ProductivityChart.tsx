import type { FC } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import type { DailyActivity } from '../services/analyticsService';

interface ProductivityChartProps {
    data: DailyActivity[];
    isLoading?: boolean;
}

const CustomTooltip: FC<{
    active?: boolean;
    label?: string;
    payload?: Array<{ dataKey: string; value: number; payload: DailyActivity }>;
}> = ({ active, label, payload }) => {
    if (!active || !payload?.length) return null;

    const study = payload.find((entry) => entry.dataKey === 'study')?.value ?? 0;
    const work = payload.find((entry) => entry.dataKey === 'work')?.value ?? 0;
    const xp = payload[0]?.payload?.xp ?? 0;

    return (
        <div className="rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 text-xs text-white shadow-xl">
            <p className="text-white/70">{label}</p>
            <p className="mt-1 text-indigo-200">Studio: {study} min</p>
            <p className="text-emerald-200">Lavoro: {work} min</p>
            <p className="text-amber-200">XP: {xp}</p>
        </div>
    );
};

export const ProductivityChart: FC<ProductivityChartProps> = ({ data, isLoading }) => {
    if (isLoading) {
        return (
            <div className="h-56 w-full animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
        );
    }

    if (!data.length) {
        return (
            <div className="flex h-56 w-full items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-sm text-white/40">
                Nessun dato disponibile
            </div>
        );
    }

    return (
        <div className="h-56 w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="mb-3">
                <p className="text-sm font-semibold text-white">Studio vs Lavoro</p>
                <p className="text-xs text-white/50">Minuti per giorno</p>
            </div>
            <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="study" name="Studio" fill="#6366f1" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="work" name="Lavoro" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
