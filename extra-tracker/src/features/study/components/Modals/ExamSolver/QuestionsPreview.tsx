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
import { QuestionsSkeleton, StreamingSkeleton } from './QuestionsSkeleton';

// ============================================
// TYPES
// ============================================

export interface QuestionsPreviewProps {
    questions: string[];
    selectedIndices: Set<number>;
    onSelectionChange: (indices: Set<number>) => void;
    onBack: () => void;
    onNext: () => void;
    error: string | null;
    isLoading?: boolean; // Se true, mostra skeleton durante estrazione
}

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

const groupSimilarQuestions = (questions: string[]): GroupedQuestion[] => {
    const groups: Map<string, Array<{ text: string; originalIndex: number }>> = new Map();
    
    questions.forEach((question, idx) => {
        // Estrai prefisso comune (prime 3-5 parole)
        const words = question.trim().split(/\s+/).slice(0, 5);
        const prefix = words.join(' ').toLowerCase();
        
        // Cerca gruppo esistente con prefisso simile
        let foundGroup = false;
        for (const [existingPrefix, group] of groups.entries()) {
            // Se il prefisso inizia con quello esistente o viceversa
            if (prefix.startsWith(existingPrefix.substring(0, 20)) || 
                existingPrefix.startsWith(prefix.substring(0, 20))) {
                group.push({ text: question, originalIndex: idx });
                foundGroup = true;
                break;
            }
        }
        
        if (!foundGroup) {
            groups.set(prefix, [{ text: question, originalIndex: idx }]);
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
    const [streamingQuestions, setStreamingQuestions] = useState<string[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const streamingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Keyboard shortcuts
    useKeyboardShortcuts(questions, selectedIndices, onSelectionChange, focusedIndex, setFocusedIndex);

    // Streaming simulato quando le domande arrivano
    useEffect(() => {
        if (isLoading && questions.length === 0) {
            // Reset streaming quando inizia il loading
            setStreamingQuestions([]);
            setIsStreaming(false);
        } else if (!isLoading && questions.length > 0 && streamingQuestions.length === 0) {
            // Inizia streaming quando le domande arrivano
            setIsStreaming(true);
            setStreamingQuestions([]);
            
            // Simula streaming: aggiungi una domanda ogni 300ms
            let currentIndex = 0;
            streamingTimerRef.current = setInterval(() => {
                if (currentIndex < questions.length) {
                    setStreamingQuestions(prev => [...prev, questions[currentIndex]]);
                    currentIndex++;
                } else {
                    if (streamingTimerRef.current) {
                        clearInterval(streamingTimerRef.current);
                        streamingTimerRef.current = null;
                    }
                    setIsStreaming(false);
                }
            }, 300);
        }

        return () => {
            if (streamingTimerRef.current) {
                clearInterval(streamingTimerRef.current);
            }
        };
    }, [isLoading, questions.length]);

    // Filtra domande basandosi sulla ricerca (usa sempre questions per il filtro)
    const filteredQuestions = useMemo(() => {
        if (!searchQuery.trim()) {
            return questions.map((q, idx) => ({ text: q, originalIndex: idx }));
        }
        
        const query = searchQuery.toLowerCase();
        return questions
            .map((q, idx) => ({ text: q, originalIndex: idx }))
            .filter(({ text }) => text.toLowerCase().includes(query));
    }, [questions, searchQuery]);

    // Per lo streaming, mostra solo le domande già "arrivate"
    const displayQuestions = useMemo(() => {
        if (isStreaming && streamingQuestions.length > 0) {
            // Filtra solo le domande che sono già arrivate nello streaming
            return questions.filter((_, idx) => idx < streamingQuestions.length);
        }
        return questions;
    }, [isStreaming, streamingQuestions, questions]);

    // Raggruppa domande se abilitato (solo quando non in streaming)
    const groupedQuestions = useMemo(() => {
        if (isStreaming || !useGrouping || filteredQuestions.length < 5) {
            return null;
        }
        return groupSimilarQuestions(filteredQuestions.map(q => q.text));
    }, [filteredQuestions, useGrouping, isStreaming]);

    // Calcola statistiche (usa displayQuestions durante streaming)
    const filteredSelectedCount = useMemo(() => {
        if (isStreaming) {
            // Durante streaming, conta solo le domande già arrivate
            return displayQuestions.filter((_, idx) => selectedIndices.has(idx)).length;
        }
        return filteredQuestions.filter(q => selectedIndices.has(q.originalIndex)).length;
    }, [filteredQuestions, selectedIndices, isStreaming, displayQuestions]);

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
        const questionsToUse = isStreaming ? displayQuestions : filteredQuestions;
        const countToUse = isStreaming ? displayQuestions.length : filteredQuestions.length;
        
        if (filteredSelectedCount === countToUse) {
            // Deseleziona tutte
            const newSelected = new Set(selectedIndices);
            if (isStreaming) {
                displayQuestions.forEach((_, idx) => newSelected.delete(idx));
            } else {
                questionsToUse.forEach(q => newSelected.delete(q.originalIndex));
            }
            onSelectionChange(newSelected);
        } else {
            // Seleziona tutte
            const newSelected = new Set(selectedIndices);
            if (isStreaming) {
                displayQuestions.forEach((_, idx) => newSelected.add(idx));
            } else {
                questionsToUse.forEach(q => newSelected.add(q.originalIndex));
            }
            onSelectionChange(newSelected);
        }
    }, [filteredQuestions, filteredSelectedCount, selectedIndices, onSelectionChange, isStreaming, displayQuestions]);

    const handleInvertSelection = useCallback(() => {
        const newSelected = new Set(selectedIndices);
        if (isStreaming) {
            displayQuestions.forEach((_, idx) => {
                if (newSelected.has(idx)) {
                    newSelected.delete(idx);
                } else {
                    newSelected.add(idx);
                }
            });
        } else {
            filteredQuestions.forEach(q => {
                if (newSelected.has(q.originalIndex)) {
                    newSelected.delete(q.originalIndex);
                } else {
                    newSelected.add(q.originalIndex);
                }
            });
        }
        onSelectionChange(newSelected);
    }, [filteredQuestions, selectedIndices, onSelectionChange, isStreaming, displayQuestions]);

    // Render item
    const renderQuestionItem = useCallback((
        item: { text: string; originalIndex: number } | string,
        displayIndex: number
    ) => {
        // Gestisci sia oggetto che stringa (per streaming)
        const questionText = typeof item === 'string' ? item : item.text;
        const originalIndex = typeof item === 'string' ? displayIndex : item.originalIndex;
        const isSelected = selectedIndices.has(originalIndex);
        
        return (
            <motion.label
                key={item.originalIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: displayIndex * 0.01 }}
                onMouseEnter={() => setFocusedIndex(item.originalIndex)}
                onMouseLeave={() => setFocusedIndex(null)}
                className={`
                    flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all
                    ${isSelected
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : focusedIndex === item.originalIndex
                        ? 'bg-zinc-800/80 border-white/10'
                        : 'bg-zinc-900/60 border-white/5 hover:bg-zinc-900/80'
                    }
                `}
            >
                <div className="flex-shrink-0 mt-0.5">
                    <motion.div
                        animate={{ scale: isSelected ? 1.1 : 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-amber-400" />
                        ) : (
                            <Square className="w-5 h-5 text-white/40" />
                        )}
                    </motion.div>
                </div>
                <div className="flex-1">
                    <p className="text-sm text-white/90 leading-relaxed">
                        {questionText}
                    </p>
                </div>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelection(originalIndex)}
                    className="hidden"
                />
            </motion.label>
        );
    }, [selectedIndices, focusedIndex, handleToggleSelection]);

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
                        <h3 className="text-lg font-semibold text-white">
                            {isLoading && questions.length === 0 
                                ? 'Estrazione in corso...' 
                                : isStreaming 
                                ? 'Domande in arrivo...' 
                                : 'Domande Estratte'
                            }
                        </h3>
                        <p className="text-xs text-white/50 mt-1">
                            {isStreaming 
                                ? `${displayQuestions.length} di ${questions.length} arrivate`
                                : `${questions.length} domande totali`
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30"
                        >
                            <span className="text-sm font-semibold text-amber-300">
                                {isStreaming 
                                    ? `${displayQuestions.length} di ${questions.length} arrivate`
                                    : `${filteredSelectedCount} di ${filteredQuestions.length} selezionate`
                                }
                            </span>
                        </motion.div>
                    </div>
                </div>

                {/* Barra ricerca e controlli */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cerca domande..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/60 border border-white/10 text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSelectAll}
                            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors text-xs font-medium"
                        >
                            {filteredSelectedCount === filteredQuestions.length ? 'Deseleziona' : 'Seleziona tutte'}
                        </button>
                        <button
                            onClick={handleInvertSelection}
                            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors text-xs font-medium flex items-center gap-1.5"
                            title="Inverti selezione"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Inverti
                        </button>
                    </div>
                </div>

                {/* Info keyboard shortcuts */}
                <div className="flex items-center gap-4 text-xs text-white/40">
                    <span>⌨️ <kbd className="px-1.5 py-0.5 rounded bg-white/5">Ctrl+A</kbd> Seleziona tutte</span>
                    <span><kbd className="px-1.5 py-0.5 rounded bg-white/5">Esc</kbd> Deseleziona</span>
                    <span><kbd className="px-1.5 py-0.5 rounded bg-white/5">Spazio</kbd> Toggle</span>
                </div>
            </div>

            {/* Lista domande */}
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                    {/* Skeleton durante loading iniziale */}
                    {isLoading && questions.length === 0 ? (
                        <motion.div
                            key="skeleton"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <QuestionsSkeleton count={8} isLoading={true} />
                        </motion.div>
                    ) : isStreaming && questions.length > 0 ? (
                        <motion.div
                            key="streaming"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <StreamingSkeleton
                                totalCount={questions.length}
                                currentCount={streamingQuestions.length}
                                questions={streamingQuestions}
                            />
                        </motion.div>
                    ) : isStreaming && displayQuestions.length > 0 ? (
                        <motion.div
                            key="streaming-list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-2"
                        >
                            {displayQuestions.map((question, idx) => 
                                renderQuestionItem(question, idx)
                            )}
                            {streamingQuestions.length < questions.length && (
                                <QuestionsSkeleton 
                                    count={Math.min(3, questions.length - streamingQuestions.length)} 
                                    isLoading={true} 
                                />
                            )}
                        </motion.div>
                    ) : groupedQuestions && groupedQuestions.length > 0 ? (
                        <motion.div
                            key="grouped"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            {groupedQuestions.map((group, groupIdx) => (
                                <div key={groupIdx} className="space-y-2">
                                    {group.questions.length > 1 && (
                                        <div className="px-3 py-1.5 rounded-lg bg-zinc-800/40 border border-white/5">
                                            <p className="text-xs font-medium text-white/60">
                                                {group.questions.length} domande simili
                                            </p>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        {group.questions.map((item) => 
                                            renderQuestionItem(item, item.originalIndex)
                                        )}
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="flat"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <VirtualizedList
                                items={filteredQuestions}
                                renderItem={renderQuestionItem}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Messaggio se nessuna domanda trovata */}
            {filteredQuestions.length === 0 && searchQuery && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                >
                    <p className="text-sm text-white/50">
                        Nessuna domanda trovata per &quot;{searchQuery}&quot;
                    </p>
                </motion.div>
            )}

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
                    className="flex-1 px-4 py-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/80 border border-white/10 text-white font-medium transition-colors"
                >
                    Indietro
                </button>
                <button
                    onClick={onNext}
                    disabled={selectedIndices.size === 0}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
