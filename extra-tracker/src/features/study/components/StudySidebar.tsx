/**
 * 📚 STUDY SIDEBAR
 * ================
 * 
 * Reusable component containing the Flashcards/Chat tabs.
 * Used in both Desktop (right panel) and Mobile (drawer).
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit2, FiPlus, FiX, FiCheck } from 'react-icons/fi';
import { Layers, MessageCircle } from 'lucide-react';
import type { Deck, Card } from '../services/studyService';
import { PDFChat } from './PDFChat';

interface StudySidebarProps {
    deck: Deck;
    pdfSrc: string | null;
    editMode: boolean;
    setEditMode: (v: boolean) => void;
    onAddCard: () => void;
    onEditCard: (card: Card) => void;
    className?: string;
    /** For mobile drawer: shows only the active tab content without header */
    compactMode?: boolean;
    /** When in compact mode, which tab to show */
    activeTabOverride?: 'flashcards' | 'chat';
}

export const StudySidebar: React.FC<StudySidebarProps> = ({
    deck,
    pdfSrc,
    editMode,
    setEditMode,
    onAddCard,
    onEditCard,
    className = '',
    compactMode = false,
    activeTabOverride,
}) => {
    const [activeTab, setActiveTab] = useState<'flashcards' | 'chat'>('flashcards');
    const currentTab = activeTabOverride ?? activeTab;

    // Compact mode: just render the content
    if (compactMode) {
        return (
            <div className={`h-full ${className}`}>
                {currentTab === 'flashcards' ? (
                    <FlashcardsList
                        deck={deck}
                        editMode={editMode}
                        setEditMode={setEditMode}
                        onAddCard={onAddCard}
                        onEditCard={onEditCard}
                        showHeader
                    />
                ) : (
                    <PDFChat deckId={deck.id} disabled={!pdfSrc} />
                )}
            </div>
        );
    }

    // Full mode with tabs
    return (
        <div className={`h-full flex flex-col ${className}`}>
            {/* Tab Header */}
            <div className="px-5 py-4 border-b border-white/[0.08] flex-shrink-0">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.08] p-1">
                        <button
                            onClick={() => setActiveTab('flashcards')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                currentTab === 'flashcards'
                                    ? 'bg-white/[0.10] text-white'
                                    : 'text-white/60 hover:text-white/90 hover:bg-white/[0.06]'
                            }`}
                        >
                            <Layers className="w-4 h-4" />
                            Flashcards
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                currentTab === 'chat'
                                    ? 'bg-white/[0.10] text-white'
                                    : 'text-white/60 hover:text-white/90 hover:bg-white/[0.06]'
                            }`}
                        >
                            <MessageCircle className="w-4 h-4" />
                            AI Tutor
                        </button>
                    </div>

                    {currentTab === 'flashcards' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setEditMode(!editMode)}
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
                                onClick={onAddCard}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white shadow-lg rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 shadow-primary-500/20"
                            >
                                <FiPlus className="w-4 h-4" />
                                Add
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-3">
                    {currentTab === 'flashcards' ? (
                        <p className="text-xs text-white/50">
                            {deck.cards.length} carte • Clicca una domanda per vedere la risposta
                        </p>
                    ) : (
                        <p className="text-xs text-white/50">
                            Chiedi chiarimenti direttamente sul contenuto del PDF del mazzo
                        </p>
                    )}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {currentTab === 'flashcards' ? (
                    <FlashcardsList
                        deck={deck}
                        editMode={editMode}
                        setEditMode={setEditMode}
                        onAddCard={onAddCard}
                        onEditCard={onEditCard}
                    />
                ) : (
                    <PDFChat deckId={deck.id} disabled={!pdfSrc} />
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Internal Component: Flashcards List
// ─────────────────────────────────────────────────────────────

interface FlashcardsListProps {
    deck: Deck;
    editMode: boolean;
    setEditMode: (v: boolean) => void;
    onAddCard: () => void;
    onEditCard: (card: Card) => void;
    showHeader?: boolean;
}

const FlashcardsList: React.FC<FlashcardsListProps> = ({
    deck,
    editMode,
    setEditMode,
    onAddCard,
    onEditCard,
    showHeader = false,
}) => {
    return (
        <div className="flex flex-col h-full">
            {showHeader && (
                <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
                    <p className="text-xs text-white/50">
                        {deck.cards.length} carte
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setEditMode(!editMode)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm ${
                                editMode
                                    ? 'bg-blue-500/15 border-blue-500/25 text-blue-200'
                                    : 'bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06]'
                            }`}
                        >
                            <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onAddCard}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white shadow-lg rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 shadow-primary-500/20"
                        >
                            <FiPlus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
            
            <div className="flex-1 p-4 overflow-auto">
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
                                <summary className="p-4 list-none cursor-pointer select-none">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs text-white/60 flex-shrink-0">
                                            Q
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="text-sm font-semibold leading-relaxed text-white">
                                                    {card.front}
                                                </p>
                                                {editMode && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            onEditCard(card);
                                                        }}
                                                        className="p-2 text-blue-200 transition-all border rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/20"
                                                        title="Modifica"
                                                    >
                                                        <FiEdit2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs text-white/40">
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
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/80">
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
    );
};

// ─────────────────────────────────────────────────────────────
// Card Modal (Extracted for reuse)
// ─────────────────────────────────────────────────────────────

interface CardModalProps {
    isOpen: boolean;
    title: string;
    initialFront?: string;
    initialBack?: string;
    confirmLabel: string;
    onClose: () => void;
    onConfirm: (front: string, back: string) => Promise<void>;
}

export const CardModal: React.FC<CardModalProps> = ({
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

    React.useEffect(() => {
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
                                <label className="block mb-2 text-sm font-medium text-white/70">
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
                                <label className="block mb-2 text-sm font-medium text-white/70">
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
                                    className="flex items-center justify-center flex-1 gap-2 px-4 py-3 font-medium text-white transition-all shadow-lg rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 shadow-primary-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
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

export default StudySidebar;
