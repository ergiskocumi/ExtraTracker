/**
 * 📡 EVENT BUS - Pattern Observer (Event Emitter)
 * ================================================
 * 
 * Event bus centralizzato per decoupling tra servizi.
 * Usa Node.js EventEmitter per implementare il pattern Observer.
 * 
 * Vantaggi:
 * - Decoupling: i servizi non conoscono direttamente ActivityService
 * - Fire and forget: gli eventi vengono emessi senza bloccare la risposta HTTP
 * - Scalabile: facile aggiungere nuovi subscriber per altri eventi
 * - Testabile: facile mockare eventi nei test
 * 
 * Uso:
 * ```js
 * const eventBus = require('./utils/eventBus');
 * 
 * // Emetti evento
 * eventBus.emit('worklog.created', { userId, workLog });
 * 
 * // Ascolta evento (in subscriber)
 * eventBus.on('worklog.created', async (data) => { ... });
 * ```
 */

const EventEmitter = require('events');

class AppEventBus extends EventEmitter {
    constructor() {
        super();
        // Aumenta il limite di listener (default è 10)
        this.setMaxListeners(20);
    }

    /**
     * Emetti un evento in modo asincrono (non blocca)
     * Gli errori nei listener vengono catturati e loggati
     */
    emit(event, data) {
        // Usa setImmediate per non bloccare il call stack
        setImmediate(() => {
            try {
                super.emit(event, data);
            } catch (err) {
                // Log errore ma non propagare (non bloccare l'app)
                console.error(`❌ EventBus error (${event}):`, err.message);
            }
        });
    }
}

// Singleton: un'unica istanza per tutta l'applicazione
const eventBus = new AppEventBus();

// Log degli eventi in sviluppo (opzionale)
if (process.env.NODE_ENV !== 'production') {
    eventBus.on('newListener', (event) => {
        console.log(`📡 Event listener registrato: ${event}`);
    });
}

module.exports = eventBus;
