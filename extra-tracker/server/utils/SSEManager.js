/**
 * 📡 SSE Manager - Gestione connessioni Server-Sent Events
 *
 * Mappa semplice userId -> response per invio aggiornamenti realtime.
 */

class SSEManager {
    constructor() {
        this.clients = new Map();
    }

    _normalizeUserId(userId) {
        if (userId === null || userId === undefined) return null;
        return String(userId);
    }

    addClient(userId, res) {
        const key = this._normalizeUserId(userId);
        if (!key || !res) return;

        const existing = this.clients.get(key);
        if (existing && existing !== res) {
            try {
                existing.end();
            } catch {
                // Ignora eventuali errori di chiusura
            }
        }

        this.clients.set(key, res);

        res.on('close', () => {
            this._removeClient(key, res);
        });
        res.on('error', () => {
            this._removeClient(key, res);
        });
    }

    _removeClient(key, res) {
        const current = this.clients.get(key);
        if (!current) return;
        if (!res || current === res) {
            this.clients.delete(key);
        }
    }

    sendToUser(userId, eventType, data = {}) {
        const key = this._normalizeUserId(userId);
        if (!key) return false;

        const client = this.clients.get(key);
        if (!client || client.writableEnded) {
            this.clients.delete(key);
            return false;
        }

        const payload = {
            event: eventType,
            data,
        };

        try {
            client.write(`data: ${JSON.stringify(payload)}\n\n`);
            return true;
        } catch {
            this.clients.delete(key);
            return false;
        }
    }
}

module.exports = new SSEManager();
