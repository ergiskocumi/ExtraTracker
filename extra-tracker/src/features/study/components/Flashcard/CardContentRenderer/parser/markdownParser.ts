/**
 * 📝 MARKDOWN PARSER CONFIGURATION
 * =================================
 *
 * Configurazione centralizzata per react-markdown con plugin per:
 * - GitHub Flavored Markdown (tabelle, strikethrough, etc.)
 * - Formule matematiche LaTeX (via remark-math + rehype-katex)
 *
 * Perché questa configurazione?
 * - KISS: usa librerie standard invece di parser custom
 * - Estensibile: facile aggiungere plugin
 * - Manutenibile: configurazione in un unico file
 *
 * @module CardContentRenderer/parser/markdownParser
 */

import type { PluggableList } from 'unified';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

/**
 * Plugin remark per il parsing del Markdown.
 *
 * Ordine importante:
 * 1. remarkGfm - estensioni GitHub (tabelle, task lists, etc.)
 * 2. remarkMath - parsing delle formule $...$ e $$...$$
 */
export const remarkPlugins: PluggableList = [
    // GitHub Flavored Markdown
    // Aggiunge: tabelle, strikethrough, autolink, task lists
    remarkGfm,
    // Parsing formule matematiche
    // Converte $...$ in nodi math inline, $$...$$ in nodi math block
    remarkMath,
];

/**
 * Plugin rehype per la trasformazione HTML.
 *
 * Ordine importante:
 * 1. rehypeKatex - renderizza i nodi math in HTML/MathML
 * 2. rehypeRaw - permette HTML raw nel markdown (necessario per KaTeX)
 */
export const rehypePlugins: PluggableList = [
    // Rendering formule con KaTeX
    // Usa rehype-raw per preservare <span> in formule complesse
    // Senza questo, KaTeX non renderizza correttamente \color{}
    rehypeKatex,
    // Permette HTML raw (generato da KaTeX)
    rehypeRaw,
];

/**
 * Configurazione completa per ReactMarkdown.
 *
 * @example
 * import ReactMarkdown from 'react-markdown';
 * import { markdownOptions } from './parser/markdownParser';
 *
 * <ReactMarkdown {...markdownOptions}>
 *   {content}
 * </ReactMarkdown>
 */
export const markdownOptions = {
    remarkPlugins,
    rehypePlugins,
};

/**
 * Configurazione alternativa senza LaTeX (per performance).
 * Usare quando si sa che il contenuto non contiene formule.
 */
export const markdownOptionsNoLatex = {
    remarkPlugins: [remarkGfm] as PluggableList,
    rehypePlugins: [] as PluggableList,
};

/**
 * Preprocessa il contenuto Markdown per fix comuni.
 *
 * Corregge:
 * - Newline Windows (\r\n) → Unix (\n)
 * - Spazi multipli in eccesso
 * - Tab → spazi (per indentazione consistente)
 *
 * @param content - Contenuto grezzo
 * @returns Contenuto preprocessato
 */
export function preprocessMarkdown(content: string): string {
    if (!content) return '';

    return content
        // Normalizza newline
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Tab → 4 spazi (standard Markdown)
        .replace(/\t/g, '    ')
        // Rimuovi spazi trailing
        .replace(/[ \t]+$/gm, '')
        // Massimo 2 newline consecutive
        .replace(/\n{3,}/g, '\n\n')
        // Trim finale
        .trim();
}

/**
 * Converte testo semplice in Markdown base.
 * Utile per contenuti legacy senza formattazione.
 *
 * Conversioni:
 * - \n\n → paragrafi
 * - \n → <br>
 * - *testo* → enfasi
 * - **testo** → grassetto
 *
 * @param plainText - Testo semplice
 * @returns Markdown equivalente
 */
export function plainTextToMarkdown(plainText: string): string {
    if (!plainText) return '';

    // Il testo è già compatibile con Markdown per la maggior parte
    // Aggiungiamo solo la gestione dei singoli newline come <br>
    return preprocessMarkdown(plainText)
        // Singoli newline (non doppi) diventano <br>
        // Ma solo se non sono già parte di una lista o heading
        .replace(/(?<!\n)\n(?!\n)(?![-*+\d]\.?\s)(?!#)/g, '  \n');
}

export default markdownOptions;
