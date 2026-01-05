/**
 * ✅ WORK TODO MODEL - Multi-Tenant
 * =================================
 * 
 * Schema per TODO/promemoria associati ai progetti workspace.
 * Permette di tracciare task e promemoria per ogni progetto.
 */

const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const workTodoSchema = new mongoose.Schema({
    // Progetto associato
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkProject',
        required: [true, 'Il progetto è obbligatorio'],
        index: true,
    },
    
    // Titolo del TODO
    title: {
        type: String,
        required: [true, 'Il titolo è obbligatorio'],
        trim: true,
        maxlength: [200, 'Il titolo non può superare 200 caratteri'],
    },
    
    // Descrizione dettagliata (opzionale)
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'La descrizione non può superare 1000 caratteri'],
    },
    
    // Priorità
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
    },
    
    // Stato
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'cancelled'],
        default: 'pending',
    },
    
    // Data di scadenza (opzionale)
    dueDate: {
        type: String, // YYYY-MM-DD
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido (usa YYYY-MM-DD)'],
    },
    
    // Data di completamento (auto-popolata quando status = 'completed')
    completedAt: {
        type: Date,
    },
    
    // Ordine di visualizzazione (per drag & drop futuro)
    order: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

// =========================================
// INDEXES
// =========================================

workTodoSchema.index({ user: 1, project: 1, status: 1 });
workTodoSchema.index({ user: 1, dueDate: 1 });
workTodoSchema.index({ user: 1, priority: 1, createdAt: -1 });

// =========================================
// MIDDLEWARE
// =========================================

// Auto-popola completedAt quando status diventa 'completed'
workTodoSchema.pre('save', function() {
    if (this.isModified('status')) {
        if (this.status === 'completed' && !this.completedAt) {
            this.completedAt = new Date();
        } else if (this.status !== 'completed' && this.completedAt) {
            this.completedAt = undefined;
        }
    }
});

// =========================================
// PLUGINS
// =========================================

workTodoSchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});

// =========================================
// SERIALIZATION
// =========================================

workTodoSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.user;
    }
});

workTodoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WorkTodo', workTodoSchema);
