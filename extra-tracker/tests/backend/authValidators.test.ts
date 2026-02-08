// @vitest-environment node

import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
    registerSchema,
    loginSchema,
    changePasswordSchema,
    resetPasswordRequestSchema,
    resetPasswordConfirmSchema,
    validate,
    validateMiddleware,
} = require('../../server/validators/authValidators');

describe('server/validators/authValidators.validate', () => {
    it('validates register payload and sanitizes email', () => {
        const result = validate(registerSchema, {
            email: 'TeSt@Example.com',
            password: 'StrongPass123',
            acceptTerms: true,
        });

        expect(result.success).toBe(true);
        expect(result.data.email).toBe('test@example.com');
    });

    it('rejects register payload without terms acceptance', () => {
        const result = validate(registerSchema, {
            email: 'test@example.com',
            password: 'StrongPass123',
            acceptTerms: false,
        });

        expect(result.success).toBe(false);
        expect(result.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ field: 'acceptTerms' }),
            ]),
        );
    });

    it('rejects weak passwords in register schema', () => {
        const result = validate(registerSchema, {
            email: 'test@example.com',
            password: 'weakpass',
            acceptTerms: true,
        });

        expect(result.success).toBe(false);
        expect(result.errors[0].message).toMatch(/maiuscola|minuscola|numero/i);
    });

    it('validates login payload with minimal password requirements', () => {
        const result = validate(loginSchema, {
            email: 'LOGIN@EXAMPLE.COM',
            password: 'a',
        });

        expect(result.success).toBe(true);
        expect(result.data.email).toBe('login@example.com');
    });

    it('rejects change password payload with mismatching confirmation', () => {
        const result = validate(changePasswordSchema, {
            currentPassword: 'OldPass123',
            newPassword: 'NewPass123',
            confirmPassword: 'Different123',
        });

        expect(result.success).toBe(false);
        expect(result.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    field: 'confirmPassword',
                    message: expect.stringMatching(/non coincidono/i),
                }),
            ]),
        );
    });

    it('rejects change password payload when new equals current', () => {
        const result = validate(changePasswordSchema, {
            currentPassword: 'SamePass123',
            newPassword: 'SamePass123',
            confirmPassword: 'SamePass123',
        });

        expect(result.success).toBe(false);
        expect(result.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ field: 'newPassword' }),
            ]),
        );
    });

    it('validates reset request and reset confirm schemas', () => {
        const requestResult = validate(resetPasswordRequestSchema, { email: 'reset@example.com' });
        const confirmResult = validate(resetPasswordConfirmSchema, {
            token: 'tok_123',
            newPassword: 'BrandNew123',
        });

        expect(requestResult.success).toBe(true);
        expect(confirmResult.success).toBe(true);
    });

    it('rejects reset confirm when token is missing', () => {
        const result = validate(resetPasswordConfirmSchema, {
            token: '',
            newPassword: 'BrandNew123',
        });
        expect(result.success).toBe(false);
        expect(result.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ field: 'token' }),
            ]),
        );
    });
});

describe('server/validators/authValidators.validateMiddleware', () => {
    it('returns 400 with validation payload when body is invalid', () => {
        const middleware = validateMiddleware(registerSchema);
        const req = {
            body: {
                email: 'not-an-email',
                password: 'short',
                acceptTerms: false,
            },
        };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        const next = vi.fn();

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: 'VALIDATION_ERROR',
                    details: expect.any(Array),
                }),
            }),
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('calls next and replaces req.body with validated/sanitized data', () => {
        const middleware = validateMiddleware(loginSchema);
        const req = {
            body: {
                email: 'USER@Example.com',
                password: 'my-pass',
            },
        };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        const next = vi.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.body.email).toBe('user@example.com');
        expect(req.body.password).toBe('my-pass');
    });
});
