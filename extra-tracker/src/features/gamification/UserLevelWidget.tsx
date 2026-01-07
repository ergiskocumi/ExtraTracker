/**
 * USER LEVEL WIDGET
 *
 * Mostra livello, XP e streak.
 */

import { motion } from 'framer-motion';
import { FiZap } from 'react-icons/fi';

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
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">L{level}</span>
                        </div>
                        <div>
                            <p className="text-xs text-white/50">Livello</p>
                            <p className="text-sm font-semibold text-white">{level}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/20">
                        <FiZap className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-sm font-semibold text-orange-400">{streakCurrent}</span>
                    </div>
                </div>

                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress * 100}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400"
                    />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-white/50">
                    <span>{xp} XP</span>
                    <span>{nextLevelXp} XP</span>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-white/60 text-sm font-semibold">
                            {displayName.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="flex-1">
                    <p className="text-sm text-white/60">{displayName}</p>
                    <p className="text-lg font-semibold text-white">Livello {level}</p>
                </div>
                <div className="flex items-center gap-1 text-orange-400 text-sm font-semibold">
                    <FiZap className="w-4 h-4" />
                    {streakCurrent}
                </div>
            </div>

            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400"
                />
            </div>
            <div className="mt-2 text-xs text-white/50">
                {xp} / {nextLevelXp} XP
            </div>
        </div>
    );
};

export default UserLevelWidget;
