/**
 * 🎬 CINEMA PAGE - Controller per vista Cinema Split View
 * 
 * Gestisce il caricamento del deck e passa i dati a CinemaLayout.
 * Nessun padding o container - layout full screen.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import { studyService, type Deck } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { CinemaLayout } from '../layout/CinemaLayout';

export const CinemaPage: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();

    // State
    const [deck, setDeck] = useState<Deck | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load deck
    const loadDeck = useCallback(async () => {
        if (!deckId) return;
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

    // Log per debug del PDF - DEVE essere prima dei return condizionali
    useEffect(() => {
        if (deck?.pdfUrl) {
            console.log('🎬 CinemaPage - PDF Source:', deck.pdfUrl);
        } else if (deck) {
            console.warn('⚠️ CinemaPage - Nessun PDF disponibile per il deck:', deck.title);
        }
    }, [deck?.pdfUrl, deck?.title]);

    // Handlers
    const handleAddCard = useCallback(async () => {
        if (!deckId || !deck) return;
        try {
            // Mostra un modal o form inline per aggiungere carta
            // Per ora usiamo un prompt semplice, ma puoi sostituirlo con un modal
            const front = window.prompt('Domanda:');
            if (!front || !front.trim()) return;
            
            const back = window.prompt('Risposta:');
            if (!back || !back.trim()) return;

            const updatedDeck = await studyService.addCard(deckId, { front: front.trim(), back: back.trim() });
            setDeck(updatedDeck);
            emitToast.success('Carta aggiunta!');
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'aggiunta della carta');
        }
    }, [deckId, deck]);

    const handleUpdateCard = useCallback(async (cardId: string, front: string, back: string) => {
        if (!deckId) return;
        try {
            const updatedDeck = await studyService.updateCard(deckId, cardId, { front, back });
            setDeck(updatedDeck);
            emitToast.success('Carta modificata!');
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nella modifica della carta');
            throw err; // Rilancia per permettere al componente di gestire l'errore
        }
    }, [deckId]);

    // ========== RENDER ==========

    // Loading state - full screen nero
    if (isLoading) {
        return (
            <div className="fixed inset-0 h-screen w-screen bg-black text-white flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
            </div>
        );
    }

    // Error state - full screen nero
    if (error || !deck) {
        return (
            <div className="fixed inset-0 h-screen w-screen bg-black text-white flex flex-col items-center justify-center">
                <FiAlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-white/60 mb-6">{error || 'Mazzo non trovato'}</p>
                <button
                    onClick={() => navigate('/study')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                >
                    <FiArrowLeft className="w-4 h-4" />
                    Torna ai Mazzi
                </button>
            </div>
        );
    }

    // Success - render CinemaLayout
    const pdfSrc = deck.pdfUrl || null;

    return (
        <CinemaLayout
            deck={deck}
            pdfSrc={pdfSrc}
            onAddCard={handleAddCard}
            onUpdateCard={handleUpdateCard}
        />
    );
};
