/**
 * 📊 ACTIVITY QUEUE - Retry con Exponential Backoff
 * ==================================================
 * 
 * Queue per activity tracking con retry automatico.
 * Usa Bull per gestire retry con exponential backoff.
 * 
 * Configurazione:
 * - Retry: 3 tentativi
 * - Backoff: exponential (2s, 4s, 8s)
 * - Timeout: 30 secondi per job
 * 
 * Fallback: Se Redis non è disponibile, usa eventBus diretto (senza retry)
 */

const Queue = require('bull');
const { getRedisClient, getRedisAvailable } = require('../config/redis');
const activityService = require('../services/activityService');
const eventBus = require('../utils/eventBus');

let activityQueue = null;

/**
 * Inizializza la queue (solo se Redis è disponibile)
 */
function initializeQueue() {
    if (!getRedisAvailable()) {
        console.log('⚠️  Redis non disponibile. Activity queue userà eventBus diretto (senza retry)');
        return null;
    }

    const redisClient = getRedisClient();
    if (!redisClient) {
        console.log('⚠️  Redis client non disponibile. Activity queue userà eventBus diretto (senza retry)');
        return null;
    }

    // Crea queue con connessione Redis
    // Bull richiede una connessione Redis separata o la URL
    activityQueue = new Queue('activity-tracking', {
        redis: process.env.REDIS_URL || {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
            attempts: 3, // 3 tentativi totali
            backoff: {
                type: 'exponential', // Exponential backoff: 2s, 4s, 8s
                delay: 2000, // Delay iniziale: 2 secondi
            },
            removeOnComplete: {
                age: 3600, // Rimuovi job completati dopo 1 ora
                count: 1000, // Mantieni max 1000 job completati
            },
            removeOnFail: {
                age: 86400, // Rimuovi job falliti dopo 24 ore
            },
        },
    });

    // Processa i job
    activityQueue.process(async (job) => {
        const { userId, activityType, payload } = job.data;
        
        try {
            await activityService.recordActivity(userId, activityType, payload);
            
            if (process.env.NODE_ENV !== 'production') {
                console.log(`✅ Activity registrata (queue): ${activityType} per user ${userId}`);
            }
            
            return { success: true };
        } catch (error) {
            // L'errore viene loggato da Bull automaticamente
            // Rilancia per triggerare retry
            throw error;
        }
    });

    // Event handlers per monitoring
    activityQueue.on('completed', (job, result) => {
        eventBus.emit('activity.queue.completed', {
            jobId: job.id,
            activityType: job.data.activityType,
            attempts: job.attemptsMade,
        });
    });

    activityQueue.on('failed', (job, error) => {
        eventBus.emit('activity.queue.failed', {
            jobId: job.id,
            activityType: job.data.activityType,
            attempts: job.attemptsMade,
            error: error.message,
        });
    });

    activityQueue.on('stalled', (job) => {
        console.warn(`⚠️  Activity job stalled: ${job.id}`);
    });

    console.log('✅ Activity queue inizializzata con retry automatico');
    return activityQueue;
}

/**
 * Aggiungi job alla queue (con retry automatico)
 * Se la queue non è disponibile, chiama direttamente activityService (senza retry)
 */
async function addActivityJob(userId, activityType, payload) {
    // Se la queue non è disponibile, usa chiamata diretta (fallback)
    if (!activityQueue) {
        try {
            await activityService.recordActivity(userId, activityType, payload);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`✅ Activity registrata (direct): ${activityType} per user ${userId}`);
            }
        } catch (error) {
            console.error(`❌ Activity error (direct): ${error.message}`);
            // Non propagare errore (non bloccare l'app)
        }
        return;
    }

    // Aggiungi job alla queue (con retry automatico)
    try {
        await activityQueue.add({
            userId,
            activityType,
            payload,
        }, {
            // Timeout per singolo job: 30 secondi
            timeout: 30000,
        });
        
        eventBus.emit('activity.queue.added', {
            activityType,
            userId,
        });
    } catch (error) {
        console.error(`❌ Errore aggiunta job alla queue: ${error.message}`);
        // Fallback: prova chiamata diretta
        try {
            await activityService.recordActivity(userId, activityType, payload);
        } catch (fallbackError) {
            console.error(`❌ Activity error (fallback): ${fallbackError.message}`);
        }
    }
}

/**
 * Ottieni statistiche della queue
 */
async function getQueueStats() {
    if (!activityQueue) {
        return null;
    }

    try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            activityQueue.getWaitingCount(),
            activityQueue.getActiveCount(),
            activityQueue.getCompletedCount(),
            activityQueue.getFailedCount(),
            activityQueue.getDelayedCount(),
        ]);

        return {
            waiting,
            active,
            completed,
            failed,
            delayed,
            total: waiting + active + completed + failed + delayed,
        };
    } catch (error) {
        console.error('❌ Errore recupero stats queue:', error.message);
        return null;
    }
}

/**
 * Chiudi la queue gracefulmente
 */
async function closeQueue() {
    if (activityQueue) {
        await activityQueue.close();
        activityQueue = null;
        console.log('✅ Activity queue chiusa');
    }
}

module.exports = {
    initializeQueue,
    addActivityJob,
    getQueueStats,
    closeQueue,
    getQueue: () => activityQueue,
};
