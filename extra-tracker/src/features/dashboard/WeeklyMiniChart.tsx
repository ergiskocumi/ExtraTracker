import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import type { WorkLog } from '../tracker/type';
import { calculateDurationInHours } from '../../shared/utils/dateUtils';

interface MiniChartProps {
    logs: WorkLog[];
}

export const WeeklyMiniChart = ({ logs }: MiniChartProps) => {
    // OTTIMIZZATO: Memoizza tutti i calcoli costosi
    const { dailyData, maxHours, totalWeekHours, avgDailyHours } = useMemo(() => {
        // Calcola ore per gli ultimi 7 giorni
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toISOString().split('T')[0];
        });

        const dailyData = last7Days.map(dateStr => {
            const dayLogs = logs.filter(l => l.date === dateStr);
            const hours = dayLogs.reduce((acc, log) => {
                return acc + calculateDurationInHours(log.startTime, log.endTime);
            }, 0);

            return {
                date: dateStr,
                dayName: new Date(dateStr).toLocaleDateString('it-IT', { weekday: 'short' }),
                hours
            };
        });

        const maxHours = Math.max(...dailyData.map(d => d.hours), 1);
        const totalWeekHours = dailyData.reduce((acc, d) => acc + d.hours, 0);
        const avgDailyHours = totalWeekHours / 7;

        return { dailyData, maxHours, totalWeekHours, avgDailyHours };
    }, [logs]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="dashboard-widget dashboard-widget--chart rounded-2xl border border-theme-default bg-theme-card p-4 sm:p-5"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3.5 sm:mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                        <TrendingUp className="text-primary-700 dark:text-primary-400" size={16} />
                    </div>
                    <div>
                        <h3 className="dashboard-widget-title font-semibold text-theme-primary">Ultimi 7 Giorni</h3>
                        <p className="dashboard-widget-caption dashboard-caption-text text-xs text-theme-secondary">Andamento ore lavorate</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-base sm:text-lg font-bold text-theme-primary">{totalWeekHours.toFixed(1)}h</p>
                    <p className="dashboard-meta-text text-xs text-theme-secondary">totale</p>
                </div>
            </div>

            {/* Mini Bar Chart */}
            <div className="flex items-end justify-between gap-2 h-24 mb-2.5 sm:mb-3">
                {dailyData.map((day, index) => {
                    const heightPercent = maxHours > 0 ? (day.hours / maxHours) * 100 : 0;
                    const isToday = index === 6;
                    
                    return (
                        <div key={day.date} className="flex-1 flex flex-col items-center">
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${heightPercent}%` }}
                                transition={{ delay: 0.3 + index * 0.05, duration: 0.5 }}
                                className={`dashboard-chart-bar w-full rounded-t-lg relative group cursor-pointer ${
                                    isToday
                                        ? 'dashboard-chart-bar--today bg-gradient-to-t from-primary-600 to-primary-400'
                                        : day.hours > 0
                                            ? 'dashboard-chart-bar--value bg-gradient-to-t from-primary-500/45 to-primary-400/60'
                                            : 'dashboard-chart-bar--empty bg-theme-surface'
                                }`}
                                style={{ minHeight: day.hours > 0 ? '8px' : '4px' }}
                            >
                                {/* Tooltip */}
                                <div className="dashboard-chart-tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-theme-default bg-theme-elevated shadow-theme-md">
                                    <p className="font-semibold text-theme-primary">{day.hours.toFixed(1)}h</p>
                                </div>
                            </motion.div>
                        </div>
                    );
                })}
            </div>

            {/* Day Labels */}
            <div className="flex justify-between gap-2">
                {dailyData.map((day, index) => {
                    const isToday = index === 6;
                    return (
                        <div key={day.date} className="flex-1 text-center">
                            <p className={`dashboard-chart-day-label dashboard-meta-text text-[11px] sm:text-xs capitalize ${
                                isToday ? 'text-primary-700 dark:text-primary-400 font-semibold' : 'text-theme-secondary'
                            }`}>
                                {day.dayName}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Average Line Indicator */}
            <div className="mt-3.5 sm:mt-4 pt-3 border-t border-theme-default">
                <div className="flex items-center justify-between">
                    <span className="dashboard-meta-text text-xs text-theme-secondary">Media giornaliera</span>
                    <span className="text-sm font-semibold text-theme-primary">{avgDailyHours.toFixed(1)}h</span>
                </div>
            </div>
        </motion.div>
    );
};
