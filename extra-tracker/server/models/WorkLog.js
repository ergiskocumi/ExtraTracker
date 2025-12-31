/**
 * ⏱️ WORKLOG MODEL - Multi-Tenant
 * ================================
 * 
 * Schema per i log delle ore lavorate (straordinari).
 * 
 * RELAZIONI:
 * - Appartiene a un User (multi-tenancy)
 * - Appartiene a un Project (referenza)
 * 
 * SICUREZZA RELAZIONI:
 * Il campo projectId deve riferirsi a un progetto dello STESSO utente.
 * Questa validazione è implementata nel service layer.
 */

const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const workLogSchema = new mongoose.Schema({
    // Riferimento al progetto (DEVE essere dello stesso utente)
    projectId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, 'Il progetto è obbligatorio'],
        index: true,
    },
    
    // Data del lavoro (formato ISO: YYYY-MM-DD)
    date: { 
        type: String, 
        required: [true, 'La data è obbligatoria'],
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido (usa YYYY-MM-DD)'],
    },
    
    // Ora inizio (formato HH:mm)
    startTime: { 
        type: String, 
        required: [true, 'L\'ora di inizio è obbligatoria'],
        match: [/^\d{2}:\d{2}$/, 'Formato ora non valido (usa HH:mm)'],
    },
    
    // Ora fine (formato HH:mm)
    endTime: { 
        type: String, 
        required: [true, 'L\'ora di fine è obbligatoria'],
        match: [/^\d{2}:\d{2}$/, 'Formato ora non valido (usa HH:mm)'],
    },
    
    // Descrizione del lavoro svolto
    description: { 
        type: String,
        trim: true,
        maxlength: [500, 'La descrizione non può superare 500 caratteri'],
    },
    
    // Durata calcolata in minuti (per query aggregate efficienti)
    durationMinutes: {
        type: Number,
        min: 0,
    },
    
}, {
    timestamps: true,
});

// =========================================
// INDEXES
// =========================================

/**
 * Indice composto per query frequenti:
 * - "Tutti i worklog di un utente in un mese"
 * - "Tutti i worklog di un progetto"
 */
workLogSchema.index({ user: 1, date: -1 });
workLogSchema.index({ user: 1, projectId: 1, date: -1 });

// =========================================
// PLUGINS
// =========================================

workLogSchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});

// =========================================
// VIRTUALS
// =========================================

/**
 * Calcola la durata in ore (formato decimale).
 */
workLogSchema.virtual('durationHours').get(function() {
    if (this.durationMinutes == null) return null;
    return (this.durationMinutes / 60).toFixed(2);
});

// =========================================
// MIDDLEWARE
// =========================================

/**
 * Pre-save: calcola automaticamente la durata in minuti.
 */
workLogSchema.pre('save', function() {
    if (this.isModified('startTime') || this.isModified('endTime')) {
        const [startHour, startMin] = this.startTime.split(':').map(Number);
        const [endHour, endMin] = this.endTime.split(':').map(Number);
        
        let duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        
        // Gestisce lavoro oltre mezzanotte
        if (duration < 0) {
            duration += 24 * 60;
        }
        
        this.durationMinutes = duration;
    }
});

// =========================================
// SERIALIZATION
// =========================================

workLogSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.user; // Non esporre l'ID utente
    }
});

module.exports = mongoose.model('WorkLog', workLogSchema);