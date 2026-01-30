/**
 * 📦 PARSER MODULE - Barrel Export
 *
 * Esporta tutte le utility di parsing per il CardContentRenderer.
 */

export {
    markdownOptions,
    markdownOptionsNoLatex,
    remarkPlugins,
    rehypePlugins,
    preprocessMarkdown,
    plainTextToMarkdown,
} from './markdownParser';

export {
    validateLaTeX,
    extractLaTeXFormulas,
    validateAllFormulas,
    hasLaTeX,
    type LaTeXValidationResult,
} from './latexValidator';

export {
    preprocessMathContent,
    wrapMathExpressions,
    containsMathExpressions,
} from './mathDetector';
