const SYNTHETIC_QUIZ_CARD_PREFIXES = ['quiz_ai_', 'quiz_tf_'];

function isSyntheticQuizCardId(cardId) {
    if (typeof cardId !== 'string') return false;
    return SYNTHETIC_QUIZ_CARD_PREFIXES.some(prefix => cardId.startsWith(prefix));
}

function dedupeSyntheticQuizCardIds(ids = []) {
    if (!Array.isArray(ids)) return [];

    return [...new Set(
        ids
            .map(id => String(id || '').trim())
            .filter(isSyntheticQuizCardId)
    )];
}

function hasOnlySyntheticQuizCardIds(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return false;

    const normalizedIds = ids
        .map(id => String(id || '').trim())
        .filter(Boolean);

    return normalizedIds.length > 0 && normalizedIds.every(isSyntheticQuizCardId);
}

function resolveQuizSnapshotSourceCardIds(requestedIds = [], validCardIds = []) {
    const normalizedRequestedIds = Array.isArray(requestedIds)
        ? [...new Set(requestedIds
            .map(id => String(id || '').trim())
            .filter(Boolean))]
        : [];
    const validCardIdSet = new Set(
        Array.isArray(validCardIds)
            ? validCardIds.map(id => String(id || '').trim()).filter(Boolean)
            : []
    );
    const realSourceCardIds = normalizedRequestedIds.filter(id => validCardIdSet.has(id));
    const syntheticSourceCardIds = dedupeSyntheticQuizCardIds(normalizedRequestedIds);
    const isSyntheticOnlyQuiz = realSourceCardIds.length === 0 && syntheticSourceCardIds.length > 0;

    return {
        sourceCardIds: isSyntheticOnlyQuiz ? syntheticSourceCardIds : realSourceCardIds,
        isSyntheticOnlyQuiz,
    };
}

module.exports = {
    SYNTHETIC_QUIZ_CARD_PREFIXES,
    isSyntheticQuizCardId,
    dedupeSyntheticQuizCardIds,
    hasOnlySyntheticQuizCardIds,
    resolveQuizSnapshotSourceCardIds,
};
