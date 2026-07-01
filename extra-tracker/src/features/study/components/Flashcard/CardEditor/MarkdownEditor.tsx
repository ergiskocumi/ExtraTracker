import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Toolbar, type ToolbarAction } from './Toolbar';
import { LaTeXModal } from './LaTeXModal';
import { useEditorHistory } from './useEditorHistory';

// Import editor styles
import './styles/editor.css';

export type ToolbarVisibility = 'always' | 'focus' | 'hidden';

export interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
    textareaClassName?: string;
    toolbarVisibility?: ToolbarVisibility;
    size?: 'sm' | 'md';
    autoFocus?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    onSave?: () => void;
    onCancel?: () => void;
    historyKey?: string | number | boolean;
    minRows?: number;
}

interface SelectionResult {
    value: string;
    selectionStart: number;
    selectionEnd: number;
}

const replaceSelection = (
    value: string,
    start: number,
    end: number,
    replacement: string,
    selectionStartOffset = 0,
    selectionEndOffset = replacement.length
): SelectionResult => {
    const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
    const selectionStart = start + selectionStartOffset;
    const selectionEnd = start + selectionEndOffset;
    return { value: nextValue, selectionStart, selectionEnd };
};

const wrapSelection = (
    value: string,
    start: number,
    end: number,
    prefix: string,
    suffix: string,
    placeholder: string
): SelectionResult => {
    const selected = value.slice(start, end);
    if (!selected) {
        const replacement = `${prefix}${placeholder}${suffix}`;
        return replaceSelection(
            value,
            start,
            end,
            replacement,
            prefix.length,
            prefix.length + placeholder.length
        );
    }

    const hasWrap = selected.startsWith(prefix) && selected.endsWith(suffix);
    if (hasWrap) {
        const unwrapped = selected.slice(prefix.length, selected.length - suffix.length);
        return replaceSelection(value, start, end, unwrapped, 0, unwrapped.length);
    }

    const replacement = `${prefix}${selected}${suffix}`;
    return replaceSelection(
        value,
        start,
        end,
        replacement,
        prefix.length,
        prefix.length + selected.length
    );
};

const getLineSelection = (value: string, start: number, end: number) => {
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    let lineEnd = value.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = value.length;
    const block = value.slice(lineStart, lineEnd);
    const lines = block.split('\n');
    return { lineStart, lineEnd, lines };
};

const replaceLines = (
    value: string,
    lineStart: number,
    lineEnd: number,
    lines: string[]
): SelectionResult => {
    const newBlock = lines.join('\n');
    const nextValue = `${value.slice(0, lineStart)}${newBlock}${value.slice(lineEnd)}`;
    return {
        value: nextValue,
        selectionStart: lineStart,
        selectionEnd: lineStart + newBlock.length,
    };
};

const applyLinePrefix = (
    value: string,
    start: number,
    end: number,
    isLineMarked: (line: string) => boolean,
    addPrefix: (line: string) => string,
    removePrefix: (line: string) => string
): SelectionResult => {
    const { lineStart, lineEnd, lines } = getLineSelection(value, start, end);
    const allMarked = lines.every((line) => !line.trim() || isLineMarked(line));
    const nextLines = lines.map((line) => {
        if (!line.trim()) return line;
        return allMarked ? removePrefix(line) : addPrefix(line);
    });
    return replaceLines(value, lineStart, lineEnd, nextLines);
};

const applyHeading = (value: string, start: number, end: number, level: number): SelectionResult => {
    const prefix = `${'#'.repeat(level)} `;
    return applyLinePrefix(
        value,
        start,
        end,
        (line) => line.startsWith(prefix),
        (line) => {
            const cleaned = line.replace(/^(\s*)#{1,6}\s+/, '$1');
            const indent = cleaned.match(/^(\s*)/)?.[1] ?? '';
            return `${indent}${prefix}${cleaned.trimStart()}`;
        },
        (line) => line.replace(/^(\s*)#{1,6}\s+/, '$1')
    );
};

const applyBulletList = (value: string, start: number, end: number): SelectionResult =>
    applyLinePrefix(
        value,
        start,
        end,
        (line) => /^(\s*)([-*+])\s+/.test(line),
        (line) => {
            const indent = line.match(/^(\s*)/)?.[1] ?? '';
            return `${indent}- ${line.trimStart()}`;
        },
        (line) => line.replace(/^(\s*)([-*+])\s+/, '$1')
    );

const applyNumberedList = (value: string, start: number, end: number): SelectionResult =>
    applyLinePrefix(
        value,
        start,
        end,
        (line) => /^(\s*)\d+\.\s+/.test(line),
        (line) => {
            const indent = line.match(/^(\s*)/)?.[1] ?? '';
            return `${indent}1. ${line.trimStart()}`;
        },
        (line) => line.replace(/^(\s*)\d+\.\s+/, '$1')
    );

const applyQuote = (value: string, start: number, end: number): SelectionResult =>
    applyLinePrefix(
        value,
        start,
        end,
        (line) => /^(\s*)>\s?/.test(line),
        (line) => {
            const indent = line.match(/^(\s*)/)?.[1] ?? '';
            return `${indent}> ${line.trimStart()}`;
        },
        (line) => line.replace(/^(\s*)>\s?/, '$1')
    );

const applyIndent = (
    value: string,
    start: number,
    end: number,
    direction: 'in' | 'out'
): SelectionResult => {
    const { lineStart, lineEnd, lines } = getLineSelection(value, start, end);
    const nextLines = lines.map((line) => {
        if (!line.trim()) return line;
        if (direction === 'in') {
            return `  ${line}`;
        }
        return line.replace(/^\s{1,2}|^\t/, '');
    });
    return replaceLines(value, lineStart, lineEnd, nextLines);
};

const insertHorizontalRule = (value: string, start: number, end: number): SelectionResult => {
    const before = start > 0 && value[start - 1] !== '\n' ? '\n' : '';
    const after = end < value.length && value[end] !== '\n' ? '\n' : '';
    const replacement = `${before}---${after}`;
    const cursor = start + replacement.length;
    return replaceSelection(value, start, end, replacement, cursor - start, cursor - start);
};

const insertCodeBlock = (
    value: string,
    start: number,
    end: number,
    language: string
): SelectionResult => {
    const selected = value.slice(start, end) || 'codice';
    const langSuffix = language.trim() ? language.trim() : '';
    const fence = langSuffix ? `\`\`\`${langSuffix}` : '```';
    const replacement = `${fence}\n${selected}\n\`\`\``;
    const selectionStart = start + fence.length + 1;
    const selectionEnd = selectionStart + selected.length;
    return replaceSelection(value, start, end, replacement, selectionStart - start, selectionEnd - start);
};

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
    value,
    onChange,
    label,
    placeholder,
    className,
    textareaClassName,
    toolbarVisibility = 'focus',
    size = 'md',
    autoFocus = false,
    disabled = false,
    readOnly = false,
    onSave,
    onCancel,
    historyKey,
    minRows = 3,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [latexOpen, setLatexOpen] = useState(false);
    const [latexMode, setLatexMode] = useState<'inline' | 'block'>('inline');
    const [latexValue, setLatexValue] = useState('');

    const history = useEditorHistory(value, onChange, historyKey);

    const toolbarVisible = toolbarVisibility === 'always' || (toolbarVisibility === 'focus' && isFocused);

    useEffect(() => {
        if (!autoFocus) return;
        const timeoutId = setTimeout(() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            textarea.focus();
            const length = textarea.value.length;
            textarea.setSelectionRange(length, length);
        }, 0);
        return () => clearTimeout(timeoutId);
    }, [autoFocus]);

    const applyResult = useCallback((result: SelectionResult) => {
        onChange(result.value);
        requestAnimationFrame(() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            textarea.focus();
            textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
        });
    }, [onChange]);

    const handleAction = useCallback((action: ToolbarAction, payload?: string) => {
        if (disabled || readOnly) return;
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;

        let result: SelectionResult | null = null;

        switch (action) {
            case 'bold':
                result = wrapSelection(value, start, end, '**', '**', 'testo');
                break;
            case 'italic':
                result = wrapSelection(value, start, end, '*', '*', 'testo');
                break;
            case 'underline':
                result = wrapSelection(value, start, end, '<u>', '</u>', 'testo');
                break;
            case 'strikethrough':
                result = wrapSelection(value, start, end, '~~', '~~', 'testo');
                break;
            case 'bullet-list':
                result = applyBulletList(value, start, end);
                break;
            case 'numbered-list':
                result = applyNumberedList(value, start, end);
                break;
            case 'quote':
                result = applyQuote(value, start, end);
                break;
            case 'code-inline':
                result = wrapSelection(value, start, end, '`', '`', 'codice');
                break;
            case 'code-block': {
                const language = typeof window !== 'undefined'
                    ? window.prompt('Linguaggio (opzionale)', '')
                    : '';
                if (language === null) return;
                result = insertCodeBlock(value, start, end, language);
                break;
            }
            case 'link': {
                const url = typeof window !== 'undefined'
                    ? window.prompt('Inserisci URL', 'https://')
                    : null;
                if (!url) return;
                const selected = value.slice(start, end) || 'link';
                const replacement = `[${selected}](${url})`;
                result = replaceSelection(value, start, end, replacement, 1, selected.length + 1);
                break;
            }
            case 'image': {
                const url = typeof window !== 'undefined'
                    ? window.prompt('URL immagine', 'https://')
                    : null;
                if (!url) return;
                const altInput = typeof window !== 'undefined'
                    ? window.prompt('Testo alternativo', 'immagine')
                    : 'immagine';
                if (altInput === null) return;
                const alt = altInput || 'immagine';
                const replacement = `![${alt}](${url})`;
                const selectionStart = start + 2;
                const selectionEnd = selectionStart + alt.length;
                result = replaceSelection(value, start, end, replacement, selectionStart - start, selectionEnd - start);
                break;
            }
            case 'heading-1':
                result = applyHeading(value, start, end, 1);
                break;
            case 'heading-2':
                result = applyHeading(value, start, end, 2);
                break;
            case 'heading-3':
                result = applyHeading(value, start, end, 3);
                break;
            case 'hr':
                result = insertHorizontalRule(value, start, end);
                break;
            case 'latex':
                setLatexValue(value.slice(start, end).replace(/^\$+|\$+$/g, ''));
                setLatexOpen(true);
                return;
            case 'color': {
                const color = payload ?? '#1e293b';
                result = wrapSelection(value, start, end, `<span style="color:${color}">`, '</span>', 'testo');
                break;
            }
            case 'highlight':
                result = wrapSelection(value, start, end, '<mark>', '</mark>', 'testo');
                break;
            case 'align-left':
                result = wrapSelection(value, start, end, '<div style="text-align:left">', '</div>', 'testo');
                break;
            case 'align-center':
                result = wrapSelection(value, start, end, '<div style="text-align:center">', '</div>', 'testo');
                break;
            case 'align-right':
                result = wrapSelection(value, start, end, '<div style="text-align:right">', '</div>', 'testo');
                break;
            case 'indent':
                result = applyIndent(value, start, end, 'in');
                break;
            case 'outdent':
                result = applyIndent(value, start, end, 'out');
                break;
            default:
                break;
        }

        if (result) {
            applyResult(result);
        }
    }, [applyResult, disabled, readOnly, value]);

    const handleInsertLatex = useCallback(() => {
        if (disabled || readOnly) return;
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;
        const formula = latexMode === 'block'
            ? `$$\n${latexValue || 'x^2'}\n$$`
            : `$${latexValue || 'x^2'}$`;
        const selectionOffset = latexMode === 'block' ? 3 : 1;
        const result = replaceSelection(
            value,
            start,
            end,
            formula,
            selectionOffset,
            selectionOffset + (latexValue || 'x^2').length
        );
        setLatexOpen(false);
        setLatexValue('');
        applyResult(result);
    }, [applyResult, disabled, latexMode, latexValue, readOnly, value]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (disabled || readOnly) return;
        const isMod = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();

        // Mai bloccare: Invio (a capo), Frecce (spostamento cursore), Backspace, Delete.
        // L'utente deve poter modificare il testo liberamente.
        const allowDefaultKeys = ['Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete'];
        if (allowDefaultKeys.includes(event.key) && !isMod) {
            return;
        }

        if (event.key === 'Tab') {
            event.preventDefault();
            handleAction(event.shiftKey ? 'outdent' : 'indent');
            return;
        }

        if (event.key === 'Escape') {
            onCancel?.();
            return;
        }

        if (!isMod) return;

        // Solo Ctrl+Enter salva; Invio senza Ctrl è già gestito sopra (a capo).
        if (event.key === 'Enter') {
            event.preventDefault();
            onSave?.();
            return;
        }

        if (key === 'b') {
            event.preventDefault();
            handleAction('bold');
        } else if (key === 'i' && event.shiftKey) {
            event.preventDefault();
            handleAction('image');
        } else if (key === 'i') {
            event.preventDefault();
            handleAction('italic');
        } else if (key === 'u') {
            event.preventDefault();
            handleAction('underline');
        } else if (key === 'z' && !event.shiftKey) {
            event.preventDefault();
            history.undo();
        } else if (key === 'z' && event.shiftKey) {
            event.preventDefault();
            history.redo();
        } else if (key === 's') {
            event.preventDefault();
            onSave?.();
        } else if (key === 'e' && event.shiftKey) {
            event.preventDefault();
            handleAction('code-block');
        } else if (key === 'e') {
            event.preventDefault();
            handleAction('code-inline');
        } else if (key === 'k') {
            event.preventDefault();
            handleAction('link');
        } else if (key === 'q' && event.shiftKey) {
            event.preventDefault();
            handleAction('quote');
        } else if (key === 'x' && event.shiftKey) {
            event.preventDefault();
            handleAction('strikethrough');
        } else if (key === '1') {
            event.preventDefault();
            handleAction('heading-1');
        } else if (key === '2') {
            event.preventDefault();
            handleAction('heading-2');
        } else if (key === '3') {
            event.preventDefault();
            handleAction('heading-3');
        } else if (event.shiftKey && (event.key === '8' || event.key === '*')) {
            event.preventDefault();
            handleAction('bullet-list');
        } else if (event.shiftKey && (event.key === '7' || event.key === '&')) {
            event.preventDefault();
            handleAction('numbered-list');
        }
    }, [disabled, handleAction, history, onCancel, onSave, readOnly]);

    const handlePaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        if (disabled || readOnly) return;
        const html = event.clipboardData.getData('text/html');
        if (!html) return;
        const plainText = event.clipboardData.getData('text/plain');
        if (!plainText) return;
        event.preventDefault();
        const cleaned = plainText.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;
        const result = replaceSelection(value, start, end, cleaned, cleaned.length, cleaned.length);
        applyResult(result);
    }, [applyResult, disabled, readOnly, value]);

    const handleFocusCapture = useCallback(() => {
        setIsFocused(true);
    }, []);

    const handleBlurCapture = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node)) {
            setIsFocused(false);
        }
    }, []);

    const editorBody = (
        <div
            ref={containerRef}
            data-card-editor
            onFocusCapture={handleFocusCapture}
            onBlurCapture={handleBlurCapture}
            className={`space-y-2 ${className ?? ''}`}
        >
            {label && (
                <label className="block text-xs font-medium text-theme-muted">{label}</label>
            )}
            {toolbarVisibility !== 'hidden' && (
                <Toolbar
                    onAction={handleAction}
                    onUndo={history.undo}
                    onRedo={history.redo}
                    canUndo={history.canUndo}
                    canRedo={history.canRedo}
                    wordCount={history.wordCount}
                    charCount={history.charCount}
                    visible={toolbarVisible}
                    size={size}
                    onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
                    isFullscreen={isFullscreen}
                />
            )}
            <textarea
                ref={textareaRef}
                data-fullscreen-edit-textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={placeholder}
                aria-label={label ?? placeholder ?? 'Editor'}
                rows={minRows}
                disabled={disabled}
                readOnly={readOnly}
                spellCheck
                autoCorrect="on"
                autoCapitalize="sentences"
                className={`w-full resize-y min-h-[100px] rounded-xl border border-theme-default bg-theme-surface p-3 text-sm md:text-base text-theme-primary placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/60 transition-all duration-300 ${textareaClassName ?? ''}`}
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

    if (!isFullscreen) {
        return editorBody;
    }

    return (
        <div className="fixed inset-0 z-modal-backdrop flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-theme-overlay backdrop-blur-sm"
                onClick={() => setIsFullscreen(false)}
                aria-hidden="true"
            />
            <div className="relative z-10 h-full w-full max-w-5xl overflow-auto rounded-2xl border border-white/10 bg-theme-elevated p-4 md:p-6 shadow-theme-lg">
                {editorBody}
            </div>
        </div>
    );
};

export default MarkdownEditor;
