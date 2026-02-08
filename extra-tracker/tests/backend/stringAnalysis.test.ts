// @vitest-environment node

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { checkAnswerSimilarity } = require('../../server/utils/stringAnalysis');

describe('server/utils/stringAnalysis.checkAnswerSimilarity', () => {
    it('matches equal answers ignoring case and trailing punctuation', () => {
        expect(checkAnswerSimilarity('  Ciao mondo!!!  ', 'ciao mondo')).toBe(true);
    });

    it('normalizes repeated spaces before comparison', () => {
        expect(checkAnswerSimilarity('teoria   dei   grafi', 'teoria dei grafi')).toBe(true);
    });

    it('returns false when one of the answers is empty', () => {
        expect(checkAnswerSimilarity('', 'qualcosa')).toBe(false);
        expect(checkAnswerSimilarity('qualcosa', '')).toBe(false);
        expect(checkAnswerSimilarity(null, 'ciao')).toBe(false);
        expect(checkAnswerSimilarity('ciao', undefined)).toBe(false);
    });

    it('accepts small typos with default threshold', () => {
        expect(checkAnswerSimilarity('algoritm0', 'algoritmo')).toBe(true);
    });

    it('rejects different answers', () => {
        expect(checkAnswerSimilarity('algebra lineare', 'chimica organica')).toBe(false);
    });

    it('supports a stricter custom threshold', () => {
        expect(checkAnswerSimilarity('algoritm0', 'algoritmo', { threshold: 0.95 })).toBe(false);
    });

    it('supports a looser custom threshold', () => {
        expect(checkAnswerSimilarity('algrtmo', 'algoritmo', { threshold: 0.6 })).toBe(true);
    });
});

