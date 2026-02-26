/**
 * EXAM QUICK ACTIONS - Azioni rapide per la pagina dettaglio esame
 * 
 * Mostra:
 * - Studio rapido (priorità)
 * - Genera carte AI
 * - Aggiungi mazzo
 * - Esame simulator
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
    Play,
    Sparkles,
    Plus,
    FileQuestion,
    BookOpen,
    RotateCcw,
    Archive,
    CheckCircle,
    Trash2,
} from 'lucide-react';
import type { Exam } from '../../types/exam';
import type { Deck } from '../../services/studyService';

// ============================================
// TYPES
// ============================================

interface ExamQuickActionsProps {
    exam: Exam;
    decks: Deck[];
    onStudy?: (deckId: string) => void;
    onStudyAll?: () => void;
    onMagicGenerate?: () => void;
    onAddDeck?: () => void;
    onExamSolver?: () => void;
    onReactivate?: () => void;
    onArchive?: () => void;
    onComplete?: () => void;
    onDeleteExam?: () => void;
}

interface ActionButton {
    id: string;
    label: string;
    description?: string;
    icon: React.ElementType;
    variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    onClick: () => void;
    disabled?: boolean;
    hidden?: boolean;
    badge?: string | number;
}

// ============================================
// COMPONENT
// ============================================

export const ExamQuickActions: React.FC<ExamQuickActionsProps> = ({
    exam,
    decks,
    onStudy,
    onStudyAll,
    onMagicGenerate,
    onAddDeck,
    onExamSolver,
    onReactivate,
    onArchive,
    onComplete,
    onDeleteExam,
}) => {
    const examDecks = decks.filter(d => d.examId === exam.id);
    const totalCards = examDecks.reduce((sum, d) => sum + (d.totalCards || d.cards?.length || 0), 0);
    const dueCards = examDecks.reduce((sum, d) => sum + (d.dueCount || 0), 0);
    const hasDueCards = dueCards > 0;

    // Trova il mazzo con più carte da ripassare
    const priorityDeck = examDecks
        .filter(d => (d.dueCount || 0) > 0)
        .sort((a, b) => (b.dueCount || 0) - (a.dueCount || 0))[0];

    const isActive = exam.status === 'active';
    const isCompleted = ['passed', 'failed', 'archived', 'completed'].includes(exam.status);

    const allActions: ActionButton[] = [
        // Azione primaria: Studio
        {
            id: 'study',
            label: priorityDeck ? `Studia ${priorityDeck.title}` : 'Inizia Studio',
            description: hasDueCards ? `${dueCards} carte da ripassare` : totalCards > 0 ? `${totalCards} carte disponibili` : 'Nessuna carta da studiare',
            icon: Play,
            variant: hasDueCards ? 'primary' : 'secondary',
            onClick: () => {
                if (priorityDeck && onStudy) {
                    onStudy(priorityDeck.id);
                } else if (onStudyAll) {
                    onStudyAll();
                }
            },
            disabled: totalCards === 0 || !isActive,
            hidden: isCompleted,
            badge: hasDueCards ? dueCards : undefined,
        },
        // Studio di tutti i mazzi
        {
            id: 'study-all',
            label: 'Studia Tutto',
            description: `Tutti i ${examDecks.length} mazzi`,
            icon: BookOpen,
            variant: 'outline',
            onClick: () => onStudyAll?.(),
            disabled: totalCards === 0 || !isActive,
            hidden: isCompleted || examDecks.length <= 1,
        },
        // Genera carte AI
        {
            id: 'magic',
            label: 'Genera Carte AI',
            description: 'Crea flashcard automaticamente',
            icon: Sparkles,
            variant: 'outline',
            onClick: () => onMagicGenerate?.(),
            disabled: !isActive,
            hidden: isCompleted || !onMagicGenerate,
        },
        // Aggiungi mazzo
        {
            id: 'add-deck',
            label: 'Nuovo Mazzo',
            description: 'Crea un mazzo di carte',
            icon: Plus,
            variant: 'ghost',
            onClick: () => onAddDeck?.(),
            disabled: !isActive,
            hidden: isCompleted || !onAddDeck,
        },
        // Simulatore esame
        {
            id: 'exam-solver',
            label: 'Simula Esame',
            description: 'Prova le tue conoscenze',
            icon: FileQuestion,
            variant: 'outline',
            onClick: () => onExamSolver?.(),
            disabled: totalCards < 5 || !isActive,
            hidden: isCompleted || !onExamSolver,
        },
        // Riattiva (solo completati)
        {
            id: 'reactivate',
            label: 'Riattiva Esame',
            description: 'Torna a studiare',
            icon: RotateCcw,
            variant: 'outline',
            onClick: () => onReactivate?.(),
            hidden: !isCompleted || !onReactivate,
        },
        // Completa (solo attivi)
        {
            id: 'complete',
            label: 'Completa Esame',
            description: 'Segna come completato',
            icon: CheckCircle,
            variant: 'ghost',
            onClick: () => onComplete?.(),
            hidden: !isActive || !onComplete,
        },
        // Archivia (solo attivi)
        {
            id: 'archive',
            label: 'Archivia',
            description: 'Nascondi dalla dashboard',
            icon: Archive,
            variant: 'ghost',
            onClick: () => onArchive?.(),
            hidden: !isActive || !onArchive,
        },
        // Elimina esame (mantiene i mazzi, scollegandoli dall'esame)
        {
            id: 'delete-exam',
            label: 'Elimina Esame',
            description: 'Rimuove l\'esame, i mazzi restano',
            icon: Trash2,
            variant: 'danger',
            onClick: () => onDeleteExam?.(),
            hidden: !onDeleteExam,
        },
    ];
    const actions = allActions.filter((a) => !a.hidden);

    const getVariantClasses = (variant: ActionButton['variant']) => {
        switch (variant) {
            case 'primary':
                return 'exam-quick-action exam-quick-action--primary';
            case 'secondary':
                return 'exam-quick-action exam-quick-action--secondary';
            case 'outline':
                return 'exam-quick-action exam-quick-action--outline';
            case 'ghost':
                return 'exam-quick-action exam-quick-action--ghost';
            case 'danger':
                return 'exam-quick-action exam-quick-action--danger';
            default:
                return 'exam-quick-action exam-quick-action--outline';
        }
    };

    return (
        <div className="space-y-3">
            <h3 className="exam-quick-actions-title text-sm font-semibold uppercase tracking-wide mb-3">
                Azioni Rapide
            </h3>
            
            {actions.map((action, index) => {
                const isSolidVariant = action.variant === 'primary' || action.variant === 'secondary';
                return (
                <motion.button
                    key={action.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={`
                        w-full flex items-center gap-4 p-4 rounded-xl
                        transition-all duration-200
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/45 focus-visible:ring-offset-2
                        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                        ${getVariantClasses(action.variant)}
                    `}
                >
                    <div className={`
                        exam-quick-action-icon p-2.5 rounded-lg flex-shrink-0
                        ${isSolidVariant
                            ? 'exam-quick-action-icon--solid' 
                            : 'exam-quick-action-icon--subtle'
                        }
                    `}>
                        <action.icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold truncate">{action.label}</span>
                            {action.badge !== undefined && (
                                <span className={`
                                    exam-quick-action-badge px-2 py-0.5 rounded-full text-xs font-bold
                                    ${action.variant === 'primary' 
                                        ? 'exam-quick-action-badge--primary' 
                                        : 'exam-quick-action-badge--accent'
                                    }
                                `}>
                                    {action.badge}
                                </span>
                            )}
                        </div>
                        {action.description && (
                            <p className={`
                                exam-quick-action-description text-xs mt-0.5 truncate
                                ${isSolidVariant
                                    ? 'exam-quick-action-description--solid' 
                                    : 'exam-quick-action-description--subtle'
                                }
                            `}>
                                {action.description}
                            </p>
                        )}
                    </div>
                </motion.button>
                );
            })}
        </div>
    );
};

export default ExamQuickActions;
