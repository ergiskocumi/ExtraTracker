/**
 * 🎉 SESSION SUMMARY MODAL - Premium Design
 * 
 * Riepilogo completo e dettagliato della sessione di studio completata.
 * Design premium ottimizzato per mobile, tablet e desktop.
 * 
 * Features:
 * - Statistiche dettagliate con animazioni fluide
 * - Percentuale di successo e tempo medio
 * - Breakdown XP completo
 * - Design responsive e touch-friendly
 * - Animazioni celebrative
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
    FiCheckCircle,
    FiClock,
    FiTrendingUp,
    FiXCircle,
    FiZap,
    FiAward,
    FiTarget,
    FiBarChart2,
    FiStar,
    FiX,
} from 'react-icons/fi';
import { LevelBadge } from './components/LevelBadge';

export interface SessionSummary {
    correctCount: number;
    wrongCount: number;
    timeSpentSeconds: number;
    xp: {
        base?: number;
        correct: number;
        speedBonus: number;
        streakBonus: number;
        total: number;
    };
    level?: {
        current: number;
        xp: number;
        nextLevelXp: number;
    };
    // Statistiche aggiuntive (opzionali)
    stats?: {
        hard?: number;
        good?: number;
        easy?: number;
        totalCards?: number;
    };
}

export interface SessionSummaryModalProps {
    isOpen: boolean;
    title?: string;
    summary: SessionSummary;
    onClose: () => void;
}

const formatDuration = (seconds: number) => {
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: 'emerald' | 'rose' | 'blue' | 'amber' | 'purple';
    delay?: number;
    subtitle?: string;
}> = ({ icon, label, value, color, delay = 0, subtitle }) => {
    const colorConfig = {
        emerald: {
            bg: 'bg-emerald-500/20',
            border: 'border-emerald-500/30',
            icon: 'text-emerald-400',
            value: 'text-emerald-200',
            glow: 'shadow-emerald-500/20'
        },
        rose: {
            bg: 'bg-rose-500/20',
            border: 'border-rose-500/30',
            icon: 'text-rose-400',
            value: 'text-rose-200',
            glow: 'shadow-rose-500/20'
        },
        blue: {
            bg: 'bg-blue-500/20',
            border: 'border-blue-500/30',
            icon: 'text-blue-400',
            value: 'text-blue-200',
            glow: 'shadow-blue-500/20'
        },
        amber: {
            bg: 'bg-amber-500/20',
            border: 'border-amber-500/30',
            icon: 'text-amber-400',
            value: 'text-amber-200',
            glow: 'shadow-amber-500/20'
        },
        purple: {
            bg: 'bg-purple-500/20',
            border: 'border-purple-500/30',
            icon: 'text-purple-400',
            value: 'text-purple-200',
            glow: 'shadow-purple-500/20'
        },
    };

    const cfg = colorConfig[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.4, type: 'spring', stiffness: 200 }}
            className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-4 sm:p-5 backdrop-blur-sm ${cfg.glow} shadow-lg`}
        >
            <div className="flex items-start justify-between mb-2">
                <div className={`p-2.5 rounded-xl ${cfg.bg} ${cfg.border} border`}>
                    {icon}
                </div>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold ${cfg.value} mb-1`}>
                {value}
            </p>
            <p className="text-xs sm:text-sm text-white/60 font-medium">{label}</p>
            {subtitle && (
                <p className="text-xs text-white/40 mt-1">{subtitle}</p>
            )}
        </motion.div>
    );
};

const XpBreakdownItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
    delay?: number;
}> = ({ icon, label, value, color, delay = 0 }) => {
    if (value === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.3 }}
            className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className={`${color} text-lg`}>
                    {icon}
                </div>
                <span className="text-sm text-white/70 font-medium">{label}</span>
            </div>
            <span className="text-sm font-semibold text-white/90">+{value} XP</span>
        </motion.div>
    );
};

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
    isOpen,
    title = 'Sessione Completata',
    summary,
    onClose,
}) => {
    const totalCards = summary.correctCount + summary.wrongCount;
    const successRate = totalCards > 0 ? Math.round((summary.correctCount / totalCards) * 100) : 0;
    const avgTimePerCard = totalCards > 0 ? Math.round(summary.timeSpentSeconds / totalCards) : 0;
    const progress = summary.level
        ? Math.min(1, summary.level.xp / Math.max(summary.level.nextLevelXp, 1))
        : 1;

    // Statistiche per rating (se disponibili)
    const hardCount = summary.stats?.hard || 0;
    const goodCount = summary.stats?.good || 0;
    const easyCount = summary.stats?.easy || 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-950/90 via-black/80 to-slate-950/90 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={(event) => event.stopPropagation()}
                            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-slate-900/98 to-slate-950/95 backdrop-blur-2xl shadow-2xl pointer-events-auto custom-scrollbar relative overflow-hidden"
                            style={{
                                boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            <div className="pointer-events-none absolute -top-20 -right-16 h-40 w-40 rotate-12 rounded-[30px] bg-white/[0.05] border border-white/10" />
                            <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 -rotate-12 rounded-[34px] bg-white/[0.04] border border-white/10" />
                            {/* Header */}
                            <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-900/98 to-transparent backdrop-blur-xl border-b border-white/10 px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="flex items-center gap-2 mb-2"
                                        >
                                            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                                                <FiAward className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <p className="text-xs uppercase tracking-[0.2em] text-white/50 font-semibold">
                                                Riepilogo Sessione
                                            </p>
                                        </motion.div>
                                        <motion.h2
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.15 }}
                                            className="text-xl sm:text-2xl font-bold text-white leading-tight"
                                        >
                                            {title}
                                        </motion.h2>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={onClose}
                                        className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                                        aria-label="Chiudi"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </motion.button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-6">
                                {/* Statistiche Principali */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                    <StatCard
                                        icon={<FiCheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
                                        label="Corrette"
                                        value={summary.correctCount}
                                        color="emerald"
                                        delay={0.2}
                                        subtitle={`${successRate}% successo`}
                                    />
                                    <StatCard
                                        icon={<FiXCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
                                        label="Sbagliate"
                                        value={summary.wrongCount}
                                        color="rose"
                                        delay={0.25}
                                    />
                                    <StatCard
                                        icon={<FiClock className="w-5 h-5 sm:w-6 sm:h-6" />}
                                        label="Tempo Totale"
                                        value={formatDuration(summary.timeSpentSeconds)}
                                        color="blue"
                                        delay={0.3}
                                        subtitle={avgTimePerCard > 0 ? `${avgTimePerCard}s per carta` : undefined}
                                    />
                                    <StatCard
                                        icon={<FiTarget className="w-5 h-5 sm:w-6 sm:h-6" />}
                                        label="Totale Carte"
                                        value={totalCards}
                                        color="purple"
                                        delay={0.35}
                                    />
                                </div>

                                {/* Statistiche Rating (se disponibili) */}
                                {(hardCount > 0 || goodCount > 0 || easyCount > 0) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
                                    >
                                        <div className="flex items-center gap-2 mb-4">
                                            <FiBarChart2 className="w-4 h-4 text-white/60" />
                                            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                                                Distribuzione Rating
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="text-center p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                                <p className="text-lg sm:text-xl font-bold text-rose-300">{hardCount}</p>
                                                <p className="text-xs text-white/50 mt-1">Difficile</p>
                                            </div>
                                            <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                                <p className="text-lg sm:text-xl font-bold text-amber-300">{goodCount}</p>
                                                <p className="text-xs text-white/50 mt-1">Ok</p>
                                            </div>
                                            <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                                <p className="text-lg sm:text-xl font-bold text-emerald-300">{easyCount}</p>
                                                <p className="text-xs text-white/50 mt-1">Facile</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Breakdown XP */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-2"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <FiZap className="w-4 h-4 text-amber-400" />
                                        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                                            Breakdown XP
                                        </h3>
                                    </div>
                                    <div className="space-y-1.5">
                                        {typeof summary.xp.base === 'number' && summary.xp.base > 0 && (
                                            <XpBreakdownItem
                                                icon={<FiStar className="w-4 h-4" />}
                                                label="Base XP"
                                                value={summary.xp.base}
                                                color="text-indigo-400"
                                                delay={0.55}
                                            />
                                        )}
                                        <XpBreakdownItem
                                            icon={<FiCheckCircle className="w-4 h-4" />}
                                            label="Risposte Corrette"
                                            value={summary.xp.correct}
                                            color="text-emerald-400"
                                            delay={0.6}
                                        />
                                        <XpBreakdownItem
                                            icon={<FiTrendingUp className="w-4 h-4" />}
                                            label="Velocità Bonus"
                                            value={summary.xp.speedBonus}
                                            color="text-amber-400"
                                            delay={0.65}
                                        />
                                        {summary.xp.streakBonus > 0 && (
                                            <XpBreakdownItem
                                                icon={<FiZap className="w-4 h-4" />}
                                                label="Streak Bonus"
                                                value={summary.xp.streakBonus}
                                                color="text-orange-400"
                                                delay={0.7}
                                            />
                                        )}
                                    </div>
                                </motion.div>

                                {/* Totale XP con Progress Bar */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.75 }}
                                    className="rounded-2xl border border-white/10 bg-gradient-to-br from-primary-500/20 via-primary-600/15 to-primary-500/20 p-5 sm:p-6 backdrop-blur-sm"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-primary-500/30 border border-primary-400/40">
                                                <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-primary-200" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-white/60 font-medium">Totale XP Guadagnato</p>
                                                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                                                    +{summary.xp.total} XP
                                                </p>
                                            </div>
                                        </div>
                                        {summary.level && (
                                            <LevelBadge level={summary.level.current} size="sm" variant="icon" />
                                        )}
                                    </div>

                                    {summary.level && (
                                        <>
                                            <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-2">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress * 100}%` }}
                                                    transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
                                                    className="h-full rounded-full bg-gradient-to-r from-primary-400 via-primary-500 to-emerald-400 shadow-lg shadow-primary-500/30"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between text-xs sm:text-sm">
                                                <span className="text-white/60">
                                                    Livello {summary.level.current}
                                                </span>
                                                <span className="text-white/80 font-semibold">
                                                    {summary.level.xp} / {summary.level.nextLevelXp} XP
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </motion.div>

                                {/* Success Message */}
                                {successRate >= 80 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.9, type: 'spring' }}
                                        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 backdrop-blur-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-emerald-500/30 border border-emerald-400/40">
                                                <FiStar className="w-5 h-5 text-emerald-300" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-emerald-200 mb-1">
                                                    Ottimo lavoro! 🎉
                                                </p>
                                                <p className="text-xs text-emerald-300/80">
                                                    Hai completato la sessione con un {successRate}% di successo!
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Action Button */}
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onClose}
                                    className="w-full rounded-2xl py-4 sm:py-5 text-base sm:text-lg font-semibold bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all"
                                >
                                    Continua
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SessionSummaryModal;
