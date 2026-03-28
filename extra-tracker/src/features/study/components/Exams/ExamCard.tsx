/**
 * EXAM CARD - Card esame migliorata con più informazioni visive
 * 
 * Mostra:
 * - Icona dinamica in base alla materia
 * - Titolo, descrizione e stato
 * - Mini distribuzione delle carte (new/learning/review/mastered)
 * - Statistiche principali
 * - Timeline scadenza visiva
 * - Badge carte da ripassare
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    ArrowRight,
    Layers,
    FileText,
    Target,
    MoreVertical,
    Trash2,
    RotateCcw,
    Clock,
    Sparkles,
    AlertCircle,
    CheckCircle,
    Archive,
    XCircle,
} from 'lucide-react';
import type { Exam } from '../../types/exam';
import type { Deck } from '../../services/studyService';
import { getExamIcon, getExamColors } from './utils/examIcons';

// ============================================
// TYPES
// ============================================

interface ExamCardProps {
    exam: Exam;
    deckCount: number;
    totalCards: number;
    dueCards: number;
    masteryPercent: number;
    decks?: Deck[]; // Opzionale per statistiche dettagliate
    onClick: () => void;
    onDelete?: (examId: string) => void;
    onReactivate?: (examId: string) => void;
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
    decks = [],
    onClick,
    onDelete,
    onReactivate,
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const deadlineDate = new Date(exam.deadline);
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isUrgent = daysUntilDeadline <= 7 && daysUntilDeadline >= 0;
    const isOverdue = daysUntilDeadline < 0;

    // Rileva materia e icona automaticamente
    const ExamIcon = getExamIcon(exam.title, exam.description);
    const examColors = getExamColors(exam.title, exam.description);

    // Calcola distribuzione delle carte
    const distribution = useMemo(() => {
        const examDecks = decks.filter(d => d.examId === exam.id);
        const allCards = examDecks.flatMap(d => d.cards || []);
        
        return {
            new: allCards.filter(c => c.status === 'new').length,
            learning: allCards.filter(c => c.status === 'learning').length,
            review: allCards.filter(c => c.status === 'review').length,
            mastered: allCards.filter(c => c.status === 'mastered').length,
        };
    }, [decks, exam.id]);

    // Chiudi menu quando si clicca fuori
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    // Determina lo stato visualizzato
    const statusConfig = useMemo(() => {
        switch (exam.status) {
            case 'passed':
                return {
                    label: 'Superato',
                    icon: CheckCircle,
                    color: 'text-emerald-400',
                    bgColor: 'bg-emerald-500/20',
                    borderColor: 'border-emerald-500/40',
                };
            case 'failed':
                return {
                    label: 'Non Superato',
                    icon: XCircle,
                    color: 'text-rose-400',
                    bgColor: 'bg-rose-500/20',
                    borderColor: 'border-rose-500/40',
                };
            case 'archived':
                return {
                    label: 'Archiviato',
                    icon: Archive,
                    color: 'text-slate-400',
                    bgColor: 'bg-slate-500/20',
                    borderColor: 'border-slate-500/40',
                };
            case 'completed':
                return {
                    label: 'Completato',
                    icon: CheckCircle,
                    color: 'text-blue-400',
                    bgColor: 'bg-blue-500/20',
                    borderColor: 'border-blue-500/40',
                };
            default:
                if (isOverdue) {
                    return {
                        label: 'Scaduto',
                        icon: AlertCircle,
                        color: 'text-red-400',
                        bgColor: 'bg-red-500/20',
                        borderColor: 'border-red-500/40',
                    };
                }
                if (isUrgent) {
                    return {
                        label: 'Urgente',
                        icon: AlertCircle,
                        color: 'text-orange-400',
                        bgColor: 'bg-orange-500/20',
                        borderColor: 'border-orange-500/40',
                    };
                }
                return {
                    label: 'In Corso',
                    icon: Sparkles,
                    color: examColors.color,
                    bgColor: examColors.bgColor,
                    borderColor: examColors.borderColor,
                };
        }
    }, [exam.status, isOverdue, isUrgent, examColors]);

    const isCompleted = ['passed', 'failed', 'archived', 'completed'].includes(exam.status);

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        if (onDelete) {
            onDelete(exam.id);
        }
    };

    const handleReactivateClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        if (onReactivate) {
            onReactivate(exam.id);
        }
    };

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
    };

    // Calcola percentuali per la barra di distribuzione
    const distTotal = totalCards || 1;
    const distPercentages = {
        new: (distribution.new / distTotal) * 100,
        learning: (distribution.learning / distTotal) * 100,
        review: (distribution.review / distTotal) * 100,
        mastered: (distribution.mastered / distTotal) * 100,
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={onClick}
            className={`
                relative rounded-2xl border overflow-hidden cursor-pointer
                transition-all duration-300 h-full flex flex-col
                ${isUrgent || isOverdue
                    ? 'border-orange-500/40 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent shadow-lg shadow-orange-500/10'
                    : isCompleted
                        ? 'border-white/10 bg-gradient-to-br from-white/5 to-transparent opacity-80'
                        : 'border-primary-500/30 bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent'
                }
                hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/15
                backdrop-blur-sm
            `}
        >
            {/* Header con Icona, Titolo e Stato */}
            <div className="p-5 pb-4 flex-1 flex flex-col">
                <div className="flex items-start gap-4 mb-4">
                    {/* Icona Esame */}
                    <div className={`
                        p-3 rounded-xl flex-shrink-0 border-2
                        ${statusConfig.bgColor} ${statusConfig.borderColor}
                    `}>
                        <ExamIcon className={`w-6 h-6 ${statusConfig.color}`} />
                    </div>
                    
                    {/* Titolo e Descrizione */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white text-lg truncate leading-tight">
                                {exam.title}
                            </h3>
                        </div>
                        
                        {/* Stato Badge */}
                        <div className="flex items-center gap-2">
                            <span className={`
                                px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide
                                ${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor}
                                flex items-center gap-1
                            `}>
                                <statusConfig.icon className="w-3 h-3" />
                                {statusConfig.label}
                            </span>
                            
                            {dueCards > 0 && !isCompleted && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                    {dueCards} da ripassare
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Context Menu */}
                    {onDelete && (
                        <div className="relative flex-shrink-0" ref={menuRef}>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleMenuClick}
                                className={`
                                    p-2 rounded-lg transition-all
                                    ${isMenuOpen
                                        ? 'bg-theme-elevated text-theme-primary'
                                        : 'bg-theme-surface text-theme-muted hover:bg-theme-elevated hover:text-theme-primary'
                                    }
                                `}
                                aria-label="Menu opzioni"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </motion.button>

                            <AnimatePresence>
                                {isMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-theme-default bg-theme-elevated shadow-2xl shadow-black/60 overflow-hidden z-50"
                                    >
                                        {isCompleted && onReactivate && (
                                            <button
                                                onClick={handleReactivateClick}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-left text-blue-400 hover:bg-blue-500/15 transition-colors border-b border-theme-subtle"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                <span className="text-sm font-medium">Riattiva</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={handleDeleteClick}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-400 hover:bg-red-500/15 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span className="text-sm font-medium">Elimina</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Descrizione */}
                {exam.description && (
                    <p className="text-sm text-white/50 line-clamp-2 leading-relaxed mb-4">
                        {exam.description}
                    </p>
                )}

                {/* Mini Distribuzione Carte (se ci sono carte) */}
                {totalCards > 0 && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-white/40 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                {totalCards} carte
                            </span>
                            <span className={`
                                font-medium
                                ${masteryPercent >= 80 ? 'text-emerald-400' : masteryPercent >= 50 ? 'text-amber-400' : 'text-white/60'}
                            `}>
                                {masteryPercent}% padronanza
                            </span>
                        </div>
                        
                        {/* Barra Distribuzione */}
                        <div className="h-2 bg-theme-surface rounded-full overflow-hidden flex">
                            {distribution.new > 0 && (
                                <div 
                                    className="h-full bg-blue-500"
                                    style={{ width: `${distPercentages.new}%` }}
                                    title={`${distribution.new} nuove`}
                                />
                            )}
                            {distribution.learning > 0 && (
                                <div 
                                    className="h-full bg-amber-500"
                                    style={{ width: `${distPercentages.learning}%` }}
                                    title={`${distribution.learning} in apprendimento`}
                                />
                            )}
                            {distribution.review > 0 && (
                                <div 
                                    className="h-full bg-orange-500"
                                    style={{ width: `${distPercentages.review}%` }}
                                    title={`${distribution.review} da ripassare`}
                                />
                            )}
                            {distribution.mastered > 0 && (
                                <div 
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${distPercentages.mastered}%` }}
                                    title={`${distribution.mastered} padroneggiate`}
                                />
                            )}
                        </div>
                        
                        {/* Legenda mini */}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-white/40">
                            {distribution.new > 0 && (
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    {distribution.new} nuove
                                </span>
                            )}
                            {distribution.mastered > 0 && (
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {distribution.mastered} ok
                                </span>
                            )}
                            {dueCards > 0 && (
                                <span className="flex items-center gap-1 text-orange-400 ml-auto">
                                    <Clock className="w-3 h-3" />
                                    {dueCards} da fare
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mt-auto pt-3">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-theme-surface border border-theme-default">
                        <Layers className="w-4 h-4 text-primary-400" />
                        <div>
                            <p className="text-lg font-bold text-theme-primary leading-none">{deckCount}</p>
                            <p className="text-[10px] text-theme-muted uppercase tracking-wide">Mazzi</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-theme-surface border border-theme-default">
                        <Target className="w-4 h-4 text-emerald-400" />
                        <div>
                            <p className="text-lg font-bold text-theme-primary leading-none">{masteryPercent}%</p>
                            <p className="text-[10px] text-theme-muted uppercase tracking-wide">Padronanza</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer con Scadenza */}
            <div className="px-5 py-3 border-t border-theme-subtle bg-theme-surface/50">
                <div className="flex items-center justify-between">
                    {/* Scadenza */}
                    <div className="flex items-center gap-2.5">
                        <div className={`
                            p-1.5 rounded-lg
                            ${isOverdue
                                ? 'bg-red-500/20 border border-red-500/30'
                                : isUrgent
                                    ? 'bg-orange-500/20 border border-orange-500/30'
                                    : 'bg-theme-surface border border-theme-default'
                                }
                            `}>
                                <Calendar className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-theme-muted'}`} />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/40 uppercase tracking-wide">Scadenza</p>
                            <p className={`text-sm font-semibold ${isOverdue ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-white/80'}`}>
                                {isOverdue 
                                    ? `Scaduto (${Math.abs(daysUntilDeadline)}gg fa)`
                                    : daysUntilDeadline === 0 
                                        ? 'Oggi!'
                                        : daysUntilDeadline === 1 
                                            ? 'Domani'
                                            : `${daysUntilDeadline} giorni`
                                }
                            </p>
                        </div>
                    </div>

                    {/* Freccia */}
                    <div className={`
                        p-2 rounded-lg transition-colors
                        ${isUrgent || isOverdue
                            ? 'bg-orange-500/10 border border-orange-500/30'
                            : 'bg-primary-500/10 border border-primary-500/30'
                        }
                    `}>
                        <ArrowRight className={`w-4 h-4 ${isUrgent || isOverdue ? 'text-orange-400' : 'text-primary-400'}`} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ExamCard;
