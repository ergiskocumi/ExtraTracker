/**
 * FULLSCREEN EDIT MODAL - Professional Flashcard Editor
 * =====================================================
 *
 * Modal fullscreen per la modifica delle flashcard con:
 * - Editor a tutto schermo (95% viewport)
 * - Toolbar su singola riga
 * - Preview live opzionale
 * - Overlay con backdrop blur
 * - Bottoni azione fissi in basso
 *
 * @module FullscreenEditModal
 */

import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { X, Save, Eye, EyeOff } from 'lucide-react';
import { MarkdownEditor } from './MarkdownEditor';
import { EditorPreview } from './EditorPreview';

/** Selettore per la textarea dell'editor attivo (per focus esplicito). */
const EDITOR_TEXTAREA_SELECTOR = '[data-fullscreen-edit-textarea]';

// ============================================
// TYPES
// ============================================

export interface FullscreenEditModalProps {
    /** Modal aperto */
    isOpen: boolean;
    /** Callback chiusura */
    onClose: () => void;
    /** Contenuto fronte (domanda) */
    frontContent: string;
    /** Contenuto retro (risposta) */
    backContent: string;
    /** Callback salvataggio */
    onSave: (front: string, back: string) => Promise<void> | void;
    /** Titolo modal */
    title?: string;
    /** Mostra preview live */
    showPreview?: boolean;
    /** Disabilita interazioni */
    disabled?: boolean;
}

// ============================================
// ANIMATIONS
// ============================================

const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

const modalVariants: Variants = {
    hidden: {
        opacity: 0,
        scale: 0.95,
        y: 20,
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: 'spring',
            damping: 25,
            stiffness: 300,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 20,
        transition: { duration: 0.2 },
    },
};

// ============================================
// COMPONENT
// ============================================

const FullscreenEditModalComponent: React.FC<FullscreenEditModalProps> = ({
    isOpen,
    onClose,
    frontContent,
    backContent,
    onSave,
    title = 'Modifica Flashcard',
    showPreview: initialShowPreview = true,
    disabled = false,
}) => {
    // State
    const [front, setFront] = useState(frontContent);
    const [back, setBack] = useState(backContent);
    const [isSaving, setIsSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(initialShowPreview);
    const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');
    const modalRef = useRef<HTMLDivElement>(null);
    const wasOpenRef = useRef(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const stopEventPropagation = useCallback((event: React.SyntheticEvent) => {
        event.stopPropagation();
    }, []);

    // Focus esplicito sulla textarea all'apertura e al cambio tab (così l'editor riceve subito i tasti)
    useEffect(() => {
        if (!isOpen || !contentRef.current) return;
        const timer = requestAnimationFrame(() => {
            const textarea = contentRef.current?.querySelector(EDITOR_TEXTAREA_SELECTOR) as HTMLTextAreaElement | null;
            if (textarea && typeof textarea.focus === 'function') {
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }
        });
        return () => cancelAnimationFrame(timer);
    }, [isOpen, activeTab]);

    // Sync con props SOLO quando il modal si apre: così l'utente può modificare liberamente
    // senza che un re-render del genitore sovrascriva il testo (Invio, frecce, ecc.)
    useEffect(() => {
        if (isOpen && !wasOpenRef.current) {
            setFront(frontContent);
            setBack(backContent);
            setActiveTab('front');
        }
        wasOpenRef.current = isOpen;
    }, [isOpen, frontContent, backContent]);

    // Blocca scroll body quando modal è aperto
    useEffect(() => {
        if (typeof document === 'undefined') return undefined;
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Escape per chiudere
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSaving) {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, isSaving, onClose]);

    // Handlers
    const handleSave = useCallback(async () => {
        if (disabled || isSaving) return;

        const trimmedFront = front.trim();
        const trimmedBack = back.trim();

        if (!trimmedFront || !trimmedBack) return;

        setIsSaving(true);
        try {
            await onSave(trimmedFront, trimmedBack);
            onClose();
        } catch (error) {
            console.error('[FullscreenEditModal] Save failed:', error);
        } finally {
            setIsSaving(false);
        }
    }, [front, back, onSave, onClose, disabled, isSaving]);

    const handleCancel = useCallback(() => {
        if (isSaving) return;
        onClose();
    }, [isSaving, onClose]);

    // Validazione
    const canSave = front.trim().length > 0 && back.trim().length > 0;
    const hasChanges = front !== frontContent || back !== backContent;

    // Preview content based on active tab
    const previewContent = activeTab === 'front' ? front : back;

    if (!isOpen) return null;

    // Usa createPortal per renderizzare direttamente nel body
    // Questo assicura che il modal sia SEMPRE sopra tutto
    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 flex items-center justify-center"
                    style={{
                        zIndex: 99999,  // Massimo z-index possibile
                        isolation: 'isolate' // Crea nuovo stacking context
                    }}
                >
                    {/* Overlay */}
                    <motion.div
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute inset-0 bg-black/80 backdrop-blur-lg"
                        onClick={handleCancel}
                        aria-hidden="true"
                    />

                    {/* Modal - stile Word: quasi tutta la viewport, nessun max-width */}
                    <motion.div
                        ref={modalRef}
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onKeyDownCapture={(event) => {
                            stopEventPropagation(event);
                            if (event.key === 'Escape') {
                                handleCancel();
                            }
                        }}
                        onPointerDownCapture={stopEventPropagation}
                        onMouseDownCapture={stopEventPropagation}
                        onTouchStartCapture={stopEventPropagation}
                        className="relative z-10 w-[96vw] h-[96vh] max-w-[1920px] flex flex-col rounded-3xl border border-white/10 bg-[#0f1116] shadow-2xl overflow-hidden"
                        style={{
                            boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.05), 0 20px 60px -10px rgba(0, 0, 0, 0.6)',
                        }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between px-8 py-6 flex-shrink-0">
                            <div>
                                <h2 id="modal-title" className="text-2xl font-bold text-white tracking-tight">
                                    {title}
                                </h2>
                                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                                    Utilizza l'editor markdown potenziato per creare flashcard ricche di contenuti.
                                    <span className="opacity-50 ml-2 hidden sm:inline">Supporta LaTeX, Code Blocks e tabelle.</span>
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Preview Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(!showPreview)}
                                    className={`p-2.5 rounded-xl transition-all border ${
                                        showPreview 
                                            ? 'bg-white/5 text-white border-white/10' 
                                            : 'bg-transparent text-slate-500 border-transparent hover:bg-white/5 hover:text-slate-300'
                                    }`}
                                    aria-label={showPreview ? 'Nascondi anteprima' : 'Mostra anteprima'}
                                    title={showPreview ? 'Nascondi anteprima' : 'Mostra anteprima'}
                                >
                                    {showPreview ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                </button>

                                {/* Close Button */}
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/20 border border-transparent transition-all disabled:opacity-50"
                                    aria-label="Chiudi"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Tab Switcher & Stats */}
                        <div className="flex items-center justify-between px-8 pb-4 border-b border-white/5 flex-shrink-0">
                            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('front')}
                                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                        activeTab === 'front'
                                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/20'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    Domanda
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('back')}
                                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                        activeTab === 'back'
                                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    Risposta
                                </button>
                            </div>

                            {/* Status indicators */}
                            <div className="flex items-center gap-4 text-xs font-medium">
                                {hasChanges ? (
                                    <span className="flex items-center gap-2 text-amber-400 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                        Modifiche non salvate
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2 text-slate-500 px-3 py-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                        Tutto salvato
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div ref={contentRef} className={`flex-1 overflow-hidden min-h-0 bg-[#0f1116] ${showPreview ? 'grid grid-cols-1 lg:grid-cols-2' : ''}`}>
                            {/* Editor Panel */}
                            <div className={`h-full overflow-hidden flex flex-col min-w-0 lg:min-w-[380px] ${showPreview ? 'border-r border-white/5' : ''}`}>
                                <div className="flex-1 overflow-hidden p-6 min-h-0 relative">
                                    {/* Background decoration */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent pointer-events-none" />
                                    
                                    <div className="relative h-full flex flex-col">
                                        {activeTab === 'front' ? (
                                            <MarkdownEditor
                                                key="front-editor"
                                                value={front}
                                                onChange={setFront}
                                                placeholder="# Scrivi qui la tua domanda..."
                                                toolbarVisibility="always"
                                                size="md"
                                                autoFocus
                                                disabled={disabled || isSaving}
                                                onSave={canSave ? handleSave : undefined}
                                                onCancel={handleCancel}
                                                minRows={14}
                                                textareaClassName="min-h-[50vh] resize-none bg-transparent border-none focus:ring-0 p-0 text-base leading-relaxed text-slate-200 font-mono"
                                            />
                                        ) : (
                                            <MarkdownEditor
                                                key="back-editor"
                                                value={back}
                                                onChange={setBack}
                                                placeholder="Scrivi la risposta... Supporta **Markdown** e $LaTeX$"
                                                toolbarVisibility="always"
                                                size="md"
                                                autoFocus
                                                disabled={disabled || isSaving}
                                                onSave={canSave ? handleSave : undefined}
                                                onCancel={handleCancel}
                                                minRows={14}
                                                textareaClassName="min-h-[50vh] resize-none bg-transparent border-none focus:ring-0 p-0 text-base leading-relaxed text-slate-200 font-mono"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Preview Panel */}
                            {showPreview && (
                                <div className="h-full overflow-hidden flex flex-col bg-[#0a0c10] min-w-0 lg:min-w-[380px]">
                                    <div className="px-6 py-3 border-b border-white/5 flex-shrink-0 bg-[#0c0e12]">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <Eye className="w-3.5 h-3.5 opacity-70" />
                                            Anteprima Live {activeTab === 'front' ? '(Domanda)' : '(Risposta)'}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-auto p-8 min-h-0">
                                        <div className="prose prose-invert prose-slate max-w-none">
                                            <EditorPreview
                                                content={previewContent}
                                                visible={true}
                                                label=""
                                                minHeight="min-h-[50vh]"
                                                emptyPlaceholder="Inizia a scrivere per vedere l'anteprima..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer - Action Buttons */}
                        <div className="flex items-center justify-between px-8 py-5 border-t border-white/5 bg-[#12141a] flex-shrink-0">
                            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                                <span className="flex items-center gap-1.5">
                                    <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-md font-sans text-[10px]">Ctrl</kbd>
                                    <span>+</span>
                                    <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-md font-sans text-[10px]">Enter</kbd>
                                    <span className="ml-1 opacity-70">Salva</span>
                                </span>
                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                <span className="flex items-center gap-1.5">
                                    <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-md font-sans text-[10px]">Esc</kbd>
                                    <span className="ml-1 opacity-70">Chiudi</span>
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 border border-transparent transition-all disabled:opacity-50"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={!canSave || isSaving || disabled}
                                    className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 ring-1 ring-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />
                                            <span>Salvataggio...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>Salva Modifiche</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    // Portal nel ROOT React (#root): così input/keydown (Invio, frecce, digitazione) arrivano
    // al root e React li gestisce. Con portal su body gli eventi non raggiungevano il root.
    const portalTarget =
        typeof document !== 'undefined' ? (document.getElementById('root') ?? document.body) : null;
    if (!portalTarget) return null;
    return createPortal(modalContent, portalTarget);
};

/**
 * Memoized version
 */
export const FullscreenEditModal = memo(FullscreenEditModalComponent);

FullscreenEditModal.displayName = 'FullscreenEditModal';

export default FullscreenEditModal;
