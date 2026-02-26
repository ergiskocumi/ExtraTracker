import { CheckCircle, Clock, Loader2, MessageSquare } from 'lucide-react';
import type { FeedbackStats } from '../../types';

interface AdminFeedbackStatsProps {
    stats: FeedbackStats | null;
    isLoading: boolean;
}

export const AdminFeedbackStats: React.FC<AdminFeedbackStatsProps> = ({
    stats,
    isLoading,
}) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
            <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-blue-500/20 blur-2xl dark:bg-blue-500/15" />
            <div className="relative flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/15 dark:bg-blue-500/15">
                    <MessageSquare className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                    <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                        {isLoading ? '-' : stats?.total || 0}
                    </p>
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-white/40">
                        Totale
                    </p>
                </div>
            </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
            <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-yellow-500/20 blur-2xl dark:bg-yellow-500/15" />
            <div className="relative flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-500/15 dark:bg-yellow-500/15">
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                    <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                        {isLoading ? '-' : stats?.byStatus?.open || 0}
                    </p>
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-white/40">
                        Aperti
                    </p>
                </div>
            </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
            <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-purple-500/20 blur-2xl dark:bg-purple-500/15" />
            <div className="relative flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/15 dark:bg-purple-500/15">
                    <Loader2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                    <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                        {isLoading ? '-' : stats?.byStatus?.in_progress || 0}
                    </p>
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-white/40">
                        In lavorazione
                    </p>
                </div>
            </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
            <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-emerald-500/20 blur-2xl dark:bg-emerald-500/15" />
            <div className="relative flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/15">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                        {isLoading ? '-' : stats?.byStatus?.resolved || 0}
                    </p>
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-white/40">
                        Risolti
                    </p>
                </div>
            </div>
        </div>
    </div>
);

