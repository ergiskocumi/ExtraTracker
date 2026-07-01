import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import LinkExt from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';
import { WysiwygToolbar } from './WysiwygToolbar';
import { LaTeXModal } from './LaTeXModal';

import './styles/editor.css';
import './styles/richtext.css';

export type ToolbarVisibility = 'always' | 'focus' | 'hidden';

interface MarkdownStorage {
    markdown?: {
        getMarkdown: () => string;
    };
}

function getEditorMarkdown(editor: Editor): string {
    const markdownStorage = (editor.storage as unknown as MarkdownStorage).markdown;
    return markdownStorage?.getMarkdown() ?? '';
}

export interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
    toolbarVisibility?: ToolbarVisibility;
    size?: 'sm' | 'md';
    autoFocus?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    onSave?: () => void;
    onCancel?: () => void;
    historyKey?: string | number | boolean;
    minRows?: number;
    // textareaClassName è ignorata (non è una textarea) ma la accettiamo per compatibilità
    textareaClassName?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    label,
    placeholder,
    className,
    toolbarVisibility = 'focus',
    autoFocus = false,
    disabled = false,
    readOnly = false,
    onSave,
    onCancel,
    minRows = 3,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [latexOpen, setLatexOpen] = useState(false);
    const [latexMode, setLatexMode] = useState<'inline' | 'block'>('inline');
    const [latexValue, setLatexValue] = useState('');

    // Impedisce che onChange del parent venga richiamato durante l'aggiornamento interno
    const isUpdatingFromProp = useRef(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // history gestita nativamente da StarterKit
            }),
            UnderlineExt,
            LinkExt.configure({
                openOnClick: false,
                HTMLAttributes: { class: 'text-violet-400 underline' },
            }),
            Markdown.configure({
                html: true,
                tightLists: true,
                breaks: false,
                transformPastedText: true,
                transformCopiedText: false,
            }),
        ],
        content: value,
        editable: !disabled && !readOnly,
        autofocus: autoFocus ? 'end' : false,
        onUpdate: ({ editor: ed }) => {
            if (isUpdatingFromProp.current) return;
            const md = getEditorMarkdown(ed);
            onChange(md);
        },
        onFocus: () => setIsFocused(true),
        onBlur: ({ event }) => {
            // Rimane "focused" se il focus va ad un elemento dentro il container (es. toolbar)
            if (!containerRef.current?.contains(event.relatedTarget as Node)) {
                setIsFocused(false);
            }
        },
    });

    // Sincronizza il valore esterno → editor quando il valore cambia dall'esterno
    useEffect(() => {
        if (!editor) return;
        const currentMd = getEditorMarkdown(editor);
        if (currentMd === value) return;
        isUpdatingFromProp.current = true;
        editor.commands.setContent(value, { emitUpdate: false });
        isUpdatingFromProp.current = false;
    }, [value, editor]);

    // Aggiorna la modalità editable
    useEffect(() => {
        if (!editor) return;
        editor.setEditable(!disabled && !readOnly);
    }, [disabled, readOnly, editor]);

    const toolbarVisible = toolbarVisibility === 'always' || (toolbarVisibility === 'focus' && isFocused);

    // Statistiche parole/caratteri calcolate dal valore Markdown corrente
    const { wordCount, charCount } = useMemo(() => {
        const text = value.replace(/[#*_`~>|\-\[\]()!]/g, ' ').trim();
        const words = text ? text.split(/\s+/).length : 0;
        return { wordCount: words, charCount: value.length };
    }, [value]);

    const handleInsertLatex = useCallback(() => {
        if (!editor) return;
        const formula = latexMode === 'block'
            ? `\n$$\n${latexValue || 'x^2'}\n$$\n`
            : `$${latexValue || 'x^2'}$`;
        editor.chain().focus().insertContent(formula).run();
        setLatexOpen(false);
        setLatexValue('');
    }, [editor, latexMode, latexValue]);

    // Gestione tasti globali sull'editor (Escape, Ctrl+Enter, Ctrl+S)
    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (disabled || readOnly) return;
        const isMod = event.ctrlKey || event.metaKey;

        if (event.key === 'Escape') {
            onCancel?.();
            return;
        }
        if (isMod && event.key === 'Enter') {
            event.preventDefault();
            onSave?.();
            return;
        }
        if (isMod && event.key.toLowerCase() === 's') {
            event.preventDefault();
            onSave?.();
        }
    }, [disabled, readOnly, onCancel, onSave]);

    const minHeight = `${minRows * 1.6 * 16}px`; // ~1.6rem line-height per row

    const editorBody = (
        <div
            ref={containerRef}
            data-card-editor
            className={`space-y-2 ${className ?? ''}`}
            onKeyDown={handleKeyDown}
        >
            {label && (
                <label className="block text-xs font-medium text-theme-muted">{label}</label>
            )}

            {toolbarVisibility !== 'hidden' && (
                <WysiwygToolbar
                    editor={editor}
                    wordCount={wordCount}
                    charCount={charCount}
                    visible={toolbarVisible}
                    onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
                    isFullscreen={isFullscreen}
                    onOpenLatex={() => setLatexOpen(true)}
                />
            )}

            <EditorContent
                editor={editor}
                className="richtext-editor-content"
                style={{ minHeight }}
                aria-label={label ?? placeholder ?? 'Editor'}
                aria-placeholder={placeholder}
            />

            <LaTeXModal
                open={latexOpen}
                value={latexValue}
                mode={latexMode}
                onChange={setLatexValue}
                onModeChange={setLatexMode}
                onClose={() => setLatexOpen(false)}
                onInsert={handleInsertLatex}
            />
        </div>
    );

    if (!isFullscreen) return editorBody;

    return (
        <div className="fixed inset-0 z-modal-backdrop flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setIsFullscreen(false)}
                aria-hidden="true"
            />
            <div className="relative z-10 h-full w-full max-w-5xl overflow-auto rounded-2xl border border-white/10 bg-theme-elevated p-4 md:p-6 shadow-theme-lg">
                {editorBody}
            </div>
        </div>
    );
};

export default RichTextEditor;
