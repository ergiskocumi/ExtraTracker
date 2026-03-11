/**
 * 📋 DECK DETAIL PAGE - Vista completa delle Flashcard (Ridisegnata)
 * 
 * Features:
 * - Header informativo con statistiche e progresso
 * - Griglia card ottimizzata con drag & drop
 * - Editor modale fullscreen per modificare carte
 * - Sidebar con statistiche avanzate e consigli
 * - Filtri migliorati con visualizzazione visiva
 * - Supporto markdown nell'editor
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollToTop } from '../../../shared/hooks/useScrollToTop';
import { studyService, type Deck, type QuizType, type SavedQuizSnapshot, type StudyMode } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { DeckDetailContent } from '../components/Deck/DeckDetailContent';
import { DeckSettings } from '../components/Deck/DeckSettings';
import { ExamSolverModal } from '../components/Modals/ExamSolver';
import { MagicGenerateModal } from '../components/Modals/MagicGenerateModal';
import { GenerateQuizModal } from '../components/Modals/GenerateQuizModal';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export const DeckDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // State
    const [deck, setDeck] = useState<Deck | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Modals state
    const [isExamSolverOpen, setIsExamSolverOpen] = useState(false);
    const [isMagicGenerateOpen, setIsMagicGenerateOpen] = useState(false);
    const [isGenerateQuizOpen, setIsGenerateQuizOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Load deck
    const loadDeck = useCallback(async () => {
        if (!id) return;
        try {
            setIsLoading(true);
            setError(null);
            const deckData = await studyService.getDeckById(id);
            setDeck(deckData);
        } catch (err: any) {
            setError(err.message || 'Errore nel caricamento del mazzo');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadDeck();
    }, [loadDeck]);

    // Scroll to top when navigating to this page
    useScrollToTop([id]);

    // Handlers
    const handleStudy = useCallback((mode: StudyMode) => {
        if (!id) return;
        navigate(`/study/${id}?mode=${mode}`);
    }, [id, navigate]);

    const handleBack = useCallback(() => {
        // Se il mazzo appartiene a un esame, torna alla dashboard con parametro exam
        // Così la dashboard mostra direttamente il dettaglio di quell'esame
        if (deck?.examId) {
            navigate(`/study?exam=${deck.examId}`);
        } else {
            navigate('/study');
        }
    }, [navigate, deck?.examId]);

    const handleReadPdf = useCallback(() => {
        if (!id) return;
        navigate(`/study/deck/${id}/cinema`);
    }, [id, navigate]);

    const handleDeckUpdate = useCallback((updatedDeck: Deck) => {
        setDeck(updatedDeck);
    }, []);

    const handleGenerateQuizSession = useCallback(async (config: { questionCount: number; quizType: QuizType }) => {
        if (!id || !deck) return;

        if ((deck.cards?.length || 0) < 10) {
            emitToast.info('Crea almeno 10 flashcard per sbloccare la generazione del quiz');
            return;
        }

        try {
            const preparedSession = await studyService.getSession(id, {
                mode: 'quiz',
                focus: 'all',
                questionCount: config.questionCount,
                limit: config.questionCount,
                quizType: config.quizType,
            });

            if (preparedSession.cards.length === 0) {
                emitToast.info('Nessuna carta disponibile per il quiz');
                return;
            }

            const sourceCardIds = Array.from(
                new Set(preparedSession.cards.map(card => card.id).filter(Boolean))
            );

            if (sourceCardIds.length > 0) {
                try {
                    const savedQuiz = await studyService.saveQuizSnapshot(id, {
                        quizType: config.quizType,
                        questionCount: preparedSession.cards.length,
                        sourceCardIds,
                        source: 'chapter',
                        name: `Quiz ${preparedSession.cards.length} domande`,
                    });
                    // Aggiorna lo state locale del deck per mostrare il nuovo quiz salvato
                    setDeck(prev => {
                        if (!prev) return prev;
                        const existing = prev.savedQuizzes ?? [];
                        const alreadyExists = existing.some(q => q.id === savedQuiz.id);
                        return {
                            ...prev,
                            savedQuizzes: alreadyExists ? existing : [savedQuiz, ...existing],
                        };
                    });
                } catch (snapshotError) {
                    // Non blocca l'avvio del quiz se il salvataggio storico fallisce.
                    console.warn('[DeckDetailPage] saveQuizSnapshot failed:', snapshotError);
                }
            }

            const params = new URLSearchParams();
            params.set('mode', 'quiz');
            params.set('focus', 'all');
            params.set('questions', String(config.questionCount));
            params.set('quizType', config.quizType);
            params.set('quizSource', 'chapter');
            params.set('run', String(Date.now()));
            if (sourceCardIds.length > 0) {
                params.set('sourceCardIds', sourceCardIds.join(','));
            }

            navigate(`/study/${id}/session?${params.toString()}`, {
                state: {
                    preparedSession,
                    preparedAt: Date.now(),
                },
            });
        } catch (err: any) {
            emitToast.error(err?.message || 'Errore nella preparazione del quiz');
            throw err;
        }
    }, [id, deck, navigate]);

    const handleRepeatSavedQuiz = useCallback(async (savedQuiz: SavedQuizSnapshot) => {
        if (!id || !deck) return;

        try {
            const preparedSession = await studyService.getSession(id, {
                mode: 'quiz',
                focus: 'all',
                questionCount: savedQuiz.questionCount,
                limit: savedQuiz.questionCount,
                quizType: savedQuiz.quizType,
                sourceCardIds: savedQuiz.sourceCardIds,
            });

            if (preparedSession.cards.length === 0) {
                emitToast.info('Nessuna carta disponibile per questo quiz');
                return;
            }

            const params = new URLSearchParams();
            params.set('mode', 'quiz');
            params.set('focus', 'all');
            params.set('questions', String(savedQuiz.questionCount));
            params.set('quizType', savedQuiz.quizType);
            params.set('quizSource', 'saved');
            params.set('run', String(Date.now()));
            if (savedQuiz.sourceCardIds.length > 0) {
                params.set('sourceCardIds', savedQuiz.sourceCardIds.join(','));
            }

            navigate(`/study/${id}/session?${params.toString()}`, {
                state: {
                    preparedSession,
                    preparedAt: Date.now(),
                },
            });
        } catch (err: any) {
            emitToast.error(err?.message || 'Errore nel caricamento del quiz');
        }
    }, [id, deck, navigate]);

    const handleDeleteDeck = useCallback(async () => {
        if (!id || !deck) return;
        
        try {
            setIsDeleting(true);
            await studyService.deleteDeck(id);
            emitToast.success('Mazzo eliminato');
            navigate('/study');
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'eliminazione');
            setIsDeleting(false);
        }
    }, [id, deck, navigate]);

    const handleResetProgress = useCallback(async () => {
        if (!id || !deck) return;

        try {
            const updatedDeck = await studyService.resetDeckProgress(id);
            setDeck(updatedDeck);
            setIsResetModalOpen(false);
            emitToast.success('Progresso resettato con successo');
        } catch (error: any) {
            emitToast.error(error?.message || 'Errore nel reset del progresso');
        }
    }, [id, deck]);

    const handleExport = useCallback(() => {
        if (!deck) return;
        
        // Esporta come JSON
        const exportData = {
            title: deck.title,
            description: deck.description,
            cards: deck.cards?.map(c => ({
                front: c.front,
                back: c.back,
                status: c.status,
            })),
            exportedAt: new Date().toISOString(),
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${deck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_flashcards.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        emitToast.success('Mazzo esportato con successo');
    }, [deck]);

    const handleShare = useCallback(() => {
        if (!deck) return;
        
        // Copia il link negli appunti
        const url = `${window.location.origin}/study/deck/${deck.id}`;
        navigator.clipboard.writeText(url).then(() => {
            emitToast.success('Link copiato negli appunti');
        }).catch(() => {
            emitToast.error('Errore nella copia del link');
        });
    }, [deck]);

    // Loading state (stesso stile di /study: nessun wrapper full-screen)
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full" />
                    <p className="text-theme-secondary text-sm">Caricamento mazzo...</p>
                </div>
            </div>
        );
    }

    // Error state (inline nel layout come /study)
    if (error || !deck) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center"
                >
                    <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </motion.div>
                <p className="text-theme-secondary text-lg">{error || 'Mazzo non trovato'}</p>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/study')}
                    className="px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold shadow-lg shadow-primary-500/30"
                >
                    Torna ai Mazzi
                </motion.button>
            </div>
        );
    }

    return (
        <>
            <div className="w-full">
                <DeckDetailContent
                    deck={deck}
                    onBack={handleBack}
                    onStudy={handleStudy}
                    onGenerateQuiz={() => setIsGenerateQuizOpen(true)}
                    onRepeatSavedQuiz={handleRepeatSavedQuiz}
                    onExamSolver={() => setIsExamSolverOpen(true)}
                    onReadPdf={deck.pdfUrl ? handleReadPdf : undefined}
                    onMagicGenerate={() => setIsMagicGenerateOpen(true)}
                    onDeckUpdate={handleDeckUpdate}
                    onDeleteDeck={() => setIsDeleting(true)}
                    onSettings={() => setIsSettingsOpen(true)}
                    onExport={handleExport}
                    onShare={handleShare}
                    onResetProgress={() => setIsResetModalOpen(true)}
                />
            </div>

            {/* Exam Solver Modal */}
            <ExamSolverModal
                isOpen={isExamSolverOpen}
                onClose={() => setIsExamSolverOpen(false)}
                onSuccess={async (deckId, stats) => {
                    await loadDeck();
                    emitToast.success(
                        `✅ Exam Solver completato! ${stats.totalFlashcards} flashcard generate`,
                        { title: 'Exam Solver', duration: 5000 }
                    );
                }}
                existingDecks={[{ id: deck.id, title: deck.title }]}
                examId={deck.examId}
                preselectedDeckId={deck.id}
            />

            {/* Magic Generate Modal */}
            <MagicGenerateModal
                isOpen={isMagicGenerateOpen}
                onClose={() => setIsMagicGenerateOpen(false)}
                deckId={deck.id}
                deckTitle={deck.title}
                onSuccess={async () => {
                    await loadDeck();
                    setIsMagicGenerateOpen(false);
                }}
            />

            {/* Settings Modal */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-overlay backdrop-blur-sm"
                        onClick={(e) => e.target === e.currentTarget && setIsSettingsOpen(false)}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="deck-settings-title"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: 'tween', duration: 0.2 }}
                            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-theme-elevated rounded-2xl border border-theme-default shadow-theme-lg flex flex-col"
                        >
                            <div className="sticky top-0 bg-theme-elevated/95 backdrop-blur-xl border-b border-theme-default px-6 py-5 flex items-center justify-between z-10 shrink-0">
                                <h2 id="deck-settings-title" className="text-xl font-bold text-theme-primary flex items-center gap-3">
                                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </span>
                                    Impostazioni mazzo
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setIsSettingsOpen(false)}
                                    className="p-2.5 rounded-xl hover:bg-theme-surface text-theme-secondary hover:text-theme-primary transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                    aria-label="Chiudi impostazioni"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6 pt-5 overflow-y-auto">
                                <DeckSettings
                                    deck={deck}
                                    onUpdate={(updatedDeck) => {
                                        handleDeckUpdate(updatedDeck);
                                        setIsSettingsOpen(false);
                                    }}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <GenerateQuizModal
                isOpen={isGenerateQuizOpen}
                totalCards={deck.cards?.length || 0}
                onClose={() => setIsGenerateQuizOpen(false)}
                onGenerate={handleGenerateQuizSession}
            />

            {/* Reset Progress Confirmation */}
            <ConfirmationModal
                isOpen={isResetModalOpen}
                title="Reset Progresso"
                description="Sei sicuro di voler resettare tutto il progresso di studio? Tutte le carte torneranno allo stato 'nuove' e perderai la cronologia di ripasso."
                confirmLabel="Resetta"
                cancelLabel="Annulla"
                destructive
                onConfirm={handleResetProgress}
                onCancel={() => setIsResetModalOpen(false)}
            />

            {/* Delete Deck Confirmation */}
            <ConfirmationModal
                isOpen={isDeleting}
                title="Elimina Mazzo"
                description={`Sei sicuro di voler eliminare il mazzo "${deck.title}"? Verranno eliminate tutte le ${deck.totalCards} carte. L'azione è irreversibile.`}
                confirmLabel="Elimina"
                cancelLabel="Annulla"
                destructive
                isLoading={isDeleting}
                onConfirm={handleDeleteDeck}
                onCancel={() => setIsDeleting(false)}
            />
        </>
    );
};

export default DeckDetailPage;
