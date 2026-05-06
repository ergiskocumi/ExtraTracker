import { useEffect, useRef, useState } from 'react';

export type SSEPayload<T = unknown> = {
    event?: string;
    data?: T;
    [key: string]: unknown;
};

export type SSEListener<T = unknown> = {
    event: string;
    handler: (payload: SSEPayload<T>, rawEvent: MessageEvent) => void;
};

export type SSECallback<T = unknown> = (payload: SSEPayload<T>, rawEvent: MessageEvent) => void;

export type SSEState<T = unknown> = {
    isConnected: boolean;
    lastEvent: SSEPayload<T> | null;
    error: string | null;
};

export const useSSE = <T = unknown>(
    url: string,
    listenersOrCallback?: SSEListener<T>[] | SSECallback<T>
): SSEState<T> => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<SSEPayload<T> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const listenersRef = useRef<SSEListener<T>[]>([]);
    const callbackRef = useRef<SSECallback<T> | null>(null);

    // Aggiornamento sincrono durante render — sempre aggiornato, nessun ritardo di useEffect
    if (Array.isArray(listenersOrCallback)) {
        listenersRef.current = listenersOrCallback;
        callbackRef.current = null;
    } else if (typeof listenersOrCallback === 'function') {
        callbackRef.current = listenersOrCallback;
        listenersRef.current = [];
    } else {
        listenersRef.current = [];
        callbackRef.current = null;
    }

    useEffect(() => {
        if (!url) {
            setIsConnected(false);
            return undefined;
        }

        const eventSource = new EventSource(url, { withCredentials: true });

        const handleOpen = () => {
            setIsConnected(true);
            setError(null);
        };

        const handleError = () => {
            setIsConnected(false);
            setError('SSE connection error');
        };

        const handleMessage = (event: MessageEvent) => {
            let payload: SSEPayload<T>;
            try {
                payload = JSON.parse(event.data) as SSEPayload<T>;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Invalid SSE JSON payload';
                setError(message);
                return;
            }

            setLastEvent(payload);

            if (callbackRef.current) {
                callbackRef.current(payload, event);
                return;
            }

            const listeners = listenersRef.current;
            if (!payload.event || listeners.length === 0) return;

            for (const listener of listeners) {
                if (listener.event === payload.event) {
                    listener.handler(payload, event);
                }
            }
        };

        eventSource.addEventListener('open', handleOpen);
        eventSource.addEventListener('error', handleError);
        eventSource.addEventListener('message', handleMessage);

        return () => {
            eventSource.removeEventListener('open', handleOpen);
            eventSource.removeEventListener('error', handleError);
            eventSource.removeEventListener('message', handleMessage);
            eventSource.close();
            setIsConnected(false);
        };
    }, [url]);

    return { isConnected, lastEvent, error };
};
