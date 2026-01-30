/**
 * 🔍 MATH DETECTOR & AUTO-WRAPPER v2
 * ===================================
 *
 * Rileva automaticamente EQUAZIONI COMPLETE nel testo e le avvolge
 * con delimitatori LaTeX ($...$) per permettere il rendering con KaTeX.
 *
 * Strategia v2:
 * - Invece di cercare singole espressioni, rileva ZONE MATEMATICHE
 * - Un'equazione inizia con "LETTERA =" e continua finché trova contenuto matematico
 * - Avvolge l'intera equazione in un unico blocco $...$
 *
 * @module CardContentRenderer/parser/mathDetector
 */

/**
 * Caratteri che indicano contenuto matematico.
 */
const MATH_CHARS = /[+\-*/=^_{}()[\]]/;

/**
 * Pattern che indicano l'INIZIO di un'equazione.
 * Es: "V = ", "M = ", "a_{n|i} = "
 */
const EQUATION_START = /(?:^|[.;:]\s*|,\s+)([A-Za-z](?:_\{[^}]+\}|_[a-zA-Z0-9]+)?)\s*=/;

/**
 * Pattern per rilevare se il testo contiene già delimitatori LaTeX.
 */
const HAS_LATEX_DELIMITERS = /\$[^$]+\$|\$\$[^$]+\$\$/;

/**
 * Preprocessa il contenuto per il rendering matematico.
 * Rileva equazioni complete e le avvolge con $...$
 *
 * @param content - Contenuto grezzo
 * @returns Contenuto pronto per react-markdown con remark-math
 */
export function preprocessMathContent(content: string): string {
    if (!content || typeof content !== 'string') {
        return '';
    }

    // Se ha già delimitatori LaTeX, non processare
    if (HAS_LATEX_DELIMITERS.test(content)) {
        return content;
    }

    // Se non contiene pattern matematici, ritorna così com'è
    if (!containsMathExpressions(content)) {
        return content;
    }

    return wrapEquations(content);
}

/**
 * Avvolge le equazioni complete con delimitatori $$ (block math).
 * Le espressioni isolate usano $ (inline math).
 * Strategia: trova sequenze che sembrano equazioni matematiche.
 */
function wrapEquations(content: string): string {
    let result = '';
    let i = 0;
    const len = content.length;

    while (i < len) {
        // Cerca l'inizio di una potenziale equazione
        const equationMatch = findEquationStart(content, i);

        if (equationMatch) {
            // Aggiungi il testo prima dell'equazione
            result += content.substring(i, equationMatch.start);

            // Trova la fine dell'equazione
            const equationEnd = findEquationEnd(content, equationMatch.start);
            const equation = content.substring(equationMatch.start, equationEnd).trim();

            // Avvolgi l'equazione come BLOCK MATH ($$...$$) per visualizzarla su riga separata
            if (isSignificantMathExpression(equation)) {
                // Rimuovi il punto finale se presente (lo aggiungiamo dopo)
                const cleanEquation = equation.replace(/\.$/, '');
                const hadPeriod = equation.endsWith('.');

                // Usa $$ per block math (display mode)
                result += `\n\n$$${cleanEquation}$$\n\n`;

                if (hadPeriod) {
                    // Se c'era un punto, non aggiungerlo (era parte della frase)
                }
            } else {
                result += equation;
            }

            i = equationEnd;
        } else {
            // Cerca espressioni matematiche isolate (non equazioni)
            const isolatedMatch = findIsolatedMathExpression(content, i);

            if (isolatedMatch) {
                result += content.substring(i, isolatedMatch.start);
                // Usa $ per inline math
                result += `$${isolatedMatch.expression}$`;
                i = isolatedMatch.end;
            } else {
                // Nessuna espressione trovata, aggiungi il resto del contenuto
                result += content.substring(i);
                break;
            }
        }
    }

    // Pulizia finale
    return cleanupResult(result);
}

/**
 * Trova l'inizio di un'equazione (pattern: LETTERA = ...)
 */
function findEquationStart(content: string, fromIndex: number): { start: number; variable: string } | null {
    // Pattern: lettera (con possibile subscript) seguita da =
    // Es: "V = ", "M = ", "a_{n|i} = ", "v^p = "
    const patterns = [
        // Variabile con subscript complesso: a_{n|i} =
        /([A-Za-z]_\{[^}]+\})\s*=/g,
        // Variabile con subscript semplice: a_ni =
        /([A-Za-z]_[a-zA-Z0-9]+)\s*=/g,
        // Variabile con esponente: v^p =
        /([A-Za-z]\^(?:\{[^}]+\}|[a-zA-Z0-9]+))\s*=/g,
        // Variabile semplice: V =, M =
        /(?:^|[^a-zA-Z])([A-Za-z])\s*=/g,
    ];

    let earliestMatch: { start: number; variable: string } | null = null;

    for (const pattern of patterns) {
        pattern.lastIndex = fromIndex;
        const match = pattern.exec(content);

        if (match && match.index >= fromIndex) {
            const start = match.index + (match[0].indexOf(match[1]));

            if (!earliestMatch || start < earliestMatch.start) {
                earliestMatch = {
                    start,
                    variable: match[1],
                };
            }
        }
    }

    return earliestMatch;
}

/**
 * Trova la fine di un'equazione.
 * Un'equazione termina quando:
 * - Si incontra un punto SINGOLO seguito da spazio o fine stringa
 * - Si incontra una virgola seguita da testo non matematico
 * - Si incontra un punto e virgola
 * - Si incontra un "dove" o "con" o "per" (parole che introducono spiegazioni)
 *
 * NON termina con:
 * - "..." (puntini di sospensione - fanno parte della formula)
 * - Virgola seguita da altra equazione
 */
function findEquationEnd(content: string, startIndex: number): number {
    let i = startIndex;
    let parenDepth = 0;
    let braceDepth = 0;
    const len = content.length;

    while (i < len) {
        const char = content[i];
        const nextChar = content[i + 1] || '';
        const nextNextChar = content[i + 2] || '';
        const prevChar = content[i - 1] || '';

        // Traccia parentesi
        if (char === '(' || char === '[') parenDepth++;
        if (char === ')' || char === ']') parenDepth--;
        if (char === '{') braceDepth++;
        if (char === '}') braceDepth--;

        // Non terminare dentro parentesi
        if (parenDepth > 0 || braceDepth > 0) {
            i++;
            continue;
        }

        // NON terminare con "..." (puntini di sospensione)
        if (char === '.' && nextChar === '.' && nextNextChar === '.') {
            i += 3; // Salta i tre punti
            continue;
        }

        // Termina con punto SINGOLO seguito da spazio, fine stringa, o maiuscola
        if (char === '.' && nextChar !== '.') {
            if (nextChar === ' ' || nextChar === '' || nextChar === '\n' || /[A-Z]/.test(nextChar)) {
                return i + 1;
            }
        }

        // Termina con punto e virgola
        if (char === ';') {
            return i;
        }

        // Controlla se siamo a una parola chiave che termina l'equazione
        const remainingText = content.substring(i).toLowerCase();
        const terminators = [', dove ', ', con ', '. per ', ' dove ', ' con '];

        for (const term of terminators) {
            if (remainingText.startsWith(term)) {
                return i;
            }
        }

        // Se troviamo una virgola, verifica se quello che segue è ancora matematica
        if (char === ',' && nextChar === ' ') {
            const afterComma = content.substring(i + 2, i + 30);

            // Continua se dopo la virgola c'è:
            // - Un'altra equazione (LETTERA =)
            // - "cioè", "quindi", "ovvero" seguiti da equazione
            // - "per" seguito da condizione (es: "per i≠0")
            const continuePatterns = [
                /^[A-Za-z](?:_\{[^}]+\}|_[a-zA-Z0-9]+|\^[^=]*)?\s*=/,  // Altra equazione
                /^(?:cioè|quindi|ovvero)\s+[A-Za-z]/i,                   // Connettivo + equazione
                /^per\s+[a-z]/i,                                         // Condizione
            ];

            const shouldContinue = continuePatterns.some(p => p.test(afterComma));

            if (!shouldContinue) {
                return i;
            }
        }

        i++;
    }

    return len;
}

/**
 * Trova espressioni matematiche isolate (non parte di equazioni).
 * Es: "il valore v^p è dato da..." - qui v^p è isolato
 */
function findIsolatedMathExpression(
    content: string,
    fromIndex: number
): { start: number; end: number; expression: string } | null {
    const patterns = [
        // Subscript complessi: a_{n|i}, s_{n|i}
        /([A-Za-z]_\{[^}]+\})/g,
        // Parentesi con esponenti: (1+i)^{-n}, (1+i)^n
        /(\([^)]+\)\^(?:\{[^}]+\}|[\-]?[a-zA-Z0-9]+))/g,
        // Variabili con esponenti: v^p, v^{-1}, v^n
        /([A-Za-z]\^(?:\{[^}]+\}|[\-]?[a-zA-Z0-9]+))/g,
        // Subscript semplici: a_ni (solo se non fa parte di parola)
        /(?<![a-zA-Z])([A-Za-z]_[a-zA-Z0-9]+)(?![a-zA-Z])/g,
    ];

    let earliestMatch: { start: number; end: number; expression: string } | null = null;

    for (const pattern of patterns) {
        pattern.lastIndex = fromIndex;
        const match = pattern.exec(content);

        if (match && match.index >= fromIndex) {
            // Verifica che non sia già stato processato (non dentro $...$)
            const beforeChar = content[match.index - 1] || '';
            const afterChar = content[match.index + match[0].length] || '';

            if (beforeChar !== '$' && afterChar !== '$') {
                if (!earliestMatch || match.index < earliestMatch.start) {
                    earliestMatch = {
                        start: match.index,
                        end: match.index + match[0].length,
                        expression: match[1],
                    };
                }
            }
        }
    }

    return earliestMatch;
}

/**
 * Verifica se un'espressione è abbastanza significativa da essere matematica.
 */
function isSignificantMathExpression(expr: string): boolean {
    if (!expr || expr.length < 3) return false;

    // Deve contenere almeno un operatore matematico o subscript/superscript
    const hasMathContent =
        /[=+\-*/^_]/.test(expr) ||
        /\{[^}]+\}/.test(expr) ||
        /\([^)]+\)/.test(expr);

    // Non deve essere solo testo normale
    const isNotJustText = !/^[a-zA-Z]+$/.test(expr);

    return hasMathContent && isNotJustText;
}

/**
 * Verifica se una stringa contiene espressioni matematiche.
 */
export function containsMathExpressions(content: string): boolean {
    if (!content) return false;

    const patterns = [
        /_\{/,           // Subscript con parentesi
        /\^\{/,          // Superscript con parentesi
        /_[a-z]/i,       // Subscript semplice
        /\^[\-]?\d/,     // Superscript numerico
        /\([^)]+\)\^/,   // Parentesi con esponente
        /\\[a-zA-Z]+/,   // Comando LaTeX
        /[A-Za-z]\s*=\s*[^,.\s]/, // Equazione
    ];

    return patterns.some((pattern) => pattern.test(content));
}

/**
 * Pulizia del risultato finale.
 */
function cleanupResult(result: string): string {
    return result
        // Rimuovi newlines eccessivi (max 2 consecutivi)
        .replace(/\n{3,}/g, '\n\n')
        // Normalizza spazi multipli (ma non newlines)
        .replace(/[^\S\n]+/g, ' ')
        // Rimuovi spazi prima/dopo newlines
        .replace(/ ?\n ?/g, '\n')
        // Trim finale
        .trim();
}

/**
 * Wrapper legacy per compatibilità.
 */
export function wrapMathExpressions(content: string): string {
    return preprocessMathContent(content);
}

export default preprocessMathContent;
