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
            className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <FiZap className="text-amber-400" size={16} />
                </div>
                <div>
                    <h3 className="font-semibold text-white">Azioni Rapide</h3>
                    <p className="text-xs text-white/50">Duplica i tuoi log recenti</p>
                </div>
            </div>

            {/* Recent Logs - Quick Duplicate */}
            {recentLogs.length > 0 ? (
                <div>
                    <p className="flex items-center gap-1 mb-3 text-xs font-medium text-white/60">
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
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-600/30 flex items-center justify-center">
                                            <span className="text-xs font-bold text-blue-300">
                                                {log.title?.charAt(0) || 'L'}
                                            </span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-white">{log.title || 'Log di lavoro'}</p>
                                            <p className="text-xs text-white/50">
                                                {log.startTime} - {log.endTime} ({hours.toFixed(1)}h)
                                            </p>
                                        </div>
                                    </div>
                                    <FiCopy className="text-white/30 group-hover:text-primary-400 transition-colors" size={16} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <p className="text-sm text-white/40 text-center py-4">
                    Nessun log recente da duplicare
                </p>
            )}
        </motion.div>
    );
};
