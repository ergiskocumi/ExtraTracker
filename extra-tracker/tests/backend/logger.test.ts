// @vitest-environment node

import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const logger = require('../../server/utils/logger');

const fixedNow = new Date('2026-02-08T12:34:56.000Z');
const originalNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.NODE_ENV = 'development';
});

afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('server/utils/logger', () => {
    it('logs info/success/warn with context and optional data formatting', () => {
        logger.info('Auth', 'Login riuscito', { userId: 'u-1' });
        logger.success('Deck', 'Carta salvata', 'extra');
        logger.warn('Sync', 'Ritardo rilevato');

        expect(console.log).toHaveBeenCalledTimes(3);

        const infoLog = (console.log as any).mock.calls[0][0] as string;
        expect(infoLog).toContain('2026-02-08 12:34:56');
        expect(infoLog).toContain('INFO');
        expect(infoLog).toContain('[Auth]');
        expect(infoLog).toContain('Login riuscito');
        expect(infoLog).toContain('"userId": "u-1"');

        const successLog = (console.log as any).mock.calls[1][0] as string;
        expect(successLog).toContain('✓');
        expect(successLog).toContain('[Deck]');
        expect(successLog).toContain('Carta salvata');
        expect(successLog).toContain('extra');

        const warnLog = (console.log as any).mock.calls[2][0] as string;
        expect(warnLog).toContain('⚠');
        expect(warnLog).toContain('[Sync]');
        expect(warnLog).toContain('Ritardo rilevato');
    });

    it('handles empty context/data branches', () => {
        logger.info(null, 'Senza contesto');

        const line = (console.log as any).mock.calls[0][0] as string;
        expect(line).toContain('Senza contesto');
        expect(line).not.toContain('[null]');
    });

    it('logs Error instances with message and stack', () => {
        const err = new Error('Connessione persa');
        err.stack = 'STACK:trace-line';

        logger.error('DB', 'Query fallita', err);

        expect(console.error).toHaveBeenCalledTimes(1);
        const errorLog = (console.error as any).mock.calls[0][0] as string;
        expect(errorLog).toContain('✗ ERROR');
        expect(errorLog).toContain('[DB]');
        expect(errorLog).toContain('Query fallita');
        expect(errorLog).toContain('Error: Connessione persa');
        expect(errorLog).toContain('STACK:trace-line');
    });

    it('logs non-Error values and falls back on circular payload formatting', () => {
        const circular: any = { level: 'critical' };
        circular.self = circular;

        logger.error('API', 'Payload non serializzabile', circular);

        const errorLog = (console.error as any).mock.calls[0][0] as string;
        expect(errorLog).toContain('[API]');
        expect(errorLog).toContain('Payload non serializzabile');
        expect(errorLog).toContain('[object Object]');
    });

    it('logs debug in development and suppresses it in production', () => {
        logger.debug('HTTP', 'Richiesta in arrivo', { method: 'POST' });
        expect(console.log).toHaveBeenCalledTimes(1);
        expect((console.log as any).mock.calls[0][0]).toContain('DEBUG');

        (console.log as any).mockClear();
        process.env.NODE_ENV = 'production';

        logger.debug('HTTP', 'Non deve apparire', { method: 'GET' });
        expect(console.log).not.toHaveBeenCalled();
    });

    it('logs HTTP requests with method/status/duration/user branches', () => {
        logger.request('GET', '/api/decks', 'u-42', 200, 123);
        logger.request('DELETE', '/api/decks/1', null, 500, null);
        logger.request('PATCH', '/api/decks/2', null, 404, 45);
        logger.request('TRACE', '/health', null, 101, null);
        logger.request('OPTIONS', '/public', null, null, null);

        expect(console.log).toHaveBeenCalledTimes(5);

        const first = (console.log as any).mock.calls[0][0] as string;
        expect(first).toContain('GET');
        expect(first).toContain('/api/decks');
        expect(first).toContain('(user: u-42)');
        expect(first).toContain('200');
        expect(first).toContain('123ms');

        const second = (console.log as any).mock.calls[1][0] as string;
        expect(second).toContain('DELETE');
        expect(second).toContain('500');
        expect(second).not.toContain('ms');

        const third = (console.log as any).mock.calls[2][0] as string;
        expect(third).toContain('PATCH');
        expect(third).toContain('404');
        expect(third).toContain('45ms');

        const fourth = (console.log as any).mock.calls[3][0] as string;
        expect(fourth).toContain('TRACE');
        expect(fourth).toContain('101');

        const fifth = (console.log as any).mock.calls[4][0] as string;
        expect(fifth).toContain('OPTIONS');
        expect(fifth).toContain('/public');
        expect(fifth).not.toContain('(user:');
        expect(fifth).not.toContain('ms');
    });
});
