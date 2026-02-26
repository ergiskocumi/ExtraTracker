import { describe, expect, it, vi } from 'vitest';
import {
    clearExamSolverCache,
    EXAM_SOLVER_CACHE_KEY,
    EXAM_SOLVER_CACHE_TTL_MS,
    isExpiredCache,
    loadExamSolverCache,
    parseExamSolverCache,
    saveExamSolverCache,
    type ExamSolverCache,
} from '../cache';

const buildValidCache = (): ExamSolverCache => ({
    timestamp: Date.now(),
    step: 'review',
    extractedQuestions: ['Q1', 'Q2'],
    selectedQuestions: [0, 1],
    deckMode: 'new',
    deckTitle: 'Deck Test',
    selectedDeckId: '',
    selectedExamId: 'exam-1',
    generatedFlashcards: [
        {
            id: 'c-1',
            front: 'Domanda',
            back: 'Risposta',
            found: true,
            confidence: 93,
        },
    ],
});

describe('exam solver cache utils', () => {
    it('parses a valid cache payload', () => {
        const parsed = parseExamSolverCache(buildValidCache());
        expect(parsed).not.toBeNull();
        expect(parsed?.step).toBe('review');
        expect(parsed?.selectedQuestions).toEqual([0, 1]);
    });

    it('rejects invalid cache payloads', () => {
        expect(parseExamSolverCache({})).toBeNull();
        expect(parseExamSolverCache({ timestamp: Date.now(), step: 'invalid', deckMode: 'new' })).toBeNull();
        expect(parseExamSolverCache({ timestamp: Date.now(), step: 'upload', deckMode: 'wrong' })).toBeNull();
    });

    it('filters invalid flashcards while parsing', () => {
        const parsed = parseExamSolverCache({
            ...buildValidCache(),
            generatedFlashcards: [
                { id: 'ok', front: 'f', back: 'b', found: true, confidence: 10 },
                { id: 'bad', front: 10, back: 'b', found: true, confidence: 10 },
            ],
        });

        expect(parsed?.generatedFlashcards).toHaveLength(1);
        expect(parsed?.generatedFlashcards?.[0].id).toBe('ok');
    });

    it('detects expired cache by ttl', () => {
        const now = 1_000_000;
        expect(isExpiredCache({ timestamp: now - EXAM_SOLVER_CACHE_TTL_MS - 1 }, now)).toBe(true);
        expect(isExpiredCache({ timestamp: now - 1_000 }, now)).toBe(false);
    });

    it('saves and loads cache using storage', () => {
        const storage = window.localStorage;
        storage.clear();
        const cache = buildValidCache();
        saveExamSolverCache(cache, storage);

        const loaded = loadExamSolverCache(storage, cache.timestamp + 5_000);
        expect(loaded).toEqual(cache);
    });

    it('drops expired cache from storage when loading', () => {
        const storage = window.localStorage;
        storage.clear();

        const expired = {
            ...buildValidCache(),
            timestamp: Date.now() - EXAM_SOLVER_CACHE_TTL_MS - 60_000,
        };
        storage.setItem(EXAM_SOLVER_CACHE_KEY, JSON.stringify(expired));

        const loaded = loadExamSolverCache(storage, Date.now());
        expect(loaded).toBeNull();
        expect(storage.getItem(EXAM_SOLVER_CACHE_KEY)).toBeNull();
    });

    it('removes invalid json cache', () => {
        const storage = window.localStorage;
        storage.clear();
        storage.setItem(EXAM_SOLVER_CACHE_KEY, '{not-json');

        const loaded = loadExamSolverCache(storage);
        expect(loaded).toBeNull();
        expect(storage.getItem(EXAM_SOLVER_CACHE_KEY)).toBeNull();
    });

    it('clears cache explicitly', () => {
        const storage = window.localStorage;
        storage.clear();
        storage.setItem(EXAM_SOLVER_CACHE_KEY, JSON.stringify(buildValidCache()));

        clearExamSolverCache(storage);
        expect(storage.getItem(EXAM_SOLVER_CACHE_KEY)).toBeNull();
    });

    it('works with custom in-memory storage implementation', () => {
        const removeItem = vi.fn();
        const setItem = vi.fn();
        const getItem = vi.fn().mockReturnValue(null);
        const storage = { getItem, setItem, removeItem };

        saveExamSolverCache(buildValidCache(), storage);
        loadExamSolverCache(storage);
        clearExamSolverCache(storage);

        expect(setItem).toHaveBeenCalledTimes(1);
        expect(getItem).toHaveBeenCalledTimes(1);
        expect(removeItem).toHaveBeenCalledTimes(1);
    });
});

