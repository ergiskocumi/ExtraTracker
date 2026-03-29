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
import { studyService, type Deck, type QuizType, type SavedQuizSnapshot, type SavedQuizReviewResponse, type StudyMode } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { getErrorMessage } from '../../../utils/errorMessage';
import { DeckDetailContent } from '../components/Deck/DeckDetailContent';
import { ExamSolverModal } from '../components/Modals/ExamSolver';
import { MagicGenerateModal } from '../components/Modals/MagicGenerateModal';
import { GenerateQuizModal } from '../components/Modals/GenerateQuizModal';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
import { QuizReviewMode } from '../components/Study/QuizReviewMode';

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
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [reviewData, setReviewData] = useState<SavedQuizReviewResponse | null>(null);

    // Load deck
    const loadDeck = useCallback(async () => {
        if (!id) return;
        try {
            setIsLoading(true);
            setError(null);
            const deckData = await studyService.getDeckById(id);
            setDeck(deckData);
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Errore nel caricamento del mazzo');
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
        navigate(`/study/${id}/session?mode=${mode}`);
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

        const canGenerateTrueFalseFromPdf = config.quizType === 'true_false' && Boolean(deck.pdfUrl);
        if (!canGenerateTrueFalseFromPdf && (deck.cards?.length || 0) < 10) {
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
                    // Extract questions from prepared cards to persist them
                    const questionsToSave = preparedSession.cards.map(card => ({
                        questionText: card.front,
                        correctAnswer: card.back,
                        distractors: card.distractors || [],
                        distractorExplanations: Array.isArray(card.distractorExplanations)
                            ? card.distractorExplanations as unknown as string[]
                            : card.distractorExplanations && typeof card.distractorExplanations === 'object'
                                ? Object.values(card.distractorExplanations)
                                : [],
                        correctAnswerExplanation: card.explanation || '',
                        difficulty: 'standard',
                        options: card.options || [],
                    }));

                    const savedQuiz = await studyService.saveQuizSnapshot(id, {
                        quizType: config.quizType,
                        questionCount: preparedSession.cards.length,
                        sourceCardIds,
                        source: 'chapter',
                        name: `Quiz ${preparedSession.cards.length} domande`,
                        questions: questionsToSave,
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
        } catch (err: unknown) {
            emitToast.error(getErrorMessage(err) || 'Errore nella preparazione del quiz');
            throw err;
        }
    }, [id, deck, navigate]);

    const handleRepeatSavedQuiz = useCallback(async (savedQuiz: SavedQuizSnapshot) => {
        if (!id || !deck) return;

        try {
            // If quiz has persisted questions, use instant retake (no AI)
            if (savedQuiz.hasQuestions) {
                const retakeData = await studyService.retakeSavedQuiz(id, savedQuiz.id);

                if (retakeData.cards.length === 0) {
                    emitToast.info('Nessuna domanda disponibile per questo quiz');
                    return;
                }

                const fakeDeck: typeof deck = { ...deck, cards: retakeData.cards, totalCards: retakeData.cards.length, dueCount: retakeData.cards.length };
                const preparedSession = {
                    deck: fakeDeck,
                    cards: retakeData.cards,
                    remaining: retakeData.cards.length,
                    total: retakeData.cards.length,
                    mode: 'quiz' as const,
                    meta: { quizType: retakeData.quizType, questionCount: retakeData.questionCount },
                };

                const params = new URLSearchParams();
                params.set('mode', 'quiz');
                params.set('focus', 'all');
                params.set('questions', String(retakeData.questionCount));
                params.set('quizType', retakeData.quizType);
                params.set('quizSource', 'saved');
                params.set('savedQuizId', savedQuiz.id);
                params.set('run', String(Date.now()));

                navigate(`/study/${id}/session?${params.toString()}`, {
                    state: {
                        preparedSession,
                        preparedAt: Date.now(),
                    },
                });
                return;
            }

            // Legacy fallback: quiz without persisted questions -> use AI
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
        } catch (err: unknown) {
            emitToast.error(getErrorMessage(err) || 'Errore nel caricamento del quiz');
        }
    }, [id, deck, navigate]);

    const handleReviewSavedQuiz = useCallback(async (savedQuiz: SavedQuizSnapshot) => {
        if (!id || !savedQuiz.hasQuestions) return;
        try {
            const data = await studyService.reviewSavedQuiz(id, savedQuiz.id);
            setReviewData(data);
        } catch (err: unknown) {
            emitToast.error(getErrorMessage(err) || 'Errore nel caricamento della review');
        }
    }, [id]);

    const handleDeleteDeck = useCallback(async () => {
        if (!id || !deck) return;
        
        try {
            setIsDeleting(true);
            await studyService.deleteDeck(id);
            emitToast.success('Mazzo eliminato');
            navigate('/study');
        } catch (err: unknown) {
            emitToast.error(getErrorMessage(err) || 'Errore nell\'eliminazione');
            setIsDeleting(false);
        } finally {
            setIsDeleteModalOpen(false);
        }
    }, [id, deck, navigate]);

    const handleResetProgress = useCallback(async () => {
        if (!id || !deck) return;

        try {
            const updatedDeck = await studyService.resetDeckProgress(id);
            setDeck(updatedDeck);
            setIsResetModalOpen(false);
            emitToast.success('Progresso resettato con successo');
        } catch (error: unknown) {
            emitToast.error(getErrorMessage(error) || 'Errore nel reset del progresso');
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
                <button
                    onClick={() => navigate('/study')}
                    className="px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold shadow-lg shadow-primary-500/30 transition-colors"
                >
                    Torna ai Mazzi
                </button>
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
                    onReviewSavedQuiz={handleReviewSavedQuiz}
                    onExamSolver={() => setIsExamSolverOpen(true)}
                    onReadPdf={deck.pdfUrl ? handleReadPdf : undefined}
                    onMagicGenerate={() => setIsMagicGenerateOpen(true)}
                    onDeckUpdate={handleDeckUpdate}
                    onDeleteDeck={() => setIsDeleteModalOpen(true)}
                    onExport={handleExport}
                    onShare={handleShare}
                    onResetProgress={() => setIsResetModalOpen(true)}
                />
            </div>

            {/* Exam Solver Modal */}
            <ExamSolverModal
                isOpen={isExamSolverOpen}
                onClose={() => setIsExamSolverOpen(false)}
                onSuccess={async (_deckId, stats) => {
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


            <GenerateQuizModal
                isOpen={isGenerateQuizOpen}
                totalCards={deck.cards?.length || 0}
                hasPdf={Boolean(deck.pdfUrl)}
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
                isOpen={isDeleteModalOpen}
                title="Elimina Mazzo"
                description={`Sei sicuro di voler eliminare il mazzo "${deck.title}"? Verranno eliminate tutte le ${deck.totalCards} carte. L'azione è irreversibile.`}
                confirmLabel="Elimina"
                cancelLabel="Annulla"
                destructive
                isLoading={isDeleting}
                onConfirm={handleDeleteDeck}
                onCancel={() => setIsDeleteModalOpen(false)}
            />

            {/* Quiz Review Mode */}
            <AnimatePresence>
                {reviewData && (
                    <QuizReviewMode
                        data={reviewData}
                        onClose={() => setReviewData(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default DeckDetailPage;
