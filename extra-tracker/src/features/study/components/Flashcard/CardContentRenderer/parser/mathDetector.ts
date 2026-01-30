/**
 * 🔍 MATH DETECTOR & AUTO-WRAPPER
 * ================================
 *
 * Rileva automaticamente espressioni matematiche nel testo e le avvolge
 * con delimitatori LaTeX ($...$) per permettere il rendering con KaTeX.
 *
 * Problema risolto:
 * Il contenuto delle flashcard spesso contiene formule scritte senza
 * delimitatori LaTeX (es. "a_{n|i}" invece di "$a_{n|i}$").
 * Questo preprocessor le rileva e le formatta correttamente.
 *
 * @module CardContentRenderer/parser/mathDetector
 */

/**
 * Pattern che indicano espressioni matematiche.
 * Ordine importante: pattern più specifici prima di quelli generici.
 */
const MATH_PATTERNS = [
    // Frazioni LaTeX: \frac{...}{...}
    /\\frac\s*\{[^}]*\}\s*\{[^}]*\}/g,

    // Radici: \sqrt{...} o \sqrt[n]{...}
    /\\sqrt(?:\[[^\]]*\])?\s*\{[^}]*\}/g,

    // Sommatorie, integrali, produttorie con limiti
    /\\(?:sum|int|prod|lim)(?:_\{[^}]*\})?(?:\^\{[^}]*\})?/g,

    // Comandi LaTeX comuni: \alpha, \beta, \infty, etc.
    /\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|infty|partial|nabla|forall|exists|in|notin|subset|supset|cup|cap|land|lor|neg|Rightarrow|Leftarrow|Leftrightarrow|rightarrow|leftarrow|leftrightarrow|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|sim|propto|perp|parallel)/g,

    // Simboli matematici comuni
    /\\(?:mathbb|mathbf|mathcal|mathrm|text)\s*\{[^}]*\}/g,
];

/**
 * Pattern per rilevare espressioni con subscript/superscript.
 * Questi sono i più comuni nelle flashcard di matematica finanziaria.
 */
const SUBSCRIPT_SUPERSCRIPT_PATTERN = /(?:^|[\s(=+\-*\/,;:])([a-zA-Z](?:_\{[^}]+\}|_[a-zA-Z0-9]|\^\{[^}]+\}|\^[\-]?[a-zA-Z0-9]+)+)(?=[\s)=+\-*\/,;:.]|$)/g;

/**
 * Pattern per espressioni matematiche complete (equazioni).
 * Rileva pattern come: V = (1+i)^{-p} a_ni
 */
const EQUATION_PATTERNS = [
    // Espressioni con parentesi e esponenti: (1+i)^{-1}, (1+i)^n, etc.
    /\([^)]+\)\^(?:\{[^}]+\}|[\-]?\d+|[\-]?[a-zA-Z])/g,

    // Variabili con subscript complessi: a_{n|i}, s_{n|i}, etc.
    /[a-zA-Z]_\{[^}]+\}/g,

    // Variabili con subscript semplici seguite da altri termini: a_ni, v^p, etc.
    /[a-zA-Z]_[a-zA-Z]+(?:\d+)?/g,

    // Esponenti: x^2, x^{-1}, v^n, etc.
    /[a-zA-Z]\^(?:\{[^}]+\}|[\-]?\d+|[\-]?[a-zA-Z])/g,
];

/**
 * Pattern per rilevare se il testo contiene già delimitatori LaTeX.
 */
const HAS_LATEX_DELIMITERS = /\$[^$]+\$|\$\$[^$]+\$\$/;

/**
 * Pattern per espressioni che dovrebbero essere formule inline.
 * Cattura sequenze matematiche significative.
 */
const INLINE_MATH_PATTERN = /(?:^|[^$\\a-zA-Z])([a-zA-Z](?:_(?:\{[^}]+\}|[a-zA-Z0-9])|(?:\^(?:\{[^}]+\}|[\-]?[a-zA-Z0-9]+)))+)(?=[^a-zA-Z$]|$)/g;

/**
 * Rileva e avvolge automaticamente le espressioni matematiche con delimitatori $.
 *
 * @param content - Testo contenente potenziali formule senza delimitatori
 * @returns Testo con formule avvolte in $...$
 *
 * @example
 * wrapMathExpressions('Il valore è a_{n|i} = v a_{n|i}')
 * // Output: 'Il valore è $a_{n|i}$ = $v$ $a_{n|i}$'
 */
export function wrapMathExpressions(content: string): string {
    if (!content || typeof content !== 'string') {
        return '';
    }

    // Se il contenuto ha già delimitatori LaTeX, non processare
    if (HAS_LATEX_DELIMITERS.test(content)) {
        return content;
    }

    let result = content;

    // Set per tracciare le espressioni già processate (evita duplicati)
    const processedExpressions = new Set<string>();

    // 1. Trova tutte le espressioni matematiche candidate
    const mathExpressions = findMathExpressions(content);

    // 2. Ordina per lunghezza decrescente (processa prima le più lunghe)
    //    Questo evita che "a_{n|i}" venga spezzato processando prima "a_"
    mathExpressions.sort((a, b) => b.length - a.length);

    // 3. Sostituisci ogni espressione con la versione wrapped
    for (const expr of mathExpressions) {
        if (processedExpressions.has(expr)) continue;

        // Crea un pattern che matcha l'espressione esatta, non come parte di altra parola
        // e non già dentro $...$
        const escapedExpr = escapeRegExp(expr);
        const pattern = new RegExp(
            `(?<!\\$|[a-zA-Z])${escapedExpr}(?!\\$|[a-zA-Z])`,
            'g'
        );

        const wrapped = `$${expr}$`;
        result = result.replace(pattern, wrapped);
        processedExpressions.add(expr);
    }

    // 4. Pulizia: rimuovi $ doppi adiacenti e spazi extra
    result = result
        .replace(/\$\s*\$/g, '') // Rimuovi $$ vuoti
        .replace(/\$\$+/g, '$') // Riduci $$$ a $
        .replace(/\s+/g, ' '); // Normalizza spazi

    return result;
}

/**
 * Trova tutte le espressioni matematiche in un testo.
 */
function findMathExpressions(content: string): string[] {
    const expressions: string[] = [];
    let match;

    // Pattern 1: Variabili con subscript complessi (a_{n|i}, s_{n|i}, etc.)
    const subscriptComplexPattern = /[a-zA-Z]_\{[^}]+\}/g;
    while ((match = subscriptComplexPattern.exec(content)) !== null) {
        expressions.push(match[0]);
    }

    // Pattern 2: Espressioni con parentesi e esponenti - TUTTI i casi
    // (1+i)^{-p}, (1+i)^n, (1+i)^2, (1+i)^{n-1}, etc.
    const parenExponentPattern = /\([^)]+\)\^(?:\{[^}]+\}|[\-]?[a-zA-Z0-9]+)/g;
    while ((match = parenExponentPattern.exec(content)) !== null) {
        expressions.push(match[0]);
    }

    // Pattern 3: Variabili con esponenti - TUTTI i casi
    // v^p, x^2, v^{-1}, v^n, etc.
    const varExponentPattern = /[a-zA-Z]\^(?:\{[^}]+\}|[\-]?[a-zA-Z0-9]+)/g;
    while ((match = varExponentPattern.exec(content)) !== null) {
        expressions.push(match[0]);
    }

    // Pattern 4: Variabili con subscript semplici (a_ni, v_0, s_n, etc.)
    // Cattura lettere seguite da _ e poi lettere/numeri
    const subscriptSimplePattern = /[a-zA-Z]_[a-zA-Z0-9]+/g;
    while ((match = subscriptSimplePattern.exec(content)) !== null) {
        // Evita match già coperti da subscript complessi
        if (!match[0].includes('{')) {
            expressions.push(match[0]);
        }
    }

    // Pattern 5: Comandi LaTeX espliciti
    const latexCommandPattern = /\\[a-zA-Z]+(?:\{[^}]*\})?/g;
    while ((match = latexCommandPattern.exec(content)) !== null) {
        expressions.push(match[0]);
    }

    // Pattern 6: Simboli matematici isolati con subscript/superscript
    // Come: ä (con umlaut che potrebbe essere mal codificato), etc.
    // Pattern per caratteri speciali matematici
    const specialMathPattern = /[äöüÄÖÜ][_^][a-zA-Z0-9{}\-]+/g;
    while ((match = specialMathPattern.exec(content)) !== null) {
        expressions.push(match[0]);
    }

    // Rimuovi duplicati e filtra espressioni troppo corte o false positive
    const uniqueExpressions = [...new Set(expressions)].filter((expr) => {
        // Minimo 3 caratteri per essere considerata un'espressione matematica
        if (expr.length < 3) return false;
        // Deve contenere almeno un operatore matematico (_, ^, \)
        return /[_^\\]/.test(expr);
    });

    return uniqueExpressions;
}

/**
 * Escape caratteri speciali per uso in RegExp.
 */
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Verifica se una stringa contiene espressioni matematiche.
 */
export function containsMathExpressions(content: string): boolean {
    if (!content) return false;

    // Check rapido per pattern comuni
    const quickPatterns = [
        /_\{/, // Subscript con parentesi
        /\^\{/, // Superscript con parentesi
        /_[a-z]/i, // Subscript semplice
        /\^[\-]?\d/, // Superscript numerico
        /\([^)]+\)\^/, // Parentesi con esponente
        /\\[a-zA-Z]+/, // Comando LaTeX
    ];

    return quickPatterns.some((pattern) => pattern.test(content));
}

/**
 * Preprocessa il contenuto per il rendering matematico.
 * Combina rilevamento e wrapping in un'unica funzione.
 *
 * @param content - Contenuto grezzo
 * @returns Contenuto pronto per react-markdown con remark-math
 */
export function preprocessMathContent(content: string): string {
    if (!content) return '';

    // Se non contiene espressioni matematiche, ritorna così com'è
    if (!containsMathExpressions(content)) {
        return content;
    }

    return wrapMathExpressions(content);
}

export default preprocessMathContent;
