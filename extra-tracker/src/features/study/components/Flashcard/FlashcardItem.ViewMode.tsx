/**
 * 🎴 FLASHCARD ITEM - View Mode Component v2
 * ===========================================
 *
 * Design moderno e pulito:
 * - Card a tutta larghezza senza container ingombrante
 * - Sezioni Front/Back chiaramente separate
 * - Badge stato colorato
 * - Azioni in hover
 * - Ottimizzato per la leggibilità
 */

import React, { memo } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { FileSearch, Clock, CheckCircle, Sparkles, BookOpen } from 'lucide-react';
import type { Card } from '../../services/studyService';
import { CardContentRenderer } from './CardContentRenderer/index';
import { cn } from '../../../../lib/utils';

// ============================================
// TYPES
// ============================================

interface ViewModeProps {
    card: Card;
    buttonState: {
        hasSourceMetadata: boolean;
        hasOnShowSource: boolean;
    };
    isSourceActive: boolean;
    onEdit: () => void;
    onDelete?: (cardId: string) => void;
    onShowSource?: (e: React.MouseEvent) => void;
    onCardClick?: (e: React.MouseEvent) => void;
}

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG = {
    new: { 
        label: 'Nuova', 
        color: 'bg-blue-500', 
        textColor: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        icon: Sparkles 
    },
    learning: { 
        label: 'In studio', 
        color: 'bg-amber-500', 
        textColor: 'text-amber-700 dark:text-amber-300',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        icon: BookOpen 
    },
    review: { 
        label: 'Da ripassare', 
        color: 'bg-orange-500', 
        textColor: 'text-orange-700 dark:text-orange-300',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
        icon: Clock 
    },
    mastered: { 
        label: 'Padroneggiata', 
        color: 'bg-emerald-500', 
        textColor: 'text-emerald-700 dark:text-emerald-300',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        icon: CheckCircle 
    },
};

// ============================================
// COMPONENT
// ============================================

const ViewModeComponent: React.FC<ViewModeProps> = ({
    card,
    buttonState,
    isSourceActive,
    onEdit,
    onDelete,
    onShowSource,
    onCardClick,
}) => {
    const status = STATUS_CONFIG[card.status] || STATUS_CONFIG.new;
    const StatusIcon = status.icon;

    return (
        <div 
            className="group relative"
            onClick={onCardClick}
        >
            {/* Card Container */}
            <div className={cn(
                "relative bg-theme-surface border rounded-xl overflow-hidden transition-all duration-200",
                "hover:shadow-lg hover:border-theme-strong",
                isSourceActive 
                    ? "border-primary-500 ring-2 ring-primary-500/20" 
                    : "border-theme-default"
            )}>
                {/* Header with Status Badge */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-theme-subtle bg-theme-subtle/30">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                            status.bgColor, status.textColor, status.borderColor, "border"
                        )}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.label}
                        </span>
                        
                        {/* Interval badge if not new */}
                        {card.status !== 'new' && card.interval > 0 && (
                            <span className="text-xs text-theme-muted">
                                · {card.interval}g
                            </span>
                        )}
                    </div>

                    {/* Action Buttons - Always visible on mobile, hover on desktop */}
                    <div className="flex items-center gap-1">
                        {buttonState.hasSourceMetadata && buttonState.hasOnShowSource && (
                            <button
                                onClick={onShowSource}
                                className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    isSourceActive 
                                        ? "bg-primary-500 text-white" 
                                        : "text-theme-muted hover:text-theme-primary hover:bg-theme-card"
                                )}
                                title="Mostra sorgente"
                            >
                                <FileSearch className="w-4 h-4" />
                            </button>
                        )}
                        
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                            className="p-1.5 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-card transition-colors"
                            title="Modifica"
                        >
                            <FiEdit2 className="w-4 h-4" />
                        </button>
                        
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(card.id);
                                }}
                                className="p-1.5 rounded-lg text-theme-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Elimina"
                            >
                                <FiTrash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-4">
                    {/* Front Side */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-theme-muted">
                                Fronte
                            </span>
                            <div className="flex-1 h-px bg-theme-subtle" />
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <CardContentRenderer
                                content={card.front}
                                variant="question"
                                size="base"
                            />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-theme-subtle" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-theme-surface px-3 text-[10px] font-medium text-theme-muted uppercase tracking-wider">
                                Retro
                            </span>
                        </div>
                    </div>

                    {/* Back Side */}
                    <div>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <CardContentRenderer
                                content={card.back}
                                variant="answer"
                                size="base"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer - Metadata */}
                {(card.interval > 0 || card.repetitions > 0) && (
                    <div className="px-4 py-2 border-t border-theme-subtle bg-theme-subtle/20">
                        <div className="flex items-center gap-4 text-xs text-theme-muted">
                            {card.repetitions > 0 && (
                                <span>📚 {card.repetitions} ripetizioni</span>
                            )}
                            {card.interval > 0 && (
                                <span>📅 Intervallo: {card.interval} giorni</span>
                            )}
                            {card.easinessFactor && card.easinessFactor !== 2.5 && (
                                <span>🎯 EF: {card.easinessFactor.toFixed(2)}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Memoized ViewMode component.
 */
export const ViewMode = memo(ViewModeComponent);
