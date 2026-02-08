// @vitest-environment node

import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);

const SECURITY_MODULE = '../../server/config/security.js';
const ENVIRONMENTS_MODULE = '../../server/ENVIRONMENTS';

type EnvModule = {
    config: any;
    isProduction: boolean;
};

const baseEnvModule = (): EnvModule => ({
    isProduction: false,
    config: {
        jwt: {
            secret: 'jwt-secret',
            accessTokenExpiry: '15m',
            refreshTokenExpiry: '7d',
            algorithm: 'HS256',
        },
        argon2: {
            type: 2,
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 4,
            hashLength: 32,
        },
        cookie: {
            name: 'accessToken',
            refreshName: 'refreshToken',
            sameSite: 'lax',
            secure: false,
            accessTokenMaxAge: 900000,
            refreshTokenMaxAge: 604800000,
            refreshTokenPath: '/api/auth/refresh',
        },
        csrf: {
            cookieName: 'csrfToken',
            headerName: 'X-CSRF-Token',
            tokenBytes: 32,
            cookieMaxAge: 604800000,
        },
        rateLimit: {
            general: { windowMs: 900000, max: 1000, enabled: false },
            auth: { windowMs: 900000, max: 15, skipSuccessfulRequests: true },
            ai: { windowMs: 3600000, max: 10, keyGenerator: 'userId' },
        },
        cors: {
            allowAllOrigins: false,
            allowedOrigins: [],
            allowedOriginPatterns: ['.netlify.app', '.vercel.app'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
        },
        helmet: {
            contentSecurityPolicy: false,
        },
        session: {
            maxActiveSessions: 10,
            refreshTokenExpiryDays: 7,
        },
        urls: {
            frontendUrl: 'https://app.example.com',
            backendUrl: 'https://api.example.com',
        },
    },
});

const deepMerge = <T extends Record<string, any>>(base: T, override: Partial<T>): T => {
    const output: any = { ...base };

    Object.keys(override).forEach((key) => {
        const incoming = (override as any)[key];
        const current = output[key];

        if (
            incoming &&
            typeof incoming === 'object' &&
            !Array.isArray(incoming) &&
            current &&
            typeof current === 'object' &&
            !Array.isArray(current)
        ) {
            output[key] = deepMerge(current, incoming);
        } else {
            output[key] = incoming;
        }
    });

    return output as T;
};

const loadSecurityWithEnv = (overrides: Partial<EnvModule> = {}) => {
    const securityPath = require.resolve(SECURITY_MODULE);
    const environmentsPath = require.resolve(ENVIRONMENTS_MODULE);

    const originalEnvironmentsCache = require.cache[environmentsPath];
    const fakeEnv = deepMerge(baseEnvModule(), overrides);

    delete require.cache[securityPath];
    require.cache[environmentsPath] = {
        id: environmentsPath,
        filename: environmentsPath,
        loaded: true,
        exports: fakeEnv,
        children: [],
        path: '',
        paths: [],
        parent: null,
        isPreloading: false,
    } as any;

    const loaded = require(SECURITY_MODULE);

    delete require.cache[securityPath];
    if (originalEnvironmentsCache) {
        require.cache[environmentsPath] = originalEnvironmentsCache;
    } else {
        delete require.cache[environmentsPath];
    }

    return loaded;
};

const callCors = (validator: (origin: string | undefined, callback: (err: any, allowed?: boolean) => void) => void, origin?: string) =>
    new Promise<{ err: any; allowed?: boolean }>((resolve) => {
        validator(origin, (err, allowed) => resolve({ err, allowed }));
    });

afterEach(() => {
    vi.restoreAllMocks();
});

describe('server/config/security (blackbox config behavior)', () => {
    it('uses explicit sameSite/secure when configured', () => {
        const security = loadSecurityWithEnv({
            isProduction: true,
            config: {
                cookie: {
                    sameSite: 'strict',
                    secure: false,
                },
            },
        });

        expect(security.cookie.sameSitePolicy).toBe('strict');
        expect(security.cookie.options.sameSite).toBe('strict');
        expect(security.cookie.options.secure).toBe(false);
        expect(security.csrf.cookieOptions.sameSite).toBe('strict');
    });

    it('falls back to lax policy in development when sameSite is not configured', () => {
        const security = loadSecurityWithEnv({
            isProduction: false,
            config: {
                cookie: {
                    sameSite: undefined,
                    secure: undefined,
                },
            },
        });

        expect(security.cookie.sameSitePolicy).toBe('lax');
        expect(security.cookie.requiresSecure).toBe(false);
        expect(security.cookie.options.secure).toBe(false);
    });

    it('uses none + secure in production when cross-origin and sameSite is unset', () => {
        const security = loadSecurityWithEnv({
            isProduction: true,
            config: {
                cookie: {
                    sameSite: undefined,
                    secure: undefined,
                },
                urls: {
                    frontendUrl: 'https://app.example.com',
                    backendUrl: 'https://api.example.com',
                },
            },
        });

        expect(security.cookie.sameSitePolicy).toBe('none');
        expect(security.cookie.requiresSecure).toBe(true);
        expect(security.cookie.options.secure).toBe(true);
        expect(security.csrf.cookieOptions.sameSite).toBe('none');
    });

    it('uses lax policy in production when frontend/backend are same-origin', () => {
        const security = loadSecurityWithEnv({
            isProduction: true,
            config: {
                cookie: {
                    sameSite: undefined,
                    secure: undefined,
                },
                urls: {
                    frontendUrl: 'https://example.com/app',
                    backendUrl: 'https://example.com/api',
                },
            },
        });

        expect(security.cookie.sameSitePolicy).toBe('lax');
        expect(security.cookie.requiresSecure).toBe(false);
        expect(security.cookie.options.secure).toBe(true);
    });

    it('treats invalid URL config as cross-origin fallback', () => {
        const security = loadSecurityWithEnv({
            isProduction: true,
            config: {
                cookie: {
                    sameSite: undefined,
                    secure: undefined,
                },
                urls: {
                    frontendUrl: 'not-a-url',
                    backendUrl: 'still-not-a-url',
                },
            },
        });

        expect(security.cookie.sameSitePolicy).toBe('none');
        expect(security.cookie.options.secure).toBe(true);
    });

    it('allows CORS request when origin is missing or allowAllOrigins is true', async () => {
        const securityMissingOrigin = loadSecurityWithEnv();
        const result1 = await callCors(securityMissingOrigin.cors.origin, undefined);
        expect(result1).toEqual({ err: null, allowed: true });

        const securityAllowAll = loadSecurityWithEnv({
            config: { cors: { allowAllOrigins: true } },
        });
        const result2 = await callCors(securityAllowAll.cors.origin, 'https://random-site.com');
        expect(result2).toEqual({ err: null, allowed: true });
    });

    it('allows explicit whitelist and frontend URL with trailing slash normalization', async () => {
        const security = loadSecurityWithEnv({
            config: {
                urls: {
                    frontendUrl: 'https://frontend.example.com/',
                },
                cors: {
                    allowedOrigins: ['https://admin.example.com'],
                },
            },
        });

        const fromWhitelist = await callCors(security.cors.origin, 'https://admin.example.com');
        expect(fromWhitelist).toEqual({ err: null, allowed: true });

        const fromFrontend = await callCors(security.cors.origin, 'https://frontend.example.com/');
        expect(fromFrontend).toEqual({ err: null, allowed: true });
    });

    it('allows CORS based on both suffix and substring patterns', async () => {
        const security = loadSecurityWithEnv({
            config: {
                cors: {
                    allowedOriginPatterns: ['.netlify.app', 'trusted-fragment'],
                },
            },
        });

        const suffixMatch = await callCors(security.cors.origin, 'https://my-site.netlify.app');
        expect(suffixMatch).toEqual({ err: null, allowed: true });

        const substringMatch = await callCors(security.cors.origin, 'https://cdn.trusted-fragment.io');
        expect(substringMatch).toEqual({ err: null, allowed: true });
    });

    it('blocks non-whitelisted origins and returns explicit CORS error', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const security = loadSecurityWithEnv({
            config: {
                cors: {
                    allowedOrigins: ['https://allowed.example.com'],
                    allowedOriginPatterns: ['.allowed.com'],
                },
                urls: {
                    frontendUrl: 'https://frontend.example.com',
                },
            },
        });

        const result = await callCors(security.cors.origin, 'https://evil.example.com');

        expect(result.allowed).toBeUndefined();
        expect(result.err).toBeInstanceOf(Error);
        expect(result.err.message).toContain('Bloccato dalla policy CORS');
        expect(warnSpy).toHaveBeenCalledWith('🛑 CORS BLOCCATO: https://evil.example.com');
    });
});
