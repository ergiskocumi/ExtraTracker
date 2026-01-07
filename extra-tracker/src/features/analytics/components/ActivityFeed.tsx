import type { FC } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS, es, fr, it } from 'date-fns/locale';
import { Brain, Briefcase, Rocket, Sparkles, Target } from 'lucide-react';

import { useFormat } from '../../../shared/hooks/useFormat';
import type { RecentActivity } from '../services/analyticsService';

interface ActivityFeedProps {
    items: RecentActivity[];
    isLoading?: boolean;
}

const localeMap = {
    it,
    en: enUS,
    es,
    de,
    fr,
};

const getActivityTitle = (item: RecentActivity) => {
    if (item.title) return item.title;

    if (item.type === 'SESSION_COMPLETE') {
        return `Sessione ${item.mode || 'studio'}`;
    }

    if (item.type.startsWith('GOAL_')) {
        if (item.type === 'GOAL_CREATED') return 'Goal creato';
        if (item.type === 'GOAL_COMPLETED') return 'Goal completato';
        return 'Goal archiviato';
    }

    if (item.type.startsWith('PROJECT_')) {
        if (item.type === 'PROJECT_CREATED') return 'Nuovo progetto';
        return 'Progetto completato';
    }

    if (item.type.startsWith('WORK_')) {
        return 'Sessione di lavoro';
    }

    if (item.type.startsWith('HABIT_')) {
        return 'Check-in abitudine';
    }

    return 'Attivita';
};

const getActivityMeta = (item: RecentActivity) => {
    const parts: string[] = [];
    if (item.mode) parts.push(item.mode);
    if (typeof item.xp === 'number') parts.push(`+${item.xp} XP`);
    return parts.join(' | ');
};

const getIconConfig = (type: string) => {
    if (type.startsWith('GOAL_')) {
        return { Icon: Target, className: 'text-rose-300' };
    }
    if (type.startsWith('PROJECT_')) {
        return { Icon: Rocket, className: 'text-sky-300' };
    }
    if (type === 'SESSION_COMPLETE') {
        return { Icon: Brain, className: 'text-indigo-300' };
    }
    if (type.startsWith('WORK_')) {
        return { Icon: Briefcase, className: 'text-emerald-300' };
    }
    return { Icon: Sparkles, className: 'text-white/70' };
};

export const ActivityFeed: FC<ActivityFeedProps> = ({ items, isLoading }) => {
    const { language } = useFormat();
    const locale = localeMap[language as keyof typeof localeMap] || it;

    if (isLoading) {
        return (
            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                <div className="space-y-2">
                    <div className="h-14 rounded-xl bg-white/5" />
                    <div className="h-14 rounded-xl bg-white/5" />
                    <div className="h-14 rounded-xl bg-white/5" />
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="mb-3">
                <p className="text-sm font-semibold text-white">Attivita recenti</p>
                <p className="text-xs text-white/50">Ultimi eventi registrati</p>
            </div>

            {items.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-white/40">
                    Nessuna attivita recente
                </div>
            ) : (
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {items.map((item) => {
                        const { Icon, className } = getIconConfig(item.type);
                        const relativeTime = formatDistanceToNow(new Date(item.date), {
                            addSuffix: true,
                            locale,
                        });
                        const meta = getActivityMeta(item);

                        return (
                            <div
                                key={item.id}
                                className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2"
                            >
                                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
                                    <Icon className={className} size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white">{getActivityTitle(item)}</p>
                                    {meta && <p className="text-xs text-white/50">{meta}</p>}
                                </div>
                                <span className="text-xs text-white/40">{relativeTime}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
