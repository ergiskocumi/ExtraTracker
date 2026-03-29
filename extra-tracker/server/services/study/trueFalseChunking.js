function buildChunkStatementCounts(chunkCount, totalRequested) {
    const safeChunkCount = Math.max(0, Math.floor(Number(chunkCount) || 0));
    const safeTotalRequested = Math.max(0, Math.floor(Number(totalRequested) || 0));

    if (safeChunkCount === 0) return [];

    const baseCount = Math.floor(safeTotalRequested / safeChunkCount);
    const remainder = safeTotalRequested % safeChunkCount;

    return Array.from({ length: safeChunkCount }, (_, index) => (
        baseCount + (index < remainder ? 1 : 0)
    ));
}

module.exports = {
    buildChunkStatementCounts,
};
