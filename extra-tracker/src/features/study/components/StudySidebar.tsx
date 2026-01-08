/**
 * 📚 STUDY SIDEBAR
 * ================
 * 
 * Reusable component containing the Flashcards/Chat tabs.
 * Used in both Desktop (right panel) and Mobile (drawer).
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiX, FiCheck } from 'react-icons/fi';
import { Layers, MessageCircle } from 'lucide-react';
import type { Deck } from '../services/studyService';
import { PDFChat } from './PDFChat';
import { FlashcardList } from './FlashcardList';

interface StudySidebarProps {
    deck: Deck;
    pdfSrc: string | null;
    onAddCard: () => void;
    onUpdateCard: (cardId: string, front: string, back: string) => Promise<void>;
    className?: string;
    /** For mobile drawer: shows only the active tab content without header */
    compactMode?: boolean;
    /** When in compact mode, which tab to show */
    activeTabOverride?: 'flashcards' | 'chat';
    /** Programmatic tab switch (id must change to trigger) */
    tabRequest?: { id: string; tab: 'flashcards' | 'chat' } | null;
    /** Programmatic message send in AI Tutor */
    pendingChatMessage?: { id: string; content: string } | null;
    onConsumePendingChatMessage?: (id: string) => void;
}

export const StudySidebar: React.FC<StudySidebarProps> = ({
    deck,
    pdfSrc,
    onAddCard,
    onUpdateCard,
    className = '',
    compactMode = false,
    activeTabOverride,
    tabRequest,
    pendingChatMessage,
    onConsumePendingChatMessage,
}) => {
    const [activeTab, setActiveTab] = useState<'flashcards' | 'chat'>('flashcards');
    const currentTab = activeTabOverride ?? activeTab;
    const lastTabRequestIdRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (!tabRequest?.id) return;
        if (lastTabRequestIdRef.current === tabRequest.id) return;
        lastTabRequestIdRef.current = tabRequest.id;
        setActiveTab(tabRequest.tab);
    }, [tabRequest?.id, tabRequest?.tab]);

    // Compact mode: just render the content
    if (compactMode) {
        return (
            <div className={`h-full ${className}`}>
                {currentTab === 'flashcards' ? (
                    <FlashcardList
                        deck={deck}
                        onAddCard={onAddCard}
                        onUpdate={onUpdateCard}
                        showHeader
                    />
                ) : (
                    <PDFChat
                        deckId={deck.id}
                        disabled={!pdfSrc}
                        pendingMessage={pendingChatMessage}
                        onConsumePendingMessage={onConsumePendingChatMessage}
                    />
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
                            {deck.cards.length} carte • Modifica inline mentre leggi il PDF
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
                    <FlashcardList
                        deck={deck}
                        onAddCard={onAddCard}
                        onUpdate={onUpdateCard}
                    />
                ) : (
                    <PDFChat
                        deckId={deck.id}
                        disabled={!pdfSrc}
                        pendingMessage={pendingChatMessage}
                        onConsumePendingMessage={onConsumePendingChatMessage}
                    />
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
