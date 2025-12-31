/**
 * 🏢 TENANT CONTEXT MIDDLEWARE
 * ============================
 * 
 * Questo middleware crea un "ponte" tra Express e Mongoose,
 * passando l'ID utente dal token JWT al contesto delle query.
 * 
 * ARCHITETTURA:
 * 
 *   [HTTP Request]
 *        │
 *        ▼
 *   [Auth Middleware] ──► req.user = { id, email }
 *        │
 *        ▼
 *   [Tenant Middleware] ──► req.tenantScope = { ... }
 *        │
 *        ▼
 *   [Route Handler]
 *        │
 *        ▼
 *   [Service Layer] usa req.tenantScope
 *        │
 *        ▼
 *   [Mongoose Query] con filtro automatico
 * 
 * PRINCIPI SOLID:
 * 
 * [S] Single Responsibility:
 *     Fa UNA cosa: prepara il contesto tenant per i layer successivi.
 * 
 * [D] Dependency Inversion:
 *     Non dipende da modelli specifici. Fornisce un'interfaccia generica
 *     che qualsiasi service può usare.
 */

const mongoose = require('mongoose');

/**
 * Crea un middleware che inietta il contesto tenant.
 * 
 * @param {Object} options - Opzioni di configurazione
 * @param {boolean} options.required - Se true, errore se non autenticato
 * @returns {Function} Express middleware
 * 
 * @example
 * // In routes:
 * router.use(requireAuth);
 * router.use(tenantContext({ required: true }));
 */
const tenantContext = (options = {}) => {
    const { required = true } = options;

    return (req, res, next) => {
        // Se non c'è utente autenticato
        if (!req.user?.id) {
            if (required) {
                return res.status(401).json({
                    success: false,
                    error: {
                        message: 'Tenant context required. Please authenticate.',
                        code: 'TENANT_CONTEXT_MISSING',
                    },
                });
            }
            // Se non required, continua senza context
            return next();
        }

        // Converte string ID in ObjectId se necessario
        const tenantId = typeof req.user.id === 'string'
            ? new mongoose.Types.ObjectId(req.user.id)
            : req.user.id;

        /**
         * req.tenantScope: oggetto helper per operazioni tenant-scoped.
         * 
         * PERCHÉ UN OGGETTO E NON SOLO L'ID?
         * Fornisce metodi helper che rendono il codice più leggibile
         * e meno soggetto a errori.
         */
        req.tenantScope = {
            /**
             * L'ID dell'utente/tenant corrente.
             */
            tenantId,

            /**
             * Restituisce un Model con scoping automatico.
             * 
             * @param {Model} Model - Il model Mongoose
             * @returns {Proxy} Model con filtro tenant
             * 
             * @example
             * const projects = await req.tenantScope.model(Project).find();
             */
            model: (Model) => {
                if (!Model.forTenant) {
                    throw new Error(
                        `Model ${Model.modelName} does not have multi-tenancy plugin. ` +
                        'Did you forget to apply the plugin?'
                    );
                }
                return Model.forTenant(tenantId);
            },

            /**
             * Crea un documento con tenant automatico.
             * 
             * @param {Model} Model - Il model Mongoose
             * @param {Object} data - I dati del documento
             * @returns {Promise<Document>}
             * 
             * @example
             * const project = await req.tenantScope.create(Project, { name: 'Test' });
             */
            create: async (Model, data) => {
                if (!Model.createForTenant) {
                    throw new Error(
                        `Model ${Model.modelName} does not have multi-tenancy plugin.`
                    );
                }
                return Model.createForTenant(tenantId, data);
            },

            /**
             * Verifica se una risorsa appartiene al tenant corrente.
             * Utile per validazioni esplicite prima di operazioni sensibili.
             * 
             * @param {Model} Model - Il model Mongoose
             * @param {ObjectId|string} documentId - ID del documento
             * @returns {Promise<boolean>}
             * 
             * @example
             * if (!await req.tenantScope.owns(Project, req.params.id)) {
             *     throw AppError.forbidden('Non puoi accedere a questa risorsa');
             * }
             */
            owns: async (Model, documentId) => {
                if (!Model.belongsToTenant) {
                    throw new Error(
                        `Model ${Model.modelName} does not have multi-tenancy plugin.`
                    );
                }
                return Model.belongsToTenant(tenantId, documentId);
            },

            /**
             * Filtro base da usare in query manuali.
             * Utile quando hai bisogno di query complesse non coperte dai helper.
             * 
             * @returns {Object} { user: tenantId }
             * 
             * @example
             * const results = await Project.aggregate([
             *     { $match: { ...req.tenantScope.filter, status: 'active' } },
             *     { $group: { _id: '$category', total: { $sum: 1 } } }
             * ]);
             */
            get filter() {
                return { user: tenantId };
            },
        };

        next();
    };
};

/**
 * Middleware combinato: Auth + Tenant Context.
 * Convenienza per routes che richiedono entrambi.
 * 
 * @param {Function} authMiddleware - Il middleware di autenticazione
 * @returns {Array<Function>} Array di middleware
 * 
 * @example
 * router.use(...withTenantAuth(requireAuth));
 * // oppure
 * router.get('/projects', ...withTenantAuth(requireAuth), projectController.list);
 */
const withTenantAuth = (authMiddleware) => {
    return [authMiddleware, tenantContext({ required: true })];
};

module.exports = {
    tenantContext,
    withTenantAuth,
};
