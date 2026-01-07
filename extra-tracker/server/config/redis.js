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

let redisClient = null;
let isRedisAvailable = false;

/**
 * Inizializza connessione Redis
 * @returns {Promise<boolean>} - true se Redis è disponibile, false altrimenti
 */
const initRedis = async () => {
    // Se REDIS_URL non è configurato, usa memoria locale
    if (!process.env.REDIS_URL) {
        console.log('⚠️  Redis non configurato (REDIS_URL mancante). Rate limiter userà memoria locale.');
        return false;
    }

    try {
        redisClient = createClient({
            url: process.env.REDIS_URL,
            socket: {
                reconnectStrategy: (retries) => {
                    // Riconnessione esponenziale: 50ms, 100ms, 200ms, 400ms, max 3000ms
                    const delay = Math.min(retries * 50, 3000);
                    console.log(`🔄 Tentativo riconnessione Redis (${retries}): ${delay}ms`);
                    return delay;
                },
                connectTimeout: 5000, // 5 secondi timeout
            },
        });

        // Gestione errori
        redisClient.on('error', (err) => {
            console.error('❌ Errore Redis:', err.message);
            isRedisAvailable = false;
        });

        redisClient.on('connect', () => {
            console.log('🔴 Connessione Redis in corso...');
        });

        redisClient.on('ready', () => {
            console.log('✅ Redis connesso e pronto');
            isRedisAvailable = true;
        });

        redisClient.on('reconnecting', () => {
            console.log('🔄 Riconnessione a Redis...');
            isRedisAvailable = false;
        });

        redisClient.on('end', () => {
            console.log('🔴 Connessione Redis chiusa');
            isRedisAvailable = false;
        });

        // Connetti
        await redisClient.connect();
        return true;
    } catch (error) {
        console.error('❌ Impossibile connettersi a Redis:', error.message);
        console.log('⚠️  Rate limiter userà memoria locale come fallback');
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
            console.log('🔴 Connessione Redis chiusa correttamente');
        } catch (error) {
            console.error('❌ Errore chiusura Redis:', error.message);
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
