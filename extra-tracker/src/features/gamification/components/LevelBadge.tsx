/**
 * LEVEL BADGE
 *
 * Badge per i 30 livelli con stile geometrico brillante.
 */

import { memo } from 'react';

type LevelBadgeSize = 'sm' | 'md' | 'lg';
type LevelBadgeVariant = 'icon' | 'pill';

interface LevelBadgeProps {
    level: number;
    title?: string;
    size?: LevelBadgeSize;
    variant?: LevelBadgeVariant;
    className?: string;
}

const sizeConfig: Record<LevelBadgeSize, { container: string; icon: string; text: string }> = {
    sm: { container: 'h-7 px-2.5', icon: 'w-4 h-4', text: 'text-[10px]' },
    md: { container: 'h-8 px-3', icon: 'w-5 h-5', text: 'text-xs' },
    lg: { container: 'h-10 px-4', icon: 'w-6 h-6', text: 'text-sm' },
};

const levelStyles: Array<{ gradient: string; border: string; glow: string }> = [
    { gradient: 'from-slate-500 to-slate-700', border: 'border-slate-400/40', glow: 'shadow-slate-500/25' }, // 1
    { gradient: 'from-blue-500 to-indigo-600', border: 'border-blue-400/40', glow: 'shadow-blue-500/25' }, // 2
    { gradient: 'from-emerald-500 to-teal-600', border: 'border-emerald-400/40', glow: 'shadow-emerald-500/25' }, // 3
    { gradient: 'from-cyan-400 to-sky-600', border: 'border-cyan-300/40', glow: 'shadow-cyan-400/25' }, // 4
    { gradient: 'from-violet-500 to-purple-600', border: 'border-violet-400/40', glow: 'shadow-violet-500/25' }, // 5
    { gradient: 'from-amber-500 to-orange-600', border: 'border-amber-400/40', glow: 'shadow-amber-500/25' }, // 6
    { gradient: 'from-rose-500 to-pink-600', border: 'border-rose-400/40', glow: 'shadow-rose-500/25' }, // 7
    { gradient: 'from-lime-500 to-emerald-600', border: 'border-lime-400/40', glow: 'shadow-lime-500/25' }, // 8
    { gradient: 'from-indigo-500 to-sky-600', border: 'border-indigo-400/40', glow: 'shadow-indigo-500/25' }, // 9
    { gradient: 'from-fuchsia-500 to-rose-600', border: 'border-fuchsia-400/40', glow: 'shadow-fuchsia-500/25' }, // 10
    { gradient: 'from-teal-500 to-cyan-600', border: 'border-teal-400/40', glow: 'shadow-teal-500/25' }, // 11
    { gradient: 'from-orange-500 to-amber-600', border: 'border-orange-400/40', glow: 'shadow-orange-500/25' }, // 12
    { gradient: 'from-purple-500 to-indigo-600', border: 'border-purple-400/40', glow: 'shadow-purple-500/25' }, // 13
    { gradient: 'from-sky-500 to-blue-600', border: 'border-sky-400/40', glow: 'shadow-sky-500/25' }, // 14
    { gradient: 'from-emerald-500 to-green-700', border: 'border-emerald-400/40', glow: 'shadow-emerald-500/25' }, // 15
    { gradient: 'from-amber-400 to-yellow-500', border: 'border-amber-300/50', glow: 'shadow-amber-400/30' }, // 16
    { gradient: 'from-rose-500 to-red-600', border: 'border-rose-400/40', glow: 'shadow-rose-500/25' }, // 17
    { gradient: 'from-cyan-500 to-blue-700', border: 'border-cyan-400/40', glow: 'shadow-cyan-500/25' }, // 18
    { gradient: 'from-violet-500 to-fuchsia-600', border: 'border-violet-400/40', glow: 'shadow-violet-500/25' }, // 19
    { gradient: 'from-emerald-400 to-teal-500', border: 'border-emerald-300/50', glow: 'shadow-emerald-400/30' }, // 20
    { gradient: 'from-indigo-400 to-purple-500', border: 'border-indigo-300/50', glow: 'shadow-indigo-400/30' }, // 21
    { gradient: 'from-sky-400 to-cyan-500', border: 'border-sky-300/50', glow: 'shadow-sky-400/30' }, // 22
    { gradient: 'from-amber-500 to-rose-500', border: 'border-amber-400/40', glow: 'shadow-amber-500/25' }, // 23
    { gradient: 'from-teal-400 to-emerald-500', border: 'border-teal-300/50', glow: 'shadow-teal-400/30' }, // 24
    { gradient: 'from-purple-500 to-violet-700', border: 'border-purple-400/40', glow: 'shadow-purple-500/25' }, // 25
    { gradient: 'from-cyan-400 to-indigo-600', border: 'border-cyan-300/50', glow: 'shadow-cyan-400/30' }, // 26
    { gradient: 'from-rose-400 to-orange-600', border: 'border-rose-300/50', glow: 'shadow-rose-400/30' }, // 27
    { gradient: 'from-blue-500 to-violet-700', border: 'border-blue-400/40', glow: 'shadow-blue-500/25' }, // 28
    { gradient: 'from-emerald-400 to-lime-500', border: 'border-emerald-300/50', glow: 'shadow-emerald-400/30' }, // 29
    { gradient: 'from-amber-400 via-yellow-500 to-orange-600', border: 'border-amber-300/60', glow: 'shadow-amber-400/35' }, // 30
];

const glyphs = [
    (className: string) => (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path d="M12 2l7 4v6c0 4.2-3.1 7.6-7 8-3.9-.4-7-3.8-7-8V6l7-4z" fill="currentColor" />
        </svg>
    ),
    (className: string) => (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path d="M12 2l8 10-8 10-8-10 8-10z" fill="currentColor" />
        </svg>
    ),
    (className: string) => (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path d="M4 9l4-5 4 5 4-5 4 5-2 11H6L4 9z" fill="currentColor" />
        </svg>
    ),
    (className: string) => (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path d="M12 3l2.6 5.3 5.9.9-4.3 4.2 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.2 5.9-.9L12 3z" fill="currentColor" />
        </svg>
    ),
    (className: string) => (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path d="M3 9l3-4h12l3 4-9 11L3 9z" fill="currentColor" />
        </svg>
    ),
    (className: string) => (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path d="M12 2l2.2 4.5L19 8l-3.6 3.5.9 5.5L12 14.7 7.7 17l.9-5.5L5 8l4.8-1.5L12 2z" fill="currentColor" />
        </svg>
    ),
];

export const LevelBadge = memo(
    ({ level, title, size = 'md', variant = 'pill', className = '' }: LevelBadgeProps) => {
        const safeLevel = Math.min(Math.max(level, 1), 30);
        const styles = levelStyles[safeLevel - 1];
        const sizes = sizeConfig[size];
        const glyph = glyphs[(safeLevel - 1) % glyphs.length];
        const badgeTitle = title || `Livello ${safeLevel}`;

        if (variant === 'icon') {
            return (
                <div
                    className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${styles.gradient} ${styles.border} border shadow-lg ${styles.glow} ${sizes.container} relative overflow-hidden ${className}`}
                    title={badgeTitle}
                >
                    <div className="absolute inset-0 opacity-25">
                        <div className="absolute -top-3 -right-3 h-8 w-8 rotate-12 rounded-[10px] bg-white/30" />
                        <div className="absolute -bottom-3 -left-3 h-8 w-8 -rotate-12 rounded-[10px] bg-white/20" />
                    </div>
                    <span className="relative z-10 text-[11px] font-bold text-white">{safeLevel}</span>
                </div>
            );
        }

        return (
            <div
                className={`inline-flex items-center gap-2 rounded-xl border ${styles.border} bg-gradient-to-br ${styles.gradient} ${sizes.container} shadow-lg ${styles.glow} relative overflow-hidden ${className}`}
                title={badgeTitle}
            >
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute -top-3 -right-3 h-8 w-8 rotate-12 rounded-[10px] bg-white/30" />
                    <div className="absolute -bottom-3 -left-3 h-8 w-8 -rotate-12 rounded-[10px] bg-white/20" />
                </div>
                <div className="relative z-10 flex items-center gap-2">
                    {glyph(`${sizes.icon} text-white`)}
                    <span className={`font-semibold text-white/95 uppercase tracking-[0.18em] ${sizes.text}`}>
                        Lv {safeLevel}
                    </span>
                </div>
            </div>
        );
    }
);

LevelBadge.displayName = 'LevelBadge';

export default LevelBadge;
