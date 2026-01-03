/**
 * 📚 SPLIT STUDY PAGE (Pro Edition)
 * ==================================
 *
 * Professional responsive study interface:
 * 
 * 🖥️ DESKTOP (md+):
 *    - Resizable panels using react-resizable-panels
 *    - Left: PDF viewer (60% default, min 30%)
 *    - Right: Flashcards/Chat tabs
 *    - Panel position persisted to localStorage
 *
 * 📱 MOBILE:
 *    - Full-screen PDF viewer
 *    - Glassmorphic bottom dock with tool buttons
 *    - Bottom sheet drawer for Flashcards/Chat
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { 
    ArrowLeft, 
    BookOpen, 
    Layers, 
    MessageCircle, 
    X, 
    GripVertical,
    AlertCircle
} from 'lucide-react';
import { studyService, type Deck, type Card } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';
import { useIsDesktop } from '../../../shared/hooks/useMediaQuery';
import { StudySidebar, CardModal } from '../components/StudySidebar';
import { InteractivePDFReader } from '../components/InteractivePDFReader';

// ─────────────────────────────────────────────────────────────
// Desktop Resize Handle
// ─────────────────────────────────────────────────────────────

const ResizeHandle: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <PanelResizeHandle
            className={`
                group relative flex items-center justify-center
                w-2 hover:w-3
                bg-white/[0.02] hover:bg-blue-500/20
                border-l border-r border-white/[0.05] hover:border-blue-500/30
                transition-all duration-200 ease-out
                cursor-col-resize
                ${className}
            `}
        >
            {/* Grip Icon */}
            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <GripVertical className="w-4 h-4 text-blue-400" />
            </div>
            
            {/* Hover line indicator */}
            <div className="absolute inset-y-4 w-0.5 bg-blue-500/0 group-hover:bg-blue-500/50 rounded-full transition-all duration-200" />
        </PanelResizeHandle>
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
                        className="fixed inset-x-0 bottom-0 z-50 h-[60vh] max-h-[600px] rounded-t-3xl overflow-hidden"
                        style={{
                            background: 'linear-gradient(180deg, rgba(30, 27, 45, 0.98) 0%, rgba(20, 18, 35, 0.99) 100%)',
                        }}
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
            transition={{ delay: 0.3, type: 'spring', damping: 20 }}
            className="fixed bottom-4 left-4 right-4 z-30"
        >
            <div className="
                flex items-center justify-center gap-3
                px-4 py-3
                bg-black/80 backdrop-blur-xl
                border border-white/[0.1]
                rounded-2xl
                shadow-2xl shadow-black/50
            ">
                {/* Flashcards Button */}
                <button
                    onClick={onOpenFlashcards}
                    className="
                        flex-1 flex items-center justify-center gap-3
                        px-4 py-3
                        bg-white/[0.08] hover:bg-white/[0.12]
                        border border-white/[0.1]
                        rounded-xl
                        transition-all duration-200
                        active:scale-95
                    "
                >
                    <Layers className="w-5 h-5 text-white" />
                    <div className="text-left">
                        <p className="text-sm font-medium text-white">Flashcards</p>
                        <p className="text-xs text-white/50">{cardCount} carte</p>
                    </div>
                </button>
                
                {/* Divider */}
                <div className="w-px h-10 bg-white/[0.1]" />
                
                {/* AI Tutor Button */}
                <button
                    onClick={onOpenChat}
                    className="
                        flex-1 flex items-center justify-center gap-3
                        px-4 py-3
                        bg-gradient-to-r from-primary-500/20 to-primary-600/20
                        hover:from-primary-500/30 hover:to-primary-600/30
                        border border-primary-500/20
                        rounded-xl
                        transition-all duration-200
                        active:scale-95
                    "
                >
                    <MessageCircle className="w-5 h-5 text-primary-300" />
                    <div className="text-left">
                        <p className="text-sm font-medium text-white">AI Tutor</p>
                        <p className="text-xs text-primary-300/70">Chiedi aiuto</p>
                    </div>
                </button>
            </div>
        </motion.div>
    );
};

// ─────────────────────────────────────────────────────────────
// PDF Viewer Component
// ─────────────────────────────────────────────────────────────

interface PDFViewerProps {
    pdfSrc: string | null;
    className?: string;
    fullHeight?: boolean;
    onAskAI: (selectedText: string) => void;
    onCreateFlashcard: (selectedText: string) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
    pdfSrc, 
    className = '',
    fullHeight = false,
    onAskAI,
    onCreateFlashcard,
}) => {
    return (
        <div className={`rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden flex flex-col ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] flex-shrink-0">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary-300" />
                    <h2 className="text-sm font-semibold text-white">PDF</h2>
                </div>
                {!pdfSrc && (
                    <span className="text-xs text-white/50">
                        Carica un PDF con "Magic Generate"
                    </span>
                )}
            </div>

            {/* PDF Content */}
            <div className={`${fullHeight ? 'flex-1' : 'h-[70vh]'} bg-black/10 overflow-auto`}>
                {pdfSrc ? (
                    <InteractivePDFReader
                        src={pdfSrc}
                        onAskAI={onAskAI}
                        onCreateFlashcard={onCreateFlashcard}
                        className="w-full"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-8">
                        <div className="text-center max-w-md">
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-4">
                                <BookOpen className="w-6 h-6 text-white/50" />
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
    const [editMode, setEditMode] = useState(false);
    const [editingCard, setEditingCard] = useState<Card | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addPrefill, setAddPrefill] = useState<{ front: string; back: string } | null>(null);
    const [tabRequest, setTabRequest] = useState<{ id: string; tab: 'flashcards' | 'chat' } | null>(null);
    const [pendingChatMessage, setPendingChatMessage] = useState<{ id: string; content: string } | null>(null);
    
    // Mobile drawer state
    const [drawerMode, setDrawerMode] = useState<'flashcards' | 'chat' | null>(null);

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

    const handleUpdateCard = async (front: string, back: string) => {
        if (!deckId || !editingCard) return;
        const updated = await studyService.updateCard(deckId, editingCard.id, { front, back });
        setDeck(updated);
        emitToast.success('Carta aggiornata', { title: 'Ok' });
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

    // ─── Loading State ───────────────────────────────────────

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

    // ─── Error State ─────────────────────────────────────────

    if (error || !deck) {
        return (
            <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8">
                <div className="max-w-3xl mx-auto">
                    <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30">
                                <AlertCircle className="w-5 h-5 text-rose-300" />
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

    // ─── Desktop Layout ──────────────────────────────────────

    if (isDesktop) {
        return (
            <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8">
                <div className="max-w-[1800px] mx-auto h-[calc(100vh-4rem)]">
                    {/* Header */}
                    <header className="mb-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/study')}
                                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                                    {deck.title}
                                </h1>
                                <p className="text-sm text-white/50 mt-0.5">
                                    Split View Pro • Trascina il bordo per ridimensionare
                                </p>
                            </div>
                            {pdfSrc && (
                                <a
                                    href={pdfSrc}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/80 transition-all"
                                >
                                    <BookOpen className="w-4 h-4" />
                                    Apri PDF
                                </a>
                            )}
                        </div>
                    </header>

                    {/* Resizable Panel Layout */}
                    <PanelGroup
                        orientation="horizontal"
                        id="split-study-panels"
                        className="h-[calc(100%-4rem)]"
                    >
                        {/* Left Panel: PDF */}
                        <Panel
                            id="pdf-panel"
                            defaultSize="60%"
                            minSize="30%"
                            className="pr-1"
                        >
                            <PDFViewer 
                                pdfSrc={pdfSrc} 
                                className="h-full"
                                fullHeight
                                onAskAI={handleAskAIFromSelection}
                                onCreateFlashcard={handleCreateFlashcardFromSelection}
                            />
                        </Panel>

                        {/* Resize Handle */}
                        <ResizeHandle />

                        {/* Right Panel: Sidebar */}
                        <Panel
                            id="tools-panel"
                            defaultSize="40%"
                            minSize="25%"
                            className="pl-1"
                        >
                            <div className="h-full rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden">
                                <StudySidebar
                                    deck={deck}
                                    pdfSrc={pdfSrc}
                                    editMode={editMode}
                                    setEditMode={setEditMode}
                                    onAddCard={() => {
                                        setAddPrefill(null);
                                        setIsAddOpen(true);
                                    }}
                                    onEditCard={setEditingCard}
                                    tabRequest={tabRequest}
                                    pendingChatMessage={pendingChatMessage}
                                    onConsumePendingChatMessage={handleConsumePendingChatMessage}
                                />
                            </div>
                        </Panel>
                    </PanelGroup>

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
    }

    // ─── Mobile Layout ───────────────────────────────────────

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            {/* Mobile Header */}
            <header className="flex-shrink-0 px-4 py-3 border-b border-white/[0.08] bg-black/20 backdrop-blur-lg z-20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/study')}
                        className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all"
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
            <div className="flex-1 overflow-auto pb-20">
                {pdfSrc ? (
                    <InteractivePDFReader
                        src={pdfSrc}
                        onAskAI={handleAskAIFromSelection}
                        onCreateFlashcard={handleCreateFlashcardFromSelection}
                        className="w-full"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-8 bg-black/10">
                        <div className="text-center max-w-xs">
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-4">
                                <BookOpen className="w-6 h-6 text-white/50" />
                            </div>
                            <h3 className="text-base font-semibold text-white">Nessun PDF</h3>
                            <p className="text-sm text-white/60 mt-1">
                                Genera le carte da un PDF per visualizzarlo qui.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Bottom Dock */}
            <MobileDock
                onOpenFlashcards={() => setDrawerMode('flashcards')}
                onOpenChat={() => setDrawerMode('chat')}
                cardCount={deck.cards.length}
            />

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
                    editMode={editMode}
                    setEditMode={setEditMode}
                    onAddCard={() => {
                        setAddPrefill(null);
                        setIsAddOpen(true);
                    }}
                    onEditCard={setEditingCard}
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
                icon={<MessageCircle className="w-5 h-5 text-primary-300" />}
            >
                <StudySidebar
                    deck={deck}
                    pdfSrc={pdfSrc}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    onAddCard={() => {
                        setAddPrefill(null);
                        setIsAddOpen(true);
                    }}
                    onEditCard={setEditingCard}
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
    );
};

export default SplitStudyPage;
