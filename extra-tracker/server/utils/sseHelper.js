/**
 * 📡 SSE HELPER - Server-Sent Events utility
 * ===========================================
 * Centralizza la gestione delle connessioni SSE:
 * headers, heartbeat, timeout e cleanup.
 */

const logger = require('./logger');

const SSE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minuti
const SSE_HEARTBEAT_MS = 30 * 1000;   // 30 secondi

/**
 * Crea e configura una connessione SSE.
 *
 * @param {import('express').Request} req - Oggetto request Express
 * @param {import('express').Response} res - Oggetto response Express
 * @returns {{ sendEvent: Function, close: Function }}
 */
function createSseConnection(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disabilita buffering nginx

    let lastActivity = Date.now();
    let closed = false;

    const sendEvent = (type, data) => {
        if (closed) return;
        lastActivity = Date.now();
        res.write(`event: ${type}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        res.end();
    };

    const heartbeat = setInterval(() => {
        if (closed) {
            clearInterval(heartbeat);
            return;
        }
        if (Date.now() - lastActivity > SSE_TIMEOUT_MS) {
            logger.warn('SseHelper', 'SSE timeout: chiusura connessione per inattività');
            sendEvent('error', { message: 'Timeout: connessione chiusa per inattività' });
            close();
            return;
        }
        res.write(':heartbeat\n\n');
    }, SSE_HEARTBEAT_MS);

    req.on('close', () => {
        closed = true;
        clearInterval(heartbeat);
    });

    return { sendEvent, close };
}

module.exports = { createSseConnection };
