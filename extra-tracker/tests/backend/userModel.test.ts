// @vitest-environment node

import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const User = require('../../server/models/User');

const getUserArgon2Module = () => {
    const argon2Entry = Object.values(require.cache).find(
        (entry: any) =>
            typeof entry?.filename === 'string' &&
            entry.filename.includes('/server/node_modules/argon2/')
    ) as { exports?: any } | undefined;

    if (!argon2Entry?.exports) {
        throw new Error('argon2 module not found in require cache');
    }

    return argon2Entry.exports;
};

const buildUser = (overrides: Record<string, any> = {}) =>
    new User({
        email: 'user@example.com',
        password: 'hashed-password',
        ...overrides,
    });

const mockSave = (user: any) => {
    const save = vi.fn().mockResolvedValue(user);
    user.save = save;
    return save;
};

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('server/models/User (schema + statics)', () => {
    it('applies defaults and normalizes email', () => {
        const user = buildUser({ email: '  TEST@EXAMPLE.COM  ' });

        expect(user.email).toBe('test@example.com');
        expect(user.role).toBe('user');
        expect(user.twoFactorEnabled).toBe(false);
        expect(user.preferences.language).toBe('it');
        expect(user.maxSessions).toBe(5);
    });

    it('fails validation when email format is invalid', () => {
        const user = buildUser({ email: 'invalid-email' });
        const err = user.validateSync();

        expect(err).toBeDefined();
        expect(err.errors.email).toBeDefined();
    });

    it('fails validation when password is missing', () => {
        const user = new User({ email: 'valid@example.com' });
        const err = user.validateSync();

        expect(err).toBeDefined();
        expect(err.errors.password).toBeDefined();
    });

    it('requires trusted device fingerprint when a device is provided', () => {
        const user = buildUser({
            trustedDevices: [{ name: 'No fingerprint' }],
        });
        const err = user.validateSync();

        expect(err).toBeDefined();
        expect(err.errors['trustedDevices.0.fingerprint']).toBeDefined();
    });

    it('findForLogin lowercases email and selects hidden auth fields', () => {
        const select = vi.fn().mockReturnValue('query-result');
        const findOneSpy = vi.spyOn(User, 'findOne').mockReturnValue({ select } as any);

        const result = User.findForLogin('Admin@Example.COM');

        expect(findOneSpy).toHaveBeenCalledWith({ email: 'admin@example.com' });
        expect(select).toHaveBeenCalledWith('+password +twoFactorSecret +twoFactorBackupCodes');
        expect(result).toBe('query-result');
    });

    it('findByRefreshToken selects hidden refresh token fields', () => {
        const select = vi.fn().mockReturnValue('refresh-query');
        const findByIdSpy = vi.spyOn(User, 'findById').mockReturnValue({ select } as any);

        const result = User.findByRefreshToken('user-id-1');

        expect(findByIdSpy).toHaveBeenCalledWith('user-id-1');
        expect(select).toHaveBeenCalledWith('+refreshTokens +gracePeriodTokens +twoFactorEnabled +twoFactorSecret');
        expect(result).toBe('refresh-query');
    });
});

describe('server/models/User (security/session methods)', () => {
    it('increments failed attempts and does not lock below threshold', async () => {
        const user = buildUser({ failedLoginAttempts: 1, isLocked: false });
        const saveSpy = mockSave(user);

        await user.incrementFailedAttempts();

        expect(user.failedLoginAttempts).toBe(2);
        expect(user.isLocked).toBe(false);
        expect(user.lastFailedLogin).toBeInstanceOf(Date);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('locks account when failed attempts reach threshold', async () => {
        const user = buildUser({ failedLoginAttempts: 4, isLocked: false });
        const saveSpy = mockSave(user);
        const now = Date.now();

        await user.incrementFailedAttempts();

        expect(user.failedLoginAttempts).toBe(5);
        expect(user.isLocked).toBe(true);
        expect(user.lockUntil).toBeInstanceOf(Date);
        expect(user.lockUntil.getTime()).toBeGreaterThan(now);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('resets failed attempts and unlock state', async () => {
        const user = buildUser({
            failedLoginAttempts: 9,
            isLocked: true,
            lockUntil: new Date(Date.now() + 30_000),
            lastFailedLogin: new Date(),
        });
        const saveSpy = mockSave(user);

        await user.resetFailedAttempts();

        expect(user.failedLoginAttempts).toBe(0);
        expect(user.isLocked).toBe(false);
        expect(user.lockUntil).toBeUndefined();
        expect(user.lastFailedLogin).toBeUndefined();
        expect(user.lastLoginAt).toBeInstanceOf(Date);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('isAccountLocked returns false when lock flags are incomplete', () => {
        const unlocked = buildUser({ isLocked: false });
        expect(unlocked.isAccountLocked()).toBe(false);

        const noExpiry = buildUser({ isLocked: true, lockUntil: undefined });
        expect(noExpiry.isAccountLocked()).toBe(false);
    });

    it('isAccountLocked auto-unlocks when lock timeout has expired', () => {
        const user = buildUser({
            isLocked: true,
            failedLoginAttempts: 8,
            lockUntil: new Date(Date.now() - 1_000),
        });

        const locked = user.isAccountLocked();

        expect(locked).toBe(false);
        expect(user.isLocked).toBe(false);
        expect(user.lockUntil).toBeUndefined();
        expect(user.failedLoginAttempts).toBe(0);
    });

    it('isAccountLocked returns true while lock timeout is still active', () => {
        const user = buildUser({
            isLocked: true,
            lockUntil: new Date(Date.now() + 60_000),
        });

        expect(user.isAccountLocked()).toBe(true);
    });

    it('findSessionByHash handles empty sessions and returns matching token', () => {
        const user = buildUser();
        user.refreshTokens = undefined;
        expect(user.findSessionByHash('missing')).toBeNull();

        user.refreshTokens = [
            { hash: 'a1', jti: '1' },
            { hash: 'b2', jti: '2' },
        ];
        expect(user.findSessionByHash('b2')?.jti).toBe('2');
        expect(user.findSessionByHash('zzz')).toBeUndefined();
    });

    it('findInGracePeriod returns only non-expired token matches', () => {
        const user = buildUser();
        user.gracePeriodTokens = undefined;
        expect(user.findInGracePeriod('token')).toBeNull();

        user.gracePeriodTokens = [
            { hash: 'expired', expiresAt: new Date(Date.now() - 1_000) },
            { hash: 'valid', expiresAt: new Date(Date.now() + 10_000) },
        ];

        expect(user.findInGracePeriod('expired')).toBeUndefined();
        expect(user.findInGracePeriod('valid')?.hash).toBe('valid');
    });

    it('removeFromGracePeriod removes only requested hash and saves', async () => {
        const user = buildUser({
            gracePeriodTokens: [
                { hash: 'keep-1', expiresAt: new Date(Date.now() + 10_000) },
                { hash: 'drop', expiresAt: new Date(Date.now() + 10_000) },
                { hash: 'keep-2', expiresAt: new Date(Date.now() + 10_000) },
            ],
        });
        const saveSpy = mockSave(user);

        await user.removeFromGracePeriod('drop');

        expect(user.gracePeriodTokens.map((token: any) => token.hash)).toEqual(['keep-1', 'keep-2']);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('cleanExpiredGracePeriodTokens ignores missing list and drops expired entries', () => {
        const user = buildUser();
        user.gracePeriodTokens = undefined;
        expect(() => user.cleanExpiredGracePeriodTokens()).not.toThrow();

        user.gracePeriodTokens = [
            { hash: 'old', expiresAt: new Date(Date.now() - 5_000) },
            { hash: 'new', expiresAt: new Date(Date.now() + 5_000) },
        ];
        user.cleanExpiredGracePeriodTokens();

        expect(user.gracePeriodTokens).toHaveLength(1);
        expect(user.gracePeriodTokens[0].hash).toBe('new');
    });

    it('removeSessionByHash removes matching refresh session and saves', async () => {
        const user = buildUser({
            refreshTokens: [{ hash: 'keep' }, { hash: 'drop' }],
        });
        const saveSpy = mockSave(user);

        await user.removeSessionByHash('drop');

        expect(user.refreshTokens.map((session: any) => session.hash)).toEqual(['keep']);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('removeAllSessions clears refresh, grace and trusted devices', async () => {
        const user = buildUser({
            refreshTokens: [{ hash: 'r1' }],
            gracePeriodTokens: [{ hash: 'g1', expiresAt: new Date(Date.now() + 1_000) }],
            trustedDevices: [{ fingerprint: 'fp-1', name: 'Chrome' }],
        });
        const saveSpy = mockSave(user);

        await user.removeAllSessions();

        expect(user.refreshTokens).toEqual([]);
        expect(user.gracePeriodTokens).toEqual([]);
        expect(user.trustedDevices).toEqual([]);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });
});

describe('server/models/User (trusted devices + password history + GDPR)', () => {
    it('addTrustedDevice deduplicates fingerprint, appends fresh timestamps and saves', async () => {
        const user = buildUser({
            trustedDevices: [
                { fingerprint: 'fp-1', name: 'Old Device', trustedAt: new Date(0), lastUsedAt: new Date(0) },
                { fingerprint: 'fp-2', name: 'Other Device' },
            ],
        });
        const saveSpy = mockSave(user);

        await user.addTrustedDevice({
            fingerprint: 'fp-1',
            name: 'New Device',
            browser: 'Chrome',
            os: 'macOS',
            ip: '127.0.0.1',
        });

        expect(user.trustedDevices).toHaveLength(2);
        expect(user.trustedDevices.filter((device: any) => device.fingerprint === 'fp-1')).toHaveLength(1);
        const updated = user.trustedDevices.find((device: any) => device.fingerprint === 'fp-1');
        expect(updated.name).toBe('New Device');
        expect(updated.trustedAt).toBeInstanceOf(Date);
        expect(updated.lastUsedAt).toBeInstanceOf(Date);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('addTrustedDevice keeps only the latest 10 entries', async () => {
        const trustedDevices = Array.from({ length: 10 }, (_, i) => ({
            fingerprint: `fp-${i + 1}`,
            name: `Device ${i + 1}`,
        }));
        const user = buildUser({ trustedDevices });
        const saveSpy = mockSave(user);

        await user.addTrustedDevice({
            fingerprint: 'fp-11',
            name: 'Newest',
        });

        expect(user.trustedDevices).toHaveLength(10);
        expect(user.trustedDevices.some((device: any) => device.fingerprint === 'fp-1')).toBe(false);
        expect(user.trustedDevices.some((device: any) => device.fingerprint === 'fp-11')).toBe(true);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('isTrustedDevice and revokeTrustedDevice work for positive/negative fingerprints', async () => {
        const user = buildUser({
            trustedDevices: [
                { fingerprint: 'phone-1', name: 'Phone' },
                { fingerprint: 'laptop-1', name: 'Laptop' },
            ],
        });
        const saveSpy = mockSave(user);

        expect(user.isTrustedDevice('phone-1')).toBe(true);
        expect(user.isTrustedDevice('missing')).toBe(false);

        await user.revokeTrustedDevice('phone-1');
        expect(user.trustedDevices.map((device: any) => device.fingerprint)).toEqual(['laptop-1']);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('addToPasswordHistory appends hash, trims to last 5 and saves', async () => {
        const user = buildUser({
            passwordHistory: [
                { hash: 'h1', changedAt: new Date(1) },
                { hash: 'h2', changedAt: new Date(2) },
                { hash: 'h3', changedAt: new Date(3) },
                { hash: 'h4', changedAt: new Date(4) },
                { hash: 'h5', changedAt: new Date(5) },
            ],
        });
        const saveSpy = mockSave(user);

        await user.addToPasswordHistory('h6');

        expect(user.passwordHistory).toHaveLength(5);
        expect(user.passwordHistory.map((entry: any) => entry.hash)).toEqual(['h2', 'h3', 'h4', 'h5', 'h6']);
        expect(user.passwordChangedAt).toBeInstanceOf(Date);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('addToPasswordHistory keeps all entries when history is below trim threshold', async () => {
        const user = buildUser({
            passwordHistory: [
                { hash: 'h1', changedAt: new Date(1) },
                { hash: 'h2', changedAt: new Date(2) },
            ],
        });
        const saveSpy = mockSave(user);

        await user.addToPasswordHistory('h3');

        expect(user.passwordHistory).toHaveLength(3);
        expect(user.passwordHistory.map((entry: any) => entry.hash)).toEqual(['h1', 'h2', 'h3']);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('isPasswordInHistory returns true on first matching hash', async () => {
        const argon2 = getUserArgon2Module();
        const verifySpy = vi
            .spyOn(argon2, 'verify')
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(true);

        const user = buildUser({
            passwordHistory: [{ hash: 'h1' }, { hash: 'h2' }, { hash: 'h3' }],
        });

        const found = await user.isPasswordInHistory('candidate-password');

        expect(found).toBe(true);
        expect(verifySpy).toHaveBeenCalledTimes(2);
    });

    it('isPasswordInHistory ignores verify errors and continues scan', async () => {
        const argon2 = getUserArgon2Module();
        const verifySpy = vi
            .spyOn(argon2, 'verify')
            .mockRejectedValueOnce(new Error('Corrupted hash'))
            .mockResolvedValueOnce(false);

        const user = buildUser({
            passwordHistory: [{ hash: 'broken' }, { hash: 'valid-but-different' }],
        });

        const found = await user.isPasswordInHistory('candidate-password');

        expect(found).toBe(false);
        expect(verifySpy).toHaveBeenCalledTimes(2);
    });

    it('softDelete anonymizes user and removes sensitive fields', async () => {
        const user = buildUser({
            refreshTokens: [{ hash: 'r1' }],
            twoFactorSecret: 'totp-secret',
            twoFactorBackupCodes: ['backup-1'],
            trustedDevices: [{ fingerprint: 'fp-1', name: 'Device' }],
            isActive: true,
        });
        const saveSpy = mockSave(user);

        await user.softDelete('user-requested');

        expect(user.deletedAt).toBeInstanceOf(Date);
        expect(user.deletedReason).toBe('user-requested');
        expect(user.email).toContain('deleted_');
        expect(user.email).toContain('_user@example.com');
        expect(user.isActive).toBe(false);
        expect(user.password).toBeUndefined();
        expect(user.refreshTokens).toEqual([]);
        expect(user.twoFactorSecret).toBeUndefined();
        expect(user.twoFactorBackupCodes).toEqual([]);
        expect(user.trustedDevices).toEqual([]);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('pre-save hook updates updatedAt and calls next', () => {
        const saveHooks = User.schema.s.hooks._pres.get('save') || [];
        const updateTimestampHook = saveHooks
            .map((hook: any) => hook.fn)
            .find((fn: Function) => fn.toString().includes('updatedAt = Date.now'));

        expect(typeof updateTimestampHook).toBe('function');

        const user = buildUser();
        user.updatedAt = new Date(0);
        const next = vi.fn();

        updateTimestampHook.call(user, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(user.updatedAt).toBeInstanceOf(Date);
        expect(user.updatedAt.getTime()).toBeGreaterThan(0);
    });
});
