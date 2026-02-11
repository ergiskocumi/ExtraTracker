/**
 * 📝 REVIEW ANSWERS - Preview e modifica delle risposte generate
 */

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Edit2, RefreshCw, Save, ArrowLeft, FileText, ExternalLink, Check } from 'lucide-react';
import { SourceViewer } from './SourceViewer';
import { studyService } from '../../../../services/studyService';
import { emitToast } from '../../../../../../shared/components/toast';
import type { ReviewAnswersProps, FlashcardWithId } from '../ExamSolverModal.types';
import { examSolverButtonClass } from '../../../utils/studyButtonClasses';

// ============================================
// COMPONENT
// ============================================

export const ReviewAnswers: React.FC<ReviewAnswersProps> = ({
    flashcards,
    deckId,
    sourceFileUrl,
    onEdit,
    onRegenerate,
    onSave,
    onBack,
}) => {
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({});
    const [savingStates, setSavingStates] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});
    const [regeneratingCards, setRegeneratingCards] = useState<Set<string>>(new Set());
    const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'notfound'>('all');
    const [isBulkSaving, setIsBulkSaving] = useState(false);

    // Source Viewer state
    const [sourceViewerOpen, setSourceViewerOpen] = useState(false);
    const [selectedSourceCard, setSelectedSourceCard] = useState<FlashcardWithId | null>(null);

    // Handler per aprire il Source Viewer
    const handleViewSource = useCallback((card: FlashcardWithId) => {
        setSelectedSourceCard(card);
        setSourceViewerOpen(true);
    }, []);

    // Inizializza editedAnswers con le risposte esistenti
    useMemo(() => {
        const initial: Record<string, string> = {};
        flashcards.forEach(card => {
            initial[card.id] = card.back;
        });
        setEditedAnswers(initial);
    }, [flashcards]);

    // Filtra e ordina flashcard per confidence
    const filteredFlashcards = useMemo(() => {
        let filtered = flashcards;

        // Applica filtro confidence
        if (confidenceFilter !== 'all') {
            filtered = flashcards.filter(card => {
                const conf = card.confidence ?? 0;
                switch (confidenceFilter) {
                    case 'high':
                        return conf >= 80;
                    case 'medium':
                        return conf >= 50 && conf < 80;
                    case 'low':
                        return conf > 0 && conf < 50;
                    case 'notfound':
                        return conf === 0 || !card.found;
                    default:
                        return true;
                }
            });
        }

        // Ordina (bassa confidence prima = richiede attenzione)
        return filtered.sort((a, b) => {
            const confA = a.confidence ?? 0;
            const confB = b.confidence ?? 0;
            return confA - confB;
        });
    }, [flashcards, confidenceFilter]);

    // Stats per bulk operations
    const highConfidenceCards = useMemo(() => {
        return flashcards.filter(card => (card.confidence ?? 0) >= 80);
    }, [flashcards]);

    // Calcola counts per ogni filtro
    const filterCounts = useMemo(() => ({
        all: flashcards.length,
        high: flashcards.filter(c => (c.confidence ?? 0) >= 80).length,
        medium: flashcards.filter(c => {
            const conf = c.confidence ?? 0;
            return conf >= 50 && conf < 80;
        }).length,
        low: flashcards.filter(c => {
            const conf = c.confidence ?? 0;
            return conf > 0 && conf < 50;
        }).length,
        notfound: flashcards.filter(c => (c.confidence ?? 0) === 0 || !c.found).length,
    }), [flashcards]);

    // Helper per ottenere badge confidenza
    const getConfidenceBadge = useCallback((confidence: number) => {
        if (confidence >= 90) {
            return {
                label: 'Alta confidenza',
                color: 'emerald',
                bg: 'bg-emerald-500/20',
                border: 'border-emerald-500/30',
                text: 'text-emerald-300',
            };
        } else if (confidence >= 60) {
            return {
                label: 'Media - verifica',
                color: 'amber',
                bg: 'bg-amber-500/20',
                border: 'border-amber-500/30',
                text: 'text-amber-300',
            };
        } else {
            return {
                label: 'Bassa - richiede review',
                color: 'red',
                bg: 'bg-red-500/20',
                border: 'border-red-500/30',
                text: 'text-red-300',
            };
        }
    }, []);

    // Il salvataggio è sempre disponibile
    const canSave = flashcards.length > 0;

    // Gestione modifica
    const handleEdit = useCallback((cardId: string) => {
        setEditingCardId(cardId);
    }, []);

    const handleAnswerChange = useCallback((cardId: string, value: string) => {
        setEditedAnswers(prev => ({ ...prev, [cardId]: value }));
    }, []);

    const handleSaveEdit = useCallback(async (cardId: string) => {
        const newAnswer = editedAnswers[cardId]?.trim();
        if (!newAnswer || newAnswer.length < 10) {
            emitToast.warning('La risposta deve contenere almeno 10 caratteri');
            return;
        }

        setSavingStates(prev => ({ ...prev, [cardId]: 'saving' }));

        try {
            await studyService.updateCardAnswer(deckId, cardId, newAnswer);
            setSavingStates(prev => ({ ...prev, [cardId]: 'saved' }));
            onEdit(cardId, newAnswer);
            setEditingCardId(null);
            emitToast.success('Risposta modificata', { duration: 2000 });

            setTimeout(() => {
                setSavingStates(prev => {
                    const newState = { ...prev };
                    if (newState[cardId] === 'saved') {
                        newState[cardId] = 'idle';
                    }
                    return newState;
                });
            }, 2000);
        } catch (err: any) {
            setSavingStates(prev => ({ ...prev, [cardId]: 'idle' }));
            emitToast.error(err.message || 'Errore nel salvataggio');
        }
    }, [deckId, editedAnswers, onEdit]);

    const handleCancelEdit = useCallback((cardId: string) => {
        setEditingCardId(null);
        // Ripristina risposta originale
        const originalCard = flashcards.find(c => c.id === cardId);
        if (originalCard) {
            setEditedAnswers(prev => ({ ...prev, [cardId]: originalCard.back }));
        }
    }, [flashcards]);


    // Gestione rigenerazione
    const handleRegenerate = useCallback(async (card: FlashcardWithId) => {
        setRegeneratingCards(prev => new Set(prev).add(card.id));
        try {
            await onRegenerate(card.id, card.front);
            emitToast.success('Risposta rigenerata', { duration: 2000 });
            // Ricarica la risposta aggiornata
            const updatedDeck = await studyService.getDeckById(deckId);
            const updatedCard = updatedDeck.cards.find(c => c.id === card.id);
            if (updatedCard) {
                setEditedAnswers(prev => ({ ...prev, [card.id]: updatedCard.back }));
            }
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nella rigenerazione');
        } finally {
            setRegeneratingCards(prev => {
                const newSet = new Set(prev);
                newSet.delete(card.id);
                return newSet;
            });
        }
    }, [deckId, onRegenerate]);

    // Bulk approve high confidence cards
    const handleBulkApprove = useCallback(async () => {
        if (highConfidenceCards.length === 0) {
            emitToast.info('Nessuna flashcard con alta confidenza');
            return;
        }

        const confirmed = window.confirm(
            `Vuoi approvare ${highConfidenceCards.length} flashcard con alta confidence (≥80%)?\n\nQueste saranno salvate automaticamente.`
        );

        if (!confirmed) return;

        setIsBulkSaving(true);

        try {
            emitToast.success(`${highConfidenceCards.length} flashcard approvate!`);
            onSave();
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nel salvataggio bulk');
        } finally {
            setIsBulkSaving(false);
        }
    }, [highConfidenceCards, onSave]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                        Rivedi Risposte
                    </h3>
                    <p className="text-sm text-white/50">
                        Controlla e modifica le risposte generate prima di salvare
                    </p>
                </div>
            </div>

            {/* Filtri e Bulk Actions */}
            <div className="flex flex-wrap items-center gap-3 pb-4">
                {/* Filtro Confidence */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-white/60">Filtra:</span>
                    <select
                        value={confidenceFilter}
                        onChange={(e) => setConfidenceFilter(e.target.value as any)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                    >
                        <option value="all">Tutte ({filterCounts.all})</option>
                        <option value="high">Alta (≥80%, {filterCounts.high})</option>
                        <option value="medium">Media (50-79%, {filterCounts.medium})</option>
                        <option value="low">Bassa (&lt;50%, {filterCounts.low})</option>
                        <option value="notfound">Non trovate ({filterCounts.notfound})</option>
                    </select>
                </div>

                {/* Bulk Approve Button */}
                {highConfidenceCards.length > 0 && (
                    <button
                        onClick={handleBulkApprove}
                        disabled={isBulkSaving}
                        className={examSolverButtonClass(
                            'successSoft',
                            'px-4 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2'
                        )}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Approva Tutte Alta Confidence ({highConfidenceCards.length})
                    </button>
                )}

                {/* Mostra count filtrati */}
                <span className="ml-auto text-sm text-white/50">
                    {filteredFlashcards.length} flashcard visibili
                </span>
            </div>

            {/* Lista Flashcard */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                {filteredFlashcards.map((card, index) => {
                    const confidence = card.confidence ?? 0;
                    const confidenceBadge = getConfidenceBadge(confidence);
                    const isEditing = editingCardId === card.id;
                    const isRegenerating = regeneratingCards.has(card.id);
                    const savingState = savingStates[card.id] || 'idle';
                    const currentAnswer = editedAnswers[card.id] || card.back;

                    return (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 rounded-xl border bg-zinc-900/60 border-white/5 transition-all"
                        >
                            {/* Badge Status */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {card.found ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Trovata
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            Non trovata
                                        </span>
                                    )}
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${confidenceBadge.bg} border ${confidenceBadge.border} ${confidenceBadge.text} text-xs font-medium`}>
                                        {confidenceBadge.label} ({confidence}%)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isEditing ? (
                                        <>
                                            <button
                                                onClick={() => handleEdit(card.id)}
                                                className={examSolverButtonClass('icon', 'p-1.5 rounded-lg')}
                                                title="Modifica"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleRegenerate(card)}
                                                disabled={isRegenerating}
                                                className={examSolverButtonClass(
                                                    'icon',
                                                    'p-1.5 rounded-lg disabled:opacity-50'
                                                )}
                                                title="Rigenera"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleSaveEdit(card.id)}
                                                disabled={savingState === 'saving'}
                                                className={examSolverButtonClass(
                                                    'successSoft',
                                                    'px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 flex items-center gap-1.5'
                                                )}
                                            >
                                                {savingState === 'saving' ? (
                                                    <>
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                        Salvataggio...
                                                    </>
                                                ) : savingState === 'saved' ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5" />
                                                        Salvato
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-3.5 h-3.5" />
                                                        Salva
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleCancelEdit(card.id)}
                                                className={examSolverButtonClass(
                                                    'neutral',
                                                    'px-3 py-1.5 rounded-lg text-xs font-medium'
                                                )}
                                            >
                                                Annulla
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Domanda (read-only) */}
                            <div className="mb-3">
                                <p className="text-xs text-white/50 mb-1.5">Domanda</p>
                                <p className="text-white text-sm leading-relaxed">{card.front}</p>
                            </div>

                            {/* Risposta (editabile) */}
                            <div>
                                <p className="text-xs text-white/50 mb-1.5">Risposta</p>
                                {isEditing ? (
                                    <textarea
                                        value={currentAnswer}
                                        onChange={(e) => handleAnswerChange(card.id, e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-white/10 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                                        rows={4}
                                        placeholder="Inserisci la risposta..."
                                    />
                                ) : (
                                    <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                                        {currentAnswer}
                                    </p>
                                )}
                            </div>

                            {/* Source Snippet con pulsante Visualizza nel PDF */}
                            {(card.sourceSnippet || card.pageNumber) && (
                                <div className="mt-3 p-3 rounded-lg bg-zinc-950/60 border border-white/5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <p className="text-xs text-white/50">Fonte originale</p>
                                                {card.pageNumber && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs">
                                                        <FileText className="w-3 h-3" />
                                                        Pagina {card.pageNumber}
                                                    </span>
                                                )}
                                            </div>
                                            {card.sourceSnippet && (
                                                <p className="text-white/60 text-xs leading-relaxed italic line-clamp-3">
                                                    "{card.sourceSnippet}"
                                                </p>
                                            )}
                                        </div>
                                        {/* Pulsante Visualizza nel PDF */}
                                        {sourceFileUrl && card.pageNumber && (
                                            <button
                                                onClick={() => handleViewSource(card)}
                                                className={examSolverButtonClass(
                                                    'infoSoft',
                                                    'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5'
                                                )}
                                                title="Visualizza nel PDF"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                Visualizza
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-white/5">
                <div className="flex items-center justify-end mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className={examSolverButtonClass(
                                'neutral',
                                'px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2'
                            )}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Indietro
                        </button>
                        <button
                            onClick={onSave}
                            disabled={!canSave}
                            className={examSolverButtonClass(
                                canSave ? 'primary' : 'neutral',
                                'px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2',
                                !canSave && 'cursor-not-allowed'
                            )}
                        >
                            <Save className="w-4 h-4" />
                            Salva nel Mazzo
                        </button>
                    </div>
                </div>
            </div>

            {/* Source Viewer Modal */}
            {sourceFileUrl && (
                <SourceViewer
                    isOpen={sourceViewerOpen}
                    onClose={() => {
                        setSourceViewerOpen(false);
                        setSelectedSourceCard(null);
                    }}
                    pdfUrl={sourceFileUrl}
                    pageNumber={selectedSourceCard?.pageNumber}
                    highlightText={selectedSourceCard?.sourceSnippet}
                    cardQuestion={selectedSourceCard?.front}
                />
            )}
        </motion.div>
    );
};
