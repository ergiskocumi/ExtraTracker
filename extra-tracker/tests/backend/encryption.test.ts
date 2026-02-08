// @vitest-environment node

import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);

const ENCRYPTION_MODULE = '../../server/utils/encryption';
const ENV_INDEX_MODULE = '../../server/ENVIRONMENTS/index.js';
const ENV_DEV_MODULE = '../../server/ENVIRONMENTS/environments.js';
const ENV_PROD_MODULE = '../../server/ENVIRONMENTS/environments.prod.js';

const loadEncryptionModule = () => {
    delete require.cache[require.resolve(ENCRYPTION_MODULE)];
    delete require.cache[require.resolve(ENV_INDEX_MODULE)];
    delete require.cache[require.resolve(ENV_DEV_MODULE)];
    delete require.cache[require.resolve(ENV_PROD_MODULE)];
    return require(ENCRYPTION_MODULE);
};

describe('server/utils/encryption', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        delete process.env.DATA_ENCRYPTION_KEY;
    });

    it('passes values through unchanged when encryption key is missing', () => {
        delete process.env.DATA_ENCRYPTION_KEY;
        const { encryptString, decryptString } = loadEncryptionModule();

        expect(encryptString('secret')).toBe('secret');
        expect(decryptString('plain-text')).toBe('plain-text');
    });

    it('passes values through when key format is invalid', () => {
        process.env.DATA_ENCRYPTION_KEY = 'invalid-key';
        const { encryptString } = loadEncryptionModule();

        expect(encryptString('secret')).toBe('secret');
    });

    it('encrypts and decrypts correctly with a valid hex key', () => {
        process.env.DATA_ENCRYPTION_KEY = 'a'.repeat(64);
        const { encryptString, decryptString, isEncrypted } = loadEncryptionModule();

        const encrypted = encryptString('very-sensitive');
        expect(encrypted).not.toBe('very-sensitive');
        expect(encrypted.startsWith('enc:')).toBe(true);
        expect(isEncrypted(encrypted)).toBe(true);

        const decrypted = decryptString(encrypted);
        expect(decrypted).toBe('very-sensitive');
    });

    it('does not re-encrypt values that are already encrypted', () => {
        process.env.DATA_ENCRYPTION_KEY = 'b'.repeat(64);
        const { encryptString } = loadEncryptionModule();

        const first = encryptString('payload');
        const second = encryptString(first);
        expect(second).toBe(first);
    });

    it('returns original string for malformed encrypted payloads', () => {
        process.env.DATA_ENCRYPTION_KEY = 'c'.repeat(64);
        const { decryptString } = loadEncryptionModule();

        expect(decryptString('enc:bad-format')).toBe('enc:bad-format');
        expect(decryptString('enc:one:two')).toBe('enc:one:two');
    });

    it('encrypts and decrypts only selected fields', () => {
        process.env.DATA_ENCRYPTION_KEY = 'd'.repeat(64);
        const { encryptFields, decryptFields, isEncrypted } = loadEncryptionModule();

        const source = {
            email: 'user@example.com',
            token: 'secret-token',
            untouched: 'visible',
        };

        const encrypted = encryptFields(source, ['token']);
        expect(encrypted).not.toBe(source);
        expect(encrypted.email).toBe('user@example.com');
        expect(encrypted.untouched).toBe('visible');
        expect(isEncrypted(encrypted.token)).toBe(true);

        const decrypted = decryptFields(encrypted, ['token']);
        expect(decrypted.token).toBe('secret-token');
        expect(decrypted.email).toBe('user@example.com');
    });

    it('handles nullish and non-string values safely', () => {
        process.env.DATA_ENCRYPTION_KEY = 'e'.repeat(64);
        const { encryptString, decryptString, encryptFields, decryptFields } = loadEncryptionModule();

        expect(encryptString(null)).toBeNull();
        expect(encryptString(undefined)).toBeUndefined();
        expect(encryptString('')).toBe('');
        expect(encryptString(123 as any)).toBe(123);
        expect(decryptString(456 as any)).toBe(456);
        expect(encryptFields(null, ['x'])).toBeNull();
        expect(decryptFields(undefined as any, ['x'])).toBeUndefined();
    });
});

