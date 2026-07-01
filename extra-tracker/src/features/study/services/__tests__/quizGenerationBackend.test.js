/* @vitest-environment node */
import { describe, it, expect, vi, afterEach } from 'vitest';
import sessionQuizService from '../../../../../server/services/study/sessionQuizService.js';
import quizGenerationModule from '../../../../../server/services/study/QuizGenerationService.js';
import constants from '../../../../../server/services/study/constants.js';
import chunking from '../../../../../server/services/study/trueFalseChunking.js';

const { QuizGenerationService } = quizGenerationModule;
const { QUIZ_FAST_PATH_MAX_QUESTIONS, QUIZ_FAST_PATH_TEXT_BUDGET } = constants;
const { buildChunkQuestionCounts } = chunking;

describe('quiz generation backend orchestration', () => {
    const originalGenerateQuizFromPDFText = sessionQuizService.generateQuizFromPDFText;

    afterEach(() => {
        sessionQuizService.generateQuizFromPDFText = originalGenerateQuizFromPDFText;
        vi.restoreAllMocks();
    });

    it('never lets async job chunks exceed the configured max length', () => {
        const service = new QuizGenerationService();
        const textWithLateSentenceBreak = `${'MapStruct '.repeat(7100)}. ${'tail '.repeat(120)}`;

        const chunks = service._splitTextIntoChunks(textWithLateSentenceBreak, 5000, 500);
        const maxChunkLength = Math.max(...chunks.map((chunk) => chunk.length));

        expect(chunks.length).toBeGreaterThan(10);
        expect(maxChunkLength).toBeLessThanOrEqual(5000);
    });

    it('generates multiple-choice questions from full PDF text without reading released text', async () => {
        sessionQuizService.generateQuizFromPDFText = vi.fn(async (_chunk, count) => (
            Array.from({ length: count }, (_, index) => ({
                questionText: `Domanda ${index + 1}`,
                correctAnswer: `Risposta ${index + 1}`,
                distractors: ['A', 'B', 'C'],
                explanations: ['x', 'y', 'z'],
                correctAnswerExplanation: 'Spiegazione',
                difficulty: 'standard',
            }))
        ));

        const questions = await sessionQuizService.generateQuizFromFullPDF(
            'Questo e un testo PDF sufficientemente lungo per il test. '.repeat(20),
            4,
        );

        expect(questions).toHaveLength(4);
        expect(sessionQuizService.generateQuizFromPDFText).toHaveBeenCalledTimes(1);
    });

    it('keeps async chunk question counts exact and persists the completed quiz result', async () => {
        const service = new QuizGenerationService();
        service._splitTextIntoChunks = () => ['chunk 1', 'chunk 2', 'chunk 3'];
        const questionCount = QUIZ_FAST_PATH_MAX_QUESTIONS + 3;

        const { jobId } = service.createJob('user-1', {
            deckId: 'deck-1',
            quizType: 'multiple_choice',
            questionCount,
            source: 'chapter',
            name: 'Quiz test',
        });
        const requestedCounts = [];

        await service.processJob(
            'user-1',
            jobId,
            async (_chunkText, count, _seen, chunkTelemetry) => {
                requestedCounts.push(count);
                const chunkId = chunkTelemetry?.chunkIndex ?? requestedCounts.length;
                return Array.from({ length: count }, (_, index) => ({
                    questionText: `Q${chunkId}-${count}-${index}`,
                }));
            },
            {
                extractedText: 'testo disponibile',
                deckId: 'deck-1',
                questionCount,
                previousQuestions: [],
                telemetry: {},
                persistFn: async (_unused, questions) => ({
                    quiz: { id: 'quiz-1', questionCount: questions.length },
                    session: { cards: questions },
                }),
            },
        );

        const status = service.getJobStatus('user-1', jobId);
        expect(requestedCounts).toEqual(buildChunkQuestionCounts(3, questionCount));
        expect(status?.status).toBe('completed');
        expect(status?.result?.quiz).toEqual({ id: 'quiz-1', questionCount });
    });

    it('processes async quiz chunks with bounded concurrency', async () => {
        const service = new QuizGenerationService();
        service._splitTextIntoChunks = () => ['chunk 1', 'chunk 2', 'chunk 3', 'chunk 4'];
        const questionCount = QUIZ_FAST_PATH_MAX_QUESTIONS + 12;

        const { jobId } = service.createJob('user-2', {
            deckId: 'deck-1',
            quizType: 'multiple_choice',
            questionCount,
            source: 'chapter',
            name: 'Quiz veloce',
        });
        let activeChunks = 0;
        let maxActiveChunks = 0;

        await service.processJob(
            'user-2',
            jobId,
            async (_chunkText, count, _seen, chunkTelemetry) => {
                activeChunks++;
                maxActiveChunks = Math.max(maxActiveChunks, activeChunks);
                await new Promise((resolve) => setTimeout(resolve, 20));
                activeChunks--;
                const chunkId = chunkTelemetry?.chunkIndex ?? 0;
                return Array.from({ length: count }, (_, index) => ({
                    questionText: `Q${chunkId}-${count}-${index}`,
                }));
            },
            {
                extractedText: 'testo disponibile',
                deckId: 'deck-1',
                questionCount,
                previousQuestions: [],
                telemetry: {},
                persistFn: async (_unused, questions) => ({
                    quiz: { id: 'quiz-2', questionCount: questions.length },
                    session: { cards: questions },
                }),
            },
        );

        const status = service.getJobStatus('user-2', jobId);
        // Concurrency default alzata a 4: i 4 chunk girano tutti nello stesso batch.
        expect(maxActiveChunks).toBe(constants.QUIZ_CHUNK_CONCURRENCY);
        expect(maxActiveChunks).toBeLessThanOrEqual(4);
        expect(status?.result?.quiz).toEqual({ id: 'quiz-2', questionCount });
    });

    it('splits small async PDF quizzes into parallel representative AI requests', async () => {
        const service = new QuizGenerationService();
        const longText = [
            'Sezione iniziale su architettura software e mappature DTO.',
            ...Array.from({ length: 2500 }, (_, index) => (
                `Sezione ${index}: MapStruct genera mapper a compile time, evita reflection runtime e rende gli errori visibili prima del rilascio.`
            )),
            'Sezione finale su test, osservabilita e manutenzione del codice.',
        ].join('\n');
        const requestedCalls = [];

        const { jobId } = service.createJob('user-3', {
            deckId: 'deck-1',
            quizType: 'multiple_choice',
            questionCount: 10,
            source: 'chapter',
            name: 'Quiz rapido',
        });

        await service.processJob(
            'user-3',
            jobId,
            async (chunkText, count) => {
                const callIndex = requestedCalls.length;
                requestedCalls.push({ chunkText, count });
                return Array.from({ length: count }, (_, index) => ({
                    questionText: `Q fast ${callIndex}-${index}`,
                }));
            },
            {
                extractedText: longText,
                deckId: 'deck-1',
                questionCount: 10,
                previousQuestions: [],
                telemetry: {},
                persistFn: async (_unused, questions) => ({
                    quiz: { id: 'quiz-3', questionCount: questions.length },
                    session: { cards: questions },
                }),
            },
        );

        const status = service.getJobStatus('user-3', jobId);
        // Fast path parallelo: 10 domande, task-size 5 → 2 chiamate AI parallele.
        const expectedTasks = Math.ceil(10 / constants.QUIZ_FAST_PATH_TASK_SIZE);
        expect(requestedCalls).toHaveLength(expectedTasks);
        // La somma delle domande richieste ai task deve fare esattamente 10.
        const totalRequested = requestedCalls.reduce((sum, call) => sum + call.count, 0);
        expect(totalRequested).toBe(10);
        for (const call of requestedCalls) {
            expect(call.chunkText.length).toBeLessThanOrEqual(QUIZ_FAST_PATH_TEXT_BUDGET);
        }
        expect(status?.result?.quiz).toEqual({ id: 'quiz-3', questionCount: 10 });
    });
});
