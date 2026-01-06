/**
 * 🏗️ BASE SERVICE - Multi-Tenant CRUD Operations
 * ===============================================
 * 
 * Service Layer astratto che implementa operazioni CRUD
 * con isolamento tenant ESPLICITO e sicuro.
 * 
 * ⚠️ SICUREZZA: Ogni query include SEMPRE { user: userId } esplicitamente.
 * Non ci affidiamo a plugin/proxy che potrebbero fallire silenziosamente.
 * 
 * PATTERN UTILIZZATI:
 * -------------------
 * 
 * 1. TEMPLATE METHOD PATTERN:
 *    I metodi base (find, create, update, delete) definiscono lo "scheletro"
 *    dell'algoritmo, mentre le sottoclassi possono sovrascrivere hook specifici.
 * 
 * 2. REPOSITORY PATTERN (semplificato):
 *    Astrae l'accesso ai dati. Il controller non sa se i dati vengono
 *    da MongoDB, PostgreSQL o un'API esterna.
 * 
 * PRINCIPI SOLID:
 * ---------------
 * 
 * [S] Single Responsibility:
 *     Ogni service gestisce UN tipo di entità.
 * 
 * [O] Open/Closed:
 *     Estendi con nuovi metodi, non modificare quelli esistenti.
 * 
 * [L] Liskov Substitution:
 *     Tutte le sottoclassi possono sostituire BaseService senza rompere il contratto.
 * 
 * [I] Interface Segregation:
 *     I metodi sono granulari. Usa solo quelli che ti servono.
 * 
 * [D] Dependency Inversion:
 *     Dipende da astrazioni (Model interface), non da implementazioni concrete.
 */

const AppError = require('../utils/AppError');
const mongoose = require('mongoose');

class BaseService {
    /**
     * Crea una nuova istanza del service.
     * 
     * @param {Model} Model - Il model Mongoose
     * @param {Object} options - Opzioni di configurazione
     * @param {Array<string>} options.searchFields - Campi su cui cercare
     * @param {Object} options.defaultSort - Ordinamento default
     * @param {Array<string>} options.populateFields - Relazioni da popolare
     * @param {string} options.entityName - Nome per messaggi di errore
     */
    constructor(Model, options = {}) {
        this.Model = Model;
        this.options = {
            searchFields: [],
            defaultSort: { createdAt: -1 },
            populateFields: [],
            entityName: Model.modelName,
            ...options,
        };
    }

    // =========================================
    // HELPER: Estrae userId in modo sicuro
    // =========================================

    /**
     * Estrae l'userId dal tenantScope con validazione.
     * 
     * ⚠️ FAIL-FAST: Se manca userId, lancia errore immediatamente.
     * Questo previene data leak silenziosi.
     * 
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @returns {ObjectId} L'ID dell'utente
     * @throws {AppError} Se tenantScope o tenantId mancano
     */
    _getUserId(tenantScope) {
        if (!tenantScope || !tenantScope.tenantId) {
            // FIX: Uso di AppError per dire al GlobalHandler "è un errore previsto"
            // Questo ritorna 401 (Unauthorized) invece di 500 (Internal Server Error)
            throw AppError.unauthorized(
                'Sessione non valida o scaduta (Tenant mancante)',
                { 
                    code: 'INVALID_TENANT_SCOPE',
                    category: 'AUTHORIZATION',
                    suggestion: 'Assicurati che il middleware tenantContext sia applicato alla route.'
                }
            );
        }
        return tenantScope.tenantId;
    }

    /**
     * Escapa caratteri speciali regex per prevenire regex injection.
     * 
     * @param {string} text - Testo da escapare
     * @returns {string} Testo escapato
     */
    _escapeRegex(text) {
        if (typeof text !== 'string') {
            return '';
        }
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Crea un filtro base con user già incluso.
     * 
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {Object} additionalFilters - Filtri aggiuntivi
     * @returns {Object} Filtro con { user: userId, ...additionalFilters }
     */
    _buildFilter(tenantScope, additionalFilters = {}) {
        const userId = this._getUserId(tenantScope);
        return { user: userId, ...additionalFilters };
    }

    // =========================================
    // READ OPERATIONS
    // =========================================

    /**
     * Trova tutti i documenti del tenant con filtri opzionali.
     * 
     * ⚠️ SICUREZZA: Il filtro { user: userId } è SEMPRE incluso esplicitamente.
     * 
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {Object} filters - Filtri aggiuntivi
     * @param {Object} options - Opzioni query (sort, limit, skip, select)
     * @returns {Promise<Array<Document>>}
     */
    async find(tenantScope, filters = {}, options = {}) {
        const {
            sort = this.options.defaultSort,
            limit,
            skip,
            select,
            populate = this.options.populateFields,
        } = options;

        // 🔒 SICUREZZA ESPLICITA: user è SEMPRE nel filtro
        const secureFilter = this._buildFilter(tenantScope, filters);

        let query = this.Model.find(secureFilter);

        if (sort) query = query.sort(sort);
        
        // FIX: Validazione limit per prevenire DoS
        // Impedisce a un client malevolo di chiedere limit=1000000 bloccando il server
        if (limit !== undefined) {
            const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20)); // Max 100 elementi
            query = query.limit(safeLimit);
        }
        
        // FIX: Validazione skip per prevenire valori negativi
        if (skip !== undefined) {
            const safeSkip = Math.max(0, parseInt(skip, 10) || 0);
            query = query.skip(safeSkip);
        }
        
        if (select) query = query.select(select);
        if (populate?.length) {
            populate.forEach(field => {
                query = query.populate(field);
            });
        }

        return query.exec();
    }

    /**
     * Trova un documento per ID (con verifica tenant).
     * 
     * ⚠️ SICUREZZA: Usa findOne con filtro { _id, user } invece di findById.
     * Questo previene IDOR anche se l'attaccante conosce l'ID.
     * 
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {string} id - ID del documento
     * @param {Object} options - Opzioni query
     * @returns {Promise<Document|null>}
     * @throws {AppError} Se ID non valido o non trovato e throwIfNotFound è true
     */
    async findById(tenantScope, id, options = {}) {
        const {
            select,
            populate = this.options.populateFields,
            throwIfNotFound = false,
        } = options;

        // Validazione ObjectId: previene errori MongoDB e attacchi
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            if (throwIfNotFound) {
                throw AppError.badRequest(
                    `ID non valido per ${this.options.entityName}`,
                    { code: 'INVALID_ID' }
                );
            }
            return null;
        }

        // 🔒 SICUREZZA ESPLICITA: user è SEMPRE nel filtro
        const secureFilter = this._buildFilter(tenantScope, { _id: id });

        let query = this.Model.findOne(secureFilter);

        if (select) query = query.select(select);
        if (populate?.length) {
            populate.forEach(field => {
                query = query.populate(field);
            });
        }

        const doc = await query.exec();

        if (!doc && throwIfNotFound) {
            throw AppError.notFound(this.options.entityName);
        }

        return doc;
    }

    /**
     * Trova un documento con filtri custom.
     * 
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {Object} filters - Filtri
     * @param {Object} options - Opzioni query
     * @returns {Promise<Document|null>}
     */
    async findOne(tenantScope, filters, options = {}) {
        const {
            select,
            populate = this.options.populateFields,
            throwIfNotFound = false,
        } = options;

        // 🔒 SICUREZZA ESPLICITA
        const secureFilter = this._buildFilter(tenantScope, filters);

        let query = this.Model.findOne(secureFilter);

        if (select) query = query.select(select);
        if (populate?.length) {
            populate.forEach(field => {
                query = query.populate(field);
            });
        }

        const doc = await query.exec();

        if (!doc && throwIfNotFound) {
            throw AppError.notFound(this.options.entityName);
        }

        return doc;
    }

    /**
     * Conta i documenti del tenant.
     * 
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {Object} filters - Filtri opzionali
     * @returns {Promise<number>}
     */
    async count(tenantScope, filters = {}) {
        // 🔒 SICUREZZA ESPLICITA
        const secureFilter = this._buildFilter(tenantScope, filters);
        return this.Model.countDocuments(secureFilter).exec();
    }

    /**
     * Verifica se esiste almeno un documento.
     * 
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {Object} filters - Filtri
     * @returns {Promise<boolean>}
     */
    async exists(tenantScope, filters) {
        const count = await this.count(tenantScope, filters);
        return count > 0;
    }

    // =========================================
    // WRITE OPERATIONS
    // =========================================

    /**
     * Crea un nuovo documento.
     * 
     * ⚠️ SICUREZZA: L'ID utente viene iniettato ESPLICITAMENTE qui.
     * Non ci affidiamo a plugin che potrebbero fallire silenziosamente.
     * 
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {Object} data - Dati del documento
     * @returns {Promise<Document>}
     */
    async create(tenantScope, data) {
        const userId = this._getUserId(tenantScope);
        
        // SICUREZZA: Rimuovi esplicitamente 'user' dai dati in input
        // per prevenire mass assignment attacks
        const { user, _id, ...safeData } = data;

        // Hook pre-create (override nelle sottoclassi)
        const processedData = await this.beforeCreate(tenantScope, safeData);

        // 🔒 SICUREZZA ESPLICITA: Iniettiamo userId direttamente
        const doc = await this.Model.create({
            ...processedData,
            user: userId, // ← ESPLICITO, non delegato a plugin
        });

        // Hook post-create
        await this.afterCreate(tenantScope, doc);

        return doc;
    }

    /**
     * Aggiorna un documento per ID.
     * 
     * ⚠️ SICUREZZA:
     * 1. Filtro { _id, user } per prevenire IDOR
     * 2. Blocca modifica del campo 'user'
     * 
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {string} id - ID del documento
     * @param {Object} data - Dati da aggiornare
     * @param {Object} options - Opzioni Mongoose
     * @returns {Promise<Document>}
     * @throws {AppError} Se documento non trovato
     */
    async update(tenantScope, id, data, options = {}) {
        // SICUREZZA: Blocca modifica di campi sensibili
        const { user, _id, ...safeData } = data;

        // Hook pre-update
        const processedData = await this.beforeUpdate(tenantScope, id, safeData);

        // 🔒 SICUREZZA ESPLICITA: user è SEMPRE nel filtro
        const secureFilter = this._buildFilter(tenantScope, { _id: id });

        const doc = await this.Model.findOneAndUpdate(
            secureFilter,
            { $set: processedData },
            { 
                new: true,           // Ritorna il documento aggiornato
                runValidators: true, // Esegui validazioni schema
                ...options,
            }
        );

        if (!doc) {
            throw AppError.notFound(this.options.entityName);
        }

        // Hook post-update
        await this.afterUpdate(tenantScope, doc);

        return doc;
    }

    /**
     * Elimina un documento per ID.
     * 
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {string} id - ID del documento
     * @returns {Promise<Document>}
     * @throws {AppError} Se documento non trovato
     */
    async delete(tenantScope, id) {
        // Hook pre-delete (es. verifica dipendenze)
        await this.beforeDelete(tenantScope, id);

        // 🔒 SICUREZZA ESPLICITA: user è SEMPRE nel filtro
        const secureFilter = this._buildFilter(tenantScope, { _id: id });
        const doc = await this.Model.findOneAndDelete(secureFilter);

        if (!doc) {
            throw AppError.notFound(this.options.entityName);
        }

        // Hook post-delete (es. cleanup)
        await this.afterDelete(tenantScope, doc);

        return doc;
    }

    /**
     * Elimina tutti i documenti che matchano i filtri.
     * 
     * ATTENZIONE: Operazione potenzialmente distruttiva!
     * 
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {Object} filters - Filtri (NON può essere vuoto per sicurezza)
     * @returns {Promise<{deletedCount: number}>}
     */
    async deleteMany(tenantScope, filters) {
        // SICUREZZA: Non permettere deleteMany senza filtri
        if (!filters || Object.keys(filters).length === 0) {
            throw new Error(
                'deleteMany requires explicit filters. ' +
                'To delete all documents, use { deletedAt: { $exists: false } } or similar.'
            );
        }

        // 🔒 SICUREZZA ESPLICITA: user è SEMPRE nel filtro
        const secureFilter = this._buildFilter(tenantScope, filters);
        return this.Model.deleteMany(secureFilter);
    }

    // =========================================
    // UTILITY METHODS
    // =========================================

    /**
     * Ricerca testuale sui campi configurati.
     * 
     * 🔒 SICUREZZA: Escapa caratteri speciali regex per prevenire regex injection.
     * 
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {string} searchTerm - Termine di ricerca
     * @param {Object} additionalFilters - Filtri aggiuntivi
     * @returns {Promise<Array<Document>>}
     */
    async search(tenantScope, searchTerm, additionalFilters = {}) {
        if (!searchTerm || !this.options.searchFields.length) {
            return this.find(tenantScope, additionalFilters);
        }

        // 🔒 FIX SICUREZZA: Escapa caratteri speciali regex
        // Previene regex injection (es. searchTerm = ".*" scaricherebbe tutto il DB)
        const escapedTerm = this._escapeRegex(searchTerm);
        const regex = new RegExp(escapedTerm, 'i');

        // Crea $or per ogni campo searchable
        const searchConditions = this.options.searchFields.map(field => ({
            [field]: regex,
        }));

        return this.find(tenantScope, {
            ...additionalFilters,
            $or: searchConditions,
        });
    }

    /**
     * Paginazione con metadata.
     * 
     * 🔒 SICUREZZA: Valida e normalizza limit/page per prevenire DoS.
     * 
     * @param {Object} tenantScope - Oggetto req.tenantScope
     * @param {Object} filters - Filtri
     * @param {Object} pagination - { page, limit }
     * @returns {Promise<{data: Array, meta: Object}>}
     */
    async paginate(tenantScope, filters = {}, { page = 1, limit = 20 } = {}) {
        // FIX: Clamp dei valori per prevenire DoS
        // Impedisce a un client malevolo di chiedere limit=1000000 bloccando il server
        const safePage = Math.max(1, parseInt(page, 10) || 1);
        const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20)); // Max 100 elementi
        
        const skip = (safePage - 1) * safeLimit;

        const [data, total] = await Promise.all([
            this.find(tenantScope, filters, { skip, limit: safeLimit }),
            this.count(tenantScope, filters),
        ]);

        return {
            data,
            meta: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit),
                hasMore: safePage * safeLimit < total,
            },
        };
    }

    // =========================================
    // LIFECYCLE HOOKS (Override in subclasses)
    // =========================================

    /**
     * Hook eseguito PRIMA della creazione.
     * Override per validazioni custom, trasformazioni, etc.
     * 
     * @param {Object} tenantScope
     * @param {Object} data
     * @returns {Promise<Object>} Dati processati
     */
    async beforeCreate(tenantScope, data) {
        return data;
    }

    /**
     * Hook eseguito DOPO la creazione.
     * Override per side effects (notifiche, logging, etc.)
     */
    async afterCreate(tenantScope, doc) {
        // Override in subclass
    }

    /**
     * Hook eseguito PRIMA dell'update.
     */
    async beforeUpdate(tenantScope, id, data) {
        return data;
    }

    /**
     * Hook eseguito DOPO l'update.
     */
    async afterUpdate(tenantScope, doc) {
        // Override in subclass
    }

    /**
     * Hook eseguito PRIMA della delete.
     * Utile per verificare dipendenze (es. non eliminare progetto con worklog).
     */
    async beforeDelete(tenantScope, id) {
        // Override in subclass
    }

    /**
     * Hook eseguito DOPO la delete.
     * Utile per cleanup (es. eliminare file associati).
     */
    async afterDelete(tenantScope, doc) {
        // Override in subclass
    }
}

module.exports = BaseService;
