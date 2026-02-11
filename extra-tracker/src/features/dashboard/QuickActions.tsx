import { motion } from 'framer-motion';
import { FiZap, FiCopy, FiCalendar } from 'react-icons/fi';
import type { WorkLog } from '../tracker/type';

interface QuickActionsProps {
    logs: WorkLog[];
    onDuplicate: (log: WorkLog) => void;
}

export const QuickActions = ({ logs, onDuplicate }: QuickActionsProps) => {
    // Trova gli ultimi 3 log unici
    const recentLogs = logs
        .slice()
        .reverse()
        .slice(0, 3);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="dashboard-widget dashboard-widget--actions rounded-2xl border border-theme-default bg-theme-card p-5"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="dashboard-action-icon-shell w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <FiZap className="text-amber-700 dark:text-amber-400" size={16} />
                </div>
                <div>
                    <h3 className="font-semibold text-theme-primary">Azioni Rapide</h3>
                    <p className="text-xs text-theme-secondary">Duplica i tuoi log recenti</p>
                </div>
            </div>

            {/* Recent Logs - Quick Duplicate */}
            {recentLogs.length > 0 ? (
                <div>
                    <p className="flex items-center gap-1 mb-3 text-xs font-medium text-theme-secondary">
                        <FiCalendar size={12} />
                        Duplica recenti
                    </p>
                    <div className="space-y-2">
                        {recentLogs.map(log => {
                            const start = new Date(`2000-01-01T${log.startTime}`);
                            const end = new Date(`2000-01-01T${log.endTime}`);
                            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

                            return (
                                <button
                                    key={log.id}
                                    onClick={() => onDuplicate(log)}
                                    className="dashboard-action-item w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-theme-subtle bg-theme-surface hover:bg-theme-card hover:border-theme-default transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/45 focus-visible:ring-offset-2"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="dashboard-action-avatar w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-600/30 flex items-center justify-center">
                                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                                                {log.title?.charAt(0) || 'L'}
                                            </span>
                                        </div>
                                        <div className="text-left">
                                            <p className="dashboard-action-title text-sm font-semibold text-theme-primary">{log.title || 'Log di lavoro'}</p>
                                            <p className="dashboard-action-meta text-xs text-theme-secondary">
                                                {log.startTime} - {log.endTime} ({hours.toFixed(1)}h)
                                            </p>
                                        </div>
                                    </div>
                                    <FiCopy className="dashboard-action-copy text-theme-secondary group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" size={16} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <p className="text-sm text-theme-secondary text-center py-4">
                    Nessun log recente da duplicare
                </p>
            )}
        </motion.div>
    );
};
