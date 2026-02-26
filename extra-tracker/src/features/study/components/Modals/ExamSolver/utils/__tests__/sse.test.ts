import { describe, expect, it, vi } from 'vitest';
import {
    parseExamSolverEvent,
    parseSseJsonPayload,
    parseSseMessageBlock,
    splitSseBuffer,
} from '../sse';

describe('exam solver sse utils', () => {
    it('splits complete events and keeps trailing partial buffer', () => {
        const { events, rest } = splitSseBuffer('event: progress\ndata: {"current":1}\n\nincomplete');
        expect(events).toEqual(['event: progress\ndata: {"current":1}']);
        expect(rest).toBe('incomplete');
    });

    it('parses sse message block with default event type', () => {
        const parsed = parseSseMessageBlock('data: {"type":"progress","current":1,"total":2}');
        expect(parsed).toEqual({
            eventType: 'message',
            dataRaw: '{"type":"progress","current":1,"total":2}',
        });
    });

    it('parses sse block with explicit event and multiple data lines', () => {
        const parsed = parseSseMessageBlock('event: complete\ndata: {"type":"complete",\ndata: "flashcards": []}');
        expect(parsed?.eventType).toBe('complete');
        expect(parsed?.dataRaw).toContain('"type":"complete"');
    });

    it('returns null for empty or invalid blocks', () => {
        expect(parseSseMessageBlock('')).toBeNull();
        expect(parseSseMessageBlock('event: progress')).toBeNull();
    });

    it('parses valid json and rejects invalid json payloads', () => {
        expect(parseSseJsonPayload('{"ok":true}')).toEqual({ ok: true });
        expect(parseSseJsonPayload('{broken')).toBeNull();
    });

    it('parses progress events from payload type or event type', () => {
        expect(parseExamSolverEvent('message', { type: 'progress', current: 2, total: 5, question: 'Q?' })).toEqual({
            kind: 'progress',
            current: 2,
            total: 5,
            question: 'Q?',
        });

        expect(parseExamSolverEvent('progress', { current: 3, total: 7 })).toEqual({
            kind: 'progress',
            current: 3,
            total: 7,
            question: '',
        });
    });

    it('parses flashcard event and creates temp id when missing', () => {
        vi.spyOn(Date, 'now').mockReturnValue(12345);
        vi.spyOn(Math, 'random').mockReturnValue(0.55);

        const parsed = parseExamSolverEvent('flashcard', {
            flashcard: { front: 'Q', back: 'A', found: true },
            index: 4,
            total: 10,
        });

        expect(parsed).toMatchObject({
            kind: 'flashcard',
            index: 4,
            total: 10,
            flashcard: {
                front: 'Q',
                back: 'A',
                found: true,
                confidence: 0,
            },
        });
        if (parsed?.kind === 'flashcard') {
            expect(parsed.flashcard.id).toContain('temp-12345');
        }
    });

    it('ignores invalid flashcard payloads', () => {
        expect(parseExamSolverEvent('flashcard', { flashcard: { front: 10 } })).toBeNull();
    });

    it('parses complete event with deck and stats', () => {
        const parsed = parseExamSolverEvent('complete', {
            type: 'complete',
            deck: { id: 'deck-1', pdfUrl: '/uploads/a.pdf' },
            stats: {
                questionsExtracted: 10,
                answersFound: 8,
                answersNotFound: 2,
                totalFlashcards: 10,
                processingTimeMs: 5000,
            },
            flashcards: [
                { id: 'c1', front: 'Q1', back: 'A1', found: true, confidence: 88 },
                { id: 'bad', front: 4, back: 'A2', found: false, confidence: 10 },
            ],
        });

        expect(parsed).toEqual({
            kind: 'complete',
            deckId: 'deck-1',
            deckPdfUrl: '/uploads/a.pdf',
            stats: {
                questionsExtracted: 10,
                answersFound: 8,
                answersNotFound: 2,
                totalFlashcards: 10,
                processingTimeMs: 5000,
            },
            flashcards: [
                { id: 'c1', front: 'Q1', back: 'A1', found: true, confidence: 88 },
            ],
        });
    });

    it('parses error event with fallback message', () => {
        expect(parseExamSolverEvent('error', { message: 'boom' })).toEqual({
            kind: 'error',
            message: 'boom',
        });

        expect(parseExamSolverEvent('error', {})).toEqual({
            kind: 'error',
            message: 'Errore durante la generazione',
        });
    });

    it('returns null for unsupported payloads', () => {
        expect(parseExamSolverEvent('unknown', { type: 'something-else' })).toBeNull();
        expect(parseExamSolverEvent('progress', null)).toBeNull();
    });
});

