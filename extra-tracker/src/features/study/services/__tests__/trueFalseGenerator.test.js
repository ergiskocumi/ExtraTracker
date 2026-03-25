import trueFalseChunkingModule from '../../../../../server/services/study/trueFalseChunking.js';

const { buildChunkStatementCounts } = trueFalseChunkingModule;

describe('trueFalseGenerator chunk distribution', () => {
    it('distributes the exact requested total across many chunks', () => {
        expect(buildChunkStatementCounts(10, 10)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
        expect(buildChunkStatementCounts(5, 3)).toEqual([1, 1, 1, 0, 0]);
        expect(buildChunkStatementCounts(3, 8)).toEqual([3, 3, 2]);
    });

    it('never changes the requested total while distributing counts', () => {
        const counts = buildChunkStatementCounts(12, 7);
        const total = counts.reduce((sum, value) => sum + value, 0);

        expect(total).toBe(7);
        expect(counts).toHaveLength(12);
        expect(counts.every(value => value >= 0)).toBe(true);
    });
});
