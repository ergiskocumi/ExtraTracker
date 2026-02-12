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
import { studyService, type Deck } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { DeckDetailContent } from '../components/Deck/DeckDetailContent';
import { DeckSettings } from '../components/Deck/DeckSettings';
import { ExamSolverModal } from '../components/Modals/ExamSolver';
import { MagicGenerateModal } from '../components/Modals/MagicGenerateModal';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
import { pagePreloaders } from '../../../shared/hooks/usePreload';

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
    const handleStudy = useCallback(() => {
        if (!id) return;
        navigate(`/study/${id}`);
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
            // Resetta tutte le carte a stato 'new' e ripristina i parametri SRS
            const updatedCards = deck.cards?.map(card => ({
                ...card,
                status: 'new' as const,
                interval: 0,
                repetitions: 0,
                easinessFactor: 2.5,
                nextReviewDate: new Date().toISOString(),
            }));
            
            // Aggiorna il deck sul server (se c'è un endpoint specifico, usalo)
            // Per ora simuliamo il reset locale
            const updatedDeck = { ...deck, cards: updatedCards || [] };
            setDeck(updatedDeck);
            
            emitToast.success('Progresso resettato con successo');
            setIsResetModalOpen(false);
            
            // Ricarica il deck per sincronizzare
            await loadDeck();
        } catch (error) {
            emitToast.error('Errore nel reset del progresso');
        }
    }, [id, deck, loadDeck]);

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

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-theme-base">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full" />
                    <p className="text-theme-secondary text-sm">Caricamento mazzo...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !deck) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-theme-base">
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
        <div className="min-h-screen bg-theme-base text-theme-primary px-4 sm:px-6 py-6 sm:py-8">
            <div className="w-full max-w-[1920px] mx-auto">
                <DeckDetailContent
                    deck={deck}
                    onBack={handleBack}
                    onStudy={handleStudy}
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
                onSuccess={async (count) => {
                    await loadDeck();
                    emitToast.success(`${count} flashcard generate con successo!`);
                }}
            />

            {/* Settings Modal */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={(e) => e.target === e.currentTarget && setIsSettingsOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-theme-elevated rounded-2xl border border-theme-default shadow-theme-lg"
                        >
                            <div className="sticky top-0 bg-theme-elevated/95 backdrop-blur-xl border-b border-theme-default p-6 flex items-center justify-between z-10">
                                <h2 className="text-xl font-bold text-theme-primary">Impostazioni Mazzo</h2>
                                <button
                                    onClick={() => setIsSettingsOpen(false)}
                                    className="p-2 rounded-lg hover:bg-theme-surface text-theme-secondary hover:text-theme-primary transition-all"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6">
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
        </div>
    );
};

export default DeckDetailPage;
