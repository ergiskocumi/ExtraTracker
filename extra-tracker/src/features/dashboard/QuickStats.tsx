import { motion } from 'framer-motion';
import { FiClock, FiTrendingUp, FiActivity, FiCalendar } from 'react-icons/fi';
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
            icon: FiClock,
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-500/10',
            iconColor: 'text-blue-400',
            trend: Number(hoursTrend) > 0 ? `+${hoursTrend}%` : `${hoursTrend}%`,
            trendPositive: Number(hoursTrend) >= 0
        },
        {
            label: 'Giorni Lavorati',
            value: uniqueDays.toString(),
            suffix: 'gg',
            icon: FiCalendar,
            color: 'from-purple-500 to-purple-600',
            bgColor: 'bg-purple-500/10',
            iconColor: 'text-purple-400',
        },
        {
            label: 'Media Giornaliera',
            value: avgHoursPerDay.toFixed(1),
            suffix: 'h/gg',
            icon: FiActivity,
            color: 'from-amber-500 to-amber-600',
            bgColor: 'bg-amber-500/10',
            iconColor: 'text-amber-400',
        }
    ];

    return (
        <div className="dashboard-widget dashboard-widget--stats grid grid-cols-2 gap-4 lg:grid-cols-3">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="dashboard-widget-card dashboard-widget-card--stat relative overflow-hidden rounded-2xl border border-theme-default bg-theme-card p-5 transition-colors hover:bg-theme-surface"
                >
                    {/* Gradient accent */}
                    <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${stat.color}`} />
                    
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-3`}>
                        <stat.icon className={stat.iconColor} size={20} />
                    </div>
                    
                    {/* Content */}
                    <p className="text-xs font-medium tracking-wide uppercase text-theme-muted mb-1">
                        {stat.label}
                    </p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-theme-primary">{stat.value}</span>
                        {stat.suffix && (
                            <span className="text-sm text-theme-muted">{stat.suffix}</span>
                        )}
                    </div>
                    
                    {/* Trend indicator */}
                    {stat.trend && (
                        <div className={`flex items-center gap-1 mt-2 text-xs ${
                            stat.trendPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                        }`}>
                            <FiTrendingUp size={12} className={stat.trendPositive ? '' : 'rotate-180'} />
                            <span>{stat.trend} vs mese prec.</span>
                        </div>
                    )}
                </motion.div>
            ))}
        </div>
    );
};
