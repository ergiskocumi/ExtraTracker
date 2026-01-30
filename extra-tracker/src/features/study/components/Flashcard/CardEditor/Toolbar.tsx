import React, { useState, useRef, useEffect } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    List,
    ListOrdered,
    Quote,
    Code,
    Link as LinkIcon,
    Image as ImageIcon,
    Heading1,
    Heading2,
    Heading3,
    Minus,
    Undo,
    Redo,
    Sigma,
    Highlighter,
    Palette,
    // Icons for categories
    Type,
    AlignLeft,
    Heading,
    Plus,
    MoreHorizontal,
    ListIndentIncrease,
    ListIndentDecrease,
    Maximize2,
    Minimize2,
    ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToolbarAction =
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'bullet-list'
    | 'numbered-list'
    | 'quote'
    | 'code-inline'
    | 'code-block'
    | 'link'
    | 'image'
    | 'heading-1'
    | 'heading-2'
    | 'heading-3'
    | 'hr'
    | 'latex'
    | 'color'
    | 'highlight'
    | 'align-left'
    | 'align-center'
    | 'align-right'
    | 'indent'
    | 'outdent';

interface ToolbarProps {
    onAction: (action: ToolbarAction, payload?: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    wordCount: number;
    charCount: number;
    visible: boolean;
    size?: 'sm' | 'md';
    onToggleFullscreen?: () => void;
    isFullscreen?: boolean;
}

const ToolbarButton: React.FC<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    isActive?: boolean; // For category buttons
    className?: string;
}> = ({ label, onClick, disabled, children, isActive, className = '' }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={`
                relative flex items-center justify-center rounded-lg p-2 transition-all duration-200
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                ${isActive 
                    ? 'bg-violet-500/20 text-violet-300' 
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }
                ${className}
            `}
        >
            {children}
        </button>
    );
};

const Divider: React.FC = () => (
    <div className="w-px h-6 bg-white/10 mx-2 self-center" aria-hidden="true" />
);

// Popup menu component for categories
const CategoryMenu: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
}> = ({ isOpen, onClose, children, title }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute top-full left-0 mt-2 p-2 bg-[#1a1d26] border border-white/10 rounded-xl shadow-xl z-50 flex flex-col gap-1 min-w-[200px]"
                    style={{ left: '-50%' }} // Adjust alignment if needed
                >
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-white/5 mb-1">
                        {title}
                    </div>
                    <div className="flex flex-wrap gap-1 p-1">
                        {children}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


export const Toolbar: React.FC<ToolbarProps> = ({
    onAction,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    wordCount,
    charCount,
    visible,
    size = 'md',
    onToggleFullscreen,
    isFullscreen,
}) => {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const iconSize = 18; // Standard size

    const toggleCategory = (category: string) => {
        setActiveCategory(activeCategory === category ? null : category);
    };

    return (
        <div
            className={`
                relative flex items-center justify-between gap-2 rounded-2xl border border-white/5 bg-[#14161f] p-2 shadow-xl transition-opacity duration-300
                ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
        >
            <div className="flex items-center gap-1">
                {/* GLOBAL ACTIONS - Always visible */}
                <ToolbarButton label="Annulla" onClick={onUndo} disabled={!canUndo}>
                    <Undo size={iconSize} />
                </ToolbarButton>
                <ToolbarButton label="Ripristina" onClick={onRedo} disabled={!canRedo}>
                    <Redo size={iconSize} />
                </ToolbarButton>
                
                <Divider />

                {/* CATEGORY: TEXT STYLE */}
                <div className="relative">
                    <ToolbarButton 
                        label="Stile Testo" 
                        onClick={() => toggleCategory('text')}
                        isActive={activeCategory === 'text'}
                        className="gap-2 px-3"
                    >
                        <Type size={iconSize} />
                        <span className="text-sm font-medium">Testo</span>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${activeCategory === 'text' ? 'rotate-180' : ''}`} />
                    </ToolbarButton>
                    
                    <CategoryMenu isOpen={activeCategory === 'text'} onClose={() => setActiveCategory(null)} title="Formattazione">
                        <ToolbarButton label="Grassetto" onClick={() => onAction('bold')}>
                            <Bold size={iconSize} />
                        </ToolbarButton>
                        <ToolbarButton label="Corsivo" onClick={() => onAction('italic')}>
                            <Italic size={iconSize} />
                        </ToolbarButton>
                        <ToolbarButton label="Sottolineato" onClick={() => onAction('underline')}>
                            <Underline size={iconSize} />
                        </ToolbarButton>
                        <ToolbarButton label="Barrato" onClick={() => onAction('strikethrough')}>
                            <Strikethrough size={iconSize} />
                        </ToolbarButton>
                        <ToolbarButton label="Codice Inline" onClick={() => onAction('code-inline')}>
                            <Code size={iconSize} />
                        </ToolbarButton>
                        {/* Highlights removed for brevity as they were not fully implemented in old toolbar logic shown, but placeholders exist */}
                    </CategoryMenu>
                </div>

                {/* CATEGORY: PARAGRAPH */}
                <div className="relative">
                    <ToolbarButton 
                        label="Paragrafo" 
                        onClick={() => toggleCategory('paragraph')}
                        isActive={activeCategory === 'paragraph'}
                        className="gap-2 px-3"
                    >
                        <AlignLeft size={iconSize} />
                        <span className="text-sm font-medium">Paragrafo</span>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${activeCategory === 'paragraph' ? 'rotate-180' : ''}`} />
                    </ToolbarButton>
                    
                    <CategoryMenu isOpen={activeCategory === 'paragraph'} onClose={() => setActiveCategory(null)} title="Elenchi e Allineamento">
                        <ToolbarButton label="Elenco Puntato" onClick={() => onAction('bullet-list')}>
                            <List size={iconSize} />
                        </ToolbarButton>
                        <ToolbarButton label="Elenco Numerato" onClick={() => onAction('numbered-list')}>
                            <ListOrdered size={iconSize} />
                        </ToolbarButton>
                        <ToolbarButton label="Aumenta Rientro" onClick={() => onAction('indent')}>
                            <ListIndentIncrease size={iconSize} />
                        </ToolbarButton>
                        <ToolbarButton label="Riduci Rientro" onClick={() => onAction('outdent')}>
                            <ListIndentDecrease size={iconSize} />
                        </ToolbarButton>
                        <ToolbarButton label="Citazione" onClick={() => onAction('quote')}>
                            <Quote size={iconSize} />
                        </ToolbarButton>
                    </CategoryMenu>
                </div>

                {/* CATEGORY: HEADINGS */}
                <div className="relative">
                    <ToolbarButton 
                        label="Titoli" 
                        onClick={() => toggleCategory('headings')}
                        isActive={activeCategory === 'headings'}
                        className="gap-2 px-3"
                    >
                        <Heading size={iconSize} />
                        <span className="text-sm font-medium">Titoli</span>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${activeCategory === 'headings' ? 'rotate-180' : ''}`} />
                    </ToolbarButton>
                    
                    <CategoryMenu isOpen={activeCategory === 'headings'} onClose={() => setActiveCategory(null)} title="Struttura">
                        <ToolbarButton label="Titolo 1 (H1)" onClick={() => onAction('heading-1')}>
                            <Heading1 size={iconSize} />
                        </ToolbarButton>
                        <ToolbarButton label="Titolo 2 (H2)" onClick={() => onAction('heading-2')}>
                            <Heading2 size={iconSize} />
                        </ToolbarButton>
                        <ToolbarButton label="Titolo 3 (H3)" onClick={() => onAction('heading-3')}>
                            <Heading3 size={iconSize} />
                        </ToolbarButton>
                        <ToolbarButton label="Divisore" onClick={() => onAction('hr')}>
                            <Minus size={iconSize} />
                        </ToolbarButton>
                    </CategoryMenu>
                </div>

                {/* CATEGORY: INSERT */}
                <div className="relative">
                    <ToolbarButton 
                        label="Inserisci" 
                        onClick={() => toggleCategory('insert')}
                        isActive={activeCategory === 'insert'}
                        className="gap-2 px-3"
                    >
                        <Plus size={iconSize} />
                        <span className="text-sm font-medium">Inserisci</span>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${activeCategory === 'insert' ? 'rotate-180' : ''}`} />
                    </ToolbarButton>

                    <CategoryMenu isOpen={activeCategory === 'insert'} onClose={() => setActiveCategory(null)} title="Elementi Multimediali">
                        <ToolbarButton label="Link" onClick={() => onAction('link')}>
                            <LinkIcon size={iconSize} />
                        </ToolbarButton>
                        <ToolbarButton label="Immagine" onClick={() => onAction('image')}>
                            <ImageIcon size={iconSize} />
                        </ToolbarButton>
                        <ToolbarButton label="Blocco Codice" onClick={() => onAction('code-block')}>
                            <Code size={iconSize} />
                        </ToolbarButton>
                        <ToolbarButton label="Formula LaTeX" onClick={() => onAction('latex')}>
                            <Sigma size={iconSize} />
                        </ToolbarButton>
                    </CategoryMenu>
                </div>
            </div>

            {/* Right side: Stats & Fullscreen */}
            <div className="flex items-center gap-4 px-2">
                <div className="hidden sm:flex flex-col items-end text-[10px] sm:text-xs text-slate-500 font-mono leading-none">
                    <span>{wordCount} parole</span>
                    <span>{charCount} car.</span>
                </div>
                
                {onToggleFullscreen && (
                    <>
                        <div className="w-px h-6 bg-white/10" aria-hidden="true" />
                        <ToolbarButton 
                            label={isFullscreen ? "Esci da Fullscreen" : "Fullscreen"} 
                            onClick={onToggleFullscreen}
                            isActive={isFullscreen}
                        >
                            {isFullscreen ? <Minimize2 size={iconSize} /> : <Maximize2 size={iconSize} />}
                        </ToolbarButton>
                    </>
                )}
            </div>
        </div>
    );
};

export default Toolbar;
