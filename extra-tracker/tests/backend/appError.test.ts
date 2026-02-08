// @vitest-environment node

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const AppError = require('../../server/utils/AppError');

describe('server/utils/AppError', () => {
    it('builds a default internal error shape', () => {
        const err = new AppError('Boom');
        expect(err.message).toBe('Boom');
        expect(err.statusCode).toBe(500);
        expect(err.code).toBe('INTERNAL_ERROR');
        expect(err.status).toBe('error');
        expect(err.isOperational).toBe(true);
    });

    it('uses fail status for 4xx errors', () => {
        const err = new AppError('Bad request', 400, 'BAD_REQUEST');
        expect(err.status).toBe('fail');
    });

    it('supports metadata and requestId enrichment chain', () => {
        const err = new AppError('Enriched');
        err.addMetadata('userId', 'u-1').setRequestId('req-123');

        expect(err.metadata.userId).toBe('u-1');
        expect(err.requestId).toBe('req-123');
    });

    it('serializes safe response by default', () => {
        const err = AppError.validation('Campo mancante', { field: 'email' });
        const payload = err.toJSON();

        expect(payload).toEqual({
            success: false,
            status: 'fail',
            error: {
                message: 'Campo mancante',
                code: 'VALIDATION_ERROR',
            },
        });
    });

    it('includes details/suggestion/requestId when includeDetails is true', () => {
        const err = AppError.validation('Campo mancante', { field: 'email' });
        err.setRequestId('req-9');
        const payload = err.toJSON(true);

        expect(payload.error.details).toEqual({ field: 'email' });
        expect(payload.error.suggestion).toMatch(/controlla/i);
        expect(payload.error.requestId).toBe('req-9');
    });

    it('serializes extended logging payload including wrapped original error', () => {
        const original = new Error('db down');
        const err = AppError.database('Errore DB', original);
        const logPayload = err.toLog();

        expect(logPayload.category).toBe(AppError.CATEGORIES.DATABASE);
        expect(logPayload.originalError).toEqual(
            expect.objectContaining({
                message: 'db down',
                name: 'Error',
            }),
        );
    });

    it('creates rate-limit errors with retryAfter details', () => {
        const err = AppError.tooManyRequests('Troppi tentativi', 60);
        expect(err.statusCode).toBe(429);
        expect(err.code).toBe('TOO_MANY_REQUESTS');
        expect(err.details).toEqual({ retryAfter: 60 });
        expect(err.suggestion).toMatch(/60/);
    });

    it('creates internal errors as non-operational', () => {
        const err = AppError.internal({ context: 'unit-test' }, new Error('fatal'));
        expect(err.statusCode).toBe(500);
        expect(err.isOperational).toBe(false);
        expect(err.category).toBe(AppError.CATEGORIES.INTERNAL);
    });

    it('creates file upload errors with correct status for oversized payloads', () => {
        const tooBig = AppError.fileUpload('File troppo grande', { sizeExceeded: true });
        const invalidFormat = AppError.fileUpload('Formato non supportato', { sizeExceeded: false });

        expect(tooBig.statusCode).toBe(413);
        expect(invalidFormat.statusCode).toBe(400);
    });

    it('creates service unavailable errors with optional retry metadata', () => {
        const err = AppError.serviceUnavailable('Servizio down', 120);
        expect(err.statusCode).toBe(503);
        expect(err.code).toBe('SERVICE_UNAVAILABLE');
        expect(err.details).toEqual({ retryAfter: 120 });
    });
});

