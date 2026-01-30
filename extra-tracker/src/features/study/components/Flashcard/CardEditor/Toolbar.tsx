import React, { useState } from 'react';
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
    TextAlignStart,
    TextAlignCenter,
    TextAlignEnd,
    ListIndentIncrease,
    ListIndentDecrease,
    Maximize2,
    Minimize2,
} from 'lucide-react';

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

const COLOR_PALETTE = [
    '#0f172a',
    '#1e293b',
    '#334155',
    '#475569',
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#eab308',
    '#22c55e',
    '#10b981',
    '#14b8a6',
    '#06b6d4',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
];

const ToolbarButton: React.FC<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    size: 'sm' | 'md';
}> = ({ label, onClick, disabled, children, size }) => {
    const sizeClasses = size === 'sm' ? 'p-1.5' : 'p-2';
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={`rounded-lg ${sizeClasses} text-theme-secondary hover:text-theme-primary hover:bg-white/[0.08] transition-all duration-200 active:scale-95 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed`}
        >
            {children}
        </button>
    );
};

const Divider: React.FC = () => (
    <span className="w-px h-5 bg-white/10 mx-1" aria-hidden="true" />
);

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
    const [showColors, setShowColors] = useState(false);
    const iconSize = size === 'sm' ? 14 : 16;

    return (
        <div
            className={`card-editor-toolbar flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md px-2 py-2 shadow-theme-sm transition-opacity duration-300 ${
                visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        >
            <ToolbarButton label="Grassetto" onClick={() => onAction('bold')} size={size}>
                <Bold size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Corsivo" onClick={() => onAction('italic')} size={size}>
                <Italic size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Sottolineato" onClick={() => onAction('underline')} size={size}>
                <Underline size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Barrato" onClick={() => onAction('strikethrough')} size={size}>
                <Strikethrough size={iconSize} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton label="Elenco puntato" onClick={() => onAction('bullet-list')} size={size}>
                <List size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Elenco numerato" onClick={() => onAction('numbered-list')} size={size}>
                <ListOrdered size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Indenta" onClick={() => onAction('indent')} size={size}>
                <ListIndentIncrease size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Riduci indentazione" onClick={() => onAction('outdent')} size={size}>
                <ListIndentDecrease size={iconSize} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton label="Citazione" onClick={() => onAction('quote')} size={size}>
                <Quote size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Codice inline" onClick={() => onAction('code-inline')} size={size}>
                <Code size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Blocco codice" onClick={() => onAction('code-block')} size={size}>
                <Code size={iconSize} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton label="Link" onClick={() => onAction('link')} size={size}>
                <LinkIcon size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Immagine" onClick={() => onAction('image')} size={size}>
                <ImageIcon size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Formula LaTeX" onClick={() => onAction('latex')} size={size}>
                <Sigma size={iconSize} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton label="Heading 1" onClick={() => onAction('heading-1')} size={size}>
                <Heading1 size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Heading 2" onClick={() => onAction('heading-2')} size={size}>
                <Heading2 size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Heading 3" onClick={() => onAction('heading-3')} size={size}>
                <Heading3 size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Linea orizzontale" onClick={() => onAction('hr')} size={size}>
                <Minus size={iconSize} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton label="Allinea a sinistra" onClick={() => onAction('align-left')} size={size}>
                <TextAlignStart size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Allinea al centro" onClick={() => onAction('align-center')} size={size}>
                <TextAlignCenter size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Allinea a destra" onClick={() => onAction('align-right')} size={size}>
                <TextAlignEnd size={iconSize} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton label="Evidenzia" onClick={() => onAction('highlight')} size={size}>
                <Highlighter size={iconSize} />
            </ToolbarButton>
            <div className="relative">
                <ToolbarButton
                    label="Colore testo"
                    onClick={() => setShowColors((prev) => !prev)}
                    size={size}
                >
                    <Palette size={iconSize} />
                </ToolbarButton>
                {showColors && (
                    <div className="absolute z-20 mt-2 grid grid-cols-8 gap-1 rounded-xl border border-white/10 bg-theme-elevated p-2 shadow-theme-md">
                        {COLOR_PALETTE.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => {
                                    onAction('color', color);
                                    setShowColors(false);
                                }}
                                className="h-5 w-5 rounded-full border border-white/10 hover:scale-110 transition-transform"
                                style={{ backgroundColor: color }}
                                aria-label={`Colore ${color}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            <Divider />

            <ToolbarButton label="Annulla" onClick={onUndo} disabled={!canUndo} size={size}>
                <Undo size={iconSize} />
            </ToolbarButton>
            <ToolbarButton label="Ripeti" onClick={onRedo} disabled={!canRedo} size={size}>
                <Redo size={iconSize} />
            </ToolbarButton>

            {onToggleFullscreen && (
                <>
                    <Divider />
                    <ToolbarButton
                        label={isFullscreen ? 'Esci da fullscreen' : 'Fullscreen'}
                        onClick={onToggleFullscreen}
                        size={size}
                    >
                        {isFullscreen ? <Minimize2 size={iconSize} /> : <Maximize2 size={iconSize} />}
                    </ToolbarButton>
                </>
            )}

            <div className="ml-auto text-[11px] text-theme-muted px-2">
                {wordCount} parole • {charCount} caratteri
            </div>
        </div>
    );
};

export default Toolbar;
