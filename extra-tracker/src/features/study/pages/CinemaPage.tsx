/**
 * 🎬 CINEMA PAGE - Controller per vista Cinema Split View
 * 
 * Gestisce il caricamento del deck e passa i dati a CinemaLayout.
 * 
 * Clean Code Principles:
 * - Single Responsibility: gestisce solo il caricamento e il routing dei dati
 * - Separation of Concerns: logica di business separata dalla presentazione
 * - Error Handling: gestione errori centralizzata e user-friendly
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import { studyService, type Deck } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { CinemaLayout } from '../layout/CinemaLayout';

// ============================================
// CONSTANTS
// ============================================

const LOADING_SPINNER_SIZE = 8;

// ============================================
// SUB-COMPONENTS
// ============================================

interface LoadingStateProps {
    message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Caricamento...' }) => (
    <div className="fixed inset-0 h-screen w-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className={`animate-spin w-${LOADING_SPINNER_SIZE} h-${LOADING_SPINNER_SIZE} border-2 border-white/20 border-t-white rounded-full`} />
            <p className="text-white/60 text-sm">{message}</p>
        </div>
    </div>
);

interface ErrorStateProps {
    error: string;
    onNavigateBack: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onNavigateBack }) => (
    <div className="fixed inset-0 h-screen w-screen bg-zinc-950 text-white flex flex-col items-center justify-center">
        <FiAlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-white/60 mb-6 text-center px-4">{error}</p>
        <button
            onClick={onNavigateBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
        >
            <FiArrowLeft className="w-4 h-4" />
            Torna ai Mazzi
        </button>
    </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const CinemaPage: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();

    const [deck, setDeck] = useState<Deck | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load deck
    const loadDeck = useCallback(async () => {
        if (!deckId) {
            setError('ID mazzo non valido');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            
            const deckData = await studyService.getDeckById(deckId);
            
            console.log('📚 Deck caricato:', {
                id: deckData.id,
                title: deckData.title,
                pdfUrl: deckData.pdfUrl,
                hasPdf: !!deckData.pdfUrl,
            });
            
            setDeck(deckData);
        } catch (err: any) {
            console.error('❌ Errore nel caricamento del deck:', err);
            setError(err.message || 'Errore nel caricamento del mazzo');
        } finally {
            setIsLoading(false);
        }
    }, [deckId]);

    useEffect(() => {
        loadDeck();
    }, [loadDeck]);

    // Log PDF availability
    useEffect(() => {
        if (!deck) return;

        if (deck.pdfUrl) {
            console.log('🎬 CinemaPage - PDF Source:', deck.pdfUrl);
        } else {
            console.warn('⚠️ CinemaPage - Nessun PDF disponibile per il deck:', deck.title);
        }
    }, [deck?.pdfUrl, deck?.title]);

    // Handlers
    const handleAddCard = useCallback(async () => {
        if (!deckId || !deck) return;

        try {
            const front = window.prompt('Domanda:');
            if (!front?.trim()) return;
            
            const back = window.prompt('Risposta:');
            if (!back?.trim()) return;

            const updatedDeck = await studyService.addCard(deckId, { 
                front: front.trim(), 
                back: back.trim() 
            });
            
            setDeck(updatedDeck);
            emitToast.success('Carta aggiunta!');
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'aggiunta della carta');
        }
    }, [deckId, deck]);

    const handleUpdateCard = useCallback(async (
        cardId: string, 
        front: string, 
        back: string
    ) => {
        if (!deckId) return;

        try {
            const updatedDeck = await studyService.updateCard(deckId, cardId, { front, back });
            setDeck(updatedDeck);
            emitToast.success('Carta modificata!');
        } catch (err: any) {
            const errorMessage = err.message || 'Errore nella modifica della carta';
            emitToast.error(errorMessage);
            throw err;
        }
    }, [deckId]);

    const handleNavigateBack = useCallback(() => {
        navigate('/study');
    }, [navigate]);

    // ========== RENDER ==========

    if (isLoading) {
        return <LoadingState message="Caricamento mazzo..." />;
    }

    if (error || !deck) {
        return (
            <ErrorState 
                error={error || 'Mazzo non trovato'} 
                onNavigateBack={handleNavigateBack} 
            />
        );
    }

    return (
        <CinemaLayout
            deck={deck}
            pdfSrc={deck.pdfUrl || null}
            onAddCard={handleAddCard}
            onUpdateCard={handleUpdateCard}
        />
    );
};
