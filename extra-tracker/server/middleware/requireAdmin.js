/**
 * 🔒 MIDDLEWARE ADMIN
 *
 * Verifica che l'utente autenticato abbia il ruolo di admin.
 * DEVE essere usato DOPO requireAuth.
 */

const User = require('../models/User');
const AppError = require('../utils/AppError');

/**
 * Middleware che richiede ruolo admin
 * Verifica nel DB che l'utente abbia role === 'admin'
 */
const requireAdmin = async (req, res, next) => {
    try {
        // Verifica che requireAuth sia stato chiamato prima
        if (!req.user || !req.user.id) {
            throw AppError.unauthorized('Autenticazione richiesta');
        }

        // Query DB per verificare il ruolo
        const user = await User.findById(req.user.id).select('role');

        if (!user) {
            throw AppError.unauthorized('Utente non trovato');
        }

        if (user.role !== 'admin') {
            throw AppError.forbidden('Accesso riservato agli amministratori', {
                code: 'ADMIN_REQUIRED',
            });
        }

        // Aggiungi ruolo alla request per uso successivo
        req.user.role = user.role;

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { requireAdmin };
