import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

if (typeof window !== 'undefined') {
    window.scrollTo = vi.fn();

    if (!window.matchMedia) {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    }

    if (!window.ResizeObserver) {
        class ResizeObserverMock {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
        window.ResizeObserver = ResizeObserverMock as any;
    }

    if (!window.IntersectionObserver) {
        class IntersectionObserverMock {
            root = null;
            rootMargin = '';
            thresholds: number[] = [];
            observe() {}
            unobserve() {}
            disconnect() {}
            takeRecords() {
                return [];
            }
        }
        window.IntersectionObserver = IntersectionObserverMock as any;
    }

    if (!HTMLElement.prototype.scrollIntoView) {
        HTMLElement.prototype.scrollIntoView = vi.fn();
    }

    if (!(globalThis as any).EventSource) {
        class EventSourceMock {
            static CONNECTING = 0;
            static OPEN = 1;
            static CLOSED = 2;
            readyState = EventSourceMock.OPEN;
            url: string;
            withCredentials = false;
            onopen: ((event: Event) => void) | null = null;
            onmessage: ((event: MessageEvent) => void) | null = null;
            onerror: ((event: Event) => void) | null = null;

            constructor(url: string, init?: EventSourceInit) {
                this.url = url;
                this.withCredentials = !!init?.withCredentials;
            }

            addEventListener() {}
            removeEventListener() {}
            dispatchEvent() {
                return true;
            }
            close() {
                this.readyState = EventSourceMock.CLOSED;
            }
        }

        (globalThis as any).EventSource = EventSourceMock;
        (window as any).EventSource = EventSourceMock;
    }
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});
