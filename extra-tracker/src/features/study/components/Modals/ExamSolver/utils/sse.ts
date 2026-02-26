import type { ExamSolverStats, FlashcardWithId } from '../ExamSolverModal.types';

type RecordLike = Record<string, unknown>;

export interface ParsedSseMessage {
    eventType: string;
    dataRaw: string;
}

export type ExamSolverStreamEvent =
    | {
        kind: 'progress';
        current: number;
        total: number;
        question: string;
    }
    | {
        kind: 'flashcard';
        flashcard: FlashcardWithId;
        index?: number;
        total?: number;
    }
    | {
        kind: 'complete';
        stats?: ExamSolverStats;
        deckId: string;
        deckPdfUrl: string | null;
        flashcards: FlashcardWithId[];
    }
    | {
        kind: 'error';
        message: string;
    };

const isRecord = (value: unknown): value is RecordLike =>
    typeof value === 'object' && value !== null;

const asString = (value: unknown, fallback = ''): string =>
    typeof value === 'string' ? value : fallback;

const asPositiveInt = (value: unknown, fallback = 0): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    return Math.max(0, Math.round(value));
};

const asOptionalInt = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;

const parseFlashcard = (value: unknown): FlashcardWithId | null => {
    if (!isRecord(value)) return null;
    if (typeof value.front !== 'string' || typeof value.back !== 'string') {
        return null;
    }
    const front = value.front;
    const back = value.back;

    return {
        id: typeof value.id === 'string' && value.id.length > 0
            ? value.id
            : `temp-${Date.now()}-${Math.random()}`,
        front,
        back,
        found: typeof value.found === 'boolean' ? value.found : Boolean(back),
        confidence: typeof value.confidence === 'number' && Number.isFinite(value.confidence)
            ? value.confidence
            : 0,
        sourceSnippet: typeof value.sourceSnippet === 'string' ? value.sourceSnippet : undefined,
        pageNumber: typeof value.pageNumber === 'number' && Number.isFinite(value.pageNumber)
            ? value.pageNumber
            : undefined,
    };
};

const parseFlashcards = (value: unknown): FlashcardWithId[] => {
    if (!Array.isArray(value)) return [];
    return value.map(parseFlashcard).filter((card): card is FlashcardWithId => card !== null);
};

const parseStats = (value: unknown): ExamSolverStats | undefined => {
    if (!isRecord(value)) return undefined;
    return {
        questionsExtracted: asPositiveInt(value.questionsExtracted),
        answersFound: asPositiveInt(value.answersFound),
        answersNotFound: asPositiveInt(value.answersNotFound),
        totalFlashcards: asPositiveInt(value.totalFlashcards),
        processingTimeMs: asPositiveInt(value.processingTimeMs),
    };
};

export const splitSseBuffer = (buffer: string): { events: string[]; rest: string } => {
    const events = buffer.split('\n\n');
    return {
        events: events.slice(0, -1),
        rest: events.at(-1) || '',
    };
};

export const parseSseMessageBlock = (message: string): ParsedSseMessage | null => {
    if (!message.trim()) return null;

    let eventType = 'message';
    const dataLines: string[] = [];

    for (const line of message.split('\n')) {
        if (line.startsWith('event: ')) {
            eventType = line.substring(7).trim();
        } else if (line.startsWith('data: ')) {
            dataLines.push(line.substring(6));
        }
    }

    if (dataLines.length === 0) return null;

    return {
        eventType,
        dataRaw: dataLines.join('\n').trim(),
    };
};

export const parseExamSolverEvent = (
    eventType: string,
    payload: unknown
): ExamSolverStreamEvent | null => {
    if (!isRecord(payload)) return null;

    const payloadType = typeof payload.type === 'string' ? payload.type : eventType;

    if (payloadType === 'progress') {
        return {
            kind: 'progress',
            current: asPositiveInt(payload.current),
            total: asPositiveInt(payload.total),
            question: asString(payload.question),
        };
    }

    if (payloadType === 'flashcard') {
        const flashcard = parseFlashcard(payload.flashcard);
        if (!flashcard) return null;
        return {
            kind: 'flashcard',
            flashcard,
            index: asOptionalInt(payload.index),
            total: asOptionalInt(payload.total),
        };
    }

    if (payloadType === 'complete') {
        const deck = isRecord(payload.deck) ? payload.deck : null;
        return {
            kind: 'complete',
            stats: parseStats(payload.stats),
            deckId: deck && typeof deck.id === 'string' ? deck.id : '',
            deckPdfUrl: deck && typeof deck.pdfUrl === 'string' ? deck.pdfUrl : null,
            flashcards: parseFlashcards(payload.flashcards),
        };
    }

    if (payloadType === 'error') {
        return {
            kind: 'error',
            message: asString(payload.message, 'Errore durante la generazione'),
        };
    }

    return null;
};

export const parseSseJsonPayload = (dataRaw: string): unknown | null => {
    try {
        return JSON.parse(dataRaw);
    } catch {
        return null;
    }
};
