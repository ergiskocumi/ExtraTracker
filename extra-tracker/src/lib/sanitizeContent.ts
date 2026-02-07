/**
 * 🛡️ CONTENT SANITIZATION UTILITY
 * ================================
 *
 * Sanitizza il contenuto delle flashcard per prevenire attacchi XSS.
 * Utilizza DOMPurify per rimuovere script malevoli preservando il markup sicuro.
 *
 * Perché DOMPurify?
 * - Standard de-facto per sanitizzazione XSS in applicazioni web
 * - Mantiene il markup necessario per Markdown/LaTeX
 * - Configurabile per whitelist di tag/attributi
 * - Testato contro OWASP XSS vectors
 *
 * @module lib/sanitizeContent
 */

import DOMPurify from 'dompurify';

/**
 * Configurazione DOMPurify per contenuti Flashcard.
 *
 * ALLOWED_TAGS: Tag HTML permessi dopo il parsing Markdown
 * ALLOWED_ATTR: Attributi permessi (es. class per styling, aria-* per accessibilità)
 *
 * Perché questi tag specifici?
 * - span/div: necessari per KaTeX e styling formule
 * - math/annotation: elementi MathML per accessibilità
 * - a: link esterni (con target="_blank" forzato)
 */
const SANITIZE_CONFIG = {
    ALLOWED_TAGS: [
        // Struttura base
        'p', 'br', 'div', 'span',
        // Formattazione testo
        'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark',
        // Heading (per contenuti strutturati)
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        // Liste
        'ul', 'ol', 'li',
        // Citazioni e codice
        'blockquote', 'pre', 'code',
        // Tabelle (GFM)
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        // Link
        'a',
        // KaTeX specifici
        'math', 'annotation', 'semantics',
        'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mroot', 'msqrt',
        'mover', 'munder', 'munderover', 'mtable', 'mtr', 'mtd',
        // SVG per simboli matematici
        'svg', 'path', 'line', 'rect', 'circle', 'g',
    ],
    ALLOWED_ATTR: [
        // Styling
        'class', 'style',
        // Accessibilità
        'aria-label', 'aria-hidden', 'role', 'title',
        // Link
        'href', 'target', 'rel',
        // Tabelle
        'colspan', 'rowspan',
        // SVG
        'd', 'viewBox', 'fill', 'stroke', 'width', 'height', 'x', 'y',
        // KaTeX/MathML
        'mathvariant', 'encoding', 'xmlns',
    ],
    // Forza target="_blank" e rel="noopener" su tutti i link
    ADD_ATTR: ['target', 'rel'],
    // Non permettere data: URLs (potenziale vettore XSS)
    ALLOW_DATA_ATTR: false,
    // Rimuovi tag vuoti
    KEEP_CONTENT: true,
    // Ritorna stringa invece di TrustedHTML
    RETURN_TRUSTED_TYPE: false,
} as const;

/**
 * Hook per forzare attributi sicuri sui link.
 * Previene attacchi di tipo "tabnabbing" aggiungendo rel="noopener noreferrer".
 */
if (typeof window !== 'undefined') {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (node.tagName === 'A') {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
        }
    });
}

/**
 * Sanitizza una stringa di contenuto per prevenire XSS.
 *
 * @param content - Il contenuto grezzo da sanitizzare
 * @returns Il contenuto sanitizzato, sicuro per il rendering
 *
 * @example
 * // Input potenzialmente pericoloso
 * const dirty = '<script>alert("xss")</script>Testo sicuro';
 * const clean = sanitizeContent(dirty);
 * // Output: 'Testo sicuro'
 *
 * @example
 * // Preserva markup valido
 * const markdown = '**Bold** e $x^2$ formula';
 * const clean = sanitizeContent(markdown);
 * // Output: '**Bold** e $x^2$ formula' (invariato, è testo sicuro)
 */
export function sanitizeContent(content: string): string {
    // Early return per contenuto vuoto
    if (!content || typeof content !== 'string') {
        return '';
    }

    // DOMPurify sanitizza l'HTML, ma il nostro input è Markdown/LaTeX
    // Prima del parsing, il contenuto è principalmente testo
    // La sanitizzazione principale avviene DOPO il parsing di react-markdown
    // Qui facciamo un pre-check per rimuovere pattern ovviamente malevoli

    // Rimuovi tag script/style anche se mascherati
    const preClean = content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');

    return preClean;
}

/**
 * Sanitizza HTML già renderizzato (post-parsing).
 * Usato come safety net dopo che react-markdown ha processato il contenuto.
 *
 * @param html - HTML generato dal parser Markdown
 * @returns HTML sanitizzato
 */
export function sanitizeHTML(html: string): string {
    if (!html || typeof html !== 'string') {
        return '';
    }

    // Crea una copia mutable della configurazione per DOMPurify
    const config = {
        ALLOWED_TAGS: [...SANITIZE_CONFIG.ALLOWED_TAGS],
        ALLOWED_ATTR: [...SANITIZE_CONFIG.ALLOWED_ATTR],
        ADD_ATTR: [...SANITIZE_CONFIG.ADD_ATTR],
        ALLOW_DATA_ATTR: SANITIZE_CONFIG.ALLOW_DATA_ATTR,
        KEEP_CONTENT: SANITIZE_CONFIG.KEEP_CONTENT,
        RETURN_TRUSTED_TYPE: false as const,
    };

    return DOMPurify.sanitize(html, config) as string;
}

/**
 * Verifica se un contenuto contiene pattern potenzialmente pericolosi.
 * Utile per logging/monitoring senza bloccare il rendering.
 *
 * @param content - Contenuto da verificare
 * @returns true se il contenuto sembra sicuro
 */
export function isContentSafe(content: string): boolean {
    if (!content) return true;

    const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /data:text\/html/i,
        /vbscript:/i,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(content));
}

export default sanitizeContent;
