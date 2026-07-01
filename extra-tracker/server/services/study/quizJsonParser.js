/**
 * 🧩 QUIZ JSON PARSER — Tollerante al troncamento
 * ================================================
 * I modelli AI possono restituire JSON troncato quando esauriscono il budget
 * di output token (finish_reason = "length"/"max_tokens"). Il parser standard
 * (`JSON.parse`) fallisce sull'intero payload e si perdono TUTTE le domande,
 * anche quelle già generate correttamente.
 *
 * Questo modulo recupera gli oggetti completi da un array JSON parziale:
 * dato `{"questions":[{...},{...},{tronc...`, ritorna i primi due oggetti validi.
 *
 * Strategia:
 *  1. `JSON.parse` diretto (caso felice, nessuna allocazione extra).
 *  2. Se fallisce, individua l'array della chiave attesa e cammina carattere per
 *     carattere raccogliendo solo gli oggetti `{...}` bilanciati e completi.
 */

/**
 * Estrae oggetti top-level completi da un frammento che inizia subito dopo `[`.
 * Ignora l'ultimo oggetto se è troncato (parentesi non bilanciate).
 *
 * @param {string} text - Testo che parte dal contenuto interno dell'array.
 * @returns {object[]} Oggetti JSON validi trovati, in ordine.
 */
function collectCompleteObjects(text) {
    const objects = [];
    let depth = 0;
    let start = -1;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
            continue;
        }

        if (char === '{') {
            if (depth === 0) start = i;
            depth++;
        } else if (char === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
                const candidate = text.slice(start, i + 1);
                try {
                    objects.push(JSON.parse(candidate));
                } catch (_ignored) {
                    // Oggetto non parsabile: lo saltiamo, continuiamo con i successivi.
                }
                start = -1;
            }
        } else if (char === ']' && depth === 0) {
            // Fine dell'array raggiunta: stop.
            break;
        }
    }

    return objects;
}

/**
 * Parse robusto di una risposta AI che dovrebbe contenere `{ [arrayKey]: [...] }`.
 * Recupera gli elementi completi anche da JSON troncato.
 *
 * @param {string} content - Contenuto grezzo restituito dal modello.
 * @param {string} arrayKey - Chiave dell'array atteso ("questions" o "statements").
 * @returns {{ items: object[], recovered: boolean }} `recovered=true` se il parse
 *          diretto è fallito ed è stato usato il recupero dal troncamento.
 */
function parseQuizArrayResponse(content, arrayKey) {
    if (!content || typeof content !== 'string') {
        return { items: [], recovered: false };
    }

    const cleaned = content
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();

    // Attempt 1: parse diretto.
    try {
        const parsed = JSON.parse(cleaned);
        const items = Array.isArray(parsed?.[arrayKey]) ? parsed[arrayKey] : [];
        return { items, recovered: false };
    } catch (_ignored) {
        // Prosegui con il recupero da troncamento.
    }

    // Attempt 2: individua l'inizio dell'array della chiave attesa e recupera
    // gli oggetti completi.
    const keyPattern = new RegExp(`"${arrayKey}"\\s*:\\s*\\[`);
    const keyMatch = cleaned.match(keyPattern);
    const arrayStart = keyMatch
        ? keyMatch.index + keyMatch[0].length
        : cleaned.indexOf('[') + 1;

    if (arrayStart <= 0) {
        return { items: [], recovered: false };
    }

    const items = collectCompleteObjects(cleaned.slice(arrayStart));
    return { items, recovered: items.length > 0 };
}

module.exports = {
    parseQuizArrayResponse,
    collectCompleteObjects,
};
