/**
 * CARD EDITOR MODAL - Editor fullscreen migliorato per le flashcard
 * 
 * Features:
 * - Interfaccia a schermo intero
 * - Anteprima live side-by-side
 * - Supporto markdown
 * - Toolbar formattazione
 * - Scorciatoie da tastiera (Ctrl+S per salvare, Esc per annullare)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Save,
    Eye,
    EyeOff,
    Type,
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
    Sparkles,
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

    // Reset quando si apre
    useEffect(() => {
        if (isOpen) {
            setFront(initialFront);
            setBack(initialBack);
            setActiveTab('split');
        }
    }, [isOpen, initialFront, initialBack]);

    // Scorciatoie da tastiera
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl/Cmd + S per salvare
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
            // Esc per chiudere
            if (e.key === 'Escape' && !isSaving) {
                onClose();
            }
            // Navigazione frecce
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
        
        // Ripristina focus e selezione
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + before.length + selectedText.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const Toolbar = ({ side }: { side: 'front' | 'back' }) => (
        <div className="flex items-center gap-1 p-2 bg-white/5 border-b border-white/10">
            <button
                onClick={() => insertMarkdown(side, '**', '**')}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
                title="Grassetto"
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                onClick={() => insertMarkdown(side, '*', '*')}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
                title="Corsivo"
            >
                <Italic className="w-4 h-4" />
            </button>
            <button
                onClick={() => insertMarkdown(side, '\n- ')}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
                title="Lista"
            >
                <List className="w-4 h-4" />
            </button>
            <button
                onClick={() => insertMarkdown(side, '> ')}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
                title="Citazione"
            >
                <Quote className="w-4 h-4" />
            </button>
            <button
                onClick={() => insertMarkdown(side, '`', '`')}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
                title="Codice inline"
            >
                <Code className="w-4 h-4" />
            </button>
            <div className="flex-1" />
            <span className="text-xs text-white/30 px-2">
                {side === 'front' ? 'Domanda' : 'Risposta'}
            </span>
        </div>
    );

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
                    text-white placeholder:text-white/30
                    focus:outline-none
                    font-mono text-sm leading-relaxed
                "
                style={{ minHeight: '200px' }}
            />
            <div className="px-4 py-2 border-t border-white/10 text-xs text-white/30 text-right">
                {(side === 'front' ? front : back).length} caratteri
            </div>
        </div>
    );

    const PreviewPanel = ({ content, label }: { content: string; label: string }) => (
        <div className="flex flex-col h-full">
            <div className="px-4 py-2 bg-white/5 border-b border-white/10 text-xs font-medium text-white/50 uppercase tracking-wide">
                {label}
            </div>
            <div className="flex-1 p-4 overflow-auto">
                {content ? (
                    <CardContentRenderer content={content} />
                ) : (
                    <p className="text-white/30 italic">Nessun contenuto...</p>
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
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={(e) => e.target === e.currentTarget && !isSaving && onClose()}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className={`
                            w-full bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden
                            ${showFullscreen ? 'h-[95vh] max-w-7xl' : 'max-w-5xl max-h-[90vh]'}
                            flex flex-col
                        `}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                            <div className="flex items-center gap-4">
                                <h2 className="text-lg font-bold text-white">{title}</h2>
                                {cardNumber !== undefined && totalCards !== undefined && (
                                    <span className="text-sm text-white/50">
                                        Carta {cardNumber} di {totalCards}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Tab Switcher */}
                                <div className="flex items-center p-1 rounded-lg bg-white/5 border border-white/10">
                                    {(['split', 'edit', 'preview'] as EditorTab[]).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`
                                                px-3 py-1.5 rounded-md text-sm font-medium transition-all
                                                ${activeTab === tab
                                                    ? 'bg-primary-500 text-white'
                                                    : 'text-white/50 hover:text-white/80'
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
                                    className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
                                >
                                    {showFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                                </button>

                                {/* Close */}
                                <button
                                    onClick={onClose}
                                    disabled={isSaving}
                                    className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all disabled:opacity-50"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">
                            {activeTab === 'split' && (
                                <div className="grid grid-cols-2 h-full divide-x divide-white/10">
                                    <div className="flex flex-col">
                                        <EditorPanel side="front" />
                                    </div>
                                    <div className="flex flex-col">
                                        <EditorPanel side="back" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'edit' && (
                                <div className="grid grid-rows-2 h-full divide-y divide-white/10">
                                    <EditorPanel side="front" />
                                    <EditorPanel side="back" />
                                </div>
                            )}

                            {activeTab === 'preview' && (
                                <div className="grid grid-cols-2 h-full divide-x divide-white/10">
                                    <PreviewPanel content={front} label="Domanda" />
                                    <PreviewPanel content={back} label="Risposta" />
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/5">
                            <div className="flex items-center gap-4">
                                {/* Navigation */}
                                {onNavigate && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onNavigate('prev')}
                                            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
                                            title="Carta precedente (Alt+←)"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => onNavigate('next')}
                                            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
                                            title="Carta successiva (Alt+→)"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}

                                {/* Delete */}
                                {onDelete && (
                                    <button
                                        onClick={onDelete}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="text-sm">Elimina</span>
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs text-white/40 hidden sm:inline">
                                    Ctrl+S per salvare · Esc per chiudere
                                </span>
                                
                                <button
                                    onClick={onClose}
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                                >
                                    Annulla
                                </button>
                                
                                <button
                                    onClick={handleSave}
                                    disabled={!front.trim() || !back.trim() || isSaving}
                                    className="
                                        flex items-center gap-2 px-6 py-2 rounded-lg
                                        bg-primary-500 hover:bg-primary-600 text-white font-medium
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                        transition-all
                                    "
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
