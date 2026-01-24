/**
 * FIELD-LEVEL ENCRYPTION UTILS
 *
 * Uses AES-256-GCM to encrypt sensitive fields at rest.
 * When no key is configured, values pass through unchanged.
 */

const crypto = require('crypto');
const { config: envConfig, isProduction } = require('../ENVIRONMENTS');
const logger = require('./logger');

const ENCRYPTION_PREFIX = 'enc:';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for GCM

let cachedKey = null;
let keyResolved = false;
let warnedMissingKey = false;
let warnedInvalidKey = false;

const resolveKey = () => {
    if (keyResolved) return cachedKey;
    keyResolved = true;

    const rawKey = envConfig.encryption?.key || '';
    if (!rawKey) {
        if (!warnedMissingKey) {
            warnedMissingKey = true;
            logger.warn('Security', 'DATA_ENCRYPTION_KEY non configurata: encryption disabilitata');
        }
        cachedKey = null;
        return cachedKey;
    }

    let keyBuffer = null;
    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
        keyBuffer = Buffer.from(rawKey, 'hex');
    } else {
        try {
            keyBuffer = Buffer.from(rawKey, 'base64');
        } catch {
            keyBuffer = null;
        }
    }

    if (!keyBuffer || keyBuffer.length !== 32) {
        if (!warnedInvalidKey) {
            warnedInvalidKey = true;
            logger.warn('Security', 'DATA_ENCRYPTION_KEY non valida: attesi 32 byte (hex/base64)');
        }
        cachedKey = null;
        return cachedKey;
    }

    cachedKey = keyBuffer;

    if (isProduction && !cachedKey) {
        logger.warn('Security', 'Encryption disabilitata in produzione: configura DATA_ENCRYPTION_KEY');
    }

    return cachedKey;
};

const isEncrypted = (value) =>
    typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);

const encryptString = (value) => {
    if (value === null || value === undefined || value === '') return value;
    if (typeof value !== 'string') return value;
    if (isEncrypted(value)) return value;

    const key = resolveKey();
    if (!key) return value;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${ENCRYPTION_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
};

const decryptString = (value) => {
    if (value === null || value === undefined || value === '') return value;
    if (typeof value !== 'string') return value;
    if (!isEncrypted(value)) return value;

    const key = resolveKey();
    if (!key) return value;

    const payload = value.slice(ENCRYPTION_PREFIX.length);
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !dataB64) return value;

    try {
        const iv = Buffer.from(ivB64, 'base64');
        const tag = Buffer.from(tagB64, 'base64');
        const data = Buffer.from(dataB64, 'base64');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
        return decrypted.toString('utf8');
    } catch {
        return value;
    }
};

const encryptFields = (obj, fields) => {
    if (!obj || typeof obj !== 'object') return obj;
    const next = { ...obj };
    fields.forEach((field) => {
        if (next[field] !== undefined) {
            next[field] = encryptString(next[field]);
        }
    });
    return next;
};

const decryptFields = (obj, fields) => {
    if (!obj || typeof obj !== 'object') return obj;
    const next = { ...obj };
    fields.forEach((field) => {
        if (next[field] !== undefined) {
            next[field] = decryptString(next[field]);
        }
    });
    return next;
};

module.exports = {
    encryptString,
    decryptString,
    encryptFields,
    decryptFields,
    isEncrypted,
};
