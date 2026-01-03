/**
 * Utility per analisi e confronto stringhe (Typing Mode).
 */

const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

const normalizeAnswer = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
        .toLowerCase()
        .trim()
        .replace(/[\s.,!?;:]+$/g, '')
        .replace(/\s+/g, ' ');
};

const levenshteinDistance = (a, b) => {
    if (a === b) return 0;

    const aLen = a.length;
    const bLen = b.length;

    if (aLen === 0) return bLen;
    if (bLen === 0) return aLen;

    const prev = new Array(bLen + 1);
    const curr = new Array(bLen + 1);

    for (let j = 0; j <= bLen; j += 1) {
        prev[j] = j;
    }

    for (let i = 1; i <= aLen; i += 1) {
        curr[0] = i;
        const aChar = a[i - 1];

        for (let j = 1; j <= bLen; j += 1) {
            const cost = aChar === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + cost
            );
        }

        for (let j = 0; j <= bLen; j += 1) {
            prev[j] = curr[j];
        }
    }

    return prev[bLen];
};

/**
 * Confronta risposta utente e risposta corretta con tolleranza errori.
 *
 * @param {string} userAnswer
 * @param {string} realAnswer
 * @param {Object} [options]
 * @param {number} [options.threshold] - Similarita minima (default 0.85)
 * @returns {boolean}
 */
const checkAnswerSimilarity = (userAnswer, realAnswer, options = {}) => {
    const threshold = typeof options.threshold === 'number'
        ? options.threshold
        : DEFAULT_SIMILARITY_THRESHOLD;

    const normalizedUser = normalizeAnswer(userAnswer);
    const normalizedReal = normalizeAnswer(realAnswer);

    if (!normalizedUser || !normalizedReal) {
        return false;
    }

    if (normalizedUser === normalizedReal) {
        return true;
    }

    const maxLen = Math.max(normalizedUser.length, normalizedReal.length);
    if (maxLen === 0) return true;

    const distance = levenshteinDistance(normalizedUser, normalizedReal);
    const similarity = 1 - distance / maxLen;

    return similarity >= threshold;
};

module.exports = {
    checkAnswerSimilarity,
};
