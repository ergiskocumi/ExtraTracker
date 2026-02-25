import React, { useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
    Bold, Italic, Underline, Strikethrough,
    List, ListOrdered, Quote, Code,
    Link as LinkIcon,
    Heading1, Heading2, Heading3, Minus,
    Undo, Redo, Sigma,
    Type, AlignLeft, Heading, Plus,
    ChevronDown, Maximize2, Minimize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from './Tooltip';

interface WysiwygToolbarProps {
    editor: Editor | null;
    wordCount: number;
    charCount: number;
    visible: boolean;
    size?: 'sm' | 'md';
    onToggleFullscreen?: () => void;
    isFullscreen?: boolean;
    onOpenLatex?: () => void;
}

// Icon size: compatto su mobile, standard da sm in su
const ICON_SM = 14;
const ICON_MD = 16;

// ── Bottone base toolbar (compatto, touch-friendly) ───────────────────────────
const TBtn: React.FC<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
    isActive?: boolean;
    className?: string;
    children: React.ReactNode;
}> = ({ label, onClick, disabled, isActive, className = '', children }) => (
    <Tooltip text={label}>
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            data-active={isActive ? 'true' : undefined}
            className={`
                relative flex items-center justify-center rounded-lg p-1.5 sm:p-2 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px]
                transition-all duration-150
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                ${isActive
                    ? 'toolbar-btn-active bg-violet-500/20 text-violet-600 dark:text-violet-300'
                    : 'text-theme-muted hover:text-theme-primary hover:bg-theme-surface'
                }
                ${className}
            `}
        >
            {children}
        </button>
    </Tooltip>
);

// ── Separatore (compatto) ──────────────────────────────────────────────────────
const Divider: React.FC = () => (
    <div className="toolbar-divider w-px h-4 sm:h-5 bg-theme-subtle mx-0.5 sm:mx-1 self-center flex-shrink-0" aria-hidden="true" />
);

// ── Dropdown categoria ────────────────────────────────────────────────────────
const CategoryMenu: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handle = (e: MouseEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className="wysiwyg-category-menu absolute top-full mt-1 sm:mt-1.5 p-1 sm:p-1.5 rounded-lg sm:rounded-xl shadow-xl z-50 min-w-[160px] sm:min-w-[180px] bg-theme-elevated border border-theme-default"
                    style={{ left: '50%', transform: 'translateX(-50%)' }}
                >
                    <p className="category-title px-2 py-1 sm:px-2.5 sm:py-1.5 text-[10px] font-semibold uppercase tracking-wider border-b border-theme-subtle mb-0.5 sm:mb-1 text-theme-secondary">
                        {title}
                    </p>
                    <div className="flex flex-wrap gap-0.5 p-0.5 gap-y-0.5">
                        {children}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ── Toolbar principale ────────────────────────────────────────────────────────
export const WysiwygToolbar: React.FC<WysiwygToolbarProps> = ({
    editor,
    wordCount,
    charCount,
    visible,
    onToggleFullscreen,
    isFullscreen,
    onOpenLatex,
}) => {
    const [open, setOpen] = useState<string | null>(null);

    const toggle = (id: string) => setOpen(o => o === id ? null : id);
    const run = (cmd: () => void) => { cmd(); setOpen(null); };

    return (
        <div
            className={`
                wysiwyg-toolbar-root
                relative flex flex-wrap items-center justify-between gap-x-0.5 gap-y-1 sm:gap-x-1 sm:gap-y-1
                rounded-lg sm:rounded-xl border border-theme-default bg-theme-elevated px-1.5 py-1 sm:px-2 sm:py-1.5
                shadow-lg transition-opacity duration-300 min-w-0
                ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
        >
            <div className="flex items-center gap-0.5 flex-wrap min-w-0 flex-1">

                {/* UNDO / REDO */}
                <TBtn label="Annulla (Ctrl+Z)" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()}>
                    <Undo size={ICON_SM} className="sm:w-4 sm:h-4 w-3.5 h-3.5" />
                </TBtn>
                <TBtn label="Ripristina (Ctrl+Shift+Z)" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()}>
                    <Redo size={ICON_SM} className="sm:w-4 sm:h-4 w-3.5 h-3.5" />
                </TBtn>

                <Divider />

                {/* TESTO */}
                <div className="relative">
                    <TBtn label="Formattazione testo" onClick={() => toggle('text')} isActive={open === 'text'} className="gap-1 px-1.5 sm:px-2">
                        <Type size={ICON_SM} className="sm:w-4 sm:h-4 w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs font-medium hidden sm:inline">Testo</span>
                        <ChevronDown size={10} className={`flex-shrink-0 transition-transform duration-200 ${open === 'text' ? 'rotate-180' : ''}`} />
                    </TBtn>
                    <CategoryMenu isOpen={open === 'text'} onClose={() => setOpen(null)} title="Formattazione">
                        <TBtn label="Grassetto (Ctrl+B)" onClick={() => run(() => editor?.chain().focus().toggleBold().run())} isActive={editor?.isActive('bold')}><Bold size={ICON_MD} /></TBtn>
                        <TBtn label="Corsivo (Ctrl+I)" onClick={() => run(() => editor?.chain().focus().toggleItalic().run())} isActive={editor?.isActive('italic')}><Italic size={ICON_MD} /></TBtn>
                        <TBtn label="Sottolineato (Ctrl+U)" onClick={() => run(() => editor?.chain().focus().toggleUnderline().run())} isActive={editor?.isActive('underline')}><Underline size={ICON_MD} /></TBtn>
                        <TBtn label="Barrato" onClick={() => run(() => editor?.chain().focus().toggleStrike().run())} isActive={editor?.isActive('strike')}><Strikethrough size={ICON_MD} /></TBtn>
                        <TBtn label="Codice inline" onClick={() => run(() => editor?.chain().focus().toggleCode().run())} isActive={editor?.isActive('code')}><Code size={ICON_MD} /></TBtn>
                    </CategoryMenu>
                </div>

                {/* PARAGRAFO */}
                <div className="relative">
                    <TBtn label="Elenchi e struttura" onClick={() => toggle('para')} isActive={open === 'para'} className="gap-1 px-1.5 sm:px-2">
                        <AlignLeft size={ICON_SM} className="sm:w-4 sm:h-4 w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs font-medium hidden sm:inline">Paragrafo</span>
                        <ChevronDown size={10} className={`flex-shrink-0 transition-transform duration-200 ${open === 'para' ? 'rotate-180' : ''}`} />
                    </TBtn>
                    <CategoryMenu isOpen={open === 'para'} onClose={() => setOpen(null)} title="Elenchi">
                        <TBtn label="Elenco puntato" onClick={() => run(() => editor?.chain().focus().toggleBulletList().run())} isActive={editor?.isActive('bulletList')}><List size={ICON_MD} /></TBtn>
                        <TBtn label="Elenco numerato" onClick={() => run(() => editor?.chain().focus().toggleOrderedList().run())} isActive={editor?.isActive('orderedList')}><ListOrdered size={ICON_MD} /></TBtn>
                        <TBtn label="Citazione (blockquote)" onClick={() => run(() => editor?.chain().focus().toggleBlockquote().run())} isActive={editor?.isActive('blockquote')}><Quote size={ICON_MD} /></TBtn>
                    </CategoryMenu>
                </div>

                {/* TITOLI */}
                <div className="relative">
                    <TBtn label="Titoli" onClick={() => toggle('head')} isActive={open === 'head'} className="gap-1 px-1.5 sm:px-2">
                        <Heading size={ICON_SM} className="sm:w-4 sm:h-4 w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs font-medium hidden sm:inline">Titoli</span>
                        <ChevronDown size={10} className={`flex-shrink-0 transition-transform duration-200 ${open === 'head' ? 'rotate-180' : ''}`} />
                    </TBtn>
                    <CategoryMenu isOpen={open === 'head'} onClose={() => setOpen(null)} title="Struttura">
                        <TBtn label="Titolo H1" onClick={() => run(() => editor?.chain().focus().toggleHeading({ level: 1 }).run())} isActive={editor?.isActive('heading', { level: 1 })}><Heading1 size={ICON_MD} /></TBtn>
                        <TBtn label="Titolo H2" onClick={() => run(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())} isActive={editor?.isActive('heading', { level: 2 })}><Heading2 size={ICON_MD} /></TBtn>
                        <TBtn label="Titolo H3" onClick={() => run(() => editor?.chain().focus().toggleHeading({ level: 3 }).run())} isActive={editor?.isActive('heading', { level: 3 })}><Heading3 size={ICON_MD} /></TBtn>
                        <TBtn label="Separatore orizzontale" onClick={() => run(() => editor?.chain().focus().setHorizontalRule().run())}><Minus size={ICON_MD} /></TBtn>
                    </CategoryMenu>
                </div>

                {/* INSERISCI */}
                <div className="relative">
                    <TBtn label="Inserisci elementi" onClick={() => toggle('ins')} isActive={open === 'ins'} className="gap-1 px-1.5 sm:px-2">
                        <Plus size={ICON_SM} className="sm:w-4 sm:h-4 w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs font-medium hidden sm:inline">Inserisci</span>
                        <ChevronDown size={10} className={`flex-shrink-0 transition-transform duration-200 ${open === 'ins' ? 'rotate-180' : ''}`} />
                    </TBtn>
                    <CategoryMenu isOpen={open === 'ins'} onClose={() => setOpen(null)} title="Elementi">
                        <TBtn label="Inserisci link" onClick={() => {
                            const url = window.prompt('URL', 'https://');
                            if (url) run(() => editor?.chain().focus().setLink({ href: url }).run());
                        }} isActive={editor?.isActive('link')}><LinkIcon size={ICON_MD} /></TBtn>
                        <TBtn label="Blocco codice" onClick={() => run(() => editor?.chain().focus().toggleCodeBlock().run())} isActive={editor?.isActive('codeBlock')}><Code size={ICON_MD} /></TBtn>
                        {onOpenLatex && (
                            <TBtn label="Formula LaTeX" onClick={() => { setOpen(null); onOpenLatex(); }}><Sigma size={ICON_MD} /></TBtn>
                        )}
                    </CategoryMenu>
                </div>
            </div>

            {/* Destra: stats + fullscreen */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <div className="toolbar-stats hidden md:flex flex-col items-end text-[9px] text-slate-500 font-mono leading-tight">
                    <span>{wordCount}p</span>
                    <span>{charCount}c</span>
                </div>

                {onToggleFullscreen && (
                    <>
                        <Divider />
                        <TBtn
                            label={isFullscreen ? 'Esci da fullscreen' : 'Apri fullscreen'}
                            onClick={onToggleFullscreen}
                            isActive={isFullscreen}
                        >
                            {isFullscreen ? <Minimize2 size={ICON_SM} className="sm:w-4 sm:h-4 w-3.5 h-3.5" /> : <Maximize2 size={ICON_SM} className="sm:w-4 sm:h-4 w-3.5 h-3.5" />}
                        </TBtn>
                    </>
                )}
            </div>
        </div>
    );
};

export default WysiwygToolbar;
