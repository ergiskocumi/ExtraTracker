/**
 * 🧠 useQuizGenerationProgress
 * =============================
 * React hook that subscribes to quiz generation SSE events and provides
 * real-time progress state. Falls back to polling if SSE disconnects.
 */

import { useState, useEffect, useRef } from 'react';

// =========================================
// TYPES
// =========================================

export type QuizGenerationPhase =
    | 'idle'
    | 'connecting'
    | 'started'
    | 'processing'
    | 'persisting'
    | 'completed'
    | 'failed'
    | 'cancelled';

export interface ChunkStatus {
    index: number;
    status: 'pending' | 'processing' | 'done' | 'failed' | 'skipped';
    retries: number;
}

export interface QuizGenerationProgress {
    phase: QuizGenerationPhase;
    jobId: string | null;
    totalChunks: number;
    completedChunks: number;
    failedChunks: number;
    chunks: ChunkStatus[];
    estimatedSeconds: number;
    elapsedSeconds: number;
    questionCount: number;
    partialResult: boolean;
    error: string | null;
    result: {
        quiz: Record<string, unknown> | null;
        session: Record<string, unknown> | null;
    } | null;
}

export interface UseQuizGenerationProgressOptions {
    jobId: string | null;
    deckId: string;
    onComplete?: (result: { quiz: Record<string, unknown>; session: Record<string, unknown> }) => void;
    onError?: (error: string) => void;
    pollStatusFn?: (deckId: string, jobId: string) => Promise<{
        status: string;
        totalChunks?: number;
        completedChunks?: number;
        failedChunks?: number;
        chunks?: Array<{ index: number; status: string; retries: number }>;
        estimatedSeconds?: number;
        elapsedSeconds?: number;
        config?: { questionCount?: number };
        questionCount?: number;
        partialResult?: boolean;
        error?: string;
        result?: { quiz: Record<string, unknown>; session: Record<string, unknown> } | null;
    } | null>;
}

// =========================================
// HOOK
// =========================================

export function useQuizGenerationProgress({
    jobId,
    deckId,
    onComplete,
    onError,
    pollStatusFn,
}: UseQuizGenerationProgressOptions): QuizGenerationProgress {
    const [progress, setProgress] = useState<QuizGenerationProgress>({
        phase: 'idle',
        jobId: null,
        totalChunks: 0,
        completedChunks: 0,
        failedChunks: 0,
        chunks: [],
        estimatedSeconds: 0,
        elapsedSeconds: 0,
        questionCount: 0,
        partialResult: false,
        error: null,
        result: null,
    });

    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;
    const completionNotifiedRef = useRef(false);
    const errorNotifiedRef = useRef(false);

    // Reset when jobId changes
    useEffect(() => {
        if (jobId) {
            completionNotifiedRef.current = false;
            errorNotifiedRef.current = false;
            setProgress((prev) => ({
                ...prev,
                phase: 'connecting',
                jobId,
                totalChunks: 0,
                completedChunks: 0,
                failedChunks: 0,
                chunks: [],
                estimatedSeconds: 0,
                elapsedSeconds: 0,
                questionCount: 0,
                partialResult: false,
                error: null,
                result: null,
            }));
        }
    }, [jobId]);

    // SSE connection
    useEffect(() => {
        if (!jobId) return;

        let eventSource: EventSource | null = null;
        let pollingTimer: ReturnType<typeof setInterval> | null = null;
        let cancelled = false;
        let consecutivePollFailures = 0;
        const MAX_POLL_FAILURES = 5;

        const notifyComplete = (result: { quiz: Record<string, unknown>; session: Record<string, unknown> }): void => {
            if (completionNotifiedRef.current) return;
            completionNotifiedRef.current = true;
            onCompleteRef.current?.(result);
        };

        const notifyError = (error: string): void => {
            if (errorNotifiedRef.current) return;
            errorNotifiedRef.current = true;
            onErrorRef.current?.(error);
        };

        const connectSSE = () => {
            try {
                const baseUrl = import.meta.env.VITE_API_URL || '';
                eventSource = new EventSource(`${baseUrl}/api/sse/stream`, {
                    withCredentials: true,
                });

                eventSource.onopen = () => {
                    if (cancelled) return;
                    setProgress((prev) =>
                        prev.phase === 'connecting' ? { ...prev, phase: 'started' } : prev,
                    );
                };

                eventSource.onmessage = (event) => {
                    if (cancelled) return;
                    try {
                        const envelope = JSON.parse(event.data);
                        const { event: eventType, data } = envelope;

                        // Filter by jobId
                        if (data?.jobId !== jobId) return;

                        switch (eventType) {
                            case 'quiz.generation.started':
                                setProgress((prev) => ({
                                    ...prev,
                                    phase: 'processing',
                                    totalChunks: data.totalChunks || 0,
                                    completedChunks: data.completedChunks || 0,
                                    estimatedSeconds: data.estimatedSeconds || 0,
                                    questionCount: data.questionCount || 0,
                                    chunks: Array.from(
                                        { length: data.totalChunks || 0 },
                                        (_, i) => ({ index: i, status: 'pending' as const, retries: 0 }),
                                    ),
                                }));
                                break;

                            case 'quiz.generation.chunk_progress':
                                setProgress((prev) => {
                                    const chunks = [...prev.chunks];
                                    const idx = (data.chunkIndex || 1) - 1;
                                    if (chunks[idx]) {
                                        chunks[idx] = {
                                            ...chunks[idx],
                                            status: data.status === 'failed' ? 'failed' : 'processing',
                                        };
                                    }
                                    return {
                                        ...prev,
                                        phase: 'processing',
                                        chunks,
                                        completedChunks: typeof data.completedChunks === 'number' ? data.completedChunks : prev.completedChunks,
                                        failedChunks: typeof data.failedChunks === 'number' ? data.failedChunks : prev.failedChunks,
                                    };
                                });
                                break;

                            case 'quiz.generation.chunk_complete':
                                setProgress((prev) => {
                                    const chunks = [...prev.chunks];
                                    const idx = (data.chunkIndex || 1) - 1;
                                    if (chunks[idx]) {
                                        chunks[idx] = { ...chunks[idx], status: 'done' };
                                    }
                                    return {
                                        ...prev,
                                        chunks,
                                        completedChunks: typeof data.completedChunks === 'number'
                                            ? data.completedChunks
                                            : (prev.completedChunks || 0) + 1,
                                        failedChunks: typeof data.failedChunks === 'number' ? data.failedChunks : prev.failedChunks,
                                    };
                                });
                                break;

                            case 'quiz.generation.chunk_retry':
                                setProgress((prev) => {
                                    const chunks = [...prev.chunks];
                                    const idx = (data.chunkIndex || 1) - 1;
                                    if (chunks[idx]) {
                                        chunks[idx] = {
                                            ...chunks[idx],
                                            retries: data.retryCount || 0,
                                        };
                                    }
                                    return { ...prev, chunks };
                                });
                                break;

                            case 'quiz.generation.persisting':
                                setProgress((prev) => ({
                                    ...prev,
                                    phase: 'persisting',
                                    totalChunks: data.totalChunks || prev.totalChunks,
                                    completedChunks: data.completedChunks ?? prev.completedChunks,
                                    failedChunks: data.failedChunks ?? prev.failedChunks,
                                    questionCount: data.questionCount || prev.questionCount,
                                    partialResult: Boolean(data.partialResult),
                                }));
                                break;

                            case 'quiz.generation.complete':
                                setProgress((prev) => ({
                                    ...prev,
                                    phase: 'completed',
                                    questionCount: data.questionCount || 0,
                                    partialResult: Boolean(data.partialResult),
                                    result: {
                                        quiz: data.quiz || null,
                                        session: data.session || null,
                                    },
                                }));
                                if (data.quiz && data.session) {
                                    notifyComplete({
                                        quiz: data.quiz as Record<string, unknown>,
                                        session: data.session as Record<string, unknown>,
                                    });
                                }
                                break;

                            case 'quiz.generation.error':
                                setProgress((prev) => ({
                                    ...prev,
                                    phase: 'failed',
                                    error: data.error?.message || 'Errore sconosciuto',
                                }));
                                notifyError(data.error?.message || 'Errore sconosciuto');
                                break;
                        }
                    } catch {
                        // Skip unparseable SSE messages
                    }
                };

                eventSource.onerror = () => {
                    if (cancelled) return;
                    eventSource?.close();
                    eventSource = null;
                };
            } catch {
                // EventSource not available. Polling is already active below.
            }
        };

        const startPolling = () => {
            if (cancelled || !pollStatusFn || pollingTimer) return;

            const pollOnce = async () => {
                if (cancelled) return;
                try {
                    const status = await pollStatusFn(deckId, jobId);
                    if (cancelled) return;

                    consecutivePollFailures = 0; // reset on success

                    if (!status) {
                        setProgress((prev) => ({
                            ...prev,
                            phase: 'failed',
                            error: 'Job non trovato o scaduto',
                        }));
                        if (pollingTimer) clearInterval(pollingTimer);
                        return;
                    }

                    // Update chunks detail from status if available
                    const updatedChunks = Array.isArray(status.chunks)
                        ? status.chunks.map((c: { index: number; status: string; retries: number }) => ({
                              index: c.index,
                              status: c.status as 'pending' | 'processing' | 'done' | 'failed' | 'skipped',
                              retries: c.retries || 0,
                          }))
                        : undefined;

                    setProgress((prev) => ({
                        ...prev,
                        phase: status.status === 'completed'
                            ? 'completed'
                            : status.status === 'failed'
                              ? 'failed'
                              : status.status === 'persisting'
                                ? 'persisting'
                                : 'processing',
                        totalChunks: status.totalChunks ?? prev.totalChunks,
                        completedChunks: status.completedChunks ?? prev.completedChunks,
                        failedChunks: status.failedChunks ?? prev.failedChunks,
                        estimatedSeconds: status.estimatedSeconds ?? prev.estimatedSeconds,
                        elapsedSeconds: status.elapsedSeconds ?? prev.elapsedSeconds,
                        questionCount: status.questionCount ?? status.config?.questionCount ?? prev.questionCount,
                        partialResult: Boolean(status.partialResult),
                        error: status.error || null,
                        result: status.result || prev.result,
                        ...(updatedChunks ? { chunks: updatedChunks } : {}),
                    }));

                    if (status.status === 'completed') {
                        if (pollingTimer) clearInterval(pollingTimer);
                        if (status.result?.quiz && status.result?.session) {
                            notifyComplete({
                                quiz: status.result.quiz as Record<string, unknown>,
                                session: status.result.session as Record<string, unknown>,
                            });
                        }
                    } else if (status.status === 'failed') {
                        if (pollingTimer) clearInterval(pollingTimer);
                        notifyError(status.error || 'Generazione fallita');
                    }
                } catch {
                    consecutivePollFailures++;
                    if (consecutivePollFailures >= MAX_POLL_FAILURES) {
                        if (pollingTimer) clearInterval(pollingTimer);
                        setProgress((prev) => ({
                            ...prev,
                            phase: 'failed',
                            error: 'Impossibile verificare lo stato della generazione. Riprova.',
                        }));
                        notifyError('Impossibile verificare lo stato della generazione. Riprova.');
                    }
                }
            };

            void pollOnce();
            pollingTimer = setInterval(() => {
                void pollOnce();
            }, 2000);
        };

        connectSSE();
        startPolling();

        return () => {
            cancelled = true;
            eventSource?.close();
            if (pollingTimer) clearInterval(pollingTimer);
        };
    }, [jobId, deckId, pollStatusFn]);

    return progress;
}

export default useQuizGenerationProgress;
