/**
 * 📋 QUESTIONS PREVIEW - Componente per visualizzare e selezionare domande estratte
 * 
 * Features:
 * - Ricerca/filtro domande
 * - Keyboard shortcuts
 * - Virtualizzazione per performance
 * - Raggruppamento domande simili
 * - Animazioni smooth
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Square, Search, AlertCircle, RotateCcw } from 'lucide-react';
import { QuestionsSkeleton } from './QuestionsSkeleton';
import type { QuestionsPreviewProps } from './ExamSolverModal.types';
import { examSolverBadgeClass, examSolverButtonClass, examSolverFieldClass } from '../../utils/studyButtonClasses';

// Re-export for convenience
export type { QuestionsPreviewProps };

// ============================================
// HOOK: useKeyboardShortcuts
// ============================================

const useKeyboardShortcuts = (
    questions: string[],
    selectedIndices: Set<number>,
    onSelectionChange: (indices: Set<number>) => void,
    focusedIndex: number | null,
    setFocusedIndex: (index: number | null) => void
) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+A: Seleziona tutte
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                onSelectionChange(new Set(questions.map((_, idx) => idx)));
            }
            
            // Esc: Deseleziona tutte
            if (e.key === 'Escape') {
                e.preventDefault();
                onSelectionChange(new Set());
            }
            
            // Spazio: Toggle selezione domanda focused
            if (e.key === ' ' && focusedIndex !== null) {
                e.preventDefault();
                const newSelected = new Set(selectedIndices);
                if (newSelected.has(focusedIndex)) {
                    newSelected.delete(focusedIndex);
                } else {
                    newSelected.add(focusedIndex);
                }
                onSelectionChange(newSelected);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [questions, selectedIndices, onSelectionChange, focusedIndex]);
};

// ============================================
// UTILITY: Raggruppa domande simili
// ============================================

interface GroupedQuestion {
    prefix: string;
    questions: Array<{ text: string; originalIndex: number }>;
}

const groupSimilarQuestions = (questions: Array<{ text: string; originalIndex: number }>): GroupedQuestion[] => {
    const groups: Map<string, Array<{ text: string; originalIndex: number }>> = new Map();
    
    questions.forEach((questionObj) => {
        const question = questionObj.text;
        // Estrai prefisso comune (prime 3-5 parole)
        const words = question.trim().split(/\s+/).slice(0, 5);
        const prefix = words.join(' ').toLowerCase();
        
        // Cerca gruppo esistente con prefisso simile
        let foundGroup = false;
        for (const [existingPrefix, group] of groups.entries()) {
            // Se il prefisso inizia con quello esistente o viceversa
            if (prefix.startsWith(existingPrefix.substring(0, 20)) || 
                existingPrefix.startsWith(prefix.substring(0, 20))) {
                group.push({ text: question, originalIndex: questionObj.originalIndex });
                foundGroup = true;
                break;
            }
        }
        
        if (!foundGroup) {
            groups.set(prefix, [{ text: question, originalIndex: questionObj.originalIndex }]);
        }
    });
    
    return Array.from(groups.entries()).map(([prefix, questions]) => ({
        prefix,
        questions,
    }));
};

// ============================================
// COMPONENT: VirtualizedList (semplice)
// ============================================

interface VirtualizedListProps {
    items: Array<{ text: string; originalIndex: number }>;
    renderItem: (item: { text: string; originalIndex: number }, index: number) => React.ReactNode;
    itemHeight?: number;
    containerHeight?: number;
}

const VirtualizedList: React.FC<VirtualizedListProps> = ({
    items,
    renderItem,
    itemHeight = 80,
    containerHeight = 384, // max-h-96 = 384px
}) => {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calcola quali item sono visibili
    const visibleRange = useMemo(() => {
        const start = Math.floor(scrollTop / itemHeight);
        const end = Math.min(
            items.length - 1,
            Math.ceil((scrollTop + containerHeight) / itemHeight)
        );
        return { start, end };
    }, [scrollTop, itemHeight, containerHeight, items.length]);

    const visibleItems = items.slice(visibleRange.start, visibleRange.end + 1);
    const totalHeight = items.length * itemHeight;
    const offsetY = visibleRange.start * itemHeight;

    if (items.length <= 50) {
        // Non virtualizzare se ci sono poche domande
        return (
            <div className="space-y-2">
                {items.map((item, idx) => renderItem(item, idx))}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="overflow-y-auto custom-scrollbar"
            style={{ height: containerHeight }}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((item, idx) => (
                        <div key={item.originalIndex} style={{ height: itemHeight }}>
                            {renderItem(item, visibleRange.start + idx)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ============================================
// COMPONENT: QuestionsPreview
// ============================================

export const QuestionsPreview: React.FC<QuestionsPreviewProps> = ({
    questions,
    selectedIndices,
    onSelectionChange,
    onBack,
    onNext,
    error,
    isLoading = false,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [useGrouping, setUseGrouping] = useState(true);
    const hasQuestionsRef = useRef(false);

    // Track quando le domande arrivano per forzare re-render
    useEffect(() => {
        if (questions.length > 0) {
            hasQuestionsRef.current = true;
        }
    }, [questions.length]);

    // Keyboard shortcuts
    useKeyboardShortcuts(questions, selectedIndices, onSelectionChange, focusedIndex, setFocusedIndex);

    // Filtra domande basandosi sulla ricerca
    const filteredQuestions = useMemo(() => {
        if (!searchQuery.trim()) {
            return questions.map((q, idx) => ({ text: q, originalIndex: idx }));
        }
        
        const query = searchQuery.toLowerCase();
        return questions
            .map((q, idx) => ({ text: q, originalIndex: idx }))
            .filter(({ text }) => text.toLowerCase().includes(query));
    }, [questions, searchQuery]);

    // Raggruppa domande se abilitato
    const groupedQuestions = useMemo(() => {
        if (!useGrouping || filteredQuestions.length < 5) {
            return null;
        }
        return groupSimilarQuestions(filteredQuestions);
    }, [filteredQuestions, useGrouping]);

    // Calcola statistiche
    const filteredSelectedCount = useMemo(() => {
        return filteredQuestions.filter(q => selectedIndices.has(q.originalIndex)).length;
    }, [filteredQuestions, selectedIndices]);

    // Handlers
    const handleToggleSelection = useCallback((index: number) => {
        const newSelected = new Set(selectedIndices);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        onSelectionChange(newSelected);
    }, [selectedIndices, onSelectionChange]);

    const handleSelectAll = useCallback(() => {
        if (filteredSelectedCount === filteredQuestions.length) {
            // Deseleziona tutte
            const newSelected = new Set(selectedIndices);
            filteredQuestions.forEach(q => newSelected.delete(q.originalIndex));
            onSelectionChange(newSelected);
        } else {
            // Seleziona tutte
            const newSelected = new Set(selectedIndices);
            filteredQuestions.forEach(q => newSelected.add(q.originalIndex));
            onSelectionChange(newSelected);
        }
    }, [filteredQuestions, filteredSelectedCount, selectedIndices, onSelectionChange]);

    const handleInvertSelection = useCallback(() => {
        const newSelected = new Set(selectedIndices);
        filteredQuestions.forEach(q => {
            if (newSelected.has(q.originalIndex)) {
                newSelected.delete(q.originalIndex);
            } else {
                newSelected.add(q.originalIndex);
            }
        });
        onSelectionChange(newSelected);
    }, [filteredQuestions, selectedIndices, onSelectionChange]);

    // Render item
    const renderQuestionItem = useCallback((
        item: { text: string; originalIndex: number },
        displayIndex: number
    ) => {
        const isSelected = selectedIndices.has(item.originalIndex);
        
        return (
            <motion.label
                key={`question-${item.originalIndex}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: displayIndex * 0.02 }}
                onMouseEnter={() => setFocusedIndex(item.originalIndex)}
                onMouseLeave={() => setFocusedIndex(null)}
                className={`
                    flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all
                    ${isSelected
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : focusedIndex === item.originalIndex
                        ? 'bg-theme-elevated border-theme-default'
                        : 'bg-theme-surface border-theme-subtle hover:bg-theme-elevated hover:border-theme-default'
                    }
                `}
            >
                <div className="flex-shrink-0 mt-0.5">
                    <motion.div
                        animate={{ scale: isSelected ? 1.1 : 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-amber-500" />
                        ) : (
                            <Square className="w-5 h-5 text-theme-muted" />
                        )}
                    </motion.div>
                </div>
                <div className="flex-1">
                    <p className="text-sm text-theme-primary leading-relaxed">
                        {item.text}
                    </p>
                </div>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelection(item.originalIndex)}
                    className="hidden"
                />
            </motion.label>
        );
    }, [selectedIndices, focusedIndex, handleToggleSelection]);

    // Determina cosa mostrare
    const showSkeleton = isLoading && questions.length === 0;
    const showEmpty = !isLoading && questions.length === 0;
    const showQuestions = !isLoading && questions.length > 0 && filteredQuestions.length > 0;
    const showNoResults = !isLoading && questions.length > 0 && filteredQuestions.length === 0 && searchQuery.trim() !== '';

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
        >
            {/* Header con contatore */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-theme-primary">
                            {isLoading ? 'Estrazione in corso...' : 'Domande Estratte'}
                        </h3>
                        <p className="text-xs text-theme-secondary mt-1">
                            {questions.length} domande totali
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className={examSolverBadgeClass('warning', 'px-4 py-2 rounded-xl text-sm font-semibold')}
                        >
                            <span>{filteredSelectedCount} di {filteredQuestions.length} selezionate</span>
                        </motion.div>
                    </div>
                </div>

                {/* Barra ricerca e controlli */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cerca domande..."
                            className={examSolverFieldClass('compact', 'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm')}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSelectAll}
                            className={examSolverButtonClass('ghost', 'px-3 py-2 rounded-lg text-xs font-medium')}
                        >
                            {filteredSelectedCount === filteredQuestions.length ? 'Deseleziona' : 'Seleziona tutte'}
                        </button>
                        <button
                            onClick={handleInvertSelection}
                            className={examSolverButtonClass(
                                'ghost',
                                'px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5'
                            )}
                            title="Inverti selezione"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Inverti
                        </button>
                    </div>
                </div>

                {/* Info keyboard shortcuts */}
                <div className="flex items-center gap-4 text-xs text-theme-muted">
                    <span>⌨️ <kbd className="px-1.5 py-0.5 rounded bg-theme-surface border border-theme-subtle">Ctrl+A</kbd> Seleziona tutte</span>
                    <span><kbd className="px-1.5 py-0.5 rounded bg-theme-surface border border-theme-subtle">Esc</kbd> Deseleziona</span>
                    <span><kbd className="px-1.5 py-0.5 rounded bg-theme-surface border border-theme-subtle">Spazio</kbd> Toggle</span>
                </div>
            </div>

            {/* Lista domande - LOGICA SEMPLIFICATA */}
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {/* Skeleton - solo durante caricamento iniziale */}
                {showSkeleton && (
                    <motion.div
                        key="skeleton"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <QuestionsSkeleton count={8} isLoading={true} />
                    </motion.div>
                )}

                {/* Messaggio vuoto - nessuna domanda estratta */}
                {showEmpty && (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8"
                    >
                        <p className="text-sm text-theme-secondary">
                            Nessuna domanda estratta
                        </p>
                    </motion.div>
                )}

                {/* Nessun risultato dalla ricerca */}
                {showNoResults && (
                    <motion.div
                        key="no-results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8"
                    >
                        <p className="text-sm text-theme-secondary">
                            Nessuna domanda trovata per &quot;{searchQuery}&quot;
                        </p>
                    </motion.div>
                )}

                {/* DOMANDE - Renderizzate sempre quando disponibili */}
                {showQuestions && (
                    <motion.div
                        key={`questions-${questions.length}-${hasQuestionsRef.current}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-2"
                    >
                        {groupedQuestions && groupedQuestions.length > 0 ? (
                            // Domande raggruppate
                            <div className="space-y-4">
                                {groupedQuestions.map((group, groupIdx) => (
                                    <div key={`group-${groupIdx}`} className="space-y-2">
                                        {group.questions.length > 1 && (
                                            <div className={examSolverBadgeClass('neutral', 'px-3 py-1.5 rounded-lg text-xs font-medium')}>
                                                <p>
                                                    {group.questions.length} domande simili
                                                </p>
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            {group.questions.map((item, idx) => 
                                                renderQuestionItem(item, item.originalIndex)
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Lista piatta normale
                            <VirtualizedList
                                items={filteredQuestions}
                                renderItem={renderQuestionItem}
                            />
                        )}
                    </motion.div>
                )}
            </div>

            {/* Error message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm flex items-center gap-2"
                >
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                </motion.div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3">
                <button
                    onClick={onBack}
                    className={examSolverButtonClass('neutral', 'flex-1 px-4 py-3 rounded-xl font-medium')}
                >
                    Indietro
                </button>
                <button
                    onClick={onNext}
                    disabled={selectedIndices.size === 0}
                    className={examSolverButtonClass(
                        'primary',
                        'flex-1 px-4 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                    )}
                >
                    Continua ({selectedIndices.size} selezionate)
                    <motion.span
                        animate={{ x: [0, 4, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                        →
                    </motion.span>
                </button>
            </div>
        </motion.div>
    );
};

export default QuestionsPreview;
