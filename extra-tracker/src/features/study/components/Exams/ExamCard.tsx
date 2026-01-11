import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import type { Goal } from '../../../goals/types';

// ============================================
// TYPES
// ============================================

interface ExamCardProps {
    exam: Goal;
    deckCount: number;
    totalCards: number;
    dueCards: number;
    masteryPercent: number;
    onClick: () => void;
}

// ============================================
// COMPONENT
// ============================================

export const ExamCard: React.FC<ExamCardProps> = ({
    exam,
    deckCount,
    totalCards,
    dueCards,
    masteryPercent,
    onClick,
}) => {
    const deadlineDate = new Date(exam.deadline);
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isUrgent = daysUntilDeadline <= 7 && daysUntilDeadline >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`
                relative rounded-xl border overflow-hidden cursor-pointer
                transition-all duration-200
                ${isUrgent
                    ? 'border-orange-500/40 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent'
                    : 'border-primary-500/30 bg-gradient-to-br from-primary-500/10 via-transparent to-transparent'
                }
                hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10
            `}
        >
            {/* Header */}
            <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-primary-500/20 border border-primary-500/30">
                            <BookOpen className="w-6 h-6 text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-lg mb-1 truncate">
                                {exam.title}
                            </h3>
                            {exam.description && (
                                <p className="text-sm text-white/50 line-clamp-2">
                                    {exam.description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="w-4 h-4 text-white/50" />
                            <span className="text-xs text-white/50">Mazzi</span>
                        </div>
                        <p className="text-xl font-bold text-white">{deckCount}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-white/50" />
                            <span className="text-xs text-white/50">Carte</span>
                        </div>
                        <p className="text-xl font-bold text-white">{totalCards}</p>
                    </div>
                </div>

                {/* Progress & Due Cards */}
                {totalCards > 0 && (
                    <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-white/70">Padronanza</span>
                            <span className="text-white font-semibold">{masteryPercent}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${masteryPercent}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className={`h-full rounded-full ${
                                    masteryPercent >= 80
                                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                        : masteryPercent >= 50
                                        ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                                        : 'bg-gradient-to-r from-primary-400 to-primary-500'
                                }`}
                            />
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className={`w-4 h-4 ${isUrgent ? 'text-orange-400' : 'text-white/50'}`} />
                        <span className={isUrgent ? 'text-orange-400 font-semibold' : 'text-white/70'}>
                            {daysUntilDeadline >= 0
                                ? `${daysUntilDeadline} ${daysUntilDeadline === 1 ? 'giorno' : 'giorni'}`
                                : 'Scaduto'
                            }
                        </span>
                    </div>
                    {dueCards > 0 && (
                        <div className="px-2 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
                            <span className="text-xs text-orange-400 font-bold">
                                {dueCards} da ripassare
                            </span>
                        </div>
                    )}
                    <ArrowRight className="w-4 h-4 text-white/50" />
                </div>
            </div>
        </motion.div>
    );
};
