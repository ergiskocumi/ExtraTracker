// @vitest-environment node

import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const securityConfig = require('../../server/config/security');
const {
    ensureCsrfCookie,
    requireCsrf,
    setCsrfCookie,
    clearCsrfCookie,
} = require('../../server/middleware/csrf');

const csrfCookieName = securityConfig.csrf.cookieName;
const csrfHeaderName = securityConfig.csrf.headerName;

const buildResponse = () => ({
    cookie: vi.fn(),
    clearCookie: vi.fn(),
});

describe('server/middleware/csrf', () => {
    it('setCsrfCookie sets cookie and returns token', () => {
        const res = buildResponse();
        const token = setCsrfCookie(res, 'fixed-token');

        expect(token).toBe('fixed-token');
        expect(res.cookie).toHaveBeenCalledWith(
            csrfCookieName,
            'fixed-token',
            securityConfig.csrf.cookieOptions,
        );
    });

    it('ensureCsrfCookie keeps existing token and does not set a new cookie', () => {
        const req: any = {
            cookies: {
                [csrfCookieName]: 'existing-token',
            },
        };
        const res = buildResponse();
        const next = vi.fn();

        ensureCsrfCookie(req, res, next);

        expect(req.csrfToken).toBe('existing-token');
        expect(res.cookie).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('ensureCsrfCookie generates and sets token when missing', () => {
        const req: any = { cookies: {} };
        const res = buildResponse();
        const next = vi.fn();

        ensureCsrfCookie(req, res, next);

        expect(typeof req.csrfToken).toBe('string');
        expect(req.csrfToken.length).toBeGreaterThan(10);
        expect(res.cookie).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('clearCsrfCookie clears cookie with security options', () => {
        const res = buildResponse();
        clearCsrfCookie(res);

        expect(res.clearCookie).toHaveBeenCalledWith(
            csrfCookieName,
            expect.objectContaining({
                httpOnly: securityConfig.csrf.cookieOptions.httpOnly,
                secure: securityConfig.csrf.cookieOptions.secure,
                sameSite: securityConfig.csrf.cookieOptions.sameSite,
                path: securityConfig.csrf.cookieOptions.path,
            }),
        );
    });

    it('requireCsrf skips validation for safe HTTP methods', () => {
        const req: any = {
            method: 'GET',
            cookies: {},
            get: vi.fn(),
        };
        const res = buildResponse();
        const next = vi.fn();

        requireCsrf(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });

    it('requireCsrf rejects missing token pair on state-changing requests', () => {
        const req: any = {
            method: 'POST',
            cookies: {},
            get: vi.fn(() => undefined),
        };
        const res = buildResponse();
        const next = vi.fn();

        requireCsrf(req, res, next);

        const err = next.mock.calls[0][0];
        expect(err).toBeTruthy();
        expect(err.code).toBe('FORBIDDEN');
        expect(err.message).toMatch(/CSRF token mancante/i);
    });

    it('requireCsrf rejects mismatched tokens', () => {
        const req: any = {
            method: 'PATCH',
            cookies: {
                [csrfCookieName]: 'cookie-token',
            },
            get: vi.fn((headerName: string) => (headerName === csrfHeaderName ? 'header-token' : undefined)),
        };
        const res = buildResponse();
        const next = vi.fn();

        requireCsrf(req, res, next);

        const err = next.mock.calls[0][0];
        expect(err).toBeTruthy();
        expect(err.code).toBe('FORBIDDEN');
        expect(err.message).toMatch(/non valido/i);
    });

    it('requireCsrf accepts matching cookie and header token', () => {
        const req: any = {
            method: 'DELETE',
            cookies: {
                [csrfCookieName]: 'same-token',
            },
            get: vi.fn((headerName: string) => (headerName === csrfHeaderName ? 'same-token' : undefined)),
        };
        const res = buildResponse();
        const next = vi.fn();

        requireCsrf(req, res, next);
        expect(next).toHaveBeenCalledWith();
    });
});

