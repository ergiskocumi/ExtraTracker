// @vitest-environment node

import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const DEV_MODULE = '../../server/ENVIRONMENTS/environments.js';
const PROD_MODULE = '../../server/ENVIRONMENTS/environments.prod.js';

const MUTATED_ENV_KEYS = [
    'PORT',
    'TRUST_PROXY',
    'MONGO_URI',
    'MONGO_MAX_POOL_SIZE',
    'MONGO_SERVER_SELECTION_TIMEOUT',
    'REDIS_URL',
    'REDIS_CONNECT_TIMEOUT',
    'JWT_SECRET',
    'JWT_ACCESS_TOKEN_EXPIRY',
    'JWT_REFRESH_TOKEN_EXPIRY',
    'JWT_ALGORITHM',
    'ARGON2_TYPE',
    'ARGON2_MEMORY_COST',
    'ARGON2_TIME_COST',
    'ARGON2_PARALLELISM',
    'ARGON2_HASH_LENGTH',
    'COOKIE_NAME',
    'COOKIE_REFRESH_NAME',
    'COOKIE_SAME_SITE',
    'COOKIE_SECURE',
    'COOKIE_ACCESS_TOKEN_MAX_AGE',
    'COOKIE_REFRESH_TOKEN_MAX_AGE',
    'COOKIE_REFRESH_TOKEN_PATH',
    'CSRF_COOKIE_NAME',
    'CSRF_HEADER_NAME',
    'CSRF_TOKEN_BYTES',
    'CSRF_COOKIE_MAX_AGE',
    'DATA_ENCRYPTION_KEY',
    'RATE_LIMIT_GENERAL_WINDOW_MS',
    'RATE_LIMIT_GENERAL_MAX',
    'RATE_LIMIT_GENERAL_ENABLED',
    'RATE_LIMIT_AUTH_WINDOW_MS',
    'RATE_LIMIT_AUTH_MAX',
    'RATE_LIMIT_AUTH_SKIP_SUCCESS',
    'RATE_LIMIT_AI_WINDOW_MS',
    'RATE_LIMIT_AI_MAX',
    'CORS_ALLOWED_ORIGINS',
    'CORS_ALLOWED_ORIGIN_PATTERNS',
    'HELMET_FRAMEGUARD_ACTION',
    'HELMET_CORP_POLICY',
    'HELMET_REFERRER_POLICY',
    'HELMET_HSTS_MAX_AGE',
    'HELMET_HSTS_INCLUDE_SUBDOMAINS',
    'HELMET_HSTS_PRELOAD',
    'SESSION_MAX_ACTIVE_SESSIONS',
    'SESSION_REFRESH_TOKEN_EXPIRY_DAYS',
    'BODY_PARSER_JSON_LIMIT',
    'BODY_PARSER_URLENCODED_LIMIT',
    'BODY_PARSER_IMPORT_JSON_LIMIT',
    'FRONTEND_URL',
    'BACKEND_URL',
    'MONITORING_EVENT_METRICS_INTERVAL',
    'MONITORING_ENABLE_EVENT_METRICS_LOGGING',
] as const;

const clearMutatedEnv = () => {
    MUTATED_ENV_KEYS.forEach((key) => {
        delete process.env[key];
    });
};

const loadFresh = (modulePath: string) => {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
};

afterEach(() => {
    clearMutatedEnv();
});

describe('server/ENVIRONMENTS/environments.js (development)', () => {
    it('uses development-safe defaults when env is missing', () => {
        clearMutatedEnv();

        const config = loadFresh(DEV_MODULE);

        expect(config.server.nodeEnv).toBe('development');
        expect(config.server.port).toBe(3001);
        expect(config.database.mongoUri).toContain('mongodb://localhost');
        expect(config.redis.url).toBeNull();

        expect(config.cors.allowAllOrigins).toBe(true);
        expect(config.cors.allowedOrigins).toEqual([]);
        expect(config.cors.allowedOriginPatterns).toEqual(['.netlify.app', '.vercel.app']);

        expect(config.cookie.secure).toBe(false);
        expect(config.rateLimit.general.enabled).toBe(false);
        expect(config.rateLimit.auth.skipSuccessfulRequests).toBe(true);
        expect(config.monitoring.enableEventMetricsLogging).toBe(true);
    });

    it('parses numeric values and maps CORS lists from env', () => {
        process.env.PORT = '4100';
        process.env.MONGO_MAX_POOL_SIZE = '22';
        process.env.MONGO_SERVER_SELECTION_TIMEOUT = '8800';
        process.env.REDIS_URL = 'redis://127.0.0.1:6379/0';
        process.env.REDIS_CONNECT_TIMEOUT = '9000';
        process.env.JWT_SECRET = 'dev-secret-from-env';
        process.env.JWT_ACCESS_TOKEN_EXPIRY = '30m';
        process.env.JWT_REFRESH_TOKEN_EXPIRY = '14d';
        process.env.JWT_ALGORITHM = 'HS384';
        process.env.COOKIE_SECURE = 'true';
        process.env.RATE_LIMIT_GENERAL_ENABLED = 'true';
        process.env.CORS_ALLOWED_ORIGINS = 'https://one.dev, https://two.dev';
        process.env.CORS_ALLOWED_ORIGIN_PATTERNS = '.dev-one.com, .dev-two.com';
        process.env.MONITORING_ENABLE_EVENT_METRICS_LOGGING = 'false';

        const config = loadFresh(DEV_MODULE);

        expect(config.server.port).toBe('4100');
        expect(config.database.maxPoolSize).toBe(22);
        expect(config.database.serverSelectionTimeoutMS).toBe(8800);
        expect(config.redis.url).toBe('redis://127.0.0.1:6379/0');
        expect(config.redis.connectTimeout).toBe(9000);

        expect(config.jwt.secret).toBe('dev-secret-from-env');
        expect(config.jwt.accessTokenExpiry).toBe('30m');
        expect(config.jwt.refreshTokenExpiry).toBe('14d');
        expect(config.jwt.algorithm).toBe('HS384');

        expect(config.cookie.secure).toBe(true);
        expect(config.rateLimit.general.enabled).toBe(true);
        expect(config.cors.allowedOrigins).toEqual(['https://one.dev', 'https://two.dev']);
        expect(config.cors.allowedOriginPatterns).toEqual(['.dev-one.com', '.dev-two.com']);
        expect(config.monitoring.enableEventMetricsLogging).toBe(false);
    });

    it('keeps auth skipSuccessfulRequests enabled even when explicitly set to false', () => {
        process.env.RATE_LIMIT_AUTH_SKIP_SUCCESS = 'false';

        const config = loadFresh(DEV_MODULE);

        expect(config.rateLimit.auth.skipSuccessfulRequests).toBe(true);
    });
});

describe('server/ENVIRONMENTS/environments.prod.js (production config object)', () => {
    it('applies production defaults when optional vars are absent', () => {
        clearMutatedEnv();

        const config = loadFresh(PROD_MODULE);

        expect(config.server.nodeEnv).toBe('production');
        expect(config.server.port).toBe(3001);
        expect(config.server.trustProxy).toBe(1);

        expect(config.cookie.secure).toBe(true);
        expect(config.rateLimit.auth.skipSuccessfulRequests).toBe(true);

        expect(config.cors.allowAllOrigins).toBe(false);
        expect(config.cors.allowedOrigins).toEqual([]);
        expect(config.cors.allowedOriginPatterns).toEqual(['.netlify.app', '.vercel.app']);

        expect(config.helmet.hsts.maxAge).toBe(31536000);
        expect(config.helmet.hsts.includeSubDomains).toBe(true);
        expect(config.helmet.hsts.preload).toBe(true);
    });

    it('parses production overrides and supports disabling secure toggles', () => {
        process.env.PORT = '5555';
        process.env.TRUST_PROXY = '2';
        process.env.MONGO_URI = 'mongodb://prod-db:27017/extratracker';
        process.env.JWT_SECRET = 'x'.repeat(64);
        process.env.REDIS_URL = 'redis://prod-redis:6379/0';

        process.env.COOKIE_SECURE = 'false';
        process.env.COOKIE_SAME_SITE = 'strict';
        process.env.RATE_LIMIT_AUTH_SKIP_SUCCESS = 'false';

        process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com, https://admin.example.com';
        process.env.CORS_ALLOWED_ORIGIN_PATTERNS = '.example.com, .example.org';

        process.env.HELMET_HSTS_MAX_AGE = '12345';
        process.env.HELMET_HSTS_INCLUDE_SUBDOMAINS = 'false';
        process.env.HELMET_HSTS_PRELOAD = 'false';

        process.env.FRONTEND_URL = 'https://app.example.com';
        process.env.BACKEND_URL = 'https://api.example.com';
        process.env.MONITORING_ENABLE_EVENT_METRICS_LOGGING = 'false';

        const config = loadFresh(PROD_MODULE);

        expect(config.server.port).toBe('5555');
        expect(config.server.trustProxy).toBe(2);

        expect(config.database.mongoUri).toBe('mongodb://prod-db:27017/extratracker');
        expect(config.redis.url).toBe('redis://prod-redis:6379/0');
        expect(config.jwt.secret).toBe('x'.repeat(64));

        expect(config.cookie.secure).toBe(false);
        expect(config.cookie.sameSite).toBe('strict');
        expect(config.rateLimit.auth.skipSuccessfulRequests).toBe(false);

        expect(config.cors.allowedOrigins).toEqual(['https://app.example.com', 'https://admin.example.com']);
        expect(config.cors.allowedOriginPatterns).toEqual(['.example.com', '.example.org']);

        expect(config.helmet.hsts.maxAge).toBe(12345);
        expect(config.helmet.hsts.includeSubDomains).toBe(false);
        expect(config.helmet.hsts.preload).toBe(false);

        expect(config.urls.frontendUrl).toBe('https://app.example.com');
        expect(config.urls.backendUrl).toBe('https://api.example.com');
        expect(config.monitoring.enableEventMetricsLogging).toBe(false);
    });
});
