/**
 * 🔒 MIDDLEWARE AUTENTICAZIONE JWT
 * 
 * Verifica che le richieste abbiano un token valido
 * Estrae i dati utente e li aggiunge a req.user
 */

const authService = require('../services/authService');
const AppError = require('../utils/AppError');
const securityConfig = require('../config/security');

/**
 * Middleware che richiede autenticazione
 * Legge il token dal cookie HttpOnly
 */
const requireAuth = async (req, res, next) => {
    try {
        // 1. Estrai token dal cookie
        const token = req.cookies?.[securityConfig.cookie.name];

        if (!token) {
            throw AppError.unauthorized('Accesso negato. Effettua il login.');
        }

        // 2. Verifica token
        const payload = authService.verifyToken(token, 'access');

        // 3. Aggiungi dati utente alla request
        req.user = {
            id: payload.sub,
            email: payload.email,
        };

        next();
    } catch (error) {
        // Passa l'errore al error handler
        next(error);
    }
};

/**
 * Middleware opzionale: aggiunge user se autenticato, altrimenti continua
 */
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.[securityConfig.cookie.name];

        if (token) {
            const payload = authService.verifyToken(token, 'access');
            req.user = {
                id: payload.sub,
                email: payload.email,
            };
        }
    } catch {
        // Ignora errori, l'utente semplicemente non è autenticato
        req.user = null;
    }

    next();
};

/**
 * Middleware per verificare ownership di una risorsa
 * Esempio: solo il proprietario può modificare i propri dati
 * 
 * @param {Function} getOwnerId - Funzione che estrae l'ownerId dalla request
 */
const requireOwnership = (getOwnerId) => {
    return async (req, res, next) => {
        try {
            const ownerId = await getOwnerId(req);
            
            if (!req.user || req.user.id !== ownerId.toString()) {
                throw AppError.forbidden('Non hai i permessi per questa azione');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = {
    requireAuth,
    optionalAuth,
    requireOwnership,
};
