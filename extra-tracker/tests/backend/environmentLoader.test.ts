// @vitest-environment node

import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);

const INDEX_MODULE = '../../server/ENVIRONMENTS/index.js';
const DEV_MODULE = '../../server/ENVIRONMENTS/environments.js';
const PROD_MODULE = '../../server/ENVIRONMENTS/environments.prod.js';

const MUTATED_ENV_KEYS = [
    'ENVIRONMENT',
    'NODE_ENV',
    'MONGO_URI',
    'JWT_SECRET',
    'FRONTEND_URL',
    'BACKEND_URL',
] as const;

const clearMutatedEnv = () => {
    MUTATED_ENV_KEYS.forEach((key) => {
        delete process.env[key];
    });
};

const loadFreshEnvironmentIndex = () => {
    delete require.cache[require.resolve(INDEX_MODULE)];
    delete require.cache[require.resolve(DEV_MODULE)];
    delete require.cache[require.resolve(PROD_MODULE)];
    return require(INDEX_MODULE);
};

const setProductionRequiredVars = (overrides: Partial<Record<(typeof MUTATED_ENV_KEYS)[number], string>> = {}) => {
    process.env.MONGO_URI = 'mongodb://prod-db:27017/extratracker';
    process.env.JWT_SECRET = 's'.repeat(32);
    process.env.FRONTEND_URL = 'https://app.example.com';
    process.env.BACKEND_URL = 'https://api.example.com';

    Object.entries(overrides).forEach(([key, value]) => {
        if (value === undefined) {
            delete process.env[key as keyof typeof process.env];
        } else {
            process.env[key as keyof typeof process.env] = value;
        }
    });
};

const mockExitToThrow = () =>
    vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
        throw new Error(`process.exit:${code}`);
    }) as never);

describe('server/ENVIRONMENTS/index.js', () => {
    beforeEach(() => {
        clearMutatedEnv();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        clearMutatedEnv();
        vi.restoreAllMocks();
    });

    it('defaults to development when no explicit environment is provided', () => {
        const envModule = loadFreshEnvironmentIndex();

        expect(envModule.environment).toBe('development');
        expect(envModule.isDevelopment).toBe(true);
        expect(envModule.isProduction).toBe(false);
        expect(envModule.config.server.nodeEnv).toBe('development');

        expect(console.log).toHaveBeenCalledWith('🔧 Environment: development');
    });

    it('uses explicit ENVIRONMENT aliases with higher priority than NODE_ENV', () => {
        process.env.ENVIRONMENT = 'prod';
        process.env.NODE_ENV = 'development';
        setProductionRequiredVars();

        const prodFromAlias = loadFreshEnvironmentIndex();
        expect(prodFromAlias.environment).toBe('production');
        expect(prodFromAlias.isProduction).toBe(true);

        process.env.ENVIRONMENT = 'dev';
        process.env.NODE_ENV = 'production';

        const devFromAlias = loadFreshEnvironmentIndex();
        expect(devFromAlias.environment).toBe('development');
        expect(devFromAlias.isDevelopment).toBe(true);
    });

    it('falls back to NODE_ENV when ENVIRONMENT is invalid', () => {
        process.env.ENVIRONMENT = 'staging';
        process.env.NODE_ENV = 'production';
        setProductionRequiredVars();

        const envModule = loadFreshEnvironmentIndex();

        expect(envModule.environment).toBe('production');
        expect(envModule.isProduction).toBe(true);
    });

    it('exits in production when required variables are missing', () => {
        process.env.ENVIRONMENT = 'production';
        const exitSpy = mockExitToThrow();

        expect(() => loadFreshEnvironmentIndex()).toThrowError('process.exit:1');
        expect(exitSpy).toHaveBeenCalledWith(1);

        const errorMessages = (console.error as any).mock.calls.flat().join(' ');
        expect(errorMessages).toContain('Variabili di ambiente mancanti');
        expect(errorMessages).toContain('MONGO_URI');
        expect(errorMessages).toContain('JWT_SECRET');
        expect(errorMessages).toContain('FRONTEND_URL');
        expect(errorMessages).toContain('BACKEND_URL');
    });

    it('exits in production when JWT secret is shorter than 32 chars', () => {
        process.env.ENVIRONMENT = 'production';
        setProductionRequiredVars({ JWT_SECRET: 'short-secret' });
        const exitSpy = mockExitToThrow();

        expect(() => loadFreshEnvironmentIndex()).toThrowError('process.exit:1');
        expect(exitSpy).toHaveBeenCalledWith(1);

        const errorMessages = (console.error as any).mock.calls.flat().join(' ');
        expect(errorMessages).toContain('JWT_SECRET deve essere almeno 32 caratteri');
    });

    it('loads production config successfully when required vars are valid', () => {
        process.env.ENVIRONMENT = 'production';
        process.env.NODE_ENV = 'production';
        setProductionRequiredVars({ JWT_SECRET: 'x'.repeat(48) });

        const exitSpy = vi.spyOn(process, 'exit');
        const envModule = loadFreshEnvironmentIndex();

        expect(envModule.environment).toBe('production');
        expect(envModule.isProduction).toBe(true);
        expect(envModule.isDevelopment).toBe(false);
        expect(envModule.config.server.nodeEnv).toBe('production');
        expect(exitSpy).not.toHaveBeenCalled();

        expect(console.log).toHaveBeenCalledWith('🔧 Environment: production');
        expect(console.log).toHaveBeenCalledWith('🔧 NODE_ENV: production');
        expect(console.log).toHaveBeenCalledWith('🔧 ENVIRONMENT: production');
    });
});
