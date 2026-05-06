import { motion } from 'framer-motion';
import { Clock, TrendingUp, Activity, Calendar } from 'lucide-react';
import type { WorkLog } from '../tracker/type';
import { useFormat } from '../../shared/hooks/useFormat';

interface QuickStatsProps {
    logs: WorkLog[];
    allLogs: WorkLog[]; // Tutti i log (per calcolare trend)
}

export const QuickStats = ({ logs, allLogs }: QuickStatsProps) => {
    const { formatHours } = useFormat();

    // Calcola statistiche correnti
    const totalHours = logs.reduce((acc, log) => {
        const start = new Date(`2000-01-01T${log.startTime}`);
        const end = new Date(`2000-01-01T${log.endTime}`);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);

    // Calcola giorni lavorati questo mese
    const uniqueDays = new Set(logs.map(l => l.date)).size;

    // Calcola media ore per giorno lavorato
    const avgHoursPerDay = uniqueDays > 0 ? totalHours / uniqueDays : 0;

    // Calcola trend rispetto al mese precedente
    const currentMonth = new Date().getMonth();
    const previousMonthLogs = allLogs.filter(log => {
        const logMonth = new Date(log.date).getMonth();
        return logMonth === currentMonth - 1;
    });
    
    const prevTotalHours = previousMonthLogs.reduce((acc, log) => {
        const start = new Date(`2000-01-01T${log.startTime}`);
        const end = new Date(`2000-01-01T${log.endTime}`);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);

    const hoursTrend = prevTotalHours > 0 
        ? ((totalHours - prevTotalHours) / prevTotalHours * 100).toFixed(0)
        : '0';

    const stats = [
        {
            label: 'Ore Totali',
            value: formatHours(totalHours),
            suffix: '',
            icon: Clock,
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-500/15 dark:bg-blue-500/12',
            iconColor: 'text-blue-700 dark:text-blue-300',
            trend: Number(hoursTrend) > 0 ? `+${hoursTrend}%` : `${hoursTrend}%`,
            trendPositive: Number(hoursTrend) >= 0
        },
        {
            label: 'Giorni Lavorati',
            value: uniqueDays.toString(),
            suffix: 'gg',
            icon: Calendar,
            color: 'from-purple-500 to-purple-600',
            bgColor: 'bg-purple-500/15 dark:bg-purple-500/12',
            iconColor: 'text-violet-700 dark:text-violet-300',
        },
        {
            label: 'Media Giornaliera',
            value: avgHoursPerDay.toFixed(1),
            suffix: 'h/gg',
            icon: Activity,
            color: 'from-amber-500 to-amber-600',
            bgColor: 'bg-amber-500/15 dark:bg-amber-500/12',
            iconColor: 'text-amber-700 dark:text-amber-300',
        }
    ];

    return (
        <div className="dashboard-widget dashboard-widget--stats grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="dashboard-widget-card dashboard-widget-card--stat relative overflow-hidden rounded-2xl border border-theme-default bg-theme-card p-4 sm:p-5 transition-all hover:bg-theme-surface hover:border-theme-strong"
                >
                    {/* Gradient accent */}
                    <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${stat.color}`} />
                    
                    {/* Icon */}
                    <div className={`dashboard-stat-icon-shell w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-2.5 sm:mb-3`}>
                        <stat.icon className={stat.iconColor} size={20} />
                    </div>
                    
                    {/* Content */}
                    <p className="dashboard-stat-label dashboard-meta-text text-xs font-semibold tracking-wide uppercase text-theme-secondary mb-1">
                        {stat.label}
                    </p>
                    <div className="flex items-baseline gap-1">
                        <span className="dashboard-stat-value text-xl sm:text-2xl font-bold text-theme-primary">{stat.value}</span>
                        {stat.suffix && (
                            <span className="dashboard-stat-suffix dashboard-meta-text text-xs sm:text-sm text-theme-secondary">{stat.suffix}</span>
                        )}
                    </div>
                    
                    {/* Trend indicator */}
                    {stat.trend && (
                        <div className={`dashboard-stat-trend dashboard-meta-text flex items-center gap-1 mt-2 text-[11px] sm:text-xs ${
                            stat.trendPositive ? 'dashboard-stat-trend--positive text-emerald-600 dark:text-emerald-400' : 'dashboard-stat-trend--negative text-rose-600 dark:text-rose-400'
                        }`}>
                            <TrendingUp size={12} className={stat.trendPositive ? '' : 'rotate-180'} />
                            <span>{stat.trend} vs mese prec.</span>
                        </div>
                    )}
                </motion.div>
            ))}
        </div>
    );
};
