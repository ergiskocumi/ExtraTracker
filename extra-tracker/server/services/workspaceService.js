/**
 * 🏠 WORKSPACE SERVICE - Multi-Tenant (Unificato)
 * ===============================================
 *
 * Service layer per la gestione del Work Journal (Workspace).
 * Gestisce TODO per l'organizzazione del lavoro.
 *
 * ⚠️ SICUREZZA: Tutte le query usano filtri ESPLICITI con userId.
 */

const workTodoService = require('./workTodoService');

// =========================================
// EXPORT
// =========================================

module.exports = {
    todos: workTodoService,
};
