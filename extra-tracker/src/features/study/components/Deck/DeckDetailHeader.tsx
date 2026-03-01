/**
 * DECK DETAIL HEADER - Header migliorato per la pagina dettaglio mazzo
 * 
 * Mostra:
 * - Titolo e descrizione con icona tematica
 * - Statistiche principali (carte totali, da ripassare, padronanza)
 * - Progress bar di padronanza
 * - Barra distribuzione carte per stato
 * - Azioni rapide (Studia, Exam Solver, Aggiungi Carta)
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Play,
    FileQuestion,
    ListChecks,
    Target,
    Clock,
    Layers,
    GraduationCap,
    FileText,
} from 'lucide-react';
import type { Deck } from '../../services/studyService';
import { getDeckTheme } from '../DeckCard/utils/deckTheme';

// ============================================
// TYPES
// ============================================

interface DeckDetailHeaderProps {
    deck: Deck;
    onBack: () => void;
    onStudy: () => void;
    onGenerateQuiz?: () => void;
    onExamSolver?: () => void;
    onAddCard: () => void;
    onReadPdf?: () => void;
    onMagicGenerate?: () => void;
    onDeleteDeck?: () => void;
    onEditDeck?: () => void;
}

interface StatItem {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    bgColor: string;
}

// ============================================
// COMPONENT
// ============================================

export const DeckDetailHeader: React.FC<DeckDetailHeaderProps> = ({
    deck,
    onBack,
    onStudy,
    onGenerateQuiz,
    onExamSolver,
    onReadPdf,
}) => {
    const theme = useMemo(() => getDeckTheme(deck), [deck]);

    // Calcola statistiche
    const stats = useMemo(() => {
        const cards = deck.cards || [];
        const total = cards.length;
        const newCards = cards.filter(c => c.status === 'new').length;
        const learning = cards.filter(c => c.status === 'learning').length;
        const review = cards.filter(c => c.status === 'review').length;
        const mastered = cards.filter(c => c.status === 'mastered').length;
        const dueCount = deck.dueCount || 0;
        
        const masteryPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;
        
        return {
            total,
            newCards,
            learning,
            review,
            mastered,
            dueCount,
            masteryPercent,
        };
    }, [deck.cards, deck.dueCount]);

    // Distribuzione percentuali
    const distribution = useMemo(() => {
        const total = stats.total || 1;
        return {
            new: (stats.newCards / total) * 100,
            learning: (stats.learning / total) * 100,
            review: (stats.review / total) * 100,
            mastered: (stats.mastered / total) * 100,
        };
    }, [stats]);

    const hasDueCards = stats.dueCount > 0;
    const hasCards = stats.total > 0;
    const hasPdf = !!deck.pdfUrl;
    const canGenerateQuiz = stats.total >= 10;

    const statItems: StatItem[] = [
        {
            label: 'Carte Totali',
            value: stats.total,
            icon: Layers,
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/15',
        },
        {
            label: 'Da Ripassare',
            value: stats.dueCount,
            icon: Clock,
            color: hasDueCards ? 'text-orange-700 dark:text-orange-300' : 'text-theme-muted',
            bgColor: hasDueCards ? 'bg-orange-500/15' : 'bg-theme-surface',
        },
        {
            label: 'Padronanza',
            value: `${stats.masteryPercent}%`,
            icon: Target,
            color: stats.masteryPercent >= 80
                ? 'text-emerald-700 dark:text-emerald-300'
                : stats.masteryPercent >= 50
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-theme-secondary',
            bgColor: stats.masteryPercent >= 80 ? 'bg-emerald-500/15' : stats.masteryPercent >= 50 ? 'bg-amber-500/15' : 'bg-theme-surface',
        },
    ];

    return (
        <div className={`
            relative overflow-hidden rounded-3xl border border-theme-default
            bg-theme-card backdrop-blur-sm shadow-theme-sm
        `}>
            {/* Background Decoration */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className={`absolute top-0 right-0 w-80 h-80 bg-gradient-to-br ${theme.gradient} rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3`} />
            </div>

            <div className="relative p-6 sm:p-8">
                {/* Top Row - Back, Title, Actions */}
                <div className="flex flex-col lg:flex-row lg:items-start gap-6 mb-6">
                    {/* Left - Back & Title */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05, x: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onBack}
                                className="p-3 rounded-xl bg-theme-surface hover:bg-theme-card border border-theme-default text-theme-secondary hover:text-theme-primary transition-all flex-shrink-0 mt-1"
                                aria-label="Torna indietro"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </motion.button>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary truncate">
                                        {deck.title}
                                    </h1>
                                    {hasDueCards && (
                                        <span className="px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 text-xs font-bold border border-orange-500/30 flex-shrink-0">
                                            {stats.dueCount} da fare
                                        </span>
                                    )}
                                </div>
                                
                                {deck.description && (
                                    <p className="text-theme-secondary text-sm sm:text-base leading-relaxed">
                                        {deck.description}
                                    </p>
                                )}

                                {/* Tags */}
                                {deck.tags && deck.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {deck.tags.map((tag, i) => (
                                            <span
                                                key={i}
                                                className="px-2.5 py-1 rounded-full bg-theme-surface border border-theme-default text-xs text-theme-secondary"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right - Quick Actions */}
                    <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
                        {hasPdf && onReadPdf && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onReadPdf}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-surface hover:bg-theme-card text-theme-primary border border-theme-default hover:border-theme-strong transition-all"
                            >
                                <FileText className="w-4 h-4" />
                                <span className="hidden sm:inline text-sm font-medium">PDF</span>
                            </motion.button>
                        )}

                        {onExamSolver && hasCards && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onExamSolver}
                                className="keep-light-text flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
                            >
                                <FileQuestion className="w-4 h-4" />
                                <span className="hidden sm:inline">Exam Solver</span>
                            </motion.button>
                        )}

                        {onGenerateQuiz && (
                            <motion.button
                                whileHover={canGenerateQuiz ? { scale: 1.02 } : undefined}
                                whileTap={canGenerateQuiz ? { scale: 0.98 } : undefined}
                                onClick={onGenerateQuiz}
                                disabled={!canGenerateQuiz}
                                title={!canGenerateQuiz ? 'Crea almeno 10 flashcard per sbloccare la generazione del quiz' : undefined}
                                className={`
                                    flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all
                                    ${canGenerateQuiz
                                        ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20'
                                        : 'bg-theme-surface border border-theme-default text-theme-muted cursor-not-allowed'
                                    }
                                `}
                            >
                                <ListChecks className="w-4 h-4" />
                                <span className="hidden sm:inline">Genera Quiz</span>
                            </motion.button>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onStudy}
                            disabled={!hasCards}
                            className={`
                                flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold
                                transition-all shadow-lg
                                ${hasCards 
                                    ? 'keep-light-text bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-primary-500/30 hover:shadow-primary-500/40' 
                                    : 'bg-theme-surface border border-theme-default text-theme-muted cursor-not-allowed'
                                }
                            `}
                        >
                            <Play className="w-4 h-4" />
                            <span>Studia</span>
                        </motion.button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {statItems.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-4 rounded-2xl bg-theme-surface border border-theme-default hover:bg-theme-card transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-theme-primary">{stat.value}</p>
                                    <p className="text-xs text-theme-secondary uppercase tracking-wide">{stat.label}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Card Distribution Bar */}
                {hasCards && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-theme-secondary flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" />
                                Distribuzione Carte
                            </span>
                            <span className="text-theme-muted text-xs">
                                {stats.newCards} nuove · {stats.learning} in studio · {stats.review} da ripassare · {stats.mastered} padroneggiate
                            </span>
                        </div>
                        
                        <div className="h-3 bg-theme-elevated rounded-full overflow-hidden flex border border-theme-default">
                            {stats.newCards > 0 && (
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${distribution.new}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                    className="h-full bg-blue-500"
                                    title={`${stats.newCards} nuove`}
                                />
                            )}
                            {stats.learning > 0 && (
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${distribution.learning}%` }}
                                    transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                                    className="h-full bg-amber-500"
                                    title={`${stats.learning} in studio`}
                                />
                            )}
                            {stats.review > 0 && (
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${distribution.review}%` }}
                                    transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                                    className="h-full bg-orange-500"
                                    title={`${stats.review} da ripassare`}
                                />
                            )}
                            {stats.mastered > 0 && (
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${distribution.mastered}%` }}
                                    transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
                                    className="h-full bg-emerald-500"
                                    title={`${stats.mastered} padroneggiate`}
                                />
                            )}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 text-xs">
                            {stats.newCards > 0 && (
                                <span className="flex items-center gap-1.5 text-theme-secondary">
                                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                                    Nuove ({stats.newCards})
                                </span>
                            )}
                            {stats.learning > 0 && (
                                <span className="flex items-center gap-1.5 text-theme-secondary">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    Studio ({stats.learning})
                                </span>
                            )}
                            {stats.review > 0 && (
                                <span className="flex items-center gap-1.5 text-theme-secondary">
                                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                                    Ripasso ({stats.review})
                                </span>
                            )}
                            {stats.mastered > 0 && (
                                <span className="flex items-center gap-1.5 text-theme-secondary">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Padroneggiate ({stats.mastered})
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Progress Bar - Mastery */}
                {hasCards && (
                    <div className="mt-6 pt-6 border-t border-theme-default">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-theme-secondary">Progresso Padronanza</span>
                            <span className={`
                                font-bold
                                ${stats.masteryPercent >= 80 ? 'text-emerald-700 dark:text-emerald-300' : stats.masteryPercent >= 50 ? 'text-amber-700 dark:text-amber-300' : 'text-theme-primary'}
                            `}>
                                {stats.masteryPercent}%
                            </span>
                        </div>
                        <div className="h-2.5 bg-theme-elevated border border-theme-default rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.masteryPercent}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className={`
                                    h-full rounded-full
                                    ${stats.masteryPercent >= 80 
                                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' 
                                        : stats.masteryPercent >= 50 
                                            ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                                            : 'bg-gradient-to-r from-primary-400 to-primary-600'
                                    }
                                `}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeckDetailHeader;
