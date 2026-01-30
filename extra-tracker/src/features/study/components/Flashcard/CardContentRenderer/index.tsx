/**
 * 📝 CARD CONTENT RENDERER
 * ========================
 *
 * Componente production-ready per il rendering avanzato del contenuto delle flashcard.
 *
 * Features:
 * - Parsing Markdown/LaTeX con KaTeX
 * - Theming automatico (light/dark)
 * - Cinema Mode per studio focalizzato
 * - Sanitizzazione XSS via DOMPurify
 * - Accessibilità WCAG 2.1 AA
 * - Truncate per contenuti lunghi
 *
 * @module CardContentRenderer
 *
 * @example
 * // Uso base
 * <CardContentRenderer content="Testo con **grassetto** e $x^2$" />
 *
 * @example
 * // Cinema Mode
 * <CardContentRenderer content={card.back} cinemaMode={true} />
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { sanitizeContent } from '../../../../../lib/sanitizeContent';
import {
    markdownOptions,
    markdownOptionsNoLatex,
    preprocessMarkdown,
    hasLaTeX,
    validateAllFormulas,
    preprocessMathContent,
    containsMathExpressions,
} from './parser';
import './styles/cinemaMode.css';

// Import KaTeX CSS
import 'katex/dist/katex.min.css';

// ============================================
// TYPES
// ============================================

/**
 * Varianti di stile per il rendering del contenuto.
 */
export type ContentVariant = 'question' | 'answer' | 'study';

/**
 * Dimensioni del testo.
 */
export type TextSize = 'sm' | 'base' | 'lg' | 'adaptive';

/**
 * Props del componente CardContentRenderer.
 */
export interface CardContentRendererProps {
    /** Contenuto da renderizzare (Markdown + LaTeX) */
    content: string;

    /** Variante di stile */
    variant?: ContentVariant;

    /** Dimensione del testo */
    size?: TextSize;

    /** Classi CSS aggiuntive */
    className?: string;

    /** Centra il testo */
    centered?: boolean;

    /** Abilita Cinema Mode (font grande, larghezza limitata) */
    cinemaMode?: boolean;

    /** Altezza massima prima del truncate (in px) */
    maxHeight?: number;

    /** Disabilita LaTeX per performance */
    disableLatex?: boolean;

    /** Callback quando si clicca su una formula */
    onFormulaClick?: (latex: string) => void;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Design System - Tipografia
 * Font: Inter con fallback a system-ui
 */
const TYPOGRAPHY = {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    sizes: {
        sm: 'text-sm',
        base: 'text-sm md:text-base',
        lg: 'text-lg md:text-xl',
        cinema: 'text-xl md:text-2xl',
    },
    lineHeight: {
        body: 'leading-relaxed', // 1.6
        math: 'leading-normal', // 1.4
    },
    letterSpacing: {
        body: 'tracking-tight', // -0.025em
        math: 'tracking-normal', // 0
    },
} as const;

/**
 * Design System - Colori
 */
const COLORS = {
    text: {
        primary: 'text-slate-800 dark:text-slate-200',
        secondary: 'text-slate-600 dark:text-slate-300',
        muted: 'text-slate-500 dark:text-slate-400',
    },
    formula: {
        background: 'bg-slate-50 dark:bg-slate-800',
        border: 'border border-slate-200 dark:border-slate-700',
    },
    list: {
        marker: 'marker:text-blue-500',
    },
} as const;

/**
 * Design System - Spaziatura
 */
const SPACING = {
    paragraph: 'mb-6 last:mb-0',
    paragraphMobile: 'mb-4 last:mb-0',
    list: {
        level1: 'pl-8',
        level2: 'pl-12',
        level3: 'pl-16',
    },
    formula: {
        block: 'py-3 px-4 my-4',
        inline: 'px-1.5',
    },
} as const;

/**
 * Limite caratteri per truncate.
 */
const TRUNCATE_LIMIT = 5000;

/**
 * Limite paragrafi visibili prima di "Mostra tutto".
 */
const TRUNCATE_PARAGRAPHS = 3;

// ============================================
// STYLE MAPPINGS
// ============================================

const VARIANT_STYLES: Record<ContentVariant, string> = {
    question: `${COLORS.text.primary} font-semibold`,
    answer: `${COLORS.text.secondary} font-normal`,
    study: 'text-white font-semibold drop-shadow-sm',
};

const SIZE_STYLES: Record<Exclude<TextSize, 'adaptive'>, string> = {
    sm: TYPOGRAPHY.sizes.sm,
    base: TYPOGRAPHY.sizes.base,
    lg: TYPOGRAPHY.sizes.lg,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calcola font size adattivo basato sulla lunghezza del testo.
 */
const getAdaptiveFontSize = (textLength: number, isMobile: boolean): string => {
    if (isMobile) {
        if (textLength < 25) return 'text-[17px]';
        if (textLength < 50) return 'text-[16px]';
        if (textLength < 80) return 'text-[15px]';
        if (textLength < 120) return 'text-[13px]';
        if (textLength < 200) return 'text-[12px]';
        return 'text-[11px]';
    }

    if (textLength < 50) return 'text-2xl md:text-3xl';
    if (textLength < 100) return 'text-xl md:text-2xl';
    if (textLength < 200) return 'text-lg md:text-xl';
    if (textLength < 400) return 'text-base md:text-lg';
    return 'text-sm md:text-base';
};

/**
 * Rileva dispositivo mobile.
 */
const isMobileDevice = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
};

/**
 * Tronca il contenuto se supera il limite.
 */
const truncateContent = (content: string, maxParagraphs: number): {
    truncated: string;
    isTruncated: boolean;
    totalParagraphs: number;
} => {
    const paragraphs = content.split(/\n\n+/);
    const totalParagraphs = paragraphs.length;

    if (content.length <= TRUNCATE_LIMIT && totalParagraphs <= maxParagraphs) {
        return { truncated: content, isTruncated: false, totalParagraphs };
    }

    const truncatedParagraphs = paragraphs.slice(0, maxParagraphs);
    return {
        truncated: truncatedParagraphs.join('\n\n'),
        isTruncated: true,
        totalParagraphs,
    };
};

// ============================================
// CUSTOM MARKDOWN COMPONENTS
// ============================================

/**
 * Crea componenti React personalizzati per ReactMarkdown.
 */
const createMarkdownComponents = (
    variant: ContentVariant,
    centered: boolean,
    cinemaMode: boolean,
    onFormulaClick?: (latex: string) => void
): Partial<Components> => ({
    // Paragrafi
    p: ({ children }) => (
        <p
            className={`
                ${cinemaMode ? 'mb-8' : SPACING.paragraph}
                ${centered ? 'text-center' : ''}
                ${TYPOGRAPHY.lineHeight.body}
            `}
        >
            {children}
        </p>
    ),

    // Liste non ordinate
    ul: ({ children }) => (
        <ul
            className={`
                list-disc ${SPACING.list.level1} space-y-2 mb-6 last:mb-0
                ${COLORS.list.marker}
                ${centered ? 'text-left inline-block' : ''}
            `}
        >
            {children}
        </ul>
    ),

    // Liste ordinate
    ol: ({ children }) => (
        <ol
            className={`
                list-decimal ${SPACING.list.level1} space-y-2 mb-6 last:mb-0
                ${centered ? 'text-left inline-block' : ''}
            `}
        >
            {children}
        </ol>
    ),

    // Elementi lista
    li: ({ children }) => (
        <li className={`pl-2 ${TYPOGRAPHY.lineHeight.body}`}>
            {children}
        </li>
    ),

    // Grassetto
    strong: ({ children }) => (
        <strong
            className={`font-bold ${
                variant === 'study' ? 'text-white' : COLORS.text.primary
            }`}
        >
            {children}
        </strong>
    ),

    // Corsivo
    em: ({ children }) => <em className="italic">{children}</em>,

    // Codice inline
    code: ({ children, className }) => {
        // Verifica se è un blocco di codice (pre > code)
        const isCodeBlock = className?.includes('language-');

        if (isCodeBlock) {
            return (
                <code className={`${className} text-slate-200`}>
                    {children}
                </code>
            );
        }

        return (
            <code
                className={`
                    px-1.5 py-0.5 rounded text-sm font-mono
                    bg-violet-500/10 text-violet-600 dark:text-violet-400
                    border border-violet-500/20
                `}
            >
                {children}
            </code>
        );
    },

    // Blocchi di codice
    pre: ({ children }) => (
        <pre
            className={`
                p-4 rounded-xl overflow-x-auto mb-6 last:mb-0
                bg-slate-900 border border-slate-700
                ${cinemaMode ? 'text-base' : 'text-sm'}
            `}
        >
            {children}
        </pre>
    ),

    // Citazioni
    blockquote: ({ children }) => (
        <blockquote
            className={`
                border-l-4 border-violet-500/50 pl-4 italic
                ${COLORS.text.secondary} opacity-90
                mb-6 last:mb-0
                ${cinemaMode ? 'py-2 bg-violet-500/5 rounded-r-lg' : ''}
            `}
        >
            {children}
        </blockquote>
    ),

    // Headings
    h1: ({ children }) => (
        <h1
            className={`
                text-xl md:text-2xl font-bold mb-4
                ${COLORS.text.primary}
                ${centered ? 'text-center' : ''}
            `}
        >
            {children}
        </h1>
    ),
    h2: ({ children }) => (
        <h2
            className={`
                text-lg md:text-xl font-bold mb-3
                ${COLORS.text.primary}
                ${centered ? 'text-center' : ''}
            `}
        >
            {children}
        </h2>
    ),
    h3: ({ children }) => (
        <h3
            className={`
                text-base md:text-lg font-bold mb-2
                ${COLORS.text.primary}
                ${centered ? 'text-center' : ''}
            `}
        >
            {children}
        </h3>
    ),

    // Tabelle
    table: ({ children }) => (
        <div className="overflow-x-auto mb-6 last:mb-0">
            <table className="w-full border-collapse rounded-lg overflow-hidden">
                {children}
            </table>
        </div>
    ),
    thead: ({ children }) => (
        <thead className="bg-slate-100 dark:bg-slate-800">{children}</thead>
    ),
    th: ({ children }) => (
        <th className="px-4 py-3 text-left font-semibold border-b border-slate-200 dark:border-slate-700">
            {children}
        </th>
    ),
    td: ({ children }) => (
        <td className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            {children}
        </td>
    ),

    // Link
    a: ({ children, href }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-500 hover:text-violet-400 underline underline-offset-2"
        >
            {children}
        </a>
    ),

    // Divisore
    hr: () => (
        <hr className="my-6 border-t border-slate-200 dark:border-slate-700" />
    ),
});

// ============================================
// EMPTY STATE COMPONENT
// ============================================

const EmptyState: React.FC<{ className?: string }> = ({ className }) => (
    <div
        className={`
            flex items-center gap-2 py-3 px-4
            text-slate-400 dark:text-slate-500 text-sm italic
            ${className}
        `}
    >
        <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
        </svg>
        <span>Nessun contenuto</span>
    </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * CardContentRenderer - Componente principale per il rendering delle flashcard.
 *
 * Features:
 * - Parsing Markdown completo (GFM)
 * - Rendering formule LaTeX con KaTeX
 * - Cinema Mode per studio focalizzato
 * - Truncate automatico per contenuti lunghi
 * - Sanitizzazione XSS
 * - Accessibilità WCAG 2.1 AA
 */
const CardContentRendererComponent: React.FC<CardContentRendererProps> = ({
    content,
    variant = 'question',
    size = 'base',
    className = '',
    centered = false,
    cinemaMode = false,
    maxHeight,
    disableLatex = false,
    onFormulaClick,
}) => {
    // State per gestione "Mostra tutto"
    const [isExpanded, setIsExpanded] = useState(false);

    // Sanitizza e preprocessa il contenuto
    const processedContent = useMemo(() => {
        // 1. Sanitizza il contenuto (rimuove XSS)
        const sanitized = sanitizeContent(content);

        // 2. Preprocessa il Markdown (normalizza newlines, etc.)
        const markdownPreprocessed = preprocessMarkdown(sanitized);

        // 3. Se LaTeX non è disabilitato, rileva e avvolgi le espressioni matematiche
        //    Questo è necessario perché il contenuto spesso ha formule SENZA delimitatori $...$
        if (!disableLatex && containsMathExpressions(markdownPreprocessed)) {
            return preprocessMathContent(markdownPreprocessed);
        }

        return markdownPreprocessed;
    }, [content, disableLatex]);

    // Gestione truncate
    const { displayContent, isTruncated, totalParagraphs } = useMemo(() => {
        if (isExpanded || !maxHeight) {
            return {
                displayContent: processedContent,
                isTruncated: false,
                totalParagraphs: 0,
            };
        }

        const result = truncateContent(processedContent, TRUNCATE_PARAGRAPHS);
        return {
            displayContent: result.truncated,
            isTruncated: result.isTruncated,
            totalParagraphs: result.totalParagraphs,
        };
    }, [processedContent, isExpanded, maxHeight]);

    // Determina se usare parsing LaTeX
    // Ora controlla sia i delimitatori espliciti che le espressioni rilevate
    const shouldParseLaTeX = useMemo(() => {
        if (disableLatex) return false;
        // Dopo il preprocessing, il contenuto dovrebbe avere i delimitatori $...$
        return hasLaTeX(processedContent) || containsMathExpressions(content);
    }, [processedContent, content, disableLatex]);

    // Validazione LaTeX in development
    useMemo(() => {
        if (import.meta.env.DEV && shouldParseLaTeX) {
            const validationResults = validateAllFormulas(processedContent);
            const invalidFormulas = validationResults.filter(r => !r.validation.isValid);

            if (invalidFormulas.length > 0) {
                console.warn('[CardContentRenderer] Formule LaTeX non valide:', invalidFormulas);
            }
        }
    }, [processedContent, shouldParseLaTeX]);

    // Calcola classi di stile
    const variantClasses = VARIANT_STYLES[variant];

    const sizeClasses = useMemo(() => {
        if (cinemaMode) return TYPOGRAPHY.sizes.cinema;
        if (size === 'adaptive') {
            return getAdaptiveFontSize(processedContent.length, isMobileDevice());
        }
        return SIZE_STYLES[size];
    }, [size, processedContent.length, cinemaMode]);

    // Componenti Markdown custom (memoizzati)
    const markdownComponents = useMemo(
        () => createMarkdownComponents(variant, centered, cinemaMode, onFormulaClick),
        [variant, centered, cinemaMode, onFormulaClick]
    );

    // Opzioni Markdown
    const mdOptions = useMemo(() => {
        return shouldParseLaTeX ? markdownOptions : markdownOptionsNoLatex;
    }, [shouldParseLaTeX]);

    // Classi container
    const containerClasses = useMemo(() => {
        const classes = [
            TYPOGRAPHY.lineHeight.body,
            TYPOGRAPHY.letterSpacing.body,
            'whitespace-pre-wrap',
            'break-words',
            variantClasses,
            sizeClasses,
            centered ? 'text-center' : '',
            cinemaMode ? 'cinema-mode' : '',
            // Stili per KaTeX
            '[&_.katex]:text-inherit',
            '[&_.katex-display]:my-4',
            '[&_.katex-display]:overflow-x-auto',
            '[&_.katex-display]:py-3',
            '[&_.katex-display]:px-4',
            '[&_.katex-display]:rounded-lg',
            cinemaMode ? '' : '[&_.katex-display]:bg-slate-50',
            cinemaMode ? '' : 'dark:[&_.katex-display]:bg-slate-800/50',
            '[&_.katex-display]:border',
            '[&_.katex-display]:border-slate-200',
            'dark:[&_.katex-display]:border-slate-700',
            className,
        ].filter(Boolean).join(' ');

        return classes;
    }, [variantClasses, sizeClasses, centered, cinemaMode, className]);

    // Handler espansione
    const handleExpand = useCallback(() => {
        setIsExpanded(true);
    }, []);

    // Render: contenuto vuoto
    if (!content || content.trim() === '') {
        return <EmptyState className={className} />;
    }

    return (
        <div
            className={containerClasses}
            style={{
                fontFamily: TYPOGRAPHY.fontFamily,
                maxHeight: !isExpanded && maxHeight ? `${maxHeight}px` : undefined,
                overflow: !isExpanded && maxHeight ? 'hidden' : undefined,
            }}
        >
            <ReactMarkdown
                {...mdOptions}
                components={markdownComponents}
            >
                {displayContent}
            </ReactMarkdown>

            {/* Bottone "Mostra tutto" per contenuto troncato */}
            {isTruncated && !isExpanded && (
                <button
                    onClick={handleExpand}
                    className={`
                        mt-4 px-4 py-2 rounded-lg
                        text-sm font-medium
                        bg-violet-500/10 text-violet-600 dark:text-violet-400
                        hover:bg-violet-500/20 transition-colors
                        border border-violet-500/20
                    `}
                >
                    Mostra tutto ({totalParagraphs - TRUNCATE_PARAGRAPHS} paragrafi nascosti)
                </button>
            )}
        </div>
    );
};

/**
 * Versione memoizzata del componente.
 */
export const CardContentRenderer = memo(
    CardContentRendererComponent,
    (prevProps, nextProps) => {
        return (
            prevProps.content === nextProps.content &&
            prevProps.variant === nextProps.variant &&
            prevProps.size === nextProps.size &&
            prevProps.className === nextProps.className &&
            prevProps.centered === nextProps.centered &&
            prevProps.cinemaMode === nextProps.cinemaMode &&
            prevProps.maxHeight === nextProps.maxHeight &&
            prevProps.disableLatex === nextProps.disableLatex
        );
    }
);

CardContentRenderer.displayName = 'CardContentRenderer';

export default CardContentRenderer;
