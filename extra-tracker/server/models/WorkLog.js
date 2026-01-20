/**
 * ⏱️ WORKLOG MODEL - Multi-Tenant (Unificato)
 * ============================================
 * 
 * Schema unificato per log di lavoro e note di lavoro.
 * Supporta sia time tracking (con orari) che note senza orari.
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
        required: [true, 'Il progetto è obbligatorio'],
        index: true,
    },
    
    // Data del lavoro (formato ISO: YYYY-MM-DD)
    date: { 
        type: String, 
        required: [true, 'La data è obbligatoria'],
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido (usa YYYY-MM-DD)'],
    },
    
    // Titolo breve dell'attività
    title: {
        type: String,
        required: [true, 'Il titolo è obbligatorio'],
        trim: true,
        maxlength: [200, 'Il titolo non può superare 200 caratteri'],
    },
    
    // Descrizione/note del lavoro svolto
    description: { 
        type: String,
        trim: true,
        maxlength: [5000, 'La descrizione non può superare 5000 caratteri'],
    },
    
    // Tag per ricerca e categorizzazione
    tags: [{
        type: String,
        trim: true,
        maxlength: [50, 'Ogni tag non può superare 50 caratteri'],
    }],
    
    // Mood/umore durante il lavoro
    mood: {
        type: String,
        enum: {
            values: ['high', 'neutral', 'low'],
            message: 'Mood deve essere: high, neutral, o low',
        },
    },
    
    // Indica se il lavoro è fatturabile
    isBillable: {
        type: Boolean,
        default: true,
    },
    
    // Ora inizio (formato HH:mm) - OPZIONALE
    startTime: { 
        type: String, 
        match: [/^\d{2}:\d{2}$/, 'Formato ora non valido (usa HH:mm)'],
    },
    
    // Ora fine (formato HH:mm) - OPZIONALE
    endTime: { 
        type: String, 
        match: [/^\d{2}:\d{2}$/, 'Formato ora non valido (usa HH:mm)'],
    },
    
    // Durata in minuti (calcolata automaticamente se orari presenti, altrimenti 0 o valore manuale)
    durationMinutes: {
        type: Number,
        min: 0,
        default: 0,
    },
    
    // Flag per indicare se la durata è stata impostata manualmente dall'utente
    // Se true, il pre-save hook NON ricalcola la durata anche se startTime/endTime sono presenti
    isManualDuration: {
        type: Boolean,
        default: false,
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

/**
 * Indice per ricerca testuale su titolo e descrizione
 */
workLogSchema.index({ title: 'text', description: 'text' });

/**
 * Indice per tag (per ricerca futura)
 */
workLogSchema.index({ tags: 1 });

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
 * Pre-save: calcola automaticamente la durata in minuti SOLO se orari sono presenti.
 * Se isManualDuration è true, salta il calcolo automatico e rispetta il valore manuale.
 * Se orari mancano, durationMinutes rimane 0 (o valore inserito manualmente).
 */
workLogSchema.pre('save', function(next) {
    // Se la durata è manuale, fidati dell'utente e salta il calcolo automatico
    if (this.isManualDuration) {
        return next();
    }

    // Calcola durationMinutes solo se startTime E endTime sono entrambi presenti
    if (this.startTime && this.endTime) {
        // Ricalcola solo se gli orari sono stati modificati
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
    } else {
        // Se orari mancano, durationMinutes = 0 (a meno che non sia stato inserito manualmente)
        // Se durationMinutes non è stato modificato esplicitamente, imposta a 0
        if (!this.isModified('durationMinutes')) {
            this.durationMinutes = 0;
        }
    }
    
    next();
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