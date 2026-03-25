import syntheticQuizIdsModule from '../../../../../server/services/study/syntheticQuizIds.js';

const {
    isSyntheticQuizCardId,
    dedupeSyntheticQuizCardIds,
    hasOnlySyntheticQuizCardIds,
    resolveQuizSnapshotSourceCardIds,
} = syntheticQuizIdsModule;

describe('synthetic quiz backend helpers', () => {
    it('recognizes both multiple-choice and true/false synthetic quiz IDs', () => {
        expect(isSyntheticQuizCardId('quiz_ai_1_100')).toBe(true);
        expect(isSyntheticQuizCardId('quiz_tf_1_100')).toBe(true);
        expect(isSyntheticQuizCardId('card-1')).toBe(false);
    });

    it('deduplicates synthetic quiz IDs while ignoring real card IDs', () => {
        expect(dedupeSyntheticQuizCardIds(['quiz_tf_1', 'quiz_tf_1', 'card-1', 'quiz_ai_3'])).toEqual([
            'quiz_tf_1',
            'quiz_ai_3',
        ]);
    });

    it('detects synthetic-only quiz requests and preserves their IDs for snapshots', () => {
        expect(hasOnlySyntheticQuizCardIds(['quiz_tf_1', 'quiz_tf_2'])).toBe(true);
        expect(hasOnlySyntheticQuizCardIds(['quiz_tf_1', 'card-1'])).toBe(false);

        expect(resolveQuizSnapshotSourceCardIds(['quiz_tf_1', 'quiz_tf_2', 'quiz_tf_1'], ['card-1', 'card-2'])).toEqual({
            isSyntheticOnlyQuiz: true,
            sourceCardIds: ['quiz_tf_1', 'quiz_tf_2'],
        });
    });

    it('prefers real deck card IDs when the request is not synthetic-only', () => {
        expect(resolveQuizSnapshotSourceCardIds(['card-1', 'card-2', 'quiz_tf_1'], ['card-1', 'card-2'])).toEqual({
            isSyntheticOnlyQuiz: false,
            sourceCardIds: ['card-1', 'card-2'],
        });
    });
});
