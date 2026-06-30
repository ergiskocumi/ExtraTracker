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
    CHUNK_AI_TIMEOUT_MS,
} = require('./constants');

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
                const DeckModel = require('../models/Deck');
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
            // --- Split text into chunks ---
            const chunks = this._splitTextIntoChunks(extractedText);
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

            // Distribute questions across chunks
            const baseCount = Math.floor(questionCount / chunks.length);
            const remainder = questionCount % chunks.length;
            const counts = chunks.map((_, i) => baseCount + (i < remainder ? 1 : 0));

            emitProgress(userId, jobId, 'started', {
                totalChunks: chunks.length,
                estimatedSeconds: job.estimatedSeconds,
                questionCount,
                quizType: job.config.quizType,
            });

            // --- Process chunks sequentially ---
            const allQuestions = [];
            let totalFailed = 0;

            for (let i = 0; i < chunks.length; i++) {
                const countForChunk = counts[i];
                if (countForChunk === 0) {
                    job.chunks.push({ index: i, status: 'skipped', questions: 0 });
                    job.completedChunks++;
                    continue;
                }

                const chunkState = { index: i, status: 'processing', retries: 0 };
                job.chunks.push(chunkState);

                emitProgress(userId, jobId, 'chunk_progress', {
                    chunkIndex: i + 1,
                    totalChunks: chunks.length,
                    status: 'processing',
                });

                // --- Retry loop for this chunk ---
                let chunkQuestions = [];
                let chunkSuccess = false;

                const seenQuestions = [
                    ...previousQuestions,
                    ...allQuestions.map((q) => q.questionText),
                ];

                for (let retry = 0; retry <= CHUNK_MAX_RETRIES; retry++) {
                    if (retry > 0) {
                        chunkState.retries = retry;
                        const delay = CHUNK_RETRY_BASE_DELAY_MS * Math.pow(2, retry - 1);
                        emitProgress(userId, jobId, 'chunk_retry', {
                            chunkIndex: i + 1,
                            retryCount: retry,
                            maxRetries: CHUNK_MAX_RETRIES,
                        });
                        await sleep(delay);
                    }

                    try {
                        chunkQuestions = await processChunkFn(chunks[i], countForChunk, seenQuestions, {
                            ...telemetry,
                            chunkIndex: i + 1,
                            totalChunks: chunks.length,
                        });

                        if (Array.isArray(chunkQuestions) && chunkQuestions.length > 0) {
                            chunkSuccess = true;
                            break;
                        }
                        // Empty result — retry
                    } catch (err) {
                        logger.warn('QuizGeneration', `Chunk ${i + 1}/${chunks.length} attempt ${retry + 1} failed`, {
                            jobId,
                            error: err.message,
                            type: err.type || err.name || 'unknown',
                            status: err.status || err.statusCode || null,
                            code: err.code || null,
                        });
                    }
                }

                if (chunkSuccess) {
                    chunkState.status = 'done';
                    allQuestions.push(...chunkQuestions);
                    job.completedChunks++;

                    emitProgress(userId, jobId, 'chunk_complete', {
                        chunkIndex: i + 1,
                        totalChunks: chunks.length,
                        questionsGenerated: chunkQuestions.length,
                    });
                } else {
                    chunkState.status = 'failed';
                    job.failedChunks++;
                    totalFailed++;

                    emitProgress(userId, jobId, 'chunk_progress', {
                        chunkIndex: i + 1,
                        totalChunks: chunks.length,
                        status: 'failed',
                    });

                    // Circuit breaker: if > threshold fail, stop
                    const failRatio = totalFailed / (i + 1);
                    if (failRatio > CHUNK_CIRCUIT_BREAKER_THRESHOLD) {
                        job.error = `Troppi chunk falliti (${totalFailed}/${i + 1}). Generazione interrotta.`;
                        logger.warn('QuizGeneration', `Circuit breaker tripped for job ${jobId}`, {
                            failRatio,
                            totalFailed,
                            processedChunks: i + 1,
                        });
                        break;
                    }
                }

                // Rate-limit delay between chunks
                if (i < chunks.length - 1) {
                    await sleep(1500);
                }
            }

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
                job.status = 'completed';
                job.partialResult = true;
                job.completedAt = new Date();

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
                job.status = 'completed';
                job.completedAt = new Date();

                if (persistFn) {
                    const result = await persistFn(null, allQuestions, job.config, generatedFromText);
                    job.result = result;
                }

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

            logger.info('QuizGeneration', `Job completed: ${jobId}`, {
                status: job.status,
                totalChunks: chunks.length,
                completedChunks: job.completedChunks,
                failedChunks: job.failedChunks,
                questionCount: allQuestions.length,
                partialResult: job.partialResult,
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
        const chunks = [];
        let start = 0;

        while (start < text.length) {
            let end = Math.min(start + maxLength, text.length);

            // Try to break at a sentence boundary
            if (end < text.length) {
                const searchWindow = text.substring(end - Math.min(200, end - start));
                const sentenceBreak = searchWindow.lastIndexOf('. ');
                const newlineBreak = searchWindow.lastIndexOf('\n');
                const bestBreak = Math.max(
                    sentenceBreak !== -1 ? end - Math.min(200, end - start) + sentenceBreak + 1 : -1,
                    newlineBreak !== -1 ? end - Math.min(200, end - start) + newlineBreak + 1 : -1,
                );
                if (bestBreak > start + overlap) {
                    end = bestBreak;
                }
            }

            // Materialize chunk: Buffer round-trip forces independent SeqString allocation,
            // breaking the SlicedString reference to the original backing store.
            // This allows extractedText to be truly freed after chunking (line 205).
            const raw = text.substring(start, end);
            chunks.push(Buffer.from(raw, 'utf8').toString('utf8'));
            if (end >= text.length) break; // ultimo chunk raggiunto — evita loop infinito
            start = end - overlap;
            // Prevent infinite loop on tiny texts (overlap >= maxLength case)
            if (start >= end) break;
        }

        return chunks.filter((c) => c.length > 0);
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
