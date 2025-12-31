/**
 * ✅ CHECKIN MODEL - Multi-Tenant
 * ================================
 * 
 * Schema per i check-in/progressi verso un obiettivo.
 * 
 * RELAZIONI:
 * - Appartiene a un User (multi-tenancy)
 * - Appartiene a un Goal (referenza)
 * 
 * SICUREZZA RELAZIONI:
 * Il goalId deve riferirsi a un goal dello STESSO utente.
 */

const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const checkInSchema = new mongoose.Schema({
    // Riferimento all'obiettivo (DEVE essere dello stesso utente)
    goalId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Goal',
        required: [true, 'L\'obiettivo è obbligatorio'],
        index: true,
    },
    
    // Data del check-in
    date: { 
        type: Date, 
        required: [true, 'La data è obbligatoria'],
        default: Date.now,
    },
    
    // Valore aggiunto in questo check-in
    value: { 
        type: Number, 
        required: [true, 'Il valore è obbligatorio'],
    },
    
    // Stato emotivo (1=triste, 2=neutro, 3=felice)
    mood: { 
        type: Number,
        min: [1, 'Il mood deve essere tra 1 e 3'],
        max: [3, 'Il mood deve essere tra 1 e 3'],
        default: 2,
    },
    
    // Note opzionali (micro-journaling)
    notes: { 
        type: String,
        default: '',
        trim: true,
        maxlength: [500, 'Le note non possono superare 500 caratteri'],
    },
    
}, {
    timestamps: true,
});

// =========================================
// INDEXES
// =========================================

checkInSchema.index({ user: 1, goalId: 1, date: -1 });
checkInSchema.index({ user: 1, date: -1 });

// =========================================
// PLUGINS
// =========================================

checkInSchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});

// =========================================
// SERIALIZATION
// =========================================

checkInSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.user;
    }
});

module.exports = mongoose.model('CheckIn', checkInSchema);
