/**
 * RANK BADGE
 *
 * Badge visivo per i rank della gamification con stile geometrico.
 */

import { memo } from 'react';

type RankSize = 'sm' | 'md' | 'lg';
type RankVariant = 'icon' | 'pill';

interface RankBadgeProps {
    rank: string;
    size?: RankSize;
    variant?: RankVariant;
    className?: string;
}

type RankKey = 'unranked' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';

const normalizeRank = (rank: string): RankKey => {
    const key = rank.trim().toLowerCase();
    if (key.includes('bronze')) return 'bronze';
    if (key.includes('silver')) return 'silver';
    if (key.includes('gold')) return 'gold';
    if (key.includes('platinum')) return 'platinum';
    if (key.includes('diamond')) return 'diamond';
    if (key.includes('master')) return 'master';
    return 'unranked';
};

const rankConfig: Record<RankKey, { label: string; gradient: string; border: string; glow: string }> = {
    unranked: {
        label: 'Unranked',
        gradient: 'from-slate-500 to-slate-600',
        border: 'border-slate-400/30',
        glow: 'shadow-slate-500/20',
    },
    bronze: {
        label: 'Bronze',
        gradient: 'from-amber-700 to-orange-700',
        border: 'border-amber-500/30',
        glow: 'shadow-amber-500/25',
    },
    silver: {
        label: 'Silver',
        gradient: 'from-slate-300 to-slate-500',
        border: 'border-slate-300/40',
        glow: 'shadow-slate-300/30',
    },
    gold: {
        label: 'Gold',
        gradient: 'from-yellow-300 to-amber-500',
        border: 'border-amber-300/40',
        glow: 'shadow-amber-300/30',
    },
    platinum: {
        label: 'Platinum',
        gradient: 'from-cyan-300 to-blue-500',
        border: 'border-cyan-300/40',
        glow: 'shadow-cyan-300/30',
    },
    diamond: {
        label: 'Diamond',
        gradient: 'from-sky-300 to-indigo-500',
        border: 'border-sky-300/40',
        glow: 'shadow-sky-300/30',
    },
    master: {
        label: 'Master',
        gradient: 'from-rose-400 to-orange-500',
        border: 'border-rose-400/40',
        glow: 'shadow-rose-400/30',
    },
};

const sizeConfig: Record<RankSize, { container: string; icon: string; text: string }> = {
    sm: { container: 'h-7 px-2.5', icon: 'w-4 h-4', text: 'text-[10px]' },
    md: { container: 'h-8 px-3', icon: 'w-5 h-5', text: 'text-xs' },
    lg: { container: 'h-10 px-4', icon: 'w-6 h-6', text: 'text-sm' },
};

const RankGlyph = ({ rankKey, className }: { rankKey: RankKey; className: string }) => {
    switch (rankKey) {
        case 'bronze':
            return (
                <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
                    <path
                        d="M12 2l7 4v6c0 4.2-3.1 7.6-7 8-3.9-.4-7-3.8-7-8V6l7-4z"
                        fill="currentColor"
                    />
                </svg>
            );
        case 'silver':
            return (
                <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
                    <path
                        d="M12 2l8 10-8 10-8-10 8-10z"
                        fill="currentColor"
                    />
                </svg>
            );
        case 'gold':
            return (
                <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
                    <path
                        d="M4 9l4-5 4 5 4-5 4 5-2 11H6L4 9z"
                        fill="currentColor"
                    />
                </svg>
            );
        case 'platinum':
            return (
                <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
                    <path
                        d="M12 3l2.6 5.3 5.9.9-4.3 4.2 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.2 5.9-.9L12 3z"
                        fill="currentColor"
                    />
                </svg>
            );
        case 'diamond':
            return (
                <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
                    <path
                        d="M3 9l3-4h12l3 4-9 11L3 9z"
                        fill="currentColor"
                    />
                </svg>
            );
        case 'master':
            return (
                <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
                    <path
                        d="M12 2l2.2 4.5L19 8l-3.6 3.5.9 5.5L12 14.7 7.7 17l.9-5.5L5 8l4.8-1.5L12 2z"
                        fill="currentColor"
                    />
                </svg>
            );
        default:
            return (
                <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
                    <path
                        d="M12 3l7 4v8l-7 4-7-4V7l7-4z"
                        fill="currentColor"
                    />
                </svg>
            );
    }
};

export const RankBadge = memo(
    ({ rank, size = 'md', variant = 'pill', className = '' }: RankBadgeProps) => {
        const rankKey = normalizeRank(rank);
        const cfg = rankConfig[rankKey];
        const sizes = sizeConfig[size];

        if (variant === 'icon') {
            return (
                <div
                    className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${cfg.gradient} ${cfg.border} border shadow-lg ${cfg.glow} ${sizes.container} ${className}`}
                    title={cfg.label}
                >
                    <RankGlyph rankKey={rankKey} className={`${sizes.icon} text-white`} />
                </div>
            );
        }

        return (
            <div
                className={`inline-flex items-center gap-2 rounded-xl border ${cfg.border} bg-gradient-to-br ${cfg.gradient} ${sizes.container} shadow-lg ${cfg.glow} ${className}`}
                title={cfg.label}
            >
                <RankGlyph rankKey={rankKey} className={`${sizes.icon} text-white`} />
                <span className={`font-semibold text-white/95 uppercase tracking-[0.18em] ${sizes.text}`}>
                    {cfg.label}
                </span>
            </div>
        );
    }
);

RankBadge.displayName = 'RankBadge';

export default RankBadge;
