// @vitest-environment node

import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const User = require('../../server/models/User');
const { requireAdmin } = require('../../server/middleware/requireAdmin');

describe('server/middleware/requireAdmin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects requests without authenticated user in req', async () => {
        const req: any = {};
        const res: any = {};
        const next = vi.fn();

        await requireAdmin(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0][0];
        expect(err.code).toBe('UNAUTHORIZED');
        expect(err.message).toMatch(/Autenticazione richiesta/i);
    });

    it('rejects when user is not found in database', async () => {
        vi.spyOn(User, 'findById').mockReturnValue({
            select: vi.fn().mockResolvedValue(null),
        });

        const req: any = { user: { id: 'u-1' } };
        const res: any = {};
        const next = vi.fn();

        await requireAdmin(req, res, next);

        expect(User.findById).toHaveBeenCalledWith('u-1');
        const err = next.mock.calls[0][0];
        expect(err.code).toBe('UNAUTHORIZED');
        expect(err.message).toMatch(/Utente non trovato/i);
    });

    it('rejects non-admin users', async () => {
        vi.spyOn(User, 'findById').mockReturnValue({
            select: vi.fn().mockResolvedValue({ role: 'user' }),
        });

        const req: any = { user: { id: 'u-2' } };
        const res: any = {};
        const next = vi.fn();

        await requireAdmin(req, res, next);

        const err = next.mock.calls[0][0];
        expect(err.code).toBe('FORBIDDEN');
        expect(err.message).toMatch(/amministratori/i);
    });

    it('allows admin users and enriches req.user.role', async () => {
        vi.spyOn(User, 'findById').mockReturnValue({
            select: vi.fn().mockResolvedValue({ role: 'admin' }),
        });

        const req: any = { user: { id: 'admin-1' } };
        const res: any = {};
        const next = vi.fn();

        await requireAdmin(req, res, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.user.role).toBe('admin');
    });

    it('forwards unexpected db errors to next', async () => {
        const dbError = new Error('DB unavailable');
        vi.spyOn(User, 'findById').mockReturnValue({
            select: vi.fn().mockRejectedValue(dbError),
        });

        const req: any = { user: { id: 'u-3' } };
        const res: any = {};
        const next = vi.fn();

        await requireAdmin(req, res, next);

        expect(next).toHaveBeenCalledWith(dbError);
    });
});
