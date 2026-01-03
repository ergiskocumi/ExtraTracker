import { useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';

export interface SessionSummaryData {
    correctCount: number;
    wrongCount: number;
    timeSpentSeconds: number;
    xpTotal: number;
}

interface SessionSummaryProps {
    deckTitle?: string;
    summary: SessionSummaryData;
    onExit: () => void;
}

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

export const SessionSummary: React.FC<SessionSummaryProps> = ({ deckTitle, summary, onExit }) => {
    const total = summary.correctCount + summary.wrongCount;
    const accuracy = useMemo(() => (total > 0 ? summary.correctCount / total : 0), [summary.correctCount, total]);
    const accuracyPct = Math.round(accuracy * 100);

    useEffect(() => {
        if (accuracy >= 0.8 && total > 0) {
            confetti({
                particleCount: 120,
                spread: 70,
                origin: { y: 0.7 },
            });
        }
    }, [accuracy, total]);

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-dark-500 to-dark-400 flex flex-col">
            <header className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-white/[0.06]">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onExit}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.1] transition-all"
                >
                    <FiArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium hidden sm:inline">Esci</span>
                </motion.button>

                <div className="text-center min-w-0">
                    <h1 className="text-sm sm:text-base font-medium text-white truncate">
                        {deckTitle ? `Sessione completata • ${deckTitle}` : 'Sessione completata'}
                    </h1>
                </div>

                <div className="w-16" />
            </header>

            <div className="flex-1 flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                    className="w-full max-w-lg"
                >
                    <div className="rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-2xl shadow-black/30 p-6 sm:p-8">
                        <div className="text-center">
                            <h2 className="text-2xl sm:text-3xl font-semibold text-white">Bravo!</h2>
                            <p className="text-white/50 mt-2">Hai completato la sessione.</p>
                        </div>

                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                <p className="text-xs uppercase tracking-wider text-white/40">Accuratezza</p>
                                <p className="mt-1 text-2xl font-semibold text-white">{accuracyPct}%</p>
                                <p className="mt-1 text-sm text-white/50">
                                    {summary.correctCount} giuste • {summary.wrongCount} da rivedere
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                <p className="text-xs uppercase tracking-wider text-white/40">XP Guadagnati</p>
                                <p className="mt-1 text-2xl font-semibold text-emerald-300">+{summary.xpTotal}</p>
                                <p className="mt-1 text-sm text-white/50">Continua cosi.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                <p className="text-xs uppercase tracking-wider text-white/40">Tempo</p>
                                <p className="mt-1 text-2xl font-semibold text-white">{formatTime(summary.timeSpentSeconds)}</p>
                                <p className="mt-1 text-sm text-white/50">Focus mode</p>
                            </div>
                        </div>

                        <div className="mt-8">
                            <button
                                onClick={onExit}
                                className="w-full rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 text-white font-semibold py-3 transition-all"
                            >
                                Torna ai Mazzi
                            </button>
                        </div>

                        {accuracy >= 0.8 && total > 0 && (
                            <p className="mt-4 text-center text-sm text-white/40">Ottimo risultato! Confetti meritati.</p>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default SessionSummary;
