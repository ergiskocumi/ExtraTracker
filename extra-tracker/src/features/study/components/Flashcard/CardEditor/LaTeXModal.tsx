import React from 'react';
import { X } from 'lucide-react';
import { CardContentRenderer } from '../CardContentRenderer';

interface LaTeXModalProps {
    open: boolean;
    value: string;
    mode: 'inline' | 'block';
    onChange: (value: string) => void;
    onModeChange: (mode: 'inline' | 'block') => void;
    onClose: () => void;
    onInsert: () => void;
}

export const LaTeXModal: React.FC<LaTeXModalProps> = ({
    open,
    value,
    mode,
    onChange,
    onModeChange,
    onClose,
    onInsert,
}) => {
    if (!open) return null;

    const previewContent = mode === 'block'
        ? `$$\n${value || 'x^2'}\n$$`
        : `$${value || 'x^2'}$`;

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-theme-overlay backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-theme-subtle bg-theme-elevated shadow-theme-lg">
                <div className="flex items-center justify-between px-5 py-4 border-b border-theme-subtle">
                    <div>
                        <h2 className="text-base font-semibold text-theme-primary">Inserisci formula LaTeX</h2>
                        <p className="text-xs text-theme-muted">Compatibile con il renderer Markdown + KaTeX</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-surface-hover transition-all"
                        aria-label="Chiudi"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 grid gap-4 md:grid-cols-[1.2fr_1fr]">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-theme-muted">
                            <span>Modalita</span>
                            <button
                                type="button"
                                onClick={() => onModeChange('inline')}
                                className={`px-2 py-1 rounded-full border text-xs transition-all ${
                                    mode === 'inline'
                                        ? 'border-violet-400/70 text-violet-200 bg-violet-500/20'
                                        : 'border-theme-subtle text-theme-muted hover:text-theme-primary'
                                }`}
                            >
                                Inline
                            </button>
                            <button
                                type="button"
                                onClick={() => onModeChange('block')}
                                className={`px-2 py-1 rounded-full border text-xs transition-all ${
                                    mode === 'block'
                                        ? 'border-violet-400/70 text-violet-200 bg-violet-500/20'
                                        : 'border-theme-subtle text-theme-muted hover:text-theme-primary'
                                }`}
                            >
                                Blocco
                            </button>
                        </div>
                        <textarea
                            value={value}
                            onChange={(event) => onChange(event.target.value)}
                            placeholder="Es: \\frac{a}{b}"
                            rows={6}
                            className="w-full min-h-[140px] resize-y rounded-xl border border-theme-subtle bg-theme-surface p-3 text-sm text-theme-primary placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/60"
                        />
                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3 py-2 rounded-lg text-sm text-theme-secondary border border-theme-subtle hover:bg-theme-surface-hover transition-all"
                            >
                                Annulla
                            </button>
                            <button
                                type="button"
                                onClick={onInsert}
                                className="px-3 py-2 rounded-lg text-sm text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all"
                            >
                                Inserisci
                            </button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-theme-subtle bg-theme-surface p-4">
                        <p className="text-xs font-semibold text-theme-muted mb-2">Preview</p>
                        <CardContentRenderer
                            content={previewContent}
                            variant="answer"
                            className="text-theme-primary"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LaTeXModal;
