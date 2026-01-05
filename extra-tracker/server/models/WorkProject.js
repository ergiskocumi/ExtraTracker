/**
 * 📂 WORK PROJECT MODEL - Multi-Tenant
 * =====================================
 * 
 * Schema per i progetti del Workspace (Work Journal).
 * Versione semplificata rispetto a Project.js:
 * - Rimossi: rate, code, estimatedHours, progress (orientati a time tracking)
 * - Aggiunti: icon, color (per UI)
 * 
 * MULTI-TENANCY:
 * Il campo `user` viene aggiunto automaticamente dal plugin.
 * Ogni query su questo model sarà automaticamente filtrata per tenant.
 */

const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const workProjectSchema = new mongoose.Schema({
    // Nome del progetto
    name: { 
        type: String, 
        required: [true, 'Il nome del progetto è obbligatorio'],
        trim: true,
        maxlength: [100, 'Il nome non può superare 100 caratteri'],
    },
    
    // Descrizione opzionale
    description: { 
        type: String,
        trim: true,
        maxlength: [500, 'La descrizione non può superare 500 caratteri'],
    },
    
    // Colore per la UI (hex)
    color: {
        type: String,
        default: '#6366f1', // indigo-500
        match: [/^#[0-9A-Fa-f]{6}$/, 'Il colore deve essere un hex valido (es. #6366f1)'],
    },
    
    // Icona per la UI (emoji o nome icona)
    icon: {
        type: String,
        trim: true,
        maxlength: [10, 'L\'icona non può superare 10 caratteri'],
        default: '📂',
    },
    
    // Stato del progetto
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active',
    },
    
}, {
    timestamps: true, // Aggiunge createdAt e updatedAt automaticamente
});

// =========================================
// INDEXES
// =========================================

/**
 * Indice per ricerca testuale.
 */
workProjectSchema.index({ name: 'text', description: 'text' });

/**
 * Indice per query frequenti: progetti attivi ordinati per nome
 */
workProjectSchema.index({ user: 1, status: 1, name: 1 });

// =========================================
// PLUGINS
// =========================================

/**
 * Applica il plugin Multi-Tenancy.
 */
workProjectSchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});

// =========================================
// VIRTUALS
// =========================================

/**
 * Conta le entries associate (popolato via populate o query separata)
 */
workProjectSchema.virtual('entriesCount', {
    ref: 'WorkEntry',
    localField: '_id',
    foreignField: 'project',
    count: true,
});

// =========================================
// SERIALIZATION
// =========================================

workProjectSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        // NON esporre l'ID utente nelle risposte API
        delete ret.user;
    }
});

workProjectSchema.set('toObject', {
    virtuals: true,
});

module.exports = mongoose.model('WorkProject', workProjectSchema);
