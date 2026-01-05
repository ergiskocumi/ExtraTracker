/**
 * 📝 WORK ENTRY MODEL - Multi-Tenant
 * ===================================
 * 
 * Schema per le entries del Work Journal.
 * Ogni entry rappresenta un'attività/annotazione su un progetto.
 * 
 * TEMPLATE SYSTEM:
 * Il campo `templateData` è un Mixed/Object che contiene dati strutturati
 * specifici per la categoria. Questo pattern si chiama "Polymorphic Embed"
 * ed è perfetto per dati semi-strutturati.
 * 
 * RELAZIONI:
 * - Appartiene a un User (multi-tenancy)
 * - Appartiene a un WorkProject (referenza)
 * 
 * SICUREZZA RELAZIONI:
 * Il campo project deve riferirsi a un progetto dello STESSO utente.
 * Questa validazione è implementata nel service layer.
 */

const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const workEntrySchema = new mongoose.Schema({
    // Riferimento al progetto (DEVE essere dello stesso utente)
    project: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkProject',
        required: [true, 'Il progetto è obbligatorio'],
        index: true,
    },
    
    // Data dell'attività (formato ISO: YYYY-MM-DD)
    date: { 
        type: String, 
        required: [true, 'La data è obbligatoria'],
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido (usa YYYY-MM-DD)'],
    },
    
    // Categoria dell'attività
    category: {
        type: String,
        enum: ['development', 'documentation', 'ticket', 'meeting', 'research', 'freeform'],
        required: [true, 'La categoria è obbligatoria'],
    },
    
    // Titolo breve dell'attività
    title: {
        type: String,
        required: [true, 'Il titolo è obbligatorio'],
        trim: true,
        maxlength: [200, 'Il titolo non può superare 200 caratteri'],
    },
    
    // Contenuto/note in markdown o testo libero
    content: {
        type: String,
        trim: true,
        maxlength: [5000, 'Il contenuto non può superare 5000 caratteri'],
    },
    
    // Dati strutturati del template (JSON flessibile)
    // Esempi:
    // - development: { branch, commits, filesChanged, status }
    // - ticket: { ticketId, ticketUrl, priority, resolution }
    // - documentation: { docType, sections }
    // - freeform: {}
    templateData: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    
    // Tag per ricerca futura
    tags: [{
        type: String,
        trim: true,
        maxlength: [50, 'Ogni tag non può superare 50 caratteri'],
    }],
    
    // Durata in minuti (opzionale, per attività con time tracking)
    duration: {
        type: Number,
        min: [0, 'La durata non può essere negativa'],
    },
    
}, {
    timestamps: true,
});

// =========================================
// INDEXES
// =========================================

/**
 * Indice composto per query frequenti:
 * - "Tutte le entries di un utente ordinate per data"
 * - "Tutte le entries di un progetto ordinate per data"
 */
workEntrySchema.index({ user: 1, date: -1 });
workEntrySchema.index({ user: 1, project: 1, date: -1 });
workEntrySchema.index({ user: 1, category: 1, date: -1 });

/**
 * Indice per ricerca testuale su titolo e contenuto
 */
workEntrySchema.index({ title: 'text', content: 'text' });

/**
 * Indice per tag (per ricerca futura)
 */
workEntrySchema.index({ tags: 1 });

// =========================================
// PLUGINS
// =========================================

workEntrySchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});

// =========================================
// VIRTUALS
// =========================================

/**
 * Calcola la durata in ore (formato decimale).
 */
workEntrySchema.virtual('durationHours').get(function() {
    if (this.duration == null) return null;
    return (this.duration / 60).toFixed(2);
});

// =========================================
// SERIALIZATION
// =========================================

workEntrySchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.user; // Non esporre l'ID utente
    }
});

module.exports = mongoose.model('WorkEntry', workEntrySchema);
