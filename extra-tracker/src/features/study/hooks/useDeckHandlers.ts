import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { studyService, type Deck, type CreateDeckPayload, type AddCardPayload } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import type { StudyStartConfig } from '../components/Modals/StudyModeSelector';

interface UseDeckHandlersProps {
    decks: Deck[];
    setDecks: React.Dispatch<React.SetStateAction<Deck[]>>;
    loadDecks: () => Promise<void>;
    loadFolders: () => Promise<void>;
}

export const useDeckHandlers = ({
    decks,
    setDecks,
    loadDecks,
    loadFolders,
}: UseDeckHandlersProps) => {
    const navigate = useNavigate();

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
    const [isMagicGenerateOpen, setIsMagicGenerateOpen] = useState(false);
    const [isExamSolverOpen, setIsExamSolverOpen] = useState(false);
    const [examSolverDeckId, setExamSolverDeckId] = useState<string | null>(null);
    const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null);
    const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
    const [isStudyModeOpen, setIsStudyModeOpen] = useState(false);
    const [studyDeck, setStudyDeck] = useState<Deck | null>(null);

    const handleStudy = useCallback((deckId: string) => {
        const deck = decks.find(d => d.id === deckId);
        if (!deck) return;
        setStudyDeck(deck);
        setIsStudyModeOpen(true);
    }, [decks]);

    const handleViewDetail = useCallback((deckId: string) => {
        navigate(`/study/deck/${deckId}`);
    }, [navigate]);

    const handleRead = useCallback((deckId: string) => {
        navigate(`/study/deck/${deckId}/cinema`);
    }, [navigate]);

    const handleAddCard = useCallback((deckId: string) => {
        const deck = decks.find(d => d.id === deckId);
        if (deck) {
            setSelectedDeck(deck);
            setIsAddCardModalOpen(true);
        }
    }, [decks]);

    const handleMagicGenerate = useCallback((deck: Deck) => {
        setSelectedDeck(deck);
        setIsMagicGenerateOpen(true);
    }, []);

    const handleMagicGenerateSuccess = useCallback(async (generatedCount: number) => {
        await loadDecks();
        if (generatedCount > 0) {
            emitToast.success(`✅ ${generatedCount} ${generatedCount === 1 ? 'nuova carta aggiunta' : 'nuove carte aggiunte'} al mazzo!`);
        }
    }, [loadDecks]);

    const handleExamSolver = useCallback((deckId?: string) => {
        setExamSolverDeckId(deckId || null);
        setIsExamSolverOpen(true);
    }, []);

    const handleExamSolverSuccess = useCallback(async (deckId: string, stats: { questionsExtracted: number; answersFound: number; answersNotFound: number; totalFlashcards: number; processingTimeMs: number }) => {
        await loadDecks();
        emitToast.success(
            `✅ Exam Solver completato! ${stats.totalFlashcards} flashcard generate (${stats.answersFound} risposte trovate, ${stats.answersNotFound} non trovate)`,
            { title: 'Exam Solver', duration: 5000 }
        );
        setIsExamSolverOpen(false);
        setExamSolverDeckId(null);
    }, [loadDecks]);

    const handleStartSession = useCallback((config: StudyStartConfig) => {
        if (!studyDeck) return;
        const params = new URLSearchParams();
        params.set('mode', config.mode);
        params.set('focus', config.focus);
        params.set('length', config.length);
        if (config.direction) {
            params.set('direction', config.direction);
        }
        if (config.timeLimitMinutes) {
            params.set('time', String(config.timeLimitMinutes));
        }
        if (config.questionCount) {
            params.set('questions', String(config.questionCount));
        }
        navigate(`/study/${studyDeck.id}/session?${params.toString()}`);
        setIsStudyModeOpen(false);
        setStudyDeck(null);
    }, [studyDeck, navigate]);

    const handleDeleteDeck = useCallback(async () => {
        if (!deletingDeck) return;
        try {
            await studyService.deleteDeck(deletingDeck.id);
            const deckTitle = deletingDeck.title;
            setDeletingDeck(null);
            await loadDecks();
            emitToast.success(`Mazzo "${deckTitle}" eliminato`);
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'eliminazione');
        }
    }, [deletingDeck, loadDecks]);

    const handleCreateDeck = useCallback(async (data: CreateDeckPayload) => {
        const newDeck = await studyService.createDeck(data);
        setDecks(prev => [...prev, newDeck]);
        emitToast.success('Mazzo creato!');
    }, [setDecks]);

    const handleSubmitCard = useCallback(async (deckId: string, data: AddCardPayload) => {
        try {
            const updatedDeck = await studyService.addCard(deckId, data);
            setDecks(prev => prev.map(d => d.id === deckId ? updatedDeck : d));
            emitToast.success('Carta aggiunta!');
        } catch (err: any) {
            emitToast.error(err.message);
            throw err;
        }
    }, [setDecks]);

    const handleDeckDrop = useCallback(async (deckId: string, folderId: string | null) => {
        console.log('[useDeckHandlers] handleDeckDrop: Starting', { deckId, folderId });
        try {
            const currentDeck = decks.find(d => d.id === deckId);
            if (!currentDeck) {
                throw new Error('Mazzo non trovato');
            }
            
            const updatedDeck = await studyService.updateDeckOrganization(deckId, { folderId });
            
            setDecks(prev => prev.map(d => d.id === deckId ? updatedDeck : d));
            
            await Promise.all([
                loadDecks(),
                loadFolders(),
            ]);
            
            emitToast.success(folderId ? 'Mazzo spostato nella cartella' : 'Mazzo spostato nella cartella radice');
        } catch (err: any) {
            console.error('[useDeckHandlers] handleDeckDrop: Error:', err);
            emitToast.error(err.message || 'Errore nello spostamento');
        }
    }, [decks, setDecks, loadDecks, loadFolders]);

    const handleTogglePin = useCallback(async (deck: Deck) => {
        try {
            const newPinnedState = !deck.pinned;
            // TODO: Quando il backend supporterà pinned, usare:
            // await studyService.updateDeck(deck.id, { pinned: newPinnedState });
            
            // Per ora aggiorniamo solo il frontend
            setDecks(prev => prev.map(d => 
                d.id === deck.id 
                    ? { ...d, pinned: newPinnedState }
                    : d
            ));
            
            emitToast.success(
                newPinnedState 
                    ? 'Aggiunto ai preferiti' 
                    : 'Rimosso dai preferiti'
            );
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'aggiornamento');
        }
    }, [setDecks]);

    return {
        // Modal state
        isCreateModalOpen,
        setIsCreateModalOpen,
        isAddCardModalOpen,
        setIsAddCardModalOpen,
        isMagicGenerateOpen,
        setIsMagicGenerateOpen,
        isExamSolverOpen,
        setIsExamSolverOpen,
        examSolverDeckId,
        setExamSolverDeckId,
        deletingDeck,
        setDeletingDeck,
        selectedDeck,
        setSelectedDeck,
        isStudyModeOpen,
        setIsStudyModeOpen,
        studyDeck,
        setStudyDeck,
        // Handlers
        handleStudy,
        handleViewDetail,
        handleRead,
        handleAddCard,
        handleMagicGenerate,
        handleMagicGenerateSuccess,
        handleExamSolver,
        handleExamSolverSuccess,
        handleStartSession,
        handleDeleteDeck,
        handleCreateDeck,
        handleSubmitCard,
        handleDeckDrop,
        handleTogglePin,
    };
};
