/**
 * 📚 SPLIT STUDY PAGE (Flashka.ai Style)
 * ======================================
 *
 * Professional responsive study interface:
 * 
 * 🖥️ DESKTOP (md+):
 *    - Resizable panels using react-resizable-panels v4.x
 *    - Left: Continuous PDF viewer (60% default)
 *    - Right: Flashcard Carousel (40% default)
 *    - Synchronized highlighting
 *
 * 📱 MOBILE:
 *    - Full-screen PDF viewer
 *    - Bottom dock with tool buttons
 *    - Bottom sheet drawer for Flashcards/Chat
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// react-resizable-panels v4.x API
import { Panel, Group as PanelGroup, Separator } from 'react-resizable-panels';
import { 
    ArrowLeft, 
    BookOpen, 
    Layers, 
    MessageCircle, 
    X, 
    GripVertical,
    AlertCircle,
    Plus
} from 'lucide-react';
import { studyService, type Deck, type Card } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { useIsDesktop } from '../../../shared/hooks/useMediaQuery';
import { StudySidebar, CardModal } from '../components/Study/StudySidebar';
import { InteractivePDFReader } from '../components/PDF/InteractivePDFReader';
import { ContinuousPDFViewer } from '../components/PDF/ContinuousPDFViewer';
import { FlashcardCarousel } from '../components/Flashcard/FlashcardCarousel';

// ─────────────────────────────────────────────────────────────
// Desktop Resize Handle Component
// ─────────────────────────────────────────────────────────────

const ResizeHandle: React.FC = () => {
    return (
        <Separator className="group relative flex items-center justify-center w-2 hover:w-3 bg-white/[0.02] hover:bg-violet-500/20 border-x border-white/[0.05] hover:border-violet-500/30 transition-all duration-200 cursor-col-resize">
            {/* Grip Icon */}
            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <GripVertical className="w-4 h-4 text-violet-400" />
            </div>
            {/* Hover line */}
            <div className="absolute inset-y-4 w-0.5 bg-violet-500/0 group-hover:bg-violet-500/50 rounded-full transition-all duration-200" />
        </Separator>
    );
};

// ─────────────────────────────────────────────────────────────
// Mobile Bottom Drawer
// ─────────────────────────────────────────────────────────────

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({
    isOpen,
    onClose,
    title,
    icon,
    children,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    
                    {/* Drawer */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed inset-x-0 bottom-0 z-50 h-[70vh] max-h-[700px] rounded-t-3xl overflow-hidden bg-zinc-900 border-t border-white/10 shadow-2xl"
                    >
                        {/* Drawer Handle */}
                        <div className="absolute top-0 inset-x-0 h-12 flex items-center justify-center">
                            <button
                                onClick={onClose}
                                className="w-12 h-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                                aria-label="Chiudi drawer"
                            />
                        </div>
                        
                        {/* Header */}
                        <div className="px-5 pt-10 pb-3 border-b border-white/[0.08] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08]">
                                    {icon}
                                </div>
                                <h2 className="text-lg font-semibold text-white">{title}</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Content */}
                        <div className="h-[calc(100%-5rem)] overflow-hidden">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// ─────────────────────────────────────────────────────────────
// Mobile Bottom Dock
// ─────────────────────────────────────────────────────────────

interface MobileDockProps {
    onOpenFlashcards: () => void;
    onOpenChat: () => void;
    cardCount: number;
}

const MobileDock: React.FC<MobileDockProps> = ({
    onOpenFlashcards,
    onOpenChat,
    cardCount,
}) => {
    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 right-4 z-30"
        >
            <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50">
                {/* Flashcards Button */}
                <button
                    onClick={onOpenFlashcards}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all active:scale-95"
                >
                    <Layers className="w-5 h-5 text-white shrink-0" />
                    <div className="text-left min-w-0">
                        <p className="text-sm font-medium text-white">Flashcards</p>
                        <p className="text-xs text-white/60">{cardCount} carte</p>
                    </div>
                </button>
                
                {/* Divider */}
                <div className="w-px h-8 bg-white/10" />
                
                {/* AI Tutor Button */}
                <button
                    onClick={onOpenChat}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 hover:from-violet-500/30 hover:to-fuchsia-500/30 border border-violet-500/20 rounded-xl transition-all active:scale-95"
                >
                    <MessageCircle className="w-5 h-5 text-violet-300 shrink-0" />
                    <div className="text-left min-w-0">
                        <p className="text-sm font-medium text-white">AI Tutor</p>
                        <p className="text-xs text-violet-300/70">Chiedi aiuto</p>
                    </div>
                </button>
            </div>
        </motion.div>
    );
};


// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export const SplitStudyPage: React.FC = () => {
    const navigate = useNavigate();
    const { deckId } = useParams();
    const isDesktop = useIsDesktop();

    // Data state
    const [deck, setDeck] = useState<Deck | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI state
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addPrefill, setAddPrefill] = useState<{ front: string; back: string } | null>(null);
    const [tabRequest, setTabRequest] = useState<{ id: string; tab: 'flashcards' | 'chat' } | null>(null);
    const [pendingChatMessage, setPendingChatMessage] = useState<{ id: string; content: string } | null>(null);
    
    // Mobile drawer state
    const [drawerMode, setDrawerMode] = useState<'flashcards' | 'chat' | null>(null);

    // Flashka.ai style state - sincronizzazione PDF ↔ Flashcard
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [highlightText, setHighlightText] = useState<string | undefined>(undefined);

    // Reset card index when deck changes
    useEffect(() => {
        if (deck && deck.cards.length > 0) {
            setCurrentCardIndex(0);
            setHighlightText(deck.cards[0]?.back);
        }
    }, [deck?.id]);

    // ─── Data Loading ────────────────────────────────────────

    const loadDeck = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const fresh = await studyService.getDeckById(id);
            setDeck(fresh);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore nel caricamento del mazzo';
            setError(message);
            emitToast.error(message, { title: 'Errore' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!deckId) return;
        loadDeck(deckId);
    }, [deckId]);

    const pdfSrc = useMemo(() => {
        if (!deck?.pdfUrl) return null;
        return deck.pdfUrl;
    }, [deck?.pdfUrl]);

    // ─── Card Actions ────────────────────────────────────────

    const handleAddCard = async (front: string, back: string) => {
        if (!deckId) return;
        const updated = await studyService.addCard(deckId, { front, back });
        setDeck(updated);
        emitToast.success('Carta aggiunta', { title: 'Ok' });
    };

    const handleUpdateCard = async (cardId: string, front: string, back: string) => {
        if (!deckId) {
            emitToast.error('Deck non trovato', { title: 'Errore' });
            throw new Error('Deck non trovato');
        }
        try {
            const updated = await studyService.updateCard(deckId, cardId, { front, back });
            setDeck(updated);
            emitToast.success('Carta aggiornata', { title: 'Ok' });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore nella modifica della carta';
            emitToast.error(message, { title: 'Errore' });
            throw err;
        }
    };

    const makeRequestId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const handleAskAIFromSelection = (selectedText: string) => {
        const clean = selectedText.trim();
        if (!clean) return;

        const id = makeRequestId();
        setTabRequest({ id, tab: 'chat' });
        setPendingChatMessage({ id, content: `Spiegami questo:\n\n${clean}` });

        if (!isDesktop) {
            setDrawerMode('chat');
        }
    };

    const handleCreateFlashcardFromSelection = (selectedText: string) => {
        const clean = selectedText.trim();
        if (!clean) return;

        const oneLine = clean.replace(/\s+/g, ' ');
        const preview = oneLine.length > 120 ? `${oneLine.slice(0, 117)}...` : oneLine;

        setAddPrefill({
            front: `Spiega questo passaggio: "${preview}"`,
            back: clean,
        });
        setIsAddOpen(true);
    };

    const handleConsumePendingChatMessage = (id: string) => {
        setPendingChatMessage((prev) => (prev?.id === id ? null : prev));
    };

    // Handler per cambio flashcard - sincronizza highlight nel PDF
    const handleCardChange = (card: Card, index: number) => {
        setCurrentCardIndex(index);
        setHighlightText(card.back);
    };

    // ─── Loading State ───────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 px-4 sm:px-6 py-6 sm:py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6 animate-pulse">
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

    // ─── Error State ─────────────────────────────────────────

    if (error || !deck) {
        return (
            <div className="min-h-screen bg-zinc-950 px-4 sm:px-6 py-6 sm:py-8 flex items-center justify-center">
                <div className="max-w-md w-full">
                    <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 shrink-0">
                                <AlertCircle className="w-5 h-5 text-rose-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-semibold text-white">Impossibile aprire la pagina</h2>
                                <p className="text-sm text-white/70 mt-1 break-words">{error || 'Mazzo non trovato'}</p>
                                <div className="mt-4">
                                    <button
                                        onClick={() => navigate('/study')}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/8 text-white hover:bg-white/12 transition-all active:scale-95"
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

    // ─── Desktop Layout (Flashka.ai Style) ───────────────────

    if (isDesktop) {
        return (
            <div className="h-screen bg-zinc-950 flex flex-col">
                {/* Header */}
                <header className="flex-shrink-0 px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-4 max-w-[1800px] mx-auto">
                        <button
                            onClick={() => navigate('/study')}
                            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-bold text-white truncate">
                                {deck.title}
                            </h1>
                            <p className="text-sm text-white/50">
                                Split View Pro • Trascina il bordo per ridimensionare
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsAddOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Aggiungi Carta
                            </button>
                            {pdfSrc && (
                                <a
                                    href={pdfSrc}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/80 transition-all"
                                >
                                    <BookOpen className="w-4 h-4" />
                                    Apri PDF
                                </a>
                            )}
                        </div>
                    </div>
                </header>

                {/* Resizable Panel Layout - react-resizable-panels v4 API */}
                <div className="flex-1 px-6 py-4 overflow-hidden">
                    <PanelGroup
                        orientation="horizontal"
                        className="h-full max-w-[1800px] mx-auto"
                    >
                        {/* Left Panel: Continuous PDF */}
                        <Panel
                            id="pdf-panel"
                            defaultSize={60}
                            minSize={30}
                            className="pr-1"
                        >
                            <div className="h-full rounded-2xl border border-white/10 overflow-hidden bg-zinc-100">
                                {pdfSrc ? (
                                    <ContinuousPDFViewer
                                        src={pdfSrc}
                                        highlightText={highlightText}
                                        onAskAI={handleAskAIFromSelection}
                                        onCreateFlashcard={handleCreateFlashcardFromSelection}
                                        className="h-full"
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center p-8 bg-zinc-950">
                                        <div className="text-center max-w-md">
                                            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                                                <BookOpen className="w-6 h-6 text-white/50" />
                                            </div>
                                            <h3 className="text-base font-semibold text-white">Nessun PDF collegato</h3>
                                            <p className="text-sm text-white/60 mt-2">
                                                Per attivare la Split View, genera le carte da un PDF con "Magic Generate".
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Panel>

                        {/* Resize Handle */}
                        <ResizeHandle />

                        {/* Right Panel: Flashcard Carousel */}
                        <Panel
                            id="flashcard-panel"
                            defaultSize={40}
                            minSize={25}
                            className="pl-1"
                        >
                            <div className="h-full rounded-2xl border border-white/10 bg-zinc-900/80 overflow-hidden">
                                <FlashcardCarousel
                                    deck={deck}
                                    currentIndex={currentCardIndex}
                                    onCardChange={handleCardChange}
                                    onUpdate={handleUpdateCard}
                                />
                            </div>
                        </Panel>
                    </PanelGroup>
                </div>

                {/* Modals */}
                <CardModal
                    isOpen={isAddOpen}
                    title="Aggiungi una carta"
                    initialFront={addPrefill?.front}
                    initialBack={addPrefill?.back}
                    confirmLabel="Aggiungi"
                    onClose={() => {
                        setIsAddOpen(false);
                        setAddPrefill(null);
                    }}
                    onConfirm={handleAddCard}
                />
            </div>
        );
    }

    // ─── Mobile Layout ───────────────────────────────────────

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-zinc-950">
            {/* Mobile Header */}
            <header className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-zinc-900/95 backdrop-blur-xl z-20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/study')}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold text-white truncate">
                            {deck.title}
                        </h1>
                        <p className="text-xs text-white/50">
                            {deck.cards.length} carte
                        </p>
                    </div>
                </div>
            </header>

            {/* Full Screen PDF */}
            <div className="flex-1 overflow-auto pb-24 bg-zinc-950">
                {pdfSrc ? (
                    <div className="w-full h-full bg-white">
                        <InteractivePDFReader
                            src={pdfSrc}
                            onAskAI={handleAskAIFromSelection}
                            onCreateFlashcard={handleCreateFlashcardFromSelection}
                            className="w-full"
                        />
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-8">
                        <div className="text-center max-w-xs">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                                <BookOpen className="w-7 h-7 text-white/60" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Nessun PDF collegato</h3>
                            <p className="text-sm text-white/60 leading-relaxed">
                                Genera le carte da un PDF con "Magic Generate" per visualizzarlo qui.
                            </p>
                            <button
                                onClick={() => navigate(`/study/deck/${deckId}`)}
                                className="mt-6 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
                            >
                                Vai al Mazzo
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Bottom Dock */}
            {deck.cards.length > 0 && (
                <MobileDock
                    onOpenFlashcards={() => setDrawerMode('flashcards')}
                    onOpenChat={() => setDrawerMode('chat')}
                    cardCount={deck.cards.length}
                />
            )}

            {/* Flashcards Drawer */}
            <MobileDrawer
                isOpen={drawerMode === 'flashcards'}
                onClose={() => setDrawerMode(null)}
                title="Flashcards"
                icon={<Layers className="w-5 h-5 text-white" />}
            >
                <StudySidebar
                    deck={deck}
                    pdfSrc={pdfSrc}
                    onAddCard={() => {
                        setAddPrefill(null);
                        setIsAddOpen(true);
                    }}
                    onUpdateCard={handleUpdateCard}
                    compactMode
                    activeTabOverride="flashcards"
                    tabRequest={tabRequest}
                    pendingChatMessage={pendingChatMessage}
                    onConsumePendingChatMessage={handleConsumePendingChatMessage}
                />
            </MobileDrawer>

            {/* Chat Drawer */}
            <MobileDrawer
                isOpen={drawerMode === 'chat'}
                onClose={() => setDrawerMode(null)}
                title="AI Tutor"
                icon={<MessageCircle className="w-5 h-5 text-violet-300" />}
            >
                <StudySidebar
                    deck={deck}
                    pdfSrc={pdfSrc}
                    onAddCard={() => {
                        setAddPrefill(null);
                        setIsAddOpen(true);
                    }}
                    onUpdateCard={handleUpdateCard}
                    compactMode
                    activeTabOverride="chat"
                    tabRequest={tabRequest}
                    pendingChatMessage={pendingChatMessage}
                    onConsumePendingChatMessage={handleConsumePendingChatMessage}
                />
            </MobileDrawer>

            {/* Modals */}
            <CardModal
                isOpen={isAddOpen}
                title="Aggiungi una carta"
                initialFront={addPrefill?.front}
                initialBack={addPrefill?.back}
                confirmLabel="Aggiungi"
                onClose={() => {
                    setIsAddOpen(false);
                    setAddPrefill(null);
                }}
                onConfirm={handleAddCard}
            />
        </div>
    );
};

export default SplitStudyPage;
