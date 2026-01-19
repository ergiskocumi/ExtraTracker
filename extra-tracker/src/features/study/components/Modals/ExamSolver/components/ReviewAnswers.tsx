/**
 * 📝 REVIEW ANSWERS - Preview e modifica delle risposte generate
 */

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Edit2, RefreshCw, Save, ArrowLeft, Check, FileText, ExternalLink } from 'lucide-react';
import { SourceViewer } from './SourceViewer';
import { studyService } from '../../../../services/studyService';
import { emitToast } from '../../../../../../shared/components/toast';
import type { ReviewAnswersProps, FlashcardWithId } from '../ExamSolverModal.types';

// ============================================
// COMPONENT
// ============================================

export const ReviewAnswers: React.FC<ReviewAnswersProps> = ({
    flashcards,
    deckId,
    sourceFileUrl,
    onApprove,
    onEdit,
    onRegenerate,
    onSave,
    onBack,
}) => {
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({});
    const [approvedCards, setApprovedCards] = useState<Set<string>>(new Set());
    const [savingStates, setSavingStates] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});
    const [regeneratingCards, setRegeneratingCards] = useState<Set<string>>(new Set());
    
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

    // Ordina flashcard per confidence (bassa prima = richiede attenzione)
    const sortedFlashcards = useMemo(() => {
        return [...flashcards].sort((a, b) => {
            const confA = a.confidence ?? 0;
            const confB = b.confidence ?? 0;
            return confA - confB; // Ordine crescente (bassa confidenza prima)
        });
    }, [flashcards]);

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

    // Conta risposte approvate
    const approvedCount = approvedCards.size;
    const totalCount = flashcards.length;
    const canSave = approvedCount >= 1;

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

    // Gestione approvazione
    const handleApprove = useCallback((cardId: string) => {
        setApprovedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cardId)) {
                newSet.delete(cardId);
            } else {
                newSet.add(cardId);
            }
            return newSet;
        });
        onApprove(cardId);
    }, [onApprove]);

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

            {/* Lista Flashcard */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                {sortedFlashcards.map((card, index) => {
                    const confidence = card.confidence ?? 0;
                    const confidenceBadge = getConfidenceBadge(confidence);
                    const isEditing = editingCardId === card.id;
                    const isApproved = approvedCards.has(card.id);
                    const isRegenerating = regeneratingCards.has(card.id);
                    const savingState = savingStates[card.id] || 'idle';
                    const currentAnswer = editedAnswers[card.id] || card.back;

                    return (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`p-4 rounded-xl border transition-all ${
                                isApproved
                                    ? 'bg-emerald-500/10 border-emerald-500/30'
                                    : 'bg-zinc-900/60 border-white/5'
                            }`}
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
                                    {isApproved && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-500/20 border border-primary-500/30 text-primary-300 text-xs font-medium">
                                            <Check className="w-3.5 h-3.5" />
                                            Approvata
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isEditing ? (
                                        <>
                                            <button
                                                onClick={() => handleEdit(card.id)}
                                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                                title="Modifica"
                                            >
                                                <Edit2 className="w-4 h-4 text-white/60" />
                                            </button>
                                            <button
                                                onClick={() => handleRegenerate(card)}
                                                disabled={isRegenerating}
                                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                                                title="Rigenera"
                                            >
                                                <RefreshCw className={`w-4 h-4 text-white/60 ${isRegenerating ? 'animate-spin' : ''}`} />
                                            </button>
                                            <button
                                                onClick={() => handleApprove(card.id)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                    isApproved
                                                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                                                        : 'bg-zinc-800 hover:bg-zinc-700 text-white/70'
                                                }`}
                                            >
                                                {isApproved ? 'Rimuovi' : 'Approva'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleSaveEdit(card.id)}
                                                disabled={savingState === 'saving'}
                                                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
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
                                                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white/70 text-xs font-medium transition-colors"
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
                                                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-xs font-medium transition-colors flex items-center gap-1.5"
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
                <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-white/70">
                        <span className="font-semibold text-white">{approvedCount}</span> / {totalCount} risposte approvate
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="px-4 py-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/80 border border-white/10 text-white text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Indietro
                        </button>
                        <button
                            onClick={onSave}
                            disabled={!canSave}
                            className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                                canSave
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40'
                                    : 'bg-zinc-800 text-white/40 cursor-not-allowed'
                            }`}
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
