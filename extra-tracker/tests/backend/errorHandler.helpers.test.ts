// @vitest-environment node

import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { notFoundHandler, asyncHandler } = require('../../server/middleware/errorHandler');

describe('server/middleware/errorHandler helpers', () => {
    it('notFoundHandler returns 404 payload with method and url', () => {
        const req: any = {
            method: 'GET',
            originalUrl: '/api/unknown',
        };
        const res: any = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };

        notFoundHandler(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                message: 'Route GET /api/unknown non trovata',
                code: 'NOT_FOUND',
            },
        });
    });

    it('asyncHandler forwards rejected errors to next', async () => {
        const err = new Error('Async failure');
        const wrapped = asyncHandler(async () => {
            throw err;
        });
        const next = vi.fn();

        wrapped({} as any, {} as any, next);
        await Promise.resolve();

        expect(next).toHaveBeenCalledWith(err);
    });

    it('asyncHandler resolves successful handlers without calling next with error', async () => {
        const res: any = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        const next = vi.fn();
        const wrapped = asyncHandler(async (_req: any, response: any) => {
            response.status(200).json({ ok: true });
        });

        wrapped({} as any, res, next);
        await Promise.resolve();

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ ok: true });
        expect(next).not.toHaveBeenCalled();
    });
});

