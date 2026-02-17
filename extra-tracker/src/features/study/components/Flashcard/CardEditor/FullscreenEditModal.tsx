/**
 * FULLSCREEN EDIT MODAL
 * ──────────────────────
 * Layout: Domanda (sx) | Risposta (dx) — editor WYSIWYG affiancati.
 * Nessuna preview: l'utente modifica entrambi i campi direttamente.
 * Tema-aware: usa classi bg-theme-* / text-theme-* ovunque.
 */

import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { Tooltip } from './Tooltip';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FullscreenEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    frontContent: string;
    backContent: string;
    onSave: (front: string, back: string) => Promise<void> | void;
    title?: string;
    /** @deprecated — la preview è stata rimossa, prop ignorata */
    showPreview?: boolean;
    disabled?: boolean;
}

// ── Animations ────────────────────────────────────────────────────────────────

const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.97, y: 16 },
    visible: {
        opacity: 1, scale: 1, y: 0,
        transition: { type: 'spring', damping: 28, stiffness: 340 },
    },
    exit: { opacity: 0, scale: 0.97, y: 16, transition: { duration: 0.18 } },
};

// ── Pill badge per l'intestazione colonna ─────────────────────────────────────

const ColumnBadge: React.FC<{
    label: string;
    sub: string;
    color: 'violet' | 'emerald';
}> = ({ label, sub, color }) => {
    const ring = color === 'violet'
        ? 'bg-violet-500/10 border-violet-500/25 text-violet-400'
        : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400';
    const dot = color === 'violet' ? 'bg-violet-400' : 'bg-emerald-400';

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${ring}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            <span>{label}</span>
            <span className="opacity-50 font-normal">{sub}</span>
        </div>
    );
};

// ── Component ─────────────────────────────────────────────────────────────────

const FullscreenEditModalComponent: React.FC<FullscreenEditModalProps> = ({
    isOpen,
    onClose,
    frontContent,
    backContent,
    onSave,
    title = 'Modifica Flashcard',
    disabled = false,
}) => {
    const [front, setFront] = useState(frontContent);
    const [back, setBack] = useState(backContent);
    const [isSaving, setIsSaving] = useState(false);
    const wasOpenRef = useRef(false);
    const modalRef = useRef<HTMLDivElement>(null);

    const stopPropagation = useCallback((e: React.SyntheticEvent) => e.stopPropagation(), []);

    // Sync solo all'apertura
    useEffect(() => {
        if (isOpen && !wasOpenRef.current) {
            setFront(frontContent);
            setBack(backContent);
        }
        wasOpenRef.current = isOpen;
    }, [isOpen, frontContent, backContent]);

    // Blocca scroll body
    useEffect(() => {
        if (typeof document === 'undefined') return undefined;
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSaving) onClose();
        };
        if (isOpen) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, isSaving, onClose]);

    const handleSave = useCallback(async () => {
        if (disabled || isSaving) return;
        const f = front.trim();
        const b = back.trim();
        if (!f || !b) return;
        setIsSaving(true);
        try {
            await onSave(f, b);
            onClose();
        } catch (err) {
            console.error('[FullscreenEditModal] save error:', err);
        } finally {
            setIsSaving(false);
        }
    }, [front, back, onSave, onClose, disabled, isSaving]);

    const handleCancel = useCallback(() => {
        if (!isSaving) onClose();
    }, [isSaving, onClose]);

    const canSave = front.trim().length > 0 && back.trim().length > 0;
    const hasChanges = front !== frontContent || back !== backContent;

    if (!isOpen) return null;

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 flex items-center justify-center p-4"
                    style={{ zIndex: 99999, isolation: 'isolate' }}
                >
                    {/* Overlay */}
                    <motion.div
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={handleCancel}
                        aria-hidden="true"
                    />

                    {/* Modal box — compatto */}
                    <motion.div
                        ref={modalRef}
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onKeyDownCapture={(e) => { stopPropagation(e); if (e.key === 'Escape') handleCancel(); }}
                        onPointerDownCapture={stopPropagation}
                        onMouseDownCapture={stopPropagation}
                        onTouchStartCapture={stopPropagation}
                        className="relative z-10 w-full max-w-5xl flex flex-col rounded-2xl border border-theme-default bg-theme-elevated shadow-theme-lg overflow-hidden"
                        style={{ maxHeight: 'min(88vh, 760px)' }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="fse-title"
                    >
                        {/* ── Header ─────────────────────────────────────── */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme-subtle bg-theme-surface flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <h2 id="fse-title" className="text-base font-semibold text-theme-primary">
                                    {title}
                                </h2>

                                {/* Stato modifiche */}
                                {hasChanges ? (
                                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-500 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                        Non salvato
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-[11px] text-theme-muted">
                                        <span className="w-1.5 h-1.5 rounded-full bg-theme-muted/40" />
                                        Salvato
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Tooltip text="Chiudi senza salvare (Esc)">
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        disabled={isSaving}
                                        aria-label="Chiudi"
                                        className="p-2 rounded-lg text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 hover:border-red-500/30 transition-all disabled:opacity-50"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        {/* ── Editor area — due colonne ───────────────────── */}
                        <div className="flex-1 overflow-hidden min-h-0 grid grid-cols-1 md:grid-cols-2">

                            {/* ── Colonna DOMANDA ── */}
                            <div className="flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-theme-subtle">
                                {/* Label colonna */}
                                <div className="px-4 pt-3 pb-2 flex-shrink-0">
                                    <ColumnBadge label="Domanda" sub="fronte" color="violet" />
                                </div>

                                {/* Editor — solo scroll verticale, niente barra orizzontale */}
                                <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 pb-4">
                                    <RichTextEditor
                                        key="front"
                                        value={front}
                                        onChange={setFront}
                                        placeholder="Scrivi la domanda..."
                                        toolbarVisibility="always"
                                        disabled={disabled || isSaving}
                                        onSave={canSave ? handleSave : undefined}
                                        onCancel={handleCancel}
                                        autoFocus
                                        minRows={10}
                                    />
                                </div>
                            </div>

                            {/* ── Colonna RISPOSTA ── */}
                            <div className="flex flex-col overflow-hidden">
                                {/* Label colonna */}
                                <div className="px-4 pt-3 pb-2 flex-shrink-0">
                                    <ColumnBadge label="Risposta" sub="retro" color="emerald" />
                                </div>

                                {/* Editor — solo scroll verticale, niente barra orizzontale */}
                                <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 pb-4">
                                    <RichTextEditor
                                        key="back"
                                        value={back}
                                        onChange={setBack}
                                        placeholder="Scrivi la risposta..."
                                        toolbarVisibility="always"
                                        disabled={disabled || isSaving}
                                        onSave={canSave ? handleSave : undefined}
                                        onCancel={handleCancel}
                                        minRows={10}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Footer ─────────────────────────────────────── */}
                        <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-theme-subtle bg-theme-surface flex-shrink-0">
                            {/* Shortcut pills — in basso a sinistra, non cliccabili */}
                            <div className="hidden sm:flex items-center gap-2" role="group" aria-label="Scorciatoie da tastiera">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25 text-[11px] font-medium text-violet-700 dark:text-violet-300 cursor-default select-none">
                                    <kbd className="px-1 py-0.5 rounded bg-violet-500/20 font-sans text-[10px]">Ctrl+Enter</kbd>
                                    salva
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25 text-[11px] font-medium text-violet-700 dark:text-violet-300 cursor-default select-none">
                                    <kbd className="px-1 py-0.5 rounded bg-violet-500/20 font-sans text-[10px]">Esc</kbd>
                                    chiudi
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5 ml-auto">
                            <Tooltip text="Annulla e chiudi (Esc)" side="top">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-theme-muted hover:text-theme-primary border border-theme-default hover:border-theme-strong hover:bg-theme-surface transition-all disabled:opacity-50"
                                >
                                    Annulla
                                </button>
                            </Tooltip>

                            <Tooltip text={canSave ? 'Salva modifiche (Ctrl+Enter)' : 'Compila entrambi i campi per salvare'} side="top">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={!canSave || isSaving || disabled}
                                    className="keep-light-text flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 rounded-full border-white/30 border-t-white animate-spin" />
                                            Salvataggio...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-3.5 h-3.5" />
                                            Salva Modifiche
                                        </>
                                    )}
                                </button>
                            </Tooltip>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    const portalTarget =
        typeof document !== 'undefined'
            ? (document.getElementById('root') ?? document.body)
            : null;

    if (!portalTarget) return null;
    return createPortal(modalContent, portalTarget);
};

export const FullscreenEditModal = memo(FullscreenEditModalComponent);
FullscreenEditModal.displayName = 'FullscreenEditModal';

export default FullscreenEditModal;
