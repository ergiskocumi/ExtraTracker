import { describe, expect, it } from 'vitest';
import { parseMagicProgressEvent } from '../magicGenerateEvents';

describe('parseMagicProgressEvent', () => {
    it('returns null for invalid payload roots', () => {
        expect(parseMagicProgressEvent(null)).toBeNull();
        expect(parseMagicProgressEvent(undefined)).toBeNull();
        expect(parseMagicProgressEvent('invalid')).toBeNull();
        expect(parseMagicProgressEvent(12)).toBeNull();
        expect(parseMagicProgressEvent({})).toBeNull();
    });

    it('returns null for unsupported step values', () => {
        expect(parseMagicProgressEvent({ step: 'idle' })).toBeNull();
        expect(parseMagicProgressEvent({ step: 'unknown-step' })).toBeNull();
    });

    it('parses analyzing payload and keeps only valid blueprint fields', () => {
        const parsed = parseMagicProgressEvent({
            step: 'analyzing',
            message: 'Analisi in corso',
            blueprint: {
                documentType: 'lecture_notes',
                mainTopics: ['Algebra', '', 12, 'Geometria'],
                densityScore: 0.78,
                ignored: true,
            },
        });

        expect(parsed).toEqual({
            step: 'analyzing',
            message: 'Analisi in corso',
            blueprint: {
                documentType: 'lecture_notes',
                mainTopics: ['Algebra', 'Geometria'],
                densityScore: 0.78,
            },
        });
    });

    it('maps blueprint step to analyzing and drops empty blueprint objects', () => {
        const parsed = parseMagicProgressEvent({
            step: 'blueprint',
            message: '  ',
            blueprint: {
                documentType: '',
                mainTopics: [],
                densityScore: Number.NaN,
            },
        });

        expect(parsed).toEqual({
            step: 'analyzing',
            message: undefined,
            blueprint: undefined,
        });
    });

    it('parses chunking and normalizes totalChunks as non-negative int', () => {
        expect(parseMagicProgressEvent({
            step: 'chunking',
            totalChunks: 14.7,
        })).toEqual({
            step: 'chunking',
            message: undefined,
            totalChunks: 15,
        });

        expect(parseMagicProgressEvent({
            step: 'chunking',
            totalChunks: -8,
        })).toEqual({
            step: 'chunking',
            message: undefined,
            totalChunks: 0,
        });
    });

    it('parses concepts and keeps only non-empty strings', () => {
        const parsed = parseMagicProgressEvent({
            step: 'concepts',
            message: 'concetti trovati',
            concepts: ['funzione', '', null, 'limite', '   ', 5],
        });

        expect(parsed).toEqual({
            step: 'concepts',
            message: 'concetti trovati',
            concepts: ['funzione', 'limite'],
        });
    });

    it('parses generating payload with clamped numeric fields', () => {
        const parsed = parseMagicProgressEvent({
            step: 'generating',
            message: 'Generazione in corso',
            currentChunk: 3.2,
            totalChunks: -10,
            generatedSoFar: 11.9,
            currentTopic: 'Derivate',
        });

        expect(parsed).toEqual({
            step: 'generating',
            message: 'Generazione in corso',
            currentChunk: 3,
            totalChunks: 0,
            generatedSoFar: 12,
            currentTopic: 'Derivate',
        });
    });

    it('parses completed payload and defaults totalCards to zero', () => {
        expect(parseMagicProgressEvent({
            step: 'completed',
            totalCards: 22,
        })).toEqual({
            step: 'completed',
            totalCards: 22,
        });

        expect(parseMagicProgressEvent({
            step: 'completed',
            totalCards: Number.NaN,
        })).toEqual({
            step: 'completed',
            totalCards: 0,
        });
    });
});

