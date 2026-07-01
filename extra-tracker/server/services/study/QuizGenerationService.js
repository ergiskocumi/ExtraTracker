/**
 * 🧠 QuizGenerationService — Async Job Manager
 * =============================================
 * Decouples AI quiz generation from HTTP request-response cycle.
 * Jobs are tracked in-memory with SSE progress events.
 */

const crypto = require('crypto');
const sseManager = require('../../utils/SSEManager');
const logger = require('../../utils/logger');

const {
    CHUNK_MAX_RETRIES,
    CHUNK_RETRY_BASE_DELAY_MS,
    CHUNK_CIRCUIT_BREAKER_THRESHOLD,
    QUIZ_CHUNK_CONCURRENCY,
    QUIZ_CHUNK_BATCH_DELAY_MS,
} = require('./constants');
const { buildChunkQuestionCounts } = require('./trueFalseChunking');
const {
    shouldUseQuizFastPath,
    computeFastPathTaskCount,
    buildFastPathTaskTexts,
} = require('./quizTextSelection');

// =========================================
// JOB STORE
// =========================================
const userJobs = new Map(); // Map<userId, Map<jobId, JobState>>

// =========================================
// TTL & CLEANUP
// =========================================
const JOB_TTL_COMPLETED_MS = 5 * 60 * 1000;  // 5 min after completion
const JOB_TTL_FAILED_MS = 2 * 60 * 1000;      // 2 min after failure
const JOB_TTL_ORPHANED_MS = 30 * 60 * 1000;   // 30 min max lifetime
const CLEANUP_INTERVAL_MS = 60 * 1000;        // run cleanup every 60s

// =========================================
// CONCURRENCY LIMIT (prevents OOM from N simultaneous jobs)
// =========================================
const MAX_CONCURRENT_JOBS = 2;
let activeJobCount = 0;
const jobQueue = []; // queue of resolve() callbacks for waiting jobs

// =========================================
// SLEEP UTILITY
// =========================================
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// =========================================
// DEDUP UTILITY
// =========================================
/**
 * Rimuove domande duplicate confrontando il questionText normalizzato.
 * Serve perché i task fast-path girano in parallelo e non si vedono tra loro.
 */
function dedupeQuestions(questions) {
    if (!Array.isArray(questions)) return [];
    const seen = new Set();
    const result = [];
    for (const question of questions) {
        const text = typeof question?.questionText === 'string' ? question.questionText : '';
        const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        result.push(question);
    }
    return result;
}

// =========================================
// JOB ID GENERATION
// =========================================
function generateJobId() {
    return `quiz_${crypto.randomBytes(8).toString('hex')}`;
}

// =========================================
// SSE EVENT EMITTERS
// =========================================

function emitProgress(userId, jobId, event, payload = {}) {
    const eventType = `quiz.generation.${event}`;
    sseManager.sendToUser(userId, eventType, { jobId, ...payload });
}

function hasSseConnection(userId) {
    const key = sseManager._normalizeUserId(userId);
    if (!key) return false;
    const client = sseManager.clients.get(key);
    return client && !client.writableEnded;
}

// =========================================
// JOB MANAGER
// =========================================

class QuizGenerationService {
    /**
     * Get or create the job map for a user.
     */
    _getUserJobs(userId) {
        const key = String(userId);
        if (!userJobs.has(key)) {
            userJobs.set(key, new Map());
        }
        return userJobs.get(key);
    }

    /**
     * Create a new generation job.
     * Returns { jobId } immediately — processing happens async.
     */
    createJob(userId, params) {
        const jobs = this._getUserJobs(userId);
        const jobId = generateJobId();

        const job = {
            jobId,
            userId: String(userId),
            deckId: params.deckId,
            status: 'pending',
            chunks: [],
            totalChunks: 0,
            completedChunks: 0,
            failedChunks: 0,
            questions: [],
            error: null,
            partialResult: false,
            startedAt: null,
            completedAt: null,
            estimatedSeconds: params.estimatedSeconds || 60,
            config: {
                quizType: params.quizType,
                questionCount: params.questionCount,
                source: params.source,
                name: params.name,
            },
        };

        jobs.set(jobId, job);
        logger.info('QuizGeneration', `Job created: ${jobId}`, {
            userId: String(userId),
            deckId: params.deckId,
            questionCount: params.questionCount,
        });

        return { jobId, job };
    }

    /**
     * Get job state. Returns null if not found.
     */
    getJob(userId, jobId) {
        const jobs = this._getUserJobs(userId);
        return jobs.get(jobId) || null;
    }

    /**
     * Get job status for API response.
     */
    getJobStatus(userId, jobId) {
        const job = this.getJob(userId, jobId);
        if (!job) return null;

        return {
            jobId: job.jobId,
            status: job.status,
            totalChunks: job.totalChunks,
            completedChunks: job.completedChunks,
            failedChunks: job.failedChunks,
            partialResult: job.partialResult,
            error: job.error,
            estimatedSeconds: job.estimatedSeconds,
            elapsedSeconds: job.startedAt
                ? Math.round((Date.now() - job.startedAt.getTime()) / 1000)
                : 0,
            chunks: job.chunks.map((c) => ({
                index: c.index,
                status: c.status,
                retries: c.retries || 0,
            })),
            config: job.config,
            result: job.status === 'completed' ? job.result : null,
        };
    }

    /**
     * Process a job asynchronously. This is the main orchestrator.
     *
     * @param {string} userId
     * @param {string} jobId
     * @param {Function} processChunkFn — async (chunkText, questionCount, context) => questions[]
     * @param {object} context — { deckId, questionCount, previousQuestions, telemetry, persistFn }
     */
    async processJob(userId, jobId, processChunkFn, context) {
        const job = this.getJob(userId, jobId);
        if (!job) {
            logger.error('QuizGeneration', `Job not found: ${jobId}`);
            return;
        }

        job.status = 'processing';
        job.startedAt = new Date();

        const { deckId, questionCount, previousQuestions, telemetry, persistFn } = context;

        // Usa extractedText dal controller se disponibile, altrimenti carica da DB
        let extractedText = context.extractedText || '';
        if (!extractedText) {
            try {
                const DeckModel = require('../../models/Deck');
                const deckDoc = await DeckModel.findOne(
                    { _id: deckId, user: userId },
                    { extractedText: 1 },
                ).lean();
                extractedText = typeof deckDoc?.extractedText === 'string' ? deckDoc.extractedText.trim() : '';
            } catch (err) {
                logger.error('QuizGeneration', `Failed to load extractedText for job ${jobId}`, { error: err.message });
            }
        }

        if (!extractedText) {
            job.status = 'failed';
            job.error = 'Testo PDF non disponibile';
            job.completedAt = new Date();
            emitProgress(userId, jobId, 'error', { error: { message: job.error, code: 'NO_TEXT' } });
            return;
        }

        // --- Concurrency gate: prevent N simultaneous jobs from multiplying memory ---
        if (activeJobCount >= MAX_CONCURRENT_JOBS) {
            logger.info('QuizGeneration', `Job ${jobId} queued (${jobQueue.length + 1} waiting, ${activeJobCount} active)`);
            await new Promise((resolve) => jobQueue.push(resolve));
        }
        activeJobCount++;

        try {
            const safeQuestionCount = Math.max(1, Math.floor(Number(questionCount) || 0));
            const fastPath = shouldUseQuizFastPath(safeQuestionCount);
            // --- Split text into chunks, or use one representative AI call for small quizzes ---
            const chunks = this._buildGenerationChunks(extractedText, safeQuestionCount);
            // Salva versione troncata per persistenza (non serve il testo intero)
            const generatedFromText = extractedText.length > 5000
                ? extractedText.substring(0, 5000) + '...'
                : extractedText;
            // FREE extractedText — non serve più, i chunk sono substring
            extractedText = '';

            if (chunks.length === 0) {
                throw new Error('Testo PDF non valido o vuoto');
            }

            job.totalChunks = chunks.length;

            const counts = buildChunkQuestionCounts(chunks.length, safeQuestionCount);

            job.chunks = counts.map((countForChunk, index) => ({
                index,
                status: countForChunk === 0 ? 'skipped' : 'pending',
                retries: 0,
                questions: 0,
            }));
            job.completedChunks = counts.filter((countForChunk) => countForChunk === 0).length;

            logger.info('QuizGeneration', `▶️  Job ${jobId} avviato: ${safeQuestionCount} domande (${job.config.quizType}) in ${chunks.length} parti parallele`, {
                domandeTotali: safeQuestionCount,
                domandePerParte: counts.filter((c) => c > 0),
                partiParallele: chunks.length,
                concorrenza: QUIZ_CHUNK_CONCURRENCY,
                fastPath,
            });

            emitProgress(userId, jobId, 'started', {
                totalChunks: chunks.length,
                estimatedSeconds: job.estimatedSeconds,
                questionCount: safeQuestionCount,
                quizType: job.config.quizType,
                completedChunks: job.completedChunks,
                concurrency: QUIZ_CHUNK_CONCURRENCY,
                fastPath,
            });

            // --- Process chunks in small batches ---
            let allQuestions = [];
            const questionsByChunk = new Map();
            let totalFailed = 0;
            let processedChunks = 0;
            let shouldStop = false;
            const processableChunkIndexes = counts
                .map((countForChunk, index) => ({ countForChunk, index }))
                .filter(({ countForChunk }) => countForChunk > 0)
                .map(({ index }) => index);

            const processChunkWithRetry = async (chunkIndex, seenQuestions) => {
                const countForChunk = counts[chunkIndex];
                const chunkState = job.chunks[chunkIndex];
                chunkState.status = 'processing';

                emitProgress(userId, jobId, 'chunk_progress', {
                    chunkIndex: chunkIndex + 1,
                    totalChunks: chunks.length,
                    status: 'processing',
                });

                let chunkQuestions = [];

                for (let retry = 0; retry <= CHUNK_MAX_RETRIES; retry++) {
                    if (retry > 0) {
                        chunkState.retries = retry;
                        const delay = CHUNK_RETRY_BASE_DELAY_MS * Math.pow(2, retry - 1);
                        emitProgress(userId, jobId, 'chunk_retry', {
                            chunkIndex: chunkIndex + 1,
                            retryCount: retry,
                            maxRetries: CHUNK_MAX_RETRIES,
                        });
                        await sleep(delay);
                    }

                    try {
                        chunkQuestions = await processChunkFn(chunks[chunkIndex], countForChunk, seenQuestions, {
                            ...telemetry,
                            chunkIndex: chunkIndex + 1,
                            totalChunks: chunks.length,
                        });

                        if (Array.isArray(chunkQuestions) && chunkQuestions.length > 0) {
                            return {
                                index: chunkIndex,
                                success: true,
                                questions: chunkQuestions,
                            };
                        }
                    } catch (err) {
                        logger.warn('QuizGeneration', `Parte ${chunkIndex + 1}/${chunks.length}: tentativo ${retry + 1}/${CHUNK_MAX_RETRIES + 1} fallito`, {
                            jobId,
                            error: err.message,
                            type: err.type || err.name || 'unknown',
                            status: err.status || err.statusCode || null,
                            code: err.code || null,
                        });
                    }
                }

                return {
                    index: chunkIndex,
                    success: false,
                    questions: [],
                };
            };

            for (let batchStart = 0; batchStart < processableChunkIndexes.length && !shouldStop; batchStart += QUIZ_CHUNK_CONCURRENCY) {
                allQuestions = [...questionsByChunk.entries()]
                    .sort(([a], [b]) => a - b)
                    .flatMap(([, questions]) => questions);
                const seenQuestions = [
                    ...previousQuestions,
                    ...allQuestions.map((q) => q.questionText),
                ];
                const batchIndexes = processableChunkIndexes.slice(batchStart, batchStart + QUIZ_CHUNK_CONCURRENCY);
                const batchResults = await Promise.all(
                    batchIndexes.map((chunkIndex) => processChunkWithRetry(chunkIndex, seenQuestions)),
                );

                // Prima raccogliamo TUTTI i risultati del batch (successi inclusi),
                // poi valutiamo il circuit breaker. Altrimenti un fallimento
                // processato per primo scarterebbe i task riusciti dello stesso batch.
                for (const result of batchResults.sort((a, b) => a.index - b.index)) {
                    processedChunks++;
                    const chunkState = job.chunks[result.index];

                    if (result.success) {
                        chunkState.status = 'done';
                        chunkState.questions = result.questions.length;
                        questionsByChunk.set(result.index, result.questions);
                        job.completedChunks++;

                        emitProgress(userId, jobId, 'chunk_complete', {
                            chunkIndex: result.index + 1,
                            totalChunks: chunks.length,
                            questionsGenerated: result.questions.length,
                            completedChunks: job.completedChunks,
                            failedChunks: job.failedChunks,
                        });
                    } else {
                        chunkState.status = 'failed';
                        job.failedChunks++;
                        totalFailed++;

                        emitProgress(userId, jobId, 'chunk_progress', {
                            chunkIndex: result.index + 1,
                            totalChunks: chunks.length,
                            status: 'failed',
                            completedChunks: job.completedChunks,
                            failedChunks: job.failedChunks,
                        });
                    }
                }

                // Circuit breaker: interrompi solo se la quota di fallimenti supera
                // la soglia E non abbiamo ancora nessuna domanda utile.
                const failRatio = processedChunks > 0 ? totalFailed / processedChunks : 0;
                const hasAnyQuestions = questionsByChunk.size > 0;
                if (failRatio > CHUNK_CIRCUIT_BREAKER_THRESHOLD && !hasAnyQuestions) {
                    job.error = `Generazione interrotta: ${totalFailed} parti su ${processedChunks} non hanno prodotto domande valide.`;
                    logger.warn('QuizGeneration', `Circuit breaker attivato per job ${jobId}`, {
                        failRatio: Math.round(failRatio * 100) / 100,
                        totalFailed,
                        processedChunks,
                        hasAnyQuestions,
                    });
                    shouldStop = true;
                }

                if (!shouldStop && batchStart + QUIZ_CHUNK_CONCURRENCY < processableChunkIndexes.length && QUIZ_CHUNK_BATCH_DELAY_MS > 0) {
                    await sleep(QUIZ_CHUNK_BATCH_DELAY_MS);
                }
            }

            allQuestions = dedupeQuestions(
                [...questionsByChunk.entries()]
                    .sort(([a], [b]) => a - b)
                    .flatMap(([, questions]) => questions),
            );

            // --- Determine outcome ---
            const successRatio = chunks.length > 0 ? (chunks.length - totalFailed) / chunks.length : 0;

            if (allQuestions.length === 0) {
                // Complete failure
                job.status = 'failed';
                job.error = job.error || 'Nessuna domanda generata. Riprova.';
                job.completedAt = new Date();
                emitProgress(userId, jobId, 'error', {
                    error: { message: job.error, code: 'GENERATION_FAILED' },
                });
            } else if (successRatio < 1.0) {
                // Partial success
                job.status = 'persisting';
                job.partialResult = true;
                emitProgress(userId, jobId, 'persisting', {
                    partialResult: true,
                    totalChunks: chunks.length,
                    completedChunks: job.completedChunks,
                    failedChunks: job.failedChunks,
                    questionCount: allQuestions.length,
                });

                // Persist partial quiz
                if (persistFn) {
                    try {
                        const result = await persistFn(null, allQuestions, job.config, generatedFromText);
                        job.result = result;
                    } catch (persistErr) {
                        logger.error('QuizGeneration', `Failed to persist partial quiz for job ${jobId}`, {
                            error: persistErr.message,
                        });
                        job.status = 'failed';
                        job.error = 'Errore nel salvataggio del quiz parziale';
                        emitProgress(userId, jobId, 'error', {
                            error: { message: job.error, code: 'PERSIST_FAILED' },
                        });
                        return;
                    }
                }

                job.status = 'completed';
                job.completedAt = new Date();
                emitProgress(userId, jobId, 'complete', {
                    jobId,
                    partialResult: true,
                    totalChunks: chunks.length,
                    completedChunks: job.completedChunks,
                    failedChunks: job.failedChunks,
                    questionCount: allQuestions.length,
                    quiz: job.result?.quiz || null,
                    session: job.result?.session || null,
                });
            } else {
                // Full success
                job.status = 'persisting';
                emitProgress(userId, jobId, 'persisting', {
                    partialResult: false,
                    totalChunks: chunks.length,
                    completedChunks: job.completedChunks,
                    failedChunks: job.failedChunks,
                    questionCount: allQuestions.length,
                });

                if (persistFn) {
                    const result = await persistFn(null, allQuestions, job.config, generatedFromText);
                    job.result = result;
                }

                job.status = 'completed';
                job.completedAt = new Date();
                emitProgress(userId, jobId, 'complete', {
                    jobId,
                    partialResult: false,
                    totalChunks: chunks.length,
                    completedChunks: job.completedChunks,
                    questionCount: allQuestions.length,
                    quiz: job.result?.quiz || null,
                    session: job.result?.session || null,
                });
            }

            const durationSec = job.startedAt
                ? Math.round((Date.now() - job.startedAt.getTime()) / 100) / 10
                : null;
            const outcomeLabel = job.status === 'completed'
                ? (job.partialResult ? '✅ COMPLETATO (parziale)' : '✅ COMPLETATO')
                : '❌ FALLITO';
            logger.info('QuizGeneration', `Job ${jobId}: ${outcomeLabel} — ${allQuestions.length} domande in ${durationSec ?? '?'}s`, {
                status: job.status,
                domande: allQuestions.length,
                partiTotali: chunks.length,
                partiRiuscite: job.completedChunks,
                partiFallite: job.failedChunks,
                parziale: job.partialResult,
                fastPath,
                durataSec: durationSec,
            });
        } catch (err) {
            job.status = 'failed';
            job.error = err.message;
            job.completedAt = new Date();
            emitProgress(userId, jobId, 'error', {
                error: { message: err.message, code: 'INTERNAL_ERROR' },
            });
            logger.error('QuizGeneration', `Job failed: ${jobId}`, { error: err.message });
        } finally {
            activeJobCount--;
            if (jobQueue.length > 0) {
                const next = jobQueue.shift();
                next(); // resolve the next waiting job's promise
            }
            if (activeJobCount < 0) {
                logger.error('QuizGeneration', 'activeJobCount went negative — resetting');
                activeJobCount = 0;
            }
        }
    }

    /**
     * Split text into chunks of ~5000 chars with 500 char overlap.
     */
    _splitTextIntoChunks(text, maxLength = 5000, overlap = 500) {
        if (!text || typeof text !== 'string') return [];

        const safeMaxLength = Math.max(1000, Math.floor(Number(maxLength) || 5000));
        const safeOverlap = Math.min(
            safeMaxLength - 1,
            Math.max(0, Math.floor(Number(overlap) || 0)),
        );
        const chunks = [];
        let start = 0;

        while (start < text.length) {
            let end = Math.min(start + safeMaxLength, text.length);

            // Try to break at a sentence boundary
            if (end < text.length) {
                const searchStart = Math.max(start, end - Math.min(400, end - start));
                const searchWindow = text.slice(searchStart, end);
                const sentenceBreak = searchWindow.lastIndexOf('. ');
                const newlineBreak = searchWindow.lastIndexOf('\n');
                const spaceBreak = searchWindow.lastIndexOf(' ');
                const candidates = [
                    sentenceBreak !== -1 ? searchStart + sentenceBreak + 2 : -1,
                    newlineBreak !== -1 ? searchStart + newlineBreak + 1 : -1,
                    spaceBreak !== -1 ? searchStart + spaceBreak + 1 : -1,
                ].filter((candidate) => (
                    candidate > start + safeOverlap &&
                    candidate > start &&
                    candidate <= end
                ));
                const bestBreak = candidates.length > 0 ? Math.max(...candidates) : -1;
                if (bestBreak !== -1) {
                    end = bestBreak;
                }
            }

            // Materialize chunk: Buffer round-trip forces independent SeqString allocation,
            // breaking the SlicedString reference to the original backing store.
            // This allows extractedText to be truly freed after chunking (line 205).
            const raw = text.substring(start, end);
            chunks.push(Buffer.from(raw, 'utf8').toString('utf8'));
            if (end >= text.length) break; // ultimo chunk raggiunto — evita loop infinito
            const nextStart = Math.max(end - safeOverlap, start + 1);
            if (nextStart <= start) break;
            start = nextStart;
        }

        return chunks.filter((c) => c.length > 0);
    }

    _buildGenerationChunks(text, questionCount) {
        if (shouldUseQuizFastPath(questionCount)) {
            // Fast path parallelo: N chiamate AI piccole invece di 1 monolitica.
            const taskCount = computeFastPathTaskCount(questionCount);
            return buildFastPathTaskTexts(text, taskCount);
        }

        return this._splitTextIntoChunks(text);
    }

    /**
     * Cleanup stale jobs.
     */
    cleanupStaleJobs() {
        const now = Date.now();
        let cleaned = 0;

        for (const [userId, jobs] of userJobs.entries()) {
            for (const [jobId, job] of jobs.entries()) {
                const age = job.completedAt
                    ? now - job.completedAt.getTime()
                    : job.startedAt
                      ? now - job.startedAt.getTime()
                      : 0;

                if (job.status === 'completed' && age > JOB_TTL_COMPLETED_MS) {
                    jobs.delete(jobId);
                    cleaned++;
                } else if (job.status === 'failed' && age > JOB_TTL_FAILED_MS) {
                    jobs.delete(jobId);
                    cleaned++;
                } else if (age > JOB_TTL_ORPHANED_MS) {
                    jobs.delete(jobId);
                    cleaned++;
                }
            }
            if (jobs.size === 0) {
                userJobs.delete(userId);
            }
        }

        if (cleaned > 0) {
            logger.debug('QuizGeneration', `Cleaned ${cleaned} stale jobs`);
        }
    }
}

// Singleton
const quizGenerationService = new QuizGenerationService();

// Periodic cleanup
setInterval(() => {
    quizGenerationService.cleanupStaleJobs();
}, CLEANUP_INTERVAL_MS).unref();

module.exports = quizGenerationService;
module.exports.QuizGenerationService = QuizGenerationService;
module.exports.hasSseConnection = hasSseConnection;
