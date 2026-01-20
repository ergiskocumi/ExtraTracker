/**
 * STREAK CARD COMPONENT
 *
 * Mostra lo stato della streak dell'utente con:
 * - Streak corrente e record
 * - Indicatore di rischio
 * - Streak freeze disponibili
 * - Pulsante per acquistare freeze
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiZap, FiShield, FiAlertTriangle, FiTrendingUp, FiClock } from 'react-icons/fi';
import type { StreakInfo } from '../services/gamificationService';

interface StreakCardProps {
    streak: StreakInfo;
    onPurchaseFreeze?: () => Promise<void>;
    isLoading?: boolean;
}

export const StreakCard: React.FC<StreakCardProps> = ({
    streak,
    onPurchaseFreeze,
    isLoading = false,
}) => {
    const [isPurchasing, setIsPurchasing] = useState(false);

    const handlePurchaseFreeze = async () => {
        if (!onPurchaseFreeze || isPurchasing) return;
        setIsPurchasing(true);
        try {
            await onPurchaseFreeze();
        } finally {
            setIsPurchasing(false);
        }
    };

    const getStreakColor = () => {
        if (streak.isAtRisk) return 'from-rose-500 to-orange-500';
        if (streak.current >= 30) return 'from-amber-400 to-yellow-500';
        if (streak.current >= 7) return 'from-orange-400 to-amber-500';
        return 'from-orange-500 to-red-500';
    };

    const getStreakEmoji = () => {
        if (streak.current >= 365) return '👑';
        if (streak.current >= 100) return '💎';
        if (streak.current >= 30) return '🌟';
        if (streak.current >= 7) return '🔥';
        return '⚡';
    };

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
                <div className="h-16 bg-white/10 rounded mb-4"></div>
                <div className="h-4 bg-white/10 rounded w-2/3"></div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 overflow-hidden relative"
        >
            {/* Background Gradient */}
            <div
                className={`absolute inset-0 bg-gradient-to-br ${getStreakColor()} opacity-5`}
            />

            {/* Header */}
            <div className="relative flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${getStreakColor()}`}>
                        <FiZap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Streak</h3>
                        <p className="text-sm text-white/50">Mantieni la tua serie!</p>
                    </div>
                </div>

                {streak.isAtRisk && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30"
                    >
                        <FiAlertTriangle className="w-4 h-4 text-rose-400" />
                        <span className="text-xs font-medium text-rose-400">A rischio!</span>
                    </motion.div>
                )}
            </div>

            {/* Current Streak */}
            <div className="relative text-center mb-6">
                <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="inline-flex items-center gap-3"
                >
                    <span className="text-4xl">{getStreakEmoji()}</span>
                    <span className={`text-6xl font-bold bg-gradient-to-r ${getStreakColor()} bg-clip-text text-transparent`}>
                        {streak.current}
                    </span>
                    <span className="text-2xl text-white/60">giorni</span>
                </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="relative grid grid-cols-2 gap-4 mb-6">
                {/* Longest Streak */}
                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FiTrendingUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-white/50 uppercase tracking-wider">Record</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{streak.longest}</p>
                    <p className="text-xs text-white/40">giorni</p>
                </div>

                {/* Days Until Reset */}
                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FiClock className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-white/50 uppercase tracking-wider">Tempo rimasto</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {streak.daysUntilReset > 0 ? streak.daysUntilReset : '< 24'}
                    </p>
                    <p className="text-xs text-white/40">ore</p>
                </div>
            </div>

            {/* Streak Freezes */}
            <div className="relative rounded-xl bg-white/[0.04] border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <FiShield className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-medium text-white">Streak Freeze</span>
                    </div>
                    <span className="text-sm text-white/50">
                        {streak.freezesAvailable} / {streak.maxFreezes}
                    </span>
                </div>

                {/* Freeze Indicators */}
                <div className="flex gap-2 mb-4">
                    {Array.from({ length: streak.maxFreezes }).map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className={`flex-1 h-2 rounded-full ${
                                i < streak.freezesAvailable
                                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500'
                                    : 'bg-white/10'
                            }`}
                        />
                    ))}
                </div>

                {/* Purchase Button */}
                {streak.freezesAvailable < streak.maxFreezes && onPurchaseFreeze && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handlePurchaseFreeze}
                        disabled={isPurchasing}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-sm font-medium text-cyan-300 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all disabled:opacity-50"
                    >
                        {isPurchasing ? (
                            <span className="flex items-center justify-center gap-2">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full"
                                />
                                Acquisto in corso...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <FiShield className="w-4 h-4" />
                                Acquista Freeze ({streak.freezeCost} coins)
                            </span>
                        )}
                    </motion.button>
                )}

                <p className="text-xs text-white/40 text-center mt-3">
                    Il freeze protegge la streak per un giorno
                </p>
            </div>
        </motion.div>
    );
};

export default StreakCard;
