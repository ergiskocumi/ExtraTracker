/**
 * CARD EDITOR MODAL - Editor fullscreen migliorato per le flashcard
 *
 * Features:
 * - Interfaccia a schermo intero
 * - Anteprima live side-by-side
 * - Supporto markdown
 * - Toolbar formattazione
 * - Scorciatoie da tastiera (Ctrl+S per salvare, Esc per annullare)
 * - Theme-aware: funziona correttamente in modalità chiara e scura
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Save,
    Bold,
    Italic,
    List,
    Code,
    Quote,
    Maximize2,
    Minimize2,
    ChevronLeft,
    ChevronRight,
    Trash2,
} from 'lucide-react';
import { CardContentRenderer } from '../Flashcard/CardContentRenderer';

// ============================================
// TYPES
// ============================================

interface CardEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    frontContent: string;
    backContent: string;
    onSave: (front: string, back: string) => Promise<void>;
    onDelete?: () => void;
    title?: string;
    cardNumber?: number;
    totalCards?: number;
    onNavigate?: (direction: 'prev' | 'next') => void;
}

type EditorTab = 'edit' | 'preview' | 'split';

// ============================================
// COMPONENT
// ============================================

export const CardEditorModal: React.FC<CardEditorModalProps> = ({
    isOpen,
    onClose,
    frontContent: initialFront,
    backContent: initialBack,
    onSave,
    onDelete,
    title = 'Modifica Carta',
    cardNumber,
    totalCards,
    onNavigate,
}) => {
    const [front, setFront] = useState(initialFront);
    const [back, setBack] = useState(initialBack);
    const [activeTab, setActiveTab] = useState<EditorTab>('split');
    const [isSaving, setIsSaving] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');

    const frontRef = useRef<HTMLTextAreaElement>(null);
    const backRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            setFront(initialFront);
            setBack(initialBack);
            setActiveTab('split');
        }
    }, [isOpen, initialFront, initialBack]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
            if (e.key === 'Escape' && !isSaving) {
                onClose();
            }
            if (onNavigate) {
                if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey || e.altKey)) {
                    e.preventDefault();
                    onNavigate('prev');
                }
                if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey || e.altKey)) {
                    e.preventDefault();
                    onNavigate('next');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSaving, onClose, onNavigate]);

    const handleSave = useCallback(async () => {
        if (!front.trim() || !back.trim() || isSaving) return;

        setIsSaving(true);
        try {
            await onSave(front.trim(), back.trim());
            onClose();
        } catch (error) {
            console.error('Error saving card:', error);
        } finally {
            setIsSaving(false);
        }
    }, [front, back, isSaving, onSave, onClose]);

    const insertMarkdown = (side: 'front' | 'back', before: string, after: string = '') => {
        const ref = side === 'front' ? frontRef : backRef;
        const setValue = side === 'front' ? setFront : setBack;
        const value = side === 'front' ? front : back;

        const textarea = ref.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);

        setValue(newText);

        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + before.length + selectedText.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    // -----------------------------------------------
    // Toolbar — theme-aware
    // -----------------------------------------------
    const Toolbar = ({ side }: { side: 'front' | 'back' }) => (
        <div className="flex items-center gap-1 p-2 bg-theme-surface border-b border-theme-default">
            <button
                onClick={() => insertMarkdown(side, '**', '**')}
                className="p-2 rounded-lg hover:bg-theme-card text-theme-secondary hover:text-theme-primary transition-all"
                title="Grassetto"
                aria-label="Grassetto"
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                onClick={() => insertMarkdown(side, '*', '*')}
                className="p-2 rounded-lg hover:bg-theme-card text-theme-secondary hover:text-theme-primary transition-all"
                title="Corsivo"
                aria-label="Corsivo"
            >
                <Italic className="w-4 h-4" />
            </button>
            <button
                onClick={() => insertMarkdown(side, '\n- ')}
                className="p-2 rounded-lg hover:bg-theme-card text-theme-secondary hover:text-theme-primary transition-all"
                title="Lista"
                aria-label="Lista puntata"
            >
                <List className="w-4 h-4" />
            </button>
            <button
                onClick={() => insertMarkdown(side, '> ')}
                className="p-2 rounded-lg hover:bg-theme-card text-theme-secondary hover:text-theme-primary transition-all"
                title="Citazione"
                aria-label="Citazione"
            >
                <Quote className="w-4 h-4" />
            </button>
            <button
                onClick={() => insertMarkdown(side, '`', '`')}
                className="p-2 rounded-lg hover:bg-theme-card text-theme-secondary hover:text-theme-primary transition-all"
                title="Codice inline"
                aria-label="Codice inline"
            >
                <Code className="w-4 h-4" />
            </button>
            <div className="flex-1" />
            <span className="text-xs text-theme-muted px-2 font-medium">
                {side === 'front' ? 'Domanda' : 'Risposta'}
            </span>
        </div>
    );

    // -----------------------------------------------
    // Editor Panel — theme-aware
    // -----------------------------------------------
    const EditorPanel = ({ side }: { side: 'front' | 'back' }) => (
        <div className="flex flex-col h-full">
            <Toolbar side={side} />
            <textarea
                ref={side === 'front' ? frontRef : backRef}
                value={side === 'front' ? front : back}
                onChange={(e) => side === 'front' ? setFront(e.target.value) : setBack(e.target.value)}
                onFocus={() => setActiveSide(side)}
                placeholder={side === 'front' ? 'Scrivi la domanda...' : 'Scrivi la risposta...'}
                className="
                    flex-1 p-4 bg-transparent resize-none
                    text-theme-primary placeholder:text-theme-muted
                    focus:outline-none
                    font-mono text-sm leading-relaxed
                "
                style={{ minHeight: '200px' }}
            />
            <div className="px-4 py-2 border-t border-theme-default text-xs text-theme-muted text-right">
                {(side === 'front' ? front : back).length} caratteri
            </div>
        </div>
    );

    // -----------------------------------------------
    // Preview Panel — theme-aware
    // -----------------------------------------------
    const PreviewPanel = ({ content, label }: { content: string; label: string }) => (
        <div className="flex flex-col h-full">
            <div className="px-4 py-2 bg-theme-surface border-b border-theme-default text-xs font-semibold text-theme-muted uppercase tracking-wide">
                {label}
            </div>
            <div className="flex-1 p-4 overflow-auto">
                {content ? (
                    <CardContentRenderer content={content} />
                ) : (
                    <p className="text-theme-muted italic">Nessun contenuto...</p>
                )}
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={(e) => e.target === e.currentTarget && !isSaving && onClose()}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className={`
                            w-full bg-theme-elevated rounded-2xl border border-theme-default shadow-theme-lg overflow-hidden
                            ${showFullscreen ? 'h-[95vh] max-w-7xl' : 'max-w-5xl max-h-[90vh]'}
                            flex flex-col
                        `}
                    >
                        {/* ── Header ── */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-default bg-theme-surface">
                            <div className="flex items-center gap-4">
                                <h2 className="text-lg font-bold text-theme-primary">{title}</h2>
                                {cardNumber !== undefined && totalCards !== undefined && (
                                    <span className="text-sm text-theme-muted">
                                        Carta {cardNumber} di {totalCards}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Tab Switcher */}
                                <div className="flex items-center p-1 rounded-xl bg-theme-card border border-theme-default">
                                    {(['split', 'edit', 'preview'] as EditorTab[]).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`
                                                px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                                ${activeTab === tab
                                                    ? 'bg-primary-500 text-white shadow-sm'
                                                    : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-surface'
                                                }
                                            `}
                                        >
                                            {tab === 'split' && 'Diviso'}
                                            {tab === 'edit' && 'Modifica'}
                                            {tab === 'preview' && 'Anteprima'}
                                        </button>
                                    ))}
                                </div>

                                {/* Fullscreen Toggle */}
                                <button
                                    onClick={() => setShowFullscreen(!showFullscreen)}
                                    aria-label={showFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
                                    className="p-2 rounded-lg hover:bg-theme-card text-theme-secondary hover:text-theme-primary transition-all"
                                >
                                    {showFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                                </button>

                                {/* Close */}
                                <button
                                    onClick={onClose}
                                    disabled={isSaving}
                                    aria-label="Chiudi editor"
                                    className="p-2 rounded-lg hover:bg-theme-card text-theme-secondary hover:text-theme-primary transition-all disabled:opacity-50"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* ── Content ── */}
                        <div className="flex-1 overflow-hidden">
                            {activeTab === 'split' && (
                                <div className="grid grid-cols-2 h-full">
                                    <div className="flex flex-col border-r border-theme-default">
                                        <EditorPanel side="front" />
                                    </div>
                                    <div className="flex flex-col">
                                        <EditorPanel side="back" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'edit' && (
                                <div className="grid grid-rows-2 h-full">
                                    <div className="border-b border-theme-default">
                                        <EditorPanel side="front" />
                                    </div>
                                    <EditorPanel side="back" />
                                </div>
                            )}

                            {activeTab === 'preview' && (
                                <div className="grid grid-cols-2 h-full">
                                    <div className="border-r border-theme-default">
                                        <PreviewPanel content={front} label="Domanda" />
                                    </div>
                                    <PreviewPanel content={back} label="Risposta" />
                                </div>
                            )}
                        </div>

                        {/* ── Footer ── */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-theme-default bg-theme-surface">
                            <div className="flex items-center gap-4">
                                {/* Navigation */}
                                {onNavigate && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => onNavigate('prev')}
                                            aria-label="Carta precedente (Alt+←)"
                                            className="p-2 rounded-lg hover:bg-theme-card text-theme-secondary hover:text-theme-primary transition-all"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => onNavigate('next')}
                                            aria-label="Carta successiva (Alt+→)"
                                            className="p-2 rounded-lg hover:bg-theme-card text-theme-secondary hover:text-theme-primary transition-all"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}

                                {/* Delete */}
                                {onDelete && (
                                    <button
                                        onClick={onDelete}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-500 hover:bg-red-500/10 dark:text-red-400 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="text-sm font-medium">Elimina</span>
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs text-theme-muted hidden sm:inline">
                                    Ctrl+S per salvare · Esc per chiudere
                                </span>

                                <button
                                    onClick={onClose}
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-card border border-theme-default transition-all disabled:opacity-50 font-medium text-sm"
                                >
                                    Annulla
                                </button>

                                <button
                                    onClick={handleSave}
                                    disabled={!front.trim() || !back.trim() || isSaving}
                                    className="
                                        flex items-center gap-2 px-6 py-2 rounded-xl
                                        bg-primary-500 hover:bg-primary-600 text-white font-semibold
                                        shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40
                                        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                                        transition-all
                                    "
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            <span>Salvataggio...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>Salva</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CardEditorModal;
