/**
 * 🧮 LATEX VALIDATOR
 * ==================
 *
 * Validazione e preprocessing delle formule LaTeX prima del rendering KaTeX.
 *
 * Perché validare?
 * - KaTeX genera errori visibili per sintassi non valida
 * - Meglio mostrare fallback pulito che errore rosso
 * - Logging per debug in development
 *
 * @module CardContentRenderer/parser/latexValidator
 */

/**
 * Pattern comuni di errori LaTeX nelle flashcard.
 * Basati su errori frequenti degli utenti.
 */
const COMMON_LATEX_ERRORS = [
    // Parentesi non bilanciate
    { pattern: /\{[^}]*$/, message: 'Parentesi graffa non chiusa' },
    { pattern: /^[^{]*\}/, message: 'Parentesi graffa non aperta' },
    // Comandi incompleti
    { pattern: /\\[a-zA-Z]+\s*$/, message: 'Comando senza argomento' },
    { pattern: /\\_/, message: 'Underscore non escapato' },
    // Frazioni incomplete
    { pattern: /\\frac\s*\{[^}]*\}\s*$/, message: 'Frazione incompleta (manca denominatore)' },
    // Subscript/superscript vuoti
    { pattern: /_\s*\{?\s*\}?$/, message: 'Subscript vuoto' },
    { pattern: /\^\s*\{?\s*\}?$/, message: 'Superscript vuoto' },
];

/**
 * Risultato della validazione LaTeX.
 */
export interface LaTeXValidationResult {
    /** Se la formula è valida */
    isValid: boolean;
    /** Messaggio di errore (se non valido) */
    errorMessage?: string;
    /** Formula corretta/suggerita (se disponibile) */
    suggestion?: string;
    /** Posizione approssimativa dell'errore */
    errorPosition?: number;
}

/**
 * Valida una formula LaTeX per sintassi base.
 *
 * Non fa parsing completo (quello lo fa KaTeX), ma controlla:
 * - Bilanciamento parentesi
 * - Pattern di errori comuni
 * - Caratteri non supportati
 *
 * @param latex - La stringa LaTeX da validare
 * @returns Risultato della validazione
 *
 * @example
 * validateLaTeX('x^2 + y^2 = z^2'); // { isValid: true }
 * validateLaTeX('\\frac{1}'); // { isValid: false, errorMessage: 'Frazione incompleta' }
 */
export function validateLaTeX(latex: string): LaTeXValidationResult {
    // Caso vuoto è valido (niente da renderizzare)
    if (!latex || latex.trim() === '') {
        return { isValid: true };
    }

    const trimmed = latex.trim();

    // 1. Controlla bilanciamento parentesi graffe
    const braceBalance = checkBraceBalance(trimmed);
    if (!braceBalance.balanced) {
        return {
            isValid: false,
            errorMessage: braceBalance.message,
            errorPosition: braceBalance.position,
        };
    }

    // 2. Controlla bilanciamento parentesi tonde
    const parenBalance = checkParenthesesBalance(trimmed);
    if (!parenBalance.balanced) {
        return {
            isValid: false,
            errorMessage: parenBalance.message,
            errorPosition: parenBalance.position,
        };
    }

    // 3. Controlla pattern di errori comuni
    for (const error of COMMON_LATEX_ERRORS) {
        if (error.pattern.test(trimmed)) {
            return {
                isValid: false,
                errorMessage: error.message,
            };
        }
    }

    // 4. Controlla caratteri potenzialmente problematici
    const problematicChars = /[<>]/g;
    if (problematicChars.test(trimmed)) {
        return {
            isValid: false,
            errorMessage: 'Caratteri < o > non supportati in LaTeX (usa \\lt e \\gt)',
            suggestion: trimmed.replace(/</g, '\\lt ').replace(/>/g, '\\gt '),
        };
    }

    return { isValid: true };
}

/**
 * Controlla il bilanciamento delle parentesi graffe.
 */
function checkBraceBalance(latex: string): {
    balanced: boolean;
    message?: string;
    position?: number;
} {
    let depth = 0;
    let lastOpenPos = -1;

    for (let i = 0; i < latex.length; i++) {
        const char = latex[i];
        const prevChar = i > 0 ? latex[i - 1] : '';

        // Ignora caratteri escapati
        if (prevChar === '\\') continue;

        if (char === '{') {
            depth++;
            lastOpenPos = i;
        } else if (char === '}') {
            depth--;
            if (depth < 0) {
                return {
                    balanced: false,
                    message: 'Parentesi graffa "}" senza corrispondente "{"',
                    position: i,
                };
            }
        }
    }

    if (depth > 0) {
        return {
            balanced: false,
            message: `${depth} parentesi graffa/e "{" non chiusa/e`,
            position: lastOpenPos,
        };
    }

    return { balanced: true };
}

/**
 * Controlla il bilanciamento delle parentesi tonde.
 */
function checkParenthesesBalance(latex: string): {
    balanced: boolean;
    message?: string;
    position?: number;
} {
    let depth = 0;
    let lastOpenPos = -1;

    for (let i = 0; i < latex.length; i++) {
        const char = latex[i];
        const prevChar = i > 0 ? latex[i - 1] : '';

        // Ignora \( e \) che sono delimitatori LaTeX, non parentesi
        if (prevChar === '\\') continue;

        if (char === '(') {
            depth++;
            lastOpenPos = i;
        } else if (char === ')') {
            depth--;
            if (depth < 0) {
                return {
                    balanced: false,
                    message: 'Parentesi ")" senza corrispondente "("',
                    position: i,
                };
            }
        }
    }

    if (depth > 0) {
        return {
            balanced: false,
            message: `${depth} parentesi "(" non chiusa/e`,
            position: lastOpenPos,
        };
    }

    return { balanced: true };
}

/**
 * Estrae tutte le formule LaTeX da un testo.
 * Utile per validazione batch o pre-processing.
 *
 * @param content - Testo contenente formule LaTeX
 * @returns Array di formule estratte con posizione
 */
export function extractLaTeXFormulas(content: string): Array<{
    formula: string;
    isBlock: boolean;
    startIndex: number;
    endIndex: number;
}> {
    const formulas: Array<{
        formula: string;
        isBlock: boolean;
        startIndex: number;
        endIndex: number;
    }> = [];

    // Pattern per formule block ($$...$$)
    const blockPattern = /\$\$([^$]+)\$\$/g;
    let match;

    while ((match = blockPattern.exec(content)) !== null) {
        formulas.push({
            formula: match[1],
            isBlock: true,
            startIndex: match.index,
            endIndex: match.index + match[0].length,
        });
    }

    // Pattern per formule inline ($...$)
    // Evita di matchare i $$ già trovati
    const inlinePattern = /(?<!\$)\$(?!\$)([^$]+)\$(?!\$)/g;

    while ((match = inlinePattern.exec(content)) !== null) {
        // Verifica che non sia dentro un blocco $$
        const isInsideBlock = formulas.some(
            f => match!.index >= f.startIndex && match!.index < f.endIndex
        );

        if (!isInsideBlock) {
            formulas.push({
                formula: match[1],
                isBlock: false,
                startIndex: match.index,
                endIndex: match.index + match[0].length,
            });
        }
    }

    return formulas.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Valida tutte le formule in un contenuto e ritorna un report.
 *
 * @param content - Testo completo con formule LaTeX
 * @returns Report di validazione per ogni formula
 */
export function validateAllFormulas(content: string): Array<{
    formula: string;
    isBlock: boolean;
    validation: LaTeXValidationResult;
}> {
    const formulas = extractLaTeXFormulas(content);

    return formulas.map(f => ({
        formula: f.formula,
        isBlock: f.isBlock,
        validation: validateLaTeX(f.formula),
    }));
}

/**
 * Controlla se un contenuto contiene formule LaTeX.
 *
 * @param content - Testo da controllare
 * @returns true se contiene almeno una formula
 */
export function hasLaTeX(content: string): boolean {
    if (!content) return false;
    return /\$[^$]+\$/.test(content);
}

/**
 * Corregge i delimitatori LaTeX non chiusi per evitare errori di rendering.
 *
 * Gestisce:
 * - `$` aperto senza chiusura → aggiunge `$` alla fine
 * - `$$` aperto senza chiusura → aggiunge `$$` alla fine
 * - Delimitatori misti (es. `$..$$`) → normalizza
 *
 * @param content - Testo con potenziali formule LaTeX incomplete
 * @returns Testo con delimitatori corretti
 *
 * @example
 * fixIncompleteLaTeX('Formula: $x^2');      // 'Formula: $x^2$'
 * fixIncompleteLaTeX('Block: $$E=mc^2');    // 'Block: $$E=mc^2$$'
 * fixIncompleteLaTeX('Già ok: $x+1$');      // 'Già ok: $x+1$' (invariato)
 */
export function fixIncompleteLaTeX(content: string): string {
    if (!content || typeof content !== 'string') {
        return '';
    }

    let result = content;

    // Conta i delimitatori block ($$)
    const blockDelimiters = (result.match(/\$\$/g) || []).length;
    if (blockDelimiters % 2 !== 0) {
        // Numero dispari di $$, aggiungi quello mancante
        // Trova l'ultimo $$ e aggiungi la chiusura alla fine della riga o del contenuto
        const lastBlockIndex = result.lastIndexOf('$$');
        if (lastBlockIndex !== -1) {
            const afterDelimiter = result.substring(lastBlockIndex + 2);
            // Trova la fine della "formula" (newline o fine stringa)
            const endOfLine = afterDelimiter.indexOf('\n');
            if (endOfLine !== -1) {
                const insertPos = lastBlockIndex + 2 + endOfLine;
                result = result.slice(0, insertPos) + '$$' + result.slice(insertPos);
            } else {
                result += '$$';
            }
        }
    }

    // Conta i delimitatori inline ($) - escludendo i $$
    // Prima maschera i $$ per non contarli come doppi $
    const maskedContent = result.replace(/\$\$/g, '\u0000\u0000');
    const inlineDelimiters = (maskedContent.match(/\$/g) || []).length;

    if (inlineDelimiters % 2 !== 0) {
        // Numero dispari di $, aggiungi quello mancante
        // Trova l'ultimo $ singolo (non parte di $$)
        let lastInlineIndex = -1;
        for (let i = result.length - 1; i >= 0; i--) {
            if (result[i] === '$') {
                // Verifica che non sia parte di $$
                const isPartOfBlock =
                    (i > 0 && result[i - 1] === '$') ||
                    (i < result.length - 1 && result[i + 1] === '$');
                if (!isPartOfBlock) {
                    lastInlineIndex = i;
                    break;
                }
            }
        }

        if (lastInlineIndex !== -1) {
            const afterDelimiter = result.substring(lastInlineIndex + 1);
            // Per inline, chiudi prima dello spazio/punteggiatura o fine
            const endMatch = afterDelimiter.match(/^[^\s.,;:!?\n$]*/);
            if (endMatch) {
                const insertPos = lastInlineIndex + 1 + endMatch[0].length;
                result = result.slice(0, insertPos) + '$' + result.slice(insertPos);
            } else {
                result += '$';
            }
        }
    }

    return result;
}

export default validateLaTeX;
