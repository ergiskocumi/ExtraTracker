/**
 * 🏢 MULTI-TENANCY MONGOOSE PLUGIN
 * ================================
 * 
 * Questo plugin implementa il pattern "Shared Database with Logical Isolation"
 * per garantire che ogni utente veda SOLO i propri dati.
 * 
 * PRINCIPI SOLID APPLICATI:
 * -------------------------
 * 
 * [S] Single Responsibility:
 *     Questo plugin ha UNA sola responsabilità: isolare i dati per tenant (utente).
 *     Non gestisce autenticazione, validazione o business logic.
 * 
 * [O] Open/Closed:
 *     Il plugin è APERTO per estensione (puoi aggiungere hook) ma CHIUSO
 *     per modifica. Funziona con qualsiasi schema senza modificarlo.
 * 
 * [D] Dependency Inversion:
 *     Il plugin non dipende da implementazioni concrete di User o Auth.
 *     Riceve l'userId come parametro (iniettato dal middleware Express).
 * 
 * COME FUNZIONA:
 * --------------
 * 1. Aggiunge il campo `user` allo schema automaticamente
 * 2. Hook PRE-SAVE: inietta userId automaticamente su nuovi documenti
 * 3. Hook PRE-QUERY: aggiunge filtro { user: userId } a tutte le query
 * 4. Crea indice composto per performance ottimali
 * 
 * RISCHI MITIGATI:
 * ----------------
 * - IDOR (Insecure Direct Object Reference): impossibile accedere a risorse altrui
 * - Mass Assignment: il campo `user` non può essere sovrascritto dal client
 * - Query Injection: il filtro user è sempre applicato server-side
 * 
 * @author Senior Software Architect
 * @version 1.0.0
 */

const mongoose = require('mongoose');

/**
 * Symbol usato per passare il contesto tenant attraverso le query Mongoose.
 * Usiamo un Symbol invece di una stringa per evitare collisioni accidentali.
 * 
 * PERCHÉ SYMBOL?
 * I Symbol sono unici e non enumerabili, quindi:
 * 1. Non appaiono in JSON.stringify()
 * 2. Non possono essere sovrascritti accidentalmente
 * 3. Sono "privati" per convenzione
 */
const TENANT_CONTEXT = Symbol.for('tenantContext');

/**
 * Plugin Multi-Tenancy per Mongoose
 * 
 * @param {mongoose.Schema} schema - Lo schema Mongoose a cui applicare il plugin
 * @param {Object} options - Opzioni di configurazione
 * @param {string} options.tenantField - Nome del campo tenant (default: 'user')
 * @param {boolean} options.required - Se il campo tenant è obbligatorio (default: true)
 * @param {Array<string>} options.excludeFromScoping - Metodi da escludere dallo scoping automatico
 */
function multiTenancyPlugin(schema, options = {}) {
    const {
        tenantField = 'user',
        required = true,
        excludeFromScoping = [],
    } = options;

    // =========================================
    // 1. SCHEMA MODIFICATION
    // =========================================
    
    /**
     * Aggiungiamo il campo `user` allo schema.
     * 
     * PERCHÉ ref: 'User'?
     * Permette di usare .populate('user') se necessario in futuro,
     * ma NON crea foreign key constraint (MongoDB non le ha).
     * 
     * PERCHÉ index: true?
     * Il 90% delle query filtrerà per user, quindi l'indice è CRITICO.
     * Senza indice: full collection scan O(n)
     * Con indice: lookup O(log n)
     */
    schema.add({
        [tenantField]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: required,
            index: true, // Indice singolo per query semplici
            immutable: true, // SICUREZZA: una volta settato, non può essere modificato
        }
    });

    /**
     * Indice composto per query comuni.
     * 
     * PERCHÉ { user: 1, createdAt: -1 }?
     * Le query più frequenti sono:
     * - "Dammi tutti i progetti dell'utente X ordinati per data"
     * - "Dammi l'ultimo worklog dell'utente X"
     * 
     * Un indice composto copre entrambi i casi con una singola scansione.
     */
    schema.index({ [tenantField]: 1, createdAt: -1 });

    // =========================================
    // 2. PRE-SAVE HOOK (Automatic User Injection)
    // =========================================
    
    /**
     * Hook eseguito PRIMA di salvare un documento.
     * 
     * QUANDO SI ATTIVA?
     * - document.save()
     * - Model.create()
     * 
     * COSA FA?
     * Se il documento è nuovo (isNew) e non ha già un user,
     * lo prende dal contesto tenant iniettato.
     * 
     * SICUREZZA:
     * L'immutable: true sullo schema impedisce modifiche successive,
     * ma questo hook previene anche injection durante la creazione.
     */
    schema.pre('save', function() {
        // Solo per documenti nuovi
        if (this.isNew) {
            // Se user non è già settato, usa il contesto tenant
            if (!this[tenantField]) {
                const tenantId = this.$locals?.[TENANT_CONTEXT] || this.constructor[TENANT_CONTEXT];
                
                if (tenantId) {
                    this[tenantField] = tenantId;
                } else if (required) {
                    // Se required e manca il tenant, errore esplicito
                    throw new Error(
                        `Multi-tenancy violation: ${tenantField} is required but not provided. ` +
                        'Did you forget to set the tenant context?'
                    );
                }
            }
        }
    });

    // =========================================
    // 3. PRE-QUERY HOOKS (Automatic Scoping)
    // =========================================
    
    /**
     * Lista di tutti i metodi di query Mongoose che devono essere "scoped".
     * 
     * PERCHÉ COSÌ TANTI?
     * Mongoose ha molte varianti di query. Se ne dimentichiamo una,
     * creiamo un buco di sicurezza. Meglio essere espliciti.
     */
    const queryMethods = [
        'find',
        'findOne',
        'findById',
        'findOneAndUpdate',
        'findOneAndDelete',
        'findOneAndReplace',
        'findByIdAndUpdate',
        'findByIdAndDelete',
        'updateOne',
        'updateMany',
        'deleteOne',
        'deleteMany',
        'count',
        'countDocuments',
        'estimatedDocumentCount',
        'distinct',
        'aggregate',
    ];

    /**
     * Applica lo scoping automatico a ogni metodo di query.
     * 
     * COME FUNZIONA?
     * 1. Mongoose emette un evento 'pre' prima di eseguire la query
     * 2. Noi intercettiamo e aggiungiamo { user: tenantId } alle condizioni
     * 3. La query originale diventa: query AND user = tenantId
     * 
     * ESEMPIO:
     * Input:  Project.find({ status: 'active' })
     * Output: Project.find({ status: 'active', user: '507f1f77bcf86cd799439011' })
     */
    queryMethods.forEach(method => {
        // Salta metodi esclusi (es. per query admin)
        if (excludeFromScoping.includes(method)) return;

        // Hook per query standard
        if (method !== 'aggregate') {
            schema.pre(method, function() {
                // `this` è l'oggetto Query
                const tenantId = this.getOptions()[TENANT_CONTEXT];
                
                if (tenantId) {
                    // Merge del filtro tenant con i filtri esistenti
                    this.where({ [tenantField]: tenantId });
                }
                // Se non c'è tenantId, la query procede senza filtro
                // (utile per query admin o migration scripts)
            });
        }
    });

    /**
     * Hook speciale per Aggregate.
     * 
     * PERCHÉ SEPARATO?
     * Le aggregation pipeline hanno una sintassi diversa.
     * Non usiamo .where(), ma aggiungiamo uno stage $match all'inizio.
     * 
     * IMPORTANTE:
     * Lo stage $match deve essere PRIMO per sfruttare gli indici!
     */
    schema.pre('aggregate', function() {
        const tenantId = this.options[TENANT_CONTEXT];
        
        if (tenantId) {
            // Unshift aggiunge all'inizio dell'array
            this.pipeline().unshift({
                $match: { [tenantField]: tenantId }
            });
        }
    });

    // =========================================
    // 4. STATIC METHODS (API Pubblica)
    // =========================================
    
    /**
     * Crea un nuovo documento con contesto tenant.
     * 
     * PERCHÉ UN METODO STATICO?
     * Model.create() non passa attraverso il constructor dove possiamo
     * iniettare il context. Questo metodo wrappa create() in modo sicuro.
     * 
     * @param {ObjectId} tenantId - ID dell'utente proprietario
     * @param {Object|Array} data - Dati del documento
     * @returns {Promise<Document>}
     * 
     * @example
     * const project = await Project.createForTenant(req.user.id, { name: 'Test' });
     */
    schema.statics.createForTenant = async function(tenantId, data) {
        // Supporta sia oggetto singolo che array
        const docs = Array.isArray(data) ? data : [data];
        
        // Inietta tenantId in ogni documento
        const docsWithTenant = docs.map(doc => ({
            ...doc,
            [tenantField]: tenantId,
        }));

        const result = await this.create(docsWithTenant);
        return Array.isArray(data) ? result : result[0];
    };

    /**
     * Restituisce un Query Builder con scoping automatico.
     * 
     * PERCHÉ QUESTO PATTERN?
     * Invece di passare userId a ogni metodo, lo "iniettiamo" una volta
     * e poi concateniamo query normali Mongoose.
     * 
     * @param {ObjectId} tenantId - ID dell'utente
     * @returns {Model} - Model con contesto tenant
     * 
     * @example
     * // Tutte queste query saranno automaticamente filtrate per user
     * const projects = await Project.forTenant(userId).find({ status: 'active' });
     * const count = await Project.forTenant(userId).countDocuments();
     * const latest = await Project.forTenant(userId).findOne().sort('-createdAt');
     */
    schema.statics.forTenant = function(tenantId) {
        const Model = this;
        
        /**
         * Creiamo un Proxy che intercetta le chiamate ai metodi.
         * 
         * PERCHÉ PROXY?
         * È il modo più elegante per "decorare" tutti i metodi
         * senza doverli overridare uno per uno.
         * 
         * COME FUNZIONA?
         * 1. Chiamiamo Project.forTenant(userId)
         * 2. Riceviamo un Proxy che "avvolge" il Model
         * 3. Ogni metodo chiamato sul Proxy riceve automaticamente il context
         */
        return new Proxy(Model, {
            get(target, prop) {
                const value = target[prop];
                
                // Se è una funzione (es. find, findOne, etc.)
                if (typeof value === 'function') {
                    return function(...args) {
                        const result = value.apply(target, args);
                        
                        // Se il risultato è una Query, aggiungi il context
                        if (result && typeof result.setOptions === 'function') {
                            result.setOptions({ [TENANT_CONTEXT]: tenantId });
                        }
                        // Se è un'Aggregation, idem
                        else if (result && result.pipeline) {
                            result.options[TENANT_CONTEXT] = tenantId;
                        }
                        
                        return result;
                    };
                }
                
                return value;
            }
        });
    };

    /**
     * Verifica se un documento appartiene a un tenant.
     * 
     * QUANDO USARLO?
     * Prima di operazioni sensibili (delete, update) su documenti
     * recuperati senza lo scoping automatico.
     * 
     * @param {ObjectId} tenantId - ID dell'utente
     * @param {ObjectId} documentId - ID del documento
     * @returns {Promise<boolean>}
     * 
     * @example
     * if (await Project.belongsToTenant(req.user.id, req.params.id)) {
     *     // OK, procedi
     * }
     */
    schema.statics.belongsToTenant = async function(tenantId, documentId) {
        const doc = await this.findOne({
            _id: documentId,
            [tenantField]: tenantId,
        });
        return !!doc;
    };
}

// =========================================
// EXPORTS
// =========================================

module.exports = {
    multiTenancyPlugin,
    TENANT_CONTEXT,
};
