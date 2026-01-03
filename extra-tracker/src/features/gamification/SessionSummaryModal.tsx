/**
 * SESSION SUMMARY MODAL
 *
 * Mostra il riepilogo XP di fine sessione.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiClock, FiTrendingUp, FiXCircle, FiZap } from 'react-icons/fi';

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
}

export interface SessionSummaryModalProps {
    isOpen: boolean;
    title?: string;
    summary: SessionSummary;
    onClose: () => void;
}

const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
    isOpen,
    title = 'Sessione Completata',
    summary,
    onClose,
}) => {
    const progress = summary.level
        ? Math.min(1, summary.level.xp / Math.max(summary.level.nextLevelXp, 1))
        : 1;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                        onClick={(event) => event.stopPropagation()}
                        className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl px-6 py-6 shadow-2xl"
                    >
                        <div className="mb-6">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Riepilogo</p>
                            <h2 className="text-2xl font-semibold text-white mt-2">{title}</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                <FiCheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
                                <p className="text-sm text-white/70">Corrette</p>
                                <p className="text-xl font-semibold text-emerald-200">{summary.correctCount}</p>
                            </div>
                            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                                <FiXCircle className="w-5 h-5 text-rose-400 mb-2" />
                                <p className="text-sm text-white/70">Sbagliate</p>
                                <p className="text-xl font-semibold text-rose-200">{summary.wrongCount}</p>
                            </div>
                            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 col-span-2">
                                <FiClock className="w-5 h-5 text-blue-400 mb-2" />
                                <p className="text-sm text-white/70">Tempo</p>
                                <p className="text-lg font-semibold text-white/90">{formatDuration(summary.timeSpentSeconds)}</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            {typeof summary.xp.base === 'number' && summary.xp.base > 0 && (
                                <div className="flex items-center justify-between text-sm text-white/70">
                                    <span className="flex items-center gap-2">
                                        <FiZap className="text-indigo-300" />
                                        Base XP
                                    </span>
                                    <span className="text-white/90">+{summary.xp.base} XP</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between text-sm text-white/70">
                                <span className="flex items-center gap-2">
                                    <FiCheckCircle className="text-emerald-400" />
                                    Risposte corrette
                                </span>
                                <span className="text-white/90">+{summary.xp.correct} XP</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-white/70">
                                <span className="flex items-center gap-2">
                                    <FiTrendingUp className="text-amber-400" />
                                    Velocita bonus
                                </span>
                                <span className="text-white/90">+{summary.xp.speedBonus} XP</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-white/70">
                                <span className="flex items-center gap-2">
                                    <FiZap className="text-orange-400" />
                                    Streak bonus
                                </span>
                                <span className="text-white/90">+{summary.xp.streakBonus} XP</span>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-white/70">Totale XP</span>
                                <span className="text-lg font-semibold text-white">+{summary.xp.total} XP</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress * 100}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-primary-400 to-emerald-400"
                                />
                            </div>
                            {summary.level && (
                                <p className="mt-2 text-xs text-white/50">
                                    Livello {summary.level.current} • {summary.level.xp}/{summary.level.nextLevelXp} XP
                                </p>
                            )}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onClose}
                            className="w-full rounded-2xl py-3 text-sm font-semibold bg-white/[0.12] text-white/90 hover:bg-white/[0.18] transition-all"
                        >
                            Continua
                        </motion.button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SessionSummaryModal;
