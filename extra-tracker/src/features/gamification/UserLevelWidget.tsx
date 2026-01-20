/**
 * USER LEVEL WIDGET
 *
 * Mostra livello, XP e streak.
 */

import { motion } from 'framer-motion';
import { FiZap } from 'react-icons/fi';
import { LevelBadge } from './components/LevelBadge';

interface UserLevelWidgetProps {
    avatarUrl?: string;
    displayName?: string;
    level: number;
    xp: number;
    nextLevelXp: number;
    streakCurrent: number;
    compact?: boolean;
}

export const UserLevelWidget: React.FC<UserLevelWidgetProps> = ({
    avatarUrl,
    displayName = 'Utente',
    level,
    xp,
    nextLevelXp,
    streakCurrent,
    compact = false,
}) => {
    const progress = Math.min(1, xp / Math.max(nextLevelXp, 1));

    if (compact) {
        return (
            <div className="rounded-xl border border-white/15 bg-slate-900/50 p-3 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.9)] relative overflow-hidden">
                <div className="absolute -top-6 -right-6 h-16 w-16 rotate-12 rounded-[14px] bg-white/[0.04] border border-white/10" />
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <LevelBadge level={level} size="sm" variant="icon" />
                        <div>
                            <p className="text-xs text-white/70">Livello</p>
                            <p className="text-sm font-semibold text-white">{level}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/20 border border-orange-500/30">
                        <FiZap className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-sm font-semibold text-orange-400">{streakCurrent}</span>
                    </div>
                </div>

                <div className="h-2 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress * 100}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400 shadow-lg shadow-indigo-500/20"
                    />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                    <span>{xp} XP</span>
                    <span>{nextLevelXp} XP</span>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-white/15 bg-slate-900/50 backdrop-blur-xl p-4 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.9)] relative overflow-hidden">
            <div className="absolute -top-10 -right-8 h-24 w-24 rotate-12 rounded-[18px] bg-white/[0.04] border border-white/10" />
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-white/70 text-sm font-semibold">
                            {displayName.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="flex-1">
                    <p className="text-sm text-white/70">{displayName}</p>
                    <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold text-white">Livello {level}</p>
                        <LevelBadge level={level} size="sm" variant="icon" />
                    </div>
                </div>
                <div className="flex items-center gap-1 text-orange-400 text-sm font-semibold">
                    <FiZap className="w-4 h-4" />
                    {streakCurrent}
                </div>
            </div>

            <div className="h-2 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400 shadow-lg shadow-indigo-500/20"
                />
            </div>
            <div className="mt-2 text-xs text-white/70">
                {xp} / {nextLevelXp} XP
            </div>
        </div>
    );
};

export default UserLevelWidget;
