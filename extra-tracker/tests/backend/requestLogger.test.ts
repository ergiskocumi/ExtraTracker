// @vitest-environment node

import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const logger = require('../../server/utils/logger');
const requestLogger = require('../../server/middleware/requestLogger');

describe('server/middleware/requestLogger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(logger, 'debug').mockImplementation(() => {});
        vi.spyOn(logger, 'request').mockImplementation(() => {});
    });

    it('logs incoming request and response outcome for normal API paths', () => {
        const req: any = {
            method: 'POST',
            path: '/api/test',
            ip: '127.0.0.1',
            user: { id: 'user-1' },
        };
        const originalSend = vi.fn(function (this: any, body: any) {
            return body;
        });
        const res: any = {
            statusCode: 201,
            send: originalSend,
        };
        const next = vi.fn();

        requestLogger(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);
        expect(logger.debug).toHaveBeenCalledWith('HTTP', 'POST /api/test', {
            userId: 'user-1',
            ip: '127.0.0.1',
        });

        res.send({ ok: true });
        expect(originalSend).toHaveBeenCalledWith({ ok: true });
        expect(logger.request).toHaveBeenCalledWith(
            'POST',
            '/api/test',
            'user-1',
            201,
            expect.any(Number),
        );
    });

    it('uses tenantScope user id when req.user is missing', () => {
        const req: any = {
            method: 'GET',
            path: '/api/something',
            ip: '127.0.0.1',
            tenantScope: { userId: { toString: () => 'tenant-user-9' } },
        };
        const res: any = {
            statusCode: 200,
            send: vi.fn(function (this: any, body: any) {
                return body;
            }),
        };

        requestLogger(req, res, vi.fn());
        res.send('ok');

        expect(logger.request).toHaveBeenCalledWith(
            'GET',
            '/api/something',
            'tenant-user-9',
            200,
            expect.any(Number),
        );
    });

    it('skips response log for static assets and health check', () => {
        const mkReq = (path: string) => ({
            method: 'GET',
            path,
            ip: '127.0.0.1',
        });

        const mkRes = () => ({
            statusCode: 200,
            send: vi.fn(function (this: any, body: any) {
                return body;
            }),
        });

        const reqAsset: any = mkReq('/assets/main.js');
        const resAsset: any = mkRes();
        requestLogger(reqAsset, resAsset, vi.fn());
        resAsset.send('asset');

        const reqHealth: any = mkReq('/health');
        const resHealth: any = mkRes();
        requestLogger(reqHealth, resHealth, vi.fn());
        resHealth.send('ok');

        expect(logger.request).not.toHaveBeenCalled();
    });
});
