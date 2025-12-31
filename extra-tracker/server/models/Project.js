/**
 * 📦 PROJECT MODEL - Multi-Tenant
 * ================================
 * 
 * Schema per i progetti/clienti dell'utente.
 * 
 * MULTI-TENANCY:
 * Il campo `user` viene aggiunto automaticamente dal plugin.
 * Ogni query su questo model sarà automaticamente filtrata per tenant.
 */

const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const projectSchema = new mongoose.Schema({
    // Nome del progetto/cliente
    name: { 
        type: String, 
        required: [true, 'Il nome del progetto è obbligatorio'],
        trim: true,
        maxlength: [100, 'Il nome non può superare 100 caratteri'],
    },
    
    // Codice identificativo breve (es. "ACME", "PROJ01")
    code: { 
        type: String, 
        required: [true, 'Il codice progetto è obbligatorio'],
        trim: true,
        uppercase: true,
        maxlength: [20, 'Il codice non può superare 20 caratteri'],
    },
    
    // Descrizione opzionale
    description: { 
        type: String,
        trim: true,
        maxlength: [500, 'La descrizione non può superare 500 caratteri'],
    },
    
    // Tariffa oraria
    rate: { 
        type: Number, 
        required: [true, 'La tariffa oraria è obbligatoria'],
        min: [0, 'La tariffa non può essere negativa'],
    },
    
    // Stato del progetto
    status: {
        type: String,
        enum: ['active', 'completed', 'archived'],
        default: 'active',
    },
    
    // Colore per la UI (opzionale)
    color: {
        type: String,
        default: '#6366f1', // indigo-500
    },
    
}, {
    timestamps: true, // Aggiunge createdAt e updatedAt automaticamente
});

// =========================================
// INDEXES
// =========================================

/**
 * Indice composto per unicità del codice PER UTENTE.
 * Due utenti diversi possono avere lo stesso codice progetto,
 * ma lo stesso utente NON può avere duplicati.
 */
projectSchema.index({ user: 1, code: 1 }, { unique: true });

/**
 * Indice per ricerca testuale.
 */
projectSchema.index({ name: 'text', description: 'text' });

// =========================================
// PLUGINS
// =========================================

/**
 * Applica il plugin Multi-Tenancy.
 * Questo aggiunge:
 * - Campo 'user' (ObjectId, required, immutable)
 * - Scoping automatico su tutte le query
 * - Metodi statici: forTenant(), createForTenant(), belongsToTenant()
 */
projectSchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});

// =========================================
// SERIALIZATION
// =========================================

projectSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        // NON esporre l'ID utente nelle risposte API
        delete ret.user;
    }
});

projectSchema.set('toObject', {
    virtuals: true,
});

// =========================================
// MIDDLEWARE
// =========================================

/**
 * Pre-save: normalizza il codice in uppercase.
 */
projectSchema.pre('save', function() {
    if (this.isModified('code')) {
        this.code = this.code.toUpperCase();
    }
});

module.exports = mongoose.model('Project', projectSchema);