import React, { lazy, Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck, FiArrowLeft } from 'react-icons/fi';
import { Layers, MessageCircle } from 'lucide-react';
import type { Deck, Card } from '../../services/studyService';
import { FlashcardList } from '../Flashcard/FlashcardList';

const PDFChat = lazy(() => import('../PDF/PDFChat').then(m => ({ default: m.PDFChat })));

interface StudySidebarProps {
    deck: Deck;
    pdfSrc: string | null;
    onAddCard?: () => void;
    onUpdateCard: (cardId: string, front: string, back: string) => Promise<void>;
    className?: string;
    compactMode?: boolean;
    activeTabOverride?: 'flashcards' | 'chat';
    tabRequest?: { id: string; tab: 'flashcards' | 'chat' } | null;
    pendingChatMessage?: { id: string; content: string } | null;
    onConsumePendingChatMessage?: (id: string) => void;
    onNavigateBack?: () => void;
    onDeckUpdate?: (updatedDeck: Deck) => void;
    onShowSource?: (card: Card) => void;
    activeSourceCardId?: string | null;
}

const ChatFallback: React.FC = () => (
    <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-xs text-theme-muted">Caricamento AI Tutor...</p>
        </div>
    </div>
);

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
    onNavigateBack,
    onDeckUpdate,
    onShowSource,
    activeSourceCardId,
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

    if (compactMode) {
        return (
            <div className={`h-full min-w-0 overflow-hidden bg-theme-elevated text-theme-primary ${className}`}>
                {currentTab === 'flashcards' ? (
                    <FlashcardList
                        deck={deck}
                        onAddCard={onAddCard}
                        onUpdate={onUpdateCard}
                        showHeader
                        onNavigateBack={onNavigateBack}
                        onDeckUpdate={onDeckUpdate}
                        onShowSource={onShowSource}
                        activeSourceCardId={activeSourceCardId}
                        compactMode={true}
                    />
                ) : (
                    <Suspense fallback={<ChatFallback />}>
                        <PDFChat
                            deckId={deck.id}
                            disabled={!pdfSrc}
                            pendingMessage={pendingChatMessage}
                            onConsumePendingMessage={onConsumePendingChatMessage}
                        />
                    </Suspense>
                )}
            </div>
        );
    }

    return (
        <div className={`h-full flex flex-col min-w-0 overflow-hidden bg-theme-elevated text-theme-primary ${className}`}>
            <div className="px-5 py-4 border-b border-theme-default bg-theme-surface backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 rounded-xl bg-theme-card border border-theme-default backdrop-blur-xl p-1 shadow-theme-sm">
                        <button
                            onClick={() => setActiveTab('flashcards')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                currentTab === 'flashcards'
                                    ? 'bg-primary-500/15 text-theme-primary border border-primary-500/40 shadow-theme-sm'
                                    : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-surface border border-transparent hover:border-theme-default'
                            }`}
                        >
                            <Layers className="w-4 h-4" />
                            Flashcards
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                currentTab === 'chat'
                                    ? 'bg-primary-500/15 text-theme-primary border border-primary-500/40 shadow-theme-sm'
                                    : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-surface border border-transparent hover:border-theme-default'
                            }`}
                        >
                            <MessageCircle className="w-4 h-4" />
                            AI Tutor
                        </button>
                    </div>

                    {currentTab === 'flashcards' && onNavigateBack && (
                        <button
                            onClick={onNavigateBack}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-theme-secondary hover:text-theme-primary rounded-xl bg-theme-surface hover:bg-theme-card border border-theme-default hover:border-theme-strong shadow-theme-sm transition-all duration-200 active:scale-95"
                            aria-label="Torna al mazzo"
                            title="Torna al dettaglio del mazzo"
                        >
                            <FiArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Indietro</span>
                        </button>
                    )}
                </div>

                <div className="mt-3">
                    {currentTab === 'flashcards' ? (
                        <p className="text-xs text-theme-secondary">
                            {deck.cards.length} carte · Modifica inline mentre leggi il PDF
                        </p>
                    ) : (
                        <p className="text-xs text-theme-secondary">
                            Chiedi chiarimenti direttamente sul contenuto del PDF del mazzo
                        </p>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {currentTab === 'flashcards' ? (
                    <FlashcardList
                        deck={deck}
                        onAddCard={onAddCard}
                        onUpdate={onUpdateCard}
                        onDeckUpdate={onDeckUpdate}
                        onShowSource={onShowSource}
                        activeSourceCardId={activeSourceCardId}
                    />
                ) : (
                    <Suspense fallback={<ChatFallback />}>
                        <PDFChat
                            deckId={deck.id}
                            disabled={!pdfSrc}
                            pendingMessage={pendingChatMessage}
                            onConsumePendingMessage={onConsumePendingChatMessage}
                        />
                    </Suspense>
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
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-2xl"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-xl rounded-3xl border border-theme-default bg-theme-elevated text-theme-primary backdrop-blur-2xl shadow-theme-lg overflow-hidden"
                    >
                        <div className="px-6 py-5 border-b border-theme-default bg-theme-surface backdrop-blur-sm flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-theme-primary">{title}</h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl border border-theme-default bg-theme-surface backdrop-blur-sm hover:bg-theme-card transition-all duration-300 active:scale-95"
                            >
                                <FiX className="w-5 h-5 text-theme-secondary" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-theme-secondary">
                                    Fronte (Domanda)
                                </label>
                                <textarea
                                    value={front}
                                    onChange={(e) => setFront(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-theme-surface border border-theme-default rounded-xl text-theme-primary placeholder:text-theme-muted focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 resize-none"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium text-theme-secondary">
                                    Retro (Risposta)
                                </label>
                                <textarea
                                    value={back}
                                    onChange={(e) => setBack(e.target.value)}
                                    rows={5}
                                    className="w-full px-4 py-3 bg-theme-surface border border-theme-default rounded-xl text-theme-primary placeholder:text-theme-muted focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-3 rounded-xl border border-theme-default bg-theme-surface text-theme-secondary hover:bg-theme-card hover:text-theme-primary transition-all duration-300 active:scale-95"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!front.trim() || !back.trim() || saving}
                                    className="flex items-center justify-center flex-1 gap-2 px-4 py-3 font-medium text-white transition-all duration-300 shadow-lg rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-violet-500/25 hover:from-violet-400 hover:to-fuchsia-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
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
