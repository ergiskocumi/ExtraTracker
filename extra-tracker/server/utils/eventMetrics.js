/**
 * 📊 EVENT METRICS - Monitoring Eventi
 * =====================================
 * 
 * Traccia metriche sugli eventi emessi e processati.
 * Utile per monitoring e debugging.
 * 
 * Metriche tracciate:
 * - Eventi emessi per tipo
 * - Eventi processati con successo
 * - Eventi falliti
 * - Tempo di processing medio
 */

const eventBus = require('./eventBus');

class EventMetrics {
    constructor() {
        this.metrics = {
            emitted: {}, // { eventType: count }
            processed: {}, // { eventType: count }
            failed: {}, // { eventType: count }
            processingTime: {}, // { eventType: [times] }
        };

        // Ascolta tutti gli eventi per tracciare emissioni
        this.setupTracking();
    }

    /**
     * Configura tracking automatico degli eventi
     */
    setupTracking() {
        // Intercetta tutte le emissioni
        const originalEmit = eventBus.emit.bind(eventBus);
        
        eventBus.emit = (event, data) => {
            // Traccia emissione
            this.recordEmitted(event);
            
            // Chiama emit originale
            return originalEmit(event, data);
        };

        // Ascolta eventi di queue per tracciare processing
        eventBus.on('activity.queue.completed', (data) => {
            this.recordProcessed(data.activityType);
        });

        eventBus.on('activity.queue.failed', (data) => {
            this.recordFailed(data.activityType);
        });
    }

    /**
     * Registra evento emesso
     */
    recordEmitted(eventType) {
        if (!this.metrics.emitted[eventType]) {
            this.metrics.emitted[eventType] = 0;
        }
        this.metrics.emitted[eventType]++;
    }

    /**
     * Registra evento processato con successo
     */
    recordProcessed(eventType) {
        if (!this.metrics.processed[eventType]) {
            this.metrics.processed[eventType] = 0;
        }
        this.metrics.processed[eventType]++;
    }

    /**
     * Registra evento fallito
     */
    recordFailed(eventType) {
        if (!this.metrics.failed[eventType]) {
            this.metrics.failed[eventType] = 0;
        }
        this.metrics.failed[eventType]++;
    }

    /**
     * Registra tempo di processing
     */
    recordProcessingTime(eventType, timeMs) {
        if (!this.metrics.processingTime[eventType]) {
            this.metrics.processingTime[eventType] = [];
        }
        this.metrics.processingTime[eventType].push(timeMs);
        
        // Mantieni solo ultimi 100 tempi per evitare memory leak
        if (this.metrics.processingTime[eventType].length > 100) {
            this.metrics.processingTime[eventType] = 
                this.metrics.processingTime[eventType].slice(-100);
        }
    }

    /**
     * Ottieni statistiche complete
     */
    getStats() {
        const stats = {
            emitted: { ...this.metrics.emitted },
            processed: { ...this.metrics.processed },
            failed: { ...this.metrics.failed },
            successRate: {},
            avgProcessingTime: {},
        };

        // Calcola success rate per ogni tipo di evento
        Object.keys(this.metrics.emitted).forEach(eventType => {
            const emitted = this.metrics.emitted[eventType] || 0;
            const processed = this.metrics.processed[eventType] || 0;
            const failed = this.metrics.failed[eventType] || 0;
            const total = processed + failed;
            
            if (total > 0) {
                stats.successRate[eventType] = ((processed / total) * 100).toFixed(2) + '%';
            }
        });

        // Calcola tempo medio di processing
        Object.keys(this.metrics.processingTime).forEach(eventType => {
            const times = this.metrics.processingTime[eventType];
            if (times.length > 0) {
                const avg = times.reduce((a, b) => a + b, 0) / times.length;
                stats.avgProcessingTime[eventType] = `${avg.toFixed(2)}ms`;
            }
        });

        return stats;
    }

    /**
     * Reset metriche
     */
    reset() {
        this.metrics = {
            emitted: {},
            processed: {},
            failed: {},
            processingTime: {},
        };
    }

    /**
     * Ottieni summary per logging
     */
    getSummary() {
        const stats = this.getStats();
        const totalEmitted = Object.values(this.metrics.emitted)
            .reduce((a, b) => a + b, 0);
        const totalProcessed = Object.values(this.metrics.processed)
            .reduce((a, b) => a + b, 0);
        const totalFailed = Object.values(this.metrics.failed)
            .reduce((a, b) => a + b, 0);

        return {
            total: {
                emitted: totalEmitted,
                processed: totalProcessed,
                failed: totalFailed,
                successRate: totalProcessed + totalFailed > 0
                    ? `${((totalProcessed / (totalProcessed + totalFailed)) * 100).toFixed(2)}%`
                    : 'N/A',
            },
            byEvent: stats,
        };
    }
}

// Singleton
const eventMetrics = new EventMetrics();

module.exports = eventMetrics;
