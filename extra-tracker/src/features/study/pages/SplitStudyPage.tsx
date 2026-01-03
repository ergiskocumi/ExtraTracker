/**
 * 📚 SPLIT STUDY PAGE
 * ==================
 *
 * Vista a 2 colonne:
 * - SX (60%): PDF originale del mazzo
 * - DX (40%): Lista flashcard + modalità edit + add card
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiBookOpen, FiEdit2, FiPlus, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { studyService, type Deck, type Card } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';

interface CardModalProps {
    isOpen: boolean;
    title: string;
    initialFront?: string;
    initialBack?: string;
    confirmLabel: string;
    onClose: () => void;
    onConfirm: (front: string, back: string) => Promise<void>;
}

const CardModal: React.FC<CardModalProps> = ({
    isOpen,
    title,
    initialFront = '',
    initialBack = '',
    confirmLabel,
    onClose,
    onConfirm,
}) => {
    const [front, setFront] = useState(initialFront);
    const [back, setBack] = useState(initialBack);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setFront(initialFront);
        setBack(initialBack);
        setSaving(false);
    }, [initialBack, initialFront, isOpen]);

    const handleConfirm = async () => {
        if (!front.trim() || !back.trim()) return;
        setSaving(true);
        try {
            await onConfirm(front.trim(), back.trim());
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-xl rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden"
                        style={{
                            background:
                                'linear-gradient(145deg, rgba(30, 27, 45, 0.98) 0%, rgba(20, 18, 35, 0.98) 100%)',
                        }}
                    >
                        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">{title}</h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/[0.1] transition-colors"
                            >
                                <FiX className="w-5 h-5 text-white/60" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Fronte (Domanda)
                                </label>
                                <textarea
                                    value={front}
                                    onChange={(e) => setFront(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Retro (Risposta)
                                </label>
                                <textarea
                                    value={back}
                                    onChange={(e) => setBack(e.target.value)}
                                    rows={5}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-3 rounded-xl bg-white/[0.05] text-white/70 hover:bg-white/[0.1] transition-all"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!front.trim() || !back.trim() || saving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium shadow-lg shadow-primary-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <FiCheck className="w-4 h-4" />
                                    {saving ? 'Salvando...' : confirmLabel}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export const SplitStudyPage: React.FC = () => {
    const navigate = useNavigate();
    const { deckId } = useParams();

    const [deck, setDeck] = useState<Deck | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editMode, setEditMode] = useState(false);
    const [editingCard, setEditingCard] = useState<Card | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);

    const loadDeck = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const fresh = await studyService.getDeckById(id);
            setDeck(fresh);
        } catch (err: any) {
            const message = err?.message || 'Errore nel caricamento del mazzo';
            setError(message);
            emitToast.error(message, { title: 'Errore' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!deckId) return;
        loadDeck(deckId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deckId]);

    const pdfSrc = useMemo(() => {
        if (!deck?.pdfUrl) return null;
        return deck.pdfUrl;
    }, [deck?.pdfUrl]);

    const handleAddCard = async (front: string, back: string) => {
        if (!deckId) return;
        const updated = await studyService.addCard(deckId, { front, back });
        setDeck(updated);
        emitToast.success('Carta aggiunta', { title: 'Ok' });
    };

    const handleUpdateCard = async (front: string, back: string) => {
        if (!deckId || !editingCard) return;
        const updated = await studyService.updateCard(deckId, editingCard.id, { front, back });
        setDeck(updated);
        emitToast.success('Carta aggiornata', { title: 'Ok' });
    };

    if (loading) {
        return (
            <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 animate-pulse">
                        <div className="h-6 w-1/3 rounded bg-white/10" />
                        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3 h-[70vh] rounded-3xl bg-white/10" />
                            <div className="lg:col-span-2 space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-20 rounded-2xl bg-white/10" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !deck) {
        return (
            <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8">
                <div className="max-w-3xl mx-auto">
                    <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30">
                                <FiAlertCircle className="w-5 h-5 text-rose-300" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-semibold text-white">Impossibile aprire la pagina</h2>
                                <p className="text-sm text-white/70 mt-1">{error || 'Mazzo non trovato'}</p>
                                <div className="mt-4">
                                    <button
                                        onClick={() => navigate('/study')}
                                        className="px-4 py-2.5 rounded-xl bg-white/[0.08] text-white/80 hover:bg-white/[0.12] transition-all"
                                    >
                                        Torna ai Mazzi
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/study')}
                            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all"
                        >
                            <FiArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                                {deck.title}
                            </h1>
                            <p className="text-sm text-white/50 mt-0.5">
                                Split View • PDF a sinistra • Carte a destra
                            </p>
                        </div>
                        {pdfSrc && (
                            <a
                                href={pdfSrc}
                                target="_blank"
                                rel="noreferrer"
                                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/80 transition-all"
                            >
                                <FiBookOpen className="w-4 h-4" />
                                Apri PDF
                            </a>
                        )}
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* PDF Column */}
                    <div className="lg:col-span-3">
                        <div className="rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
                                <div className="flex items-center gap-2">
                                    <FiBookOpen className="w-4 h-4 text-primary-300" />
                                    <h2 className="text-sm font-semibold text-white">PDF</h2>
                                </div>
                                {!pdfSrc && (
                                    <span className="text-xs text-white/50">
                                        Carica un PDF con “Magic Generate”
                                    </span>
                                )}
                            </div>

                            <div className="h-[70vh] bg-black/10">
                                {pdfSrc ? (
                                    <iframe
                                        title={`PDF - ${deck.title}`}
                                        src={pdfSrc}
                                        className="w-full h-full"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center p-8">
                                        <div className="text-center max-w-md">
                                            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-4">
                                                <FiBookOpen className="w-6 h-6 text-white/50" />
                                            </div>
                                            <h3 className="text-base font-semibold text-white">Nessun PDF collegato</h3>
                                            <p className="text-sm text-white/60 mt-1">
                                                Per attivare la Split View, genera le carte da un PDF e il file verrà salvato e collegato al mazzo.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cards Column */}
                    <div className="lg:col-span-2">
                        <div className="rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-white">Flashcard</h2>
                                    <p className="text-xs text-white/50 mt-0.5">
                                        {deck.cards.length} carte
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setEditMode((v) => !v)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
                                            editMode
                                                ? 'bg-blue-500/15 border-blue-500/25 text-blue-200'
                                                : 'bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06]'
                                        }`}
                                    >
                                        <FiEdit2 className="w-4 h-4" />
                                        {editMode ? 'Edit ON' : 'Edit'}
                                    </button>
                                    <button
                                        onClick={() => setIsAddOpen(true)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium shadow-lg shadow-primary-500/20"
                                    >
                                        <FiPlus className="w-4 h-4" />
                                        Add
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 max-h-[70vh] overflow-auto">
                                {deck.cards.length === 0 ? (
                                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-white/70">
                                        Nessuna carta ancora. Puoi aggiungerne una mentre leggi il PDF.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {deck.cards.map((card) => (
                                            <details
                                                key={card.id}
                                                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all overflow-hidden"
                                            >
                                                <summary className="list-none cursor-pointer select-none p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs text-white/60 flex-shrink-0">
                                                            Q
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <p className="text-sm font-semibold text-white leading-relaxed">
                                                                    {card.front}
                                                                </p>
                                                                {editMode && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setEditingCard(card);
                                                                        }}
                                                                        className="p-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 border border-blue-500/20 transition-all"
                                                                        title="Modifica"
                                                                    >
                                                                        <FiEdit2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-white/40 mt-1">
                                                                Clicca per vedere la risposta
                                                            </p>
                                                        </div>
                                                    </div>
                                                </summary>
                                                <div className="px-4 pb-4">
                                                    <div className="mt-2 pt-3 border-t border-white/[0.08] flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs text-white/60 flex-shrink-0">
                                                            A
                                                        </div>
                                                        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                                                            {card.back}
                                                        </p>
                                                    </div>
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <CardModal
                    isOpen={isAddOpen}
                    title="Aggiungi una carta"
                    confirmLabel="Aggiungi"
                    onClose={() => setIsAddOpen(false)}
                    onConfirm={handleAddCard}
                />

                <CardModal
                    isOpen={!!editingCard}
                    title="Modifica carta"
                    initialFront={editingCard?.front}
                    initialBack={editingCard?.back}
                    confirmLabel="Salva"
                    onClose={() => setEditingCard(null)}
                    onConfirm={handleUpdateCard}
                />
            </div>
        </div>
    );
};

export default SplitStudyPage;

