/**
 * EXAM STATS HEADER - Header informativo per la pagina dettaglio esame
 * 
 * Mostra:
 * - Titolo e descrizione con icona dinamica
 * - Badge stato e scadenza
 * - Statistiche principali (carte, mazzi, padronanza)
 * - Timeline visiva della scadenza
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar,
    Clock,
    BookOpen,
    Layers,
    Target,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Archive,
    XCircle,
    Sparkles,
} from 'lucide-react';
import type { Exam } from '../../types/exam';
import type { Deck } from '../../services/studyService';
import { getExamIcon, getExamColors } from './utils/examIcons';

// ============================================
// TYPES
// ============================================

interface ExamStatsHeaderProps {
    exam: Exam;
    decks: Deck[];
    onBack?: () => void;
}

interface ExamStat {
    label: string;
    value: string | number;
    subValue?: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
}

// ============================================
// COMPONENT
// ============================================

export const ExamStatsHeader: React.FC<ExamStatsHeaderProps> = ({
    exam,
    decks,
}) => {
    const ExamIcon = getExamIcon(exam.title, exam.description);
    const examColors = getExamColors(exam.title, exam.description);

    // Calcola statistiche dell'esame
    const stats = useMemo(() => {
        const examDecks = decks.filter(d => d.examId === exam.id);
        const allCards = examDecks.flatMap(d => d.cards || []);

        const totalCards = allCards.length;
        const dueCards = examDecks.reduce((sum, d) => sum + (d.dueCount || 0), 0);
        const masteredCards = allCards.filter(c => c.status === 'mastered').length;
        const learningCards = allCards.filter(c => c.status === 'learning').length;
        const newCards = allCards.filter(c => c.status === 'new').length;
        const reviewCards = allCards.filter(c => c.status === 'review').length;

        const masteryPercent = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

        // Calcola il progresso verso la scadenza
        const deadlineDate = new Date(exam.deadline);
        const now = new Date();
        const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Data creazione (fallback a 30 giorni fa)
        const createdAt = exam.createdAt ? new Date(exam.createdAt) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const totalDays = Math.max(1, Math.ceil((deadlineDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
        const daysPassed = Math.max(0, totalDays - Math.max(0, daysUntil));
        const timeProgress = Math.min(100, Math.round((daysPassed / totalDays) * 100));

        return {
            deckCount: examDecks.length,
            totalCards,
            dueCards,
            masteredCards,
            learningCards,
            newCards,
            reviewCards,
            masteryPercent,
            daysUntil,
            timeProgress,
            totalDays,
            daysPassed,
        };
    }, [exam, decks]);

    // Determina lo stato e i colori
    const statusConfig = useMemo(() => {
        switch (exam.status) {
            case 'passed':
                return {
                    label: 'Superato',
                    icon: CheckCircle,
                    color: 'text-emerald-400',
                    bgColor: 'bg-emerald-500/20',
                    borderColor: 'border-emerald-500/40',
                    gradient: 'from-emerald-500/20 via-emerald-500/10',
                };
            case 'failed':
                return {
                    label: 'Non Superato',
                    icon: XCircle,
                    color: 'text-rose-400',
                    bgColor: 'bg-rose-500/20',
                    borderColor: 'border-rose-500/40',
                    gradient: 'from-rose-500/20 via-rose-500/10',
                };
            case 'archived':
                return {
                    label: 'Archiviato',
                    icon: Archive,
                    color: 'text-slate-400',
                    bgColor: 'bg-slate-500/20',
                    borderColor: 'border-slate-500/40',
                    gradient: 'from-slate-500/20 via-slate-500/10',
                };
            case 'completed':
                return {
                    label: 'Completato',
                    icon: CheckCircle,
                    color: 'text-blue-400',
                    bgColor: 'bg-blue-500/20',
                    borderColor: 'border-blue-500/40',
                    gradient: 'from-blue-500/20 via-blue-500/10',
                };
            default:
                // Active status - colori basati sull'urgenza
                if (stats.daysUntil < 0) {
                    return {
                        label: 'Scaduto',
                        icon: AlertCircle,
                        color: 'text-red-400',
                        bgColor: 'bg-red-500/20',
                        borderColor: 'border-red-500/40',
                        gradient: 'from-red-500/20 via-red-500/10',
                    };
                }
                if (stats.daysUntil <= 7) {
                    return {
                        label: 'Urgente',
                        icon: AlertCircle,
                        color: 'text-orange-400',
                        bgColor: 'bg-orange-500/20',
                        borderColor: 'border-orange-500/40',
                        gradient: 'from-orange-500/20 via-orange-500/10',
                    };
                }
                return {
                    label: 'In Corso',
                    icon: Sparkles,
                    color: examColors.color,
                    bgColor: examColors.bgColor,
                    borderColor: examColors.borderColor,
                    gradient: `from-primary-500/20 via-primary-500/10`,
                };
        }
    }, [exam.status, stats.daysUntil, examColors]);

    // Formatta la data di scadenza
    const formattedDeadline = useMemo(() => {
        const date = new Date(exam.deadline);
        return date.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }, [exam.deadline]);

    // Statistiche per la grid
    const statItems: ExamStat[] = [
        {
            label: 'Mazzi',
            value: stats.deckCount,
            icon: Layers,
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/15',
        },
        {
            label: 'Carte Totali',
            value: stats.totalCards,
            subValue: stats.dueCards > 0 ? `${stats.dueCards} da ripassare` : undefined,
            icon: BookOpen,
            color: 'text-primary-400',
            bgColor: 'bg-primary-500/15',
        },
        {
            label: 'Padronanza',
            value: `${stats.masteryPercent}%`,
            subValue: `${stats.masteredCards} carte padroneggiate`,
            icon: Target,
            color: stats.masteryPercent >= 80 ? 'text-emerald-400' : stats.masteryPercent >= 50 ? 'text-amber-400' : 'text-rose-400',
            bgColor: stats.masteryPercent >= 80 ? 'bg-emerald-500/15' : stats.masteryPercent >= 50 ? 'bg-amber-500/15' : 'bg-rose-500/15',
        },
    ];

    return (
        <div className={`
            relative overflow-hidden rounded-3xl border ${statusConfig.borderColor}
            bg-gradient-to-br ${statusConfig.gradient} to-transparent
            backdrop-blur-sm
        `}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-white/5 to-transparent rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative p-6 sm:p-8">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-5 mb-8">
                    {/* Icona Esame */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className={`
                            p-4 rounded-2xl flex-shrink-0 border-2
                            ${statusConfig.bgColor} ${statusConfig.borderColor}
                        `}
                    >
                        <ExamIcon className={`w-10 h-10 ${statusConfig.color}`} />
                    </motion.div>

                    {/* Titolo e Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                                {exam.title}
                            </h1>
                            <span className={`
                                px-3 py-1 rounded-full text-xs font-bold
                                ${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor}
                                flex items-center gap-1.5
                            `}>
                                <statusConfig.icon className="w-3.5 h-3.5" />
                                {statusConfig.label}
                            </span>
                        </div>
                        
                        {exam.description && (
                            <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-4">
                                {exam.description}
                            </p>
                        )}

                        {/* Scadenza */}
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 text-white/70">
                                <Calendar className="w-4 h-4 text-primary-400" />
                                <span>{formattedDeadline}</span>
                            </div>
                            
                            {exam.status === 'active' && (
                                <div className={`
                                    flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium
                                    ${stats.daysUntil < 0 
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                        : stats.daysUntil <= 7 
                                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                            : 'bg-white/10 text-white/70 border border-white/20'
                                    }
                                `}>
                                    <Clock className="w-3.5 h-3.5" />
                                    {stats.daysUntil < 0 
                                        ? `Scaduto da ${Math.abs(stats.daysUntil)} giorni`
                                        : stats.daysUntil === 0 
                                            ? 'Oggi!'
                                            : stats.daysUntil === 1 
                                                ? 'Domani'
                                                : `${stats.daysUntil} giorni rimasti`
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {statItems.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                {stat.label === 'Padronanza' && stats.masteryPercent > 0 && (
                                    <TrendingUp className={`w-4 h-4 ${stats.masteryPercent >= 50 ? 'text-emerald-400' : 'text-amber-400'}`} />
                                )}
                            </div>
                            <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                            <p className="text-xs text-white/50 uppercase tracking-wide font-medium">{stat.label}</p>
                            {stat.subValue && (
                                <p className="text-xs text-white/40 mt-1.5">{stat.subValue}</p>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Progress Bar - Tempo rimanente */}
                {exam.status === 'active' && stats.daysUntil >= 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-white/60">Progresso Temporale</span>
                            <span className="text-white/80 font-medium">{stats.timeProgress}%</span>
                        </div>
                        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.timeProgress}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className={`
                                    h-full rounded-full transition-all duration-500
                                    ${stats.timeProgress >= 80 
                                        ? 'bg-gradient-to-r from-orange-400 to-red-500' 
                                        : stats.timeProgress >= 50 
                                            ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                                            : 'bg-gradient-to-r from-primary-400 to-primary-600'
                                    }
                                `}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-white/40">
                            <span>Giorno 1</span>
                            <span>{stats.daysPassed} giorni trascorsi</span>
                            <span>Esame</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamStatsHeader;
