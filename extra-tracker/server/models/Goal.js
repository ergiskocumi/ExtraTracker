/**
 * 🎯 GOAL MODEL - Multi-Tenant
 * ============================
 * 
 * Schema per gli obiettivi dell'utente.
 * 
 * TIPI DI OBIETTIVI:
 * 1. TARGET: Obiettivi con valore finale (es. "Risparmiare 1000€")
 * 2. HABIT: Obiettivi basati su frequenza (es. "Palestra 3x settimana")
 */

const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const goalSchema = new mongoose.Schema({
    // Titolo dell'obiettivo
    title: { 
        type: String, 
        required: [true, 'Il titolo è obbligatorio'],
        trim: true,
        maxlength: [100, 'Il titolo non può superare 100 caratteri'],
    },
    
    // Categoria macro (per raggruppamento nella UI)
    category: { 
        type: String, 
        required: [true, 'La categoria è obbligatoria'],
        enum: {
            values: ['finance', 'health', 'learning', 'career', 'personal'],
            message: 'Categoria non valida',
        },
    },
    
    // Tipo di obiettivo: determina la logica di calcolo progresso
    type: { 
        type: String, 
        required: [true, 'Il tipo è obbligatorio'],
        enum: {
            values: ['target', 'habit'],
            message: 'Tipo non valido (usa "target" o "habit")',
        },
    },
    
    // Valore target da raggiungere (solo per type: 'target')
    targetValue: { 
        type: Number, 
        default: null,
        min: [0, 'Il valore target non può essere negativo'],
    },
    
    // Unità di misura (€, ore, km, libri, ecc.)
    unit: { 
        type: String, 
        required: [true, 'L\'unità di misura è obbligatoria'],
        trim: true,
        maxlength: [20, 'L\'unità non può superare 20 caratteri'],
    },
    
    // Frequenza settimanale richiesta (solo per type: 'habit')
    frequency: { 
        type: Number, 
        default: null,
        min: [1, 'La frequenza deve essere almeno 1'],
        max: [7, 'La frequenza non può superare 7 (giorni/settimana)'],
    },
    
    // Data di scadenza
    deadline: { 
        type: Date, 
        required: [true, 'La data di scadenza è obbligatoria'],
    },
    
    // Stato dell'obiettivo
    status: { 
        type: String, 
        default: 'active',
        enum: ['active', 'completed', 'abandoned'],
    },
    
    // Descrizione/Note aggiuntive
    description: { 
        type: String,
        default: '',
        trim: true,
        maxlength: [500, 'La descrizione non può superare 500 caratteri'],
    },
    
}, {
    timestamps: true,
});

// =========================================
// INDEXES
// =========================================

goalSchema.index({ user: 1, status: 1 });
goalSchema.index({ user: 1, category: 1 });
goalSchema.index({ user: 1, deadline: 1 });

// =========================================
// PLUGINS
// =========================================

goalSchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});

// =========================================
// VALIDATION
// =========================================

goalSchema.pre('validate', function() {
    if (this.type === 'target' && this.targetValue == null) {
        this.invalidate('targetValue', 'Il valore target è obbligatorio per obiettivi di tipo "target"');
    }
    
    if (this.type === 'habit' && this.frequency == null) {
        this.invalidate('frequency', 'La frequenza è obbligatoria per obiettivi di tipo "habit"');
    }
});

// =========================================
// SERIALIZATION
// =========================================

goalSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.user;
    }
});

module.exports = mongoose.model('Goal', goalSchema);
