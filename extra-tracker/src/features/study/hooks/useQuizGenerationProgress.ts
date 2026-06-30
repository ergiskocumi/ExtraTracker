/**
 * 🧠 useQuizGenerationProgress
 * =============================
 * React hook that subscribes to quiz generation SSE events and provides
 * real-time progress state. Falls back to polling if SSE disconnects.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// =========================================
// TYPES
// =========================================

export type QuizGenerationPhase =
    | 'idle'
    | 'connecting'
    | 'started'
    | 'processing'
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
        partialResult?: boolean;
        error?: string;
        result?: { quiz: Record<string, unknown>; session: Record<string, unknown> } | null;
    }>;
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

    // Reset when jobId changes
    useEffect(() => {
        if (jobId) {
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
                                    estimatedSeconds: data.estimatedSeconds || 0,
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
                                    return { ...prev, chunks };
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
                                        completedChunks: (prev.completedChunks || 0) + 1,
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
                                if (onCompleteRef.current && data.quiz && data.session) {
                                    onCompleteRef.current({
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
                                onErrorRef.current?.(data.error?.message || 'Errore sconosciuto');
                                break;
                        }
                    } catch {
                        // Skip unparseable SSE messages
                    }
                };

                eventSource.onerror = () => {
                    if (cancelled) return;
                    // SSE connection lost — fall back to polling
                    eventSource?.close();
                    eventSource = null;
                    startPolling();
                };
            } catch {
                // EventSource not available or connection failed — start polling
                startPolling();
            }
        };

        const startPolling = () => {
            if (cancelled || !pollStatusFn) return;
            pollingTimer = setInterval(async () => {
                if (cancelled) return;
                try {
                    const status = await pollStatusFn(deckId, jobId);
                    if (cancelled) return;

                    if (!status) {
                        setProgress((prev) => ({
                            ...prev,
                            phase: 'failed',
                            error: 'Job non trovato',
                        }));
                        if (pollingTimer) clearInterval(pollingTimer);
                        return;
                    }

                    setProgress((prev) => ({
                        ...prev,
                        phase: status.status === 'completed'
                            ? 'completed'
                            : status.status === 'failed'
                              ? 'failed'
                              : 'processing',
                        totalChunks: status.totalChunks ?? prev.totalChunks,
                        completedChunks: status.completedChunks ?? prev.completedChunks,
                        failedChunks: status.failedChunks ?? prev.failedChunks,
                        partialResult: Boolean(status.partialResult),
                        error: status.error || null,
                        result: status.result || prev.result,
                    }));

                    if (status.status === 'completed') {
                        if (pollingTimer) clearInterval(pollingTimer);
                        if (onCompleteRef.current && status.result?.quiz && status.result?.session) {
                            onCompleteRef.current({
                                quiz: status.result.quiz as Record<string, unknown>,
                                session: status.result.session as Record<string, unknown>,
                            });
                        }
                    } else if (status.status === 'failed') {
                        if (pollingTimer) clearInterval(pollingTimer);
                        onErrorRef.current?.(status.error || 'Generazione fallita');
                    }
                } catch {
                    // Poll failed, will retry
                }
            }, 5000);
        };

        connectSSE();

        return () => {
            cancelled = true;
            eventSource?.close();
            if (pollingTimer) clearInterval(pollingTimer);
        };
    }, [jobId, deckId, pollStatusFn]);

    return progress;
}

export default useQuizGenerationProgress;
