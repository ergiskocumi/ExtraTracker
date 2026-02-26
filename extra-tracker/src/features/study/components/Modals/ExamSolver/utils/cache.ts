import type { FlashcardWithId, Step } from '../ExamSolverModal.types';

export const EXAM_SOLVER_CACHE_KEY = 'examSolverCache';
export const EXAM_SOLVER_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface ExamSolverCache {
    timestamp: number;
    step: Step;
    questionsFileName?: string;
    questionsFileSize?: number;
    sourceFileName?: string;
    sourceFileSize?: number;
    extractedQuestions: string[];
    selectedQuestions: number[];
    deckMode: 'new' | 'existing';
    deckTitle: string;
    selectedDeckId: string;
    selectedExamId: string;
    generatedFlashcards?: FlashcardWithId[];
    createdDeckId?: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const toStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const toNumberArray = (value: unknown): number[] =>
    Array.isArray(value)
        ? value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
        : [];

const toOptionalString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.length > 0 ? value : undefined;

const toOptionalPositiveNumber = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;

export const isExpiredCache = (
    cache: Pick<ExamSolverCache, 'timestamp'>,
    now: number = Date.now(),
    ttlMs: number = EXAM_SOLVER_CACHE_TTL_MS
): boolean => now - cache.timestamp > ttlMs;

export const parseExamSolverCache = (value: unknown): ExamSolverCache | null => {
    if (!isRecord(value)) return null;

    const timestamp = typeof value.timestamp === 'number' ? value.timestamp : NaN;
    const step = value.step;
    const deckMode = value.deckMode;

    if (!Number.isFinite(timestamp)) return null;
    if (
        step !== 'upload'
        && step !== 'preview'
        && step !== 'config'
        && step !== 'progress'
        && step !== 'review'
        && step !== 'completed'
    ) {
        return null;
    }
    if (deckMode !== 'new' && deckMode !== 'existing') return null;

    const rawFlashcards = Array.isArray(value.generatedFlashcards)
        ? value.generatedFlashcards
        : undefined;

    const generatedFlashcards = rawFlashcards
        ?.filter((card): card is FlashcardWithId => {
            if (!isRecord(card)) return false;
            return typeof card.id === 'string'
                && typeof card.front === 'string'
                && typeof card.back === 'string'
                && typeof card.found === 'boolean'
                && typeof card.confidence === 'number'
                && Number.isFinite(card.confidence);
        });

    return {
        timestamp,
        step,
        questionsFileName: toOptionalString(value.questionsFileName),
        questionsFileSize: toOptionalPositiveNumber(value.questionsFileSize),
        sourceFileName: toOptionalString(value.sourceFileName),
        sourceFileSize: toOptionalPositiveNumber(value.sourceFileSize),
        extractedQuestions: toStringArray(value.extractedQuestions),
        selectedQuestions: toNumberArray(value.selectedQuestions),
        deckMode,
        deckTitle: typeof value.deckTitle === 'string' ? value.deckTitle : '',
        selectedDeckId: typeof value.selectedDeckId === 'string' ? value.selectedDeckId : '',
        selectedExamId: typeof value.selectedExamId === 'string' ? value.selectedExamId : '',
        generatedFlashcards,
        createdDeckId: toOptionalString(value.createdDeckId),
    };
};

export const loadExamSolverCache = (
    storage: StorageLike = localStorage,
    now: number = Date.now(),
    ttlMs: number = EXAM_SOLVER_CACHE_TTL_MS
): ExamSolverCache | null => {
    const raw = storage.getItem(EXAM_SOLVER_CACHE_KEY);
    if (!raw) return null;

    try {
        const parsed = parseExamSolverCache(JSON.parse(raw));
        if (!parsed || isExpiredCache(parsed, now, ttlMs)) {
            storage.removeItem(EXAM_SOLVER_CACHE_KEY);
            return null;
        }
        return parsed;
    } catch {
        storage.removeItem(EXAM_SOLVER_CACHE_KEY);
        return null;
    }
};

export const saveExamSolverCache = (
    cache: ExamSolverCache,
    storage: StorageLike = localStorage
): void => {
    storage.setItem(EXAM_SOLVER_CACHE_KEY, JSON.stringify(cache));
};

export const clearExamSolverCache = (storage: StorageLike = localStorage): void => {
    storage.removeItem(EXAM_SOLVER_CACHE_KEY);
};

