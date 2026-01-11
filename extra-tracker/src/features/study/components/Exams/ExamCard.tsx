import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, ArrowRight, Layers, FileText, Target } from 'lucide-react';
import type { Goal } from '../../../goals/types';
import { getExamIcon, getExamColors } from './utils/examIcons';

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

    // Rileva materia e icona automaticamente
    const ExamIcon = getExamIcon(exam.title, exam.description);
    const examColors = getExamColors(exam.title, exam.description);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`
                relative rounded-2xl border overflow-hidden cursor-pointer
                transition-all duration-300
                ${isUrgent
                    ? 'border-orange-500/50 bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-transparent shadow-lg shadow-orange-500/10'
                    : 'border-primary-500/30 bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent'
                }
                hover:border-primary-500/60 hover:shadow-xl hover:shadow-primary-500/20
                backdrop-blur-sm
            `}
        >
            {/* Header con Icona e Titolo */}
            <div className="p-6 pb-4">
                <div className="flex items-start gap-4 mb-5">
                    {/* Icona Esame - Dinamica in base alla materia */}
                    <div className={`
                        p-3.5 rounded-xl flex-shrink-0 border-2
                        ${isUrgent
                            ? 'bg-orange-500/20 border-orange-500/40'
                            : `${examColors.bgColor} ${examColors.borderColor}`
                        }
                    `}>
                        <ExamIcon className={`w-7 h-7 ${isUrgent ? 'text-orange-400' : examColors.color}`} />
                    </div>
                    
                    {/* Titolo e Descrizione */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-xl mb-2 truncate leading-tight">
                            {exam.title}
                        </h3>
                        {exam.description && (
                            <p className="text-sm text-white/60 line-clamp-2 leading-relaxed">
                                {exam.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Statistiche Principali - Layout Migliorato */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    {/* Mazzi */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <Layers className="w-4 h-4 text-primary-400" />
                            <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Mazzi</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{deckCount}</p>
                    </div>
                    
                    {/* Carte */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Carte</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{totalCards}</p>
                    </div>
                </div>

                {/* Progress Bar - Solo se ci sono carte */}
                {totalCards > 0 && (
                    <div className="space-y-2.5 mb-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm font-semibold text-white/80">Padronanza</span>
                            </div>
                            <span className="text-lg font-bold text-white">{masteryPercent}%</span>
                        </div>
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden shadow-inner">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${masteryPercent}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className={`h-full rounded-full shadow-lg ${
                                    masteryPercent >= 80
                                        ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600'
                                        : masteryPercent >= 50
                                        ? 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600'
                                        : 'bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600'
                                }`}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer con Scadenza e Azioni */}
            <div className="px-6 py-4 border-t border-white/10 bg-white/5">
                <div className="flex items-center justify-between">
                    {/* Scadenza */}
                    <div className="flex items-center gap-2.5">
                        <div className={`
                            p-2 rounded-lg
                            ${isUrgent
                                ? 'bg-orange-500/20 border border-orange-500/30'
                                : 'bg-white/5 border border-white/10'
                            }
                        `}>
                            <Calendar className={`w-4 h-4 ${isUrgent ? 'text-orange-400' : 'text-white/60'}`} />
                        </div>
                        <div>
                            <p className="text-xs text-white/50 mb-0.5">Scadenza</p>
                            <p className={`text-sm font-bold ${isUrgent ? 'text-orange-400' : 'text-white/80'}`}>
                                {daysUntilDeadline >= 0
                                    ? `${daysUntilDeadline} ${daysUntilDeadline === 1 ? 'giorno' : 'giorni'}`
                                    : 'Scaduto'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Badge Da Ripassare e Freccia */}
                    <div className="flex items-center gap-3">
                        {dueCards > 0 && (
                            <div className="px-3 py-1.5 rounded-full bg-orange-500/20 border-2 border-orange-500/40 shadow-lg shadow-orange-500/20">
                                <span className="text-xs font-bold text-orange-300">
                                    {dueCards} da ripassare
                                </span>
                            </div>
                        )}
                        <div className={`
                            p-2 rounded-lg transition-colors
                            ${isUrgent
                                ? 'bg-orange-500/10 border border-orange-500/30'
                                : 'bg-primary-500/10 border border-primary-500/30'
                            }
                        `}>
                            <ArrowRight className={`w-5 h-5 ${isUrgent ? 'text-orange-400' : 'text-primary-400'}`} />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
