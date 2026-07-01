/* @vitest-environment node */
import { describe, it, expect } from 'vitest';
import parser from '../../../../../server/services/study/quizJsonParser.js';

const { parseQuizArrayResponse, collectCompleteObjects } = parser;

describe('quizJsonParser', () => {
    it('parses well-formed JSON directly without recovery', () => {
        const content = JSON.stringify({
            questions: [
                { questionText: 'Q1', correctAnswer: 'A1' },
                { questionText: 'Q2', correctAnswer: 'A2' },
            ],
        });

        const { items, recovered } = parseQuizArrayResponse(content, 'questions');
        expect(recovered).toBe(false);
        expect(items).toHaveLength(2);
        expect(items[0].questionText).toBe('Q1');
    });

    it('strips markdown code fences before parsing', () => {
        const content = '```json\n{"statements":[{"statement":"S1","isTrue":true}]}\n```';
        const { items } = parseQuizArrayResponse(content, 'statements');
        expect(items).toHaveLength(1);
        expect(items[0].statement).toBe('S1');
    });

    it('recovers complete objects from JSON truncated mid-object', () => {
        // Simula la risposta reale dai log: 2 domande complete + una tagliata a metà.
        const content = `{
  "questions": [
    { "questionText": "Q1 completa?", "correctAnswer": "Risposta 1", "distractors": ["a","b","c"] },
    { "questionText": "Q2 completa?", "correctAnswer": "Risposta 2", "distractors": ["a","b","c"] },
    { "questionText": "Q3 tagliata a met`;

        const { items, recovered } = parseQuizArrayResponse(content, 'questions');
        expect(recovered).toBe(true);
        expect(items).toHaveLength(2);
        expect(items[1].correctAnswer).toBe('Risposta 2');
    });

    it('handles truncation where a string contains braces and quotes', () => {
        const content = `{"questions":[{"questionText":"Quanto fa {a+b}?","correctAnswer":"Dipende \\"dai\\" valori"},{"questionText":"tronc`;
        const { items, recovered } = parseQuizArrayResponse(content, 'questions');
        expect(recovered).toBe(true);
        expect(items).toHaveLength(1);
        expect(items[0].questionText).toBe('Quanto fa {a+b}?');
    });

    it('returns empty when no array content is present', () => {
        const { items, recovered } = parseQuizArrayResponse('not json at all', 'questions');
        expect(items).toHaveLength(0);
        expect(recovered).toBe(false);
    });

    it('returns empty for null/empty input', () => {
        expect(parseQuizArrayResponse('', 'questions').items).toHaveLength(0);
        expect(parseQuizArrayResponse(null, 'questions').items).toHaveLength(0);
    });

    it('collectCompleteObjects ignores a trailing incomplete object', () => {
        const inner = '{"a":1},{"b":2},{"c":';
        const objects = collectCompleteObjects(inner);
        expect(objects).toEqual([{ a: 1 }, { b: 2 }]);
    });
});
