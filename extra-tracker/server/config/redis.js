/**
 * 🔴 CONFIGURAZIONE REDIS
 * 
 * Redis viene usato per:
 * - Rate limiting distribuito (condiviso tra tutte le istanze)
 * - Session storage (opzionale, futuro)
 * - Cache (opzionale, futuro)
 * 
 * Fallback: Se Redis non è disponibile, il rate limiter usa memoria locale
 */

const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let isRedisAvailable = false;

/**
 * Inizializza connessione Redis
 * @returns {Promise<boolean>} - true se Redis è disponibile, false altrimenti
 */
const initRedis = async () => {
    if (!process.env.REDIS_URL) {
        logger.warn('Redis', 'Redis non configurato. Rate limiter userà memoria locale (non distribuito).');
        return false;
    }

    try {
        redisClient = createClient({
            url: process.env.REDIS_URL,
            socket: {
                reconnectStrategy: (retries) => {
                    // Riconnessione esponenziale: 50ms, 100ms, 200ms, 400ms, max 3000ms
                    const delay = Math.min(retries * 50, 3000);
                    logger.info('Redis', `Tentativo riconnessione (${retries}): ${delay}ms`);
                    return delay;
                },
                connectTimeout: 5000, // 5 secondi timeout
            },
        });

        // Gestione errori
        redisClient.on('error', (err) => {
            logger.error('Redis', 'Errore Redis', err);
            isRedisAvailable = false;
        });

        redisClient.on('connect', () => {
            logger.info('Redis', 'Connessione Redis in corso...');
        });

        redisClient.on('ready', () => {
            logger.success('Redis', 'Redis connesso e pronto');
            isRedisAvailable = true;
        });

        redisClient.on('reconnecting', () => {
            logger.info('Redis', 'Riconnessione a Redis...');
            isRedisAvailable = false;
        });

        redisClient.on('end', () => {
            logger.info('Redis', 'Connessione Redis chiusa');
            isRedisAvailable = false;
        });

        // Connetti
        await redisClient.connect();
        return true;
    } catch (error) {
        logger.error('Redis', 'Impossibile connettersi a Redis', error);
        logger.warn('Redis', 'Rate limiter userà memoria locale come fallback');
        isRedisAvailable = false;
        return false;
    }
};

/**
 * Chiudi connessione Redis
 */
const closeRedis = async () => {
    if (redisClient) {
        try {
            await redisClient.quit();
            logger.success('Redis', 'Connessione Redis chiusa correttamente');
        } catch (error) {
            logger.error('Redis', 'Errore chiusura Redis', error);
        } finally {
            redisClient = null;
            isRedisAvailable = false;
        }
    }
};

/**
 * Verifica se Redis è disponibile
 * @returns {boolean}
 */
const getRedisAvailable = () => isRedisAvailable;

/**
 * Ottieni client Redis (solo se disponibile)
 * @returns {object|null}
 */
const getRedisClient = () => (isRedisAvailable ? redisClient : null);

module.exports = {
    initRedis,
    closeRedis,
    getRedisAvailable,
    getRedisClient,
};
