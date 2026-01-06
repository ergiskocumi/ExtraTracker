/**
 * 🏠 WORKSPACE SERVICE - Multi-Tenant (Unificato)
 * ===============================================
 * 
 * Service layer per la gestione del Work Journal (Workspace).
 * 
 * NOTA: WorkProject è stato unificato in Project.
 * Questo service ora usa ProjectService per gestire i progetti.
 * 
 * ⚠️ SICUREZZA: Tutte le query usano filtri ESPLICITI con userId.
 */

const projectService = require('./projectService');
const workTodoService = require('./workTodoService');

// =========================================
// EXPORT
// =========================================

/**
 * NOTA: Questo service ora espone ProjectService come 'projects'.
 * Tutti i metodi di ProjectService sono disponibili:
 * - find(tenantScope, filters, options)
 * - findActive(tenantScope, options)
 * - findWithEntryCount(tenantScope, options) - per Workspace
 * - findById(tenantScope, id, options)
 * - create(tenantScope, data)
 * - update(tenantScope, id, data)
 * - delete(tenantScope, id)
 */
module.exports = {
    projects: projectService,
    todos: workTodoService,
};
