const mongoose = require('mongoose');

/**
 * Goal Schema - Supporta due tipi di obiettivi:
 * 1. TARGET: Obiettivi con valore finale (es. "Risparmiare 1000€")
 * 2. HABIT: Obiettivi basati su frequenza (es. "Palestra 3x settimana")
 */
const goalSchema = new mongoose.Schema({
    // Titolo dell'obiettivo
    title: { 
        type: String, 
        required: true 
    },
    
    // Categoria macro (per raggruppamento nella UI)
    category: { 
        type: String, 
        required: true,
        enum: ['finance', 'health', 'learning', 'career', 'personal']
    },
    
    // Tipo di obiettivo: determina la logica di calcolo progresso
    type: { 
        type: String, 
        required: true,
        enum: ['target', 'habit']
    },
    
    // Valore target da raggiungere (solo per type: 'target')
    targetValue: { 
        type: Number, 
        default: null 
    },
    
    // Unità di misura (€, ore, km, libri, ecc.)
    unit: { 
        type: String, 
        required: true 
    },
    
    // Frequenza settimanale richiesta (solo per type: 'habit')
    // Es: 3 = "3 volte a settimana"
    frequency: { 
        type: Number, 
        default: null 
    },
    
    // Data di scadenza
    deadline: { 
        type: Date, 
        required: true 
    },
    
    // Stato dell'obiettivo
    status: { 
        type: String, 
        default: 'active',
        enum: ['active', 'completed', 'abandoned']
    },
    
    // Data di creazione
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    
    // Descrizione/Note aggiuntive
    description: { 
        type: String,
        default: ''
    }
});

// Trasformazione ID per coerenza con frontend
goalSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        delete ret._id;
    }
});

module.exports = mongoose.model('Goal', goalSchema);
