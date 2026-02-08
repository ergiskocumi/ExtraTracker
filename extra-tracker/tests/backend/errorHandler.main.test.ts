// @vitest-environment node

import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const AppError = require('../../server/utils/AppError');

const ERROR_HANDLER_MODULE = '../../server/middleware/errorHandler';
const errorHandlerPath = require.resolve(ERROR_HANDLER_MODULE);

const originalNodeEnv = process.env.NODE_ENV;

const loadErrorHandler = (nodeEnv: 'development' | 'production') => {
    process.env.NODE_ENV = nodeEnv;
    delete require.cache[errorHandlerPath];
    const { errorHandler } = require(ERROR_HANDLER_MODULE);
    return errorHandler as (err: any, req: any, res: any, next: any) => void;
};

const createRes = () => {
    const res: any = {
        status: vi.fn(),
        json: vi.fn(),
    };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    return res;
};

const createReq = (overrides: Record<string, any> = {}) => ({
    method: 'POST',
    originalUrl: '/api/test',
    path: '/api/test',
    query: {},
    headers: {},
    body: { payload: true },
    ip: '127.0.0.1',
    user: null,
    ...overrides,
});

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete require.cache[errorHandlerPath];
    vi.restoreAllMocks();
});

describe('server/middleware/errorHandler (development mode)', () => {
    it('converts payload-too-large errors into AppError payload response', () => {
        const errorHandler = loadErrorHandler('development');

        const req = createReq({
            headers: { 'x-request-id': 'dev-rid-1' },
            user: { id: 'user-1', email: 'u1@example.com' },
            body: { password: 'super-secret', other: 'ok' },
        });
        const res = createRes();

        errorHandler(
            {
                type: 'entity.too.large',
                message: 'request entity too large',
                status: 413,
            },
            req,
            res,
            vi.fn(),
        );

        expect(res.status).toHaveBeenCalledWith(413);
        const payload = res.json.mock.calls[0][0];
        expect(payload.error.code).toBe('PAYLOAD_TOO_LARGE');
        expect(payload.error.requestId).toBe('dev-rid-1');
        expect(payload.error.details.maxSize).toBe('50MB');
    });

    it('maps Mongoose ValidationError into a 400 response', () => {
        const errorHandler = loadErrorHandler('development');
        const req = createReq({ headers: { 'x-request-id': 'dev-rid-2' } });
        const res = createRes();

        const validationError = {
            name: 'ValidationError',
            errors: {
                title: { message: 'Titolo obbligatorio' },
                email: { message: 'Email non valida' },
            },
        };

        errorHandler(validationError, req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(400);
        const payload = res.json.mock.calls[0][0];
        expect(payload.message).toContain('Titolo obbligatorio');
        expect(payload.message).toContain('Email non valida');
        expect(payload.error.code).toBe('INTERNAL_ERROR');
    });

    it('maps CastError and duplicate field errors into 400 responses', () => {
        const errorHandler = loadErrorHandler('development');

        const castRes = createRes();
        errorHandler(
            { name: 'CastError', path: 'deckId', value: 'invalid-id' },
            createReq(),
            castRes,
            vi.fn(),
        );
        expect(castRes.status).toHaveBeenCalledWith(400);
        expect(castRes.json.mock.calls[0][0].message).toContain('Dato non valido');

        const dupRes = createRes();
        errorHandler(
            {
                code: 11000,
                errmsg: 'E11000 duplicate key error dup key: { email: "john@example.com" }',
            },
            createReq(),
            dupRes,
            vi.fn(),
        );
        expect(dupRes.status).toHaveBeenCalledWith(400);
        expect(dupRes.json.mock.calls[0][0].message).toContain('Valore duplicato');
    });

    it('wraps unknown errors into internal AppError and attaches request metadata', () => {
        const errorHandler = loadErrorHandler('development');

        const req = createReq({
            headers: { 'x-request-id': 'dev-rid-3' },
            user: { id: 'user-77', email: 'user77@example.com' },
            ip: '10.0.0.22',
        });
        const res = createRes();

        errorHandler(new Error('boom'), req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(500);
        const payload = res.json.mock.calls[0][0];
        expect(payload.error.code).toBe('INTERNAL_ERROR');
        expect(payload.error.requestId).toBe('dev-rid-3');
    });

    it('does not emit noisy warning logs for normal auth-check 401', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const errorHandler = loadErrorHandler('development');
        const req = createReq({
            originalUrl: '/api/auth/check',
            path: '/api/auth/check',
            headers: { 'x-request-id': 'dev-rid-4' },
        });
        const res = createRes();

        const unauthorized = AppError.unauthorized('Sessione scaduta');
        errorHandler(unauthorized, req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(401);
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('adds request metadata directly on AppError instances', () => {
        const errorHandler = loadErrorHandler('development');
        const req = createReq({
            headers: { 'x-request-id': 'dev-rid-5' },
            user: { id: 'user-99', email: 'user99@example.com' },
            ip: '192.168.1.10',
        });
        const res = createRes();

        const appError = AppError.validation('Input non valido', { field: 'title' });
        errorHandler(appError, req, res, vi.fn());

        expect(appError.requestId).toBe('dev-rid-5');
        expect(appError.metadata.userId).toBe('user-99');
        expect(appError.metadata.ip).toBe('192.168.1.10');

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].error.details).toEqual({ field: 'title' });
    });
});

describe('server/middleware/errorHandler (production mode)', () => {
    it('returns operational error payload for trusted AppError', () => {
        const errorHandler = loadErrorHandler('production');

        const req = createReq({ headers: { 'x-request-id': 'prod-rid-1' } });
        const res = createRes();

        const err = AppError.validation('Campo obbligatorio', { field: 'name' });
        errorHandler(err, req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            status: 'fail',
            message: 'Campo obbligatorio',
            error: {
                code: 'VALIDATION_ERROR',
                suggestion: 'Controlla i dati inseriti e riprova',
                requestId: 'prod-rid-1',
            },
        });
    });

    it('returns generic 500 payload for non-operational unknown errors', () => {
        const errorHandler = loadErrorHandler('production');

        const req = createReq({ headers: { 'x-request-id': 'prod-rid-2' } });
        const res = createRes();

        errorHandler(new Error('unexpected crash'), req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            status: 'error',
            message: 'Qualcosa è andato storto!',
            error: {
                code: 'INTERNAL_ERROR',
                requestId: 'prod-rid-2',
            },
        });
    });

    it('maps JWT-specific errors to 401 responses', () => {
        const errorHandler = loadErrorHandler('production');

        const jwtErr = AppError.internal({});
        jwtErr.name = 'JsonWebTokenError';
        const jwtRes = createRes();
        errorHandler(jwtErr, createReq({ headers: { 'x-request-id': 'prod-rid-3' } }), jwtRes, vi.fn());

        expect(jwtRes.status).toHaveBeenCalledWith(401);
        expect(jwtRes.json.mock.calls[0][0].message).toContain('Token non valido');

        const expiredErr = AppError.internal({});
        expiredErr.name = 'TokenExpiredError';
        const expiredRes = createRes();
        errorHandler(expiredErr, createReq({ headers: { 'x-request-id': 'prod-rid-4' } }), expiredRes, vi.fn());

        expect(expiredRes.status).toHaveBeenCalledWith(401);
        expect(expiredRes.json.mock.calls[0][0].message).toContain('token è scaduto');
    });

    it('handles production transforms for database, redis and timeout markers', () => {
        const errorHandler = loadErrorHandler('production');

        const mongoErr = AppError.internal({});
        mongoErr.name = 'MongoServerError';
        const mongoRes = createRes();
        errorHandler(mongoErr, createReq({ headers: { 'x-request-id': 'prod-rid-5' } }), mongoRes, vi.fn());
        expect(mongoRes.status).toHaveBeenCalledWith(500);

        const redisErr = AppError.internal({});
        redisErr.code = 'ECONNREFUSED';
        redisErr.message = 'Redis connection refused';
        const redisRes = createRes();
        errorHandler(redisErr, createReq({ headers: { 'x-request-id': 'prod-rid-6' } }), redisRes, vi.fn());
        expect(redisRes.status).toHaveBeenCalledWith(500);

        const timeoutErr = AppError.internal({});
        timeoutErr.code = 'ETIMEDOUT';
        const timeoutRes = createRes();
        errorHandler(timeoutErr, createReq({ headers: { 'x-request-id': 'prod-rid-7' } }), timeoutRes, vi.fn());
        expect(timeoutRes.status).toHaveBeenCalledWith(500);
    });
});
