const mongoose = require('mongoose');

/**
 * CheckIn Schema - Registra i singoli progressi verso un obiettivo
 * Questa tabella permette di:
 * 1. Calcolare il progresso totale (sommando i valori)
 * 2. Generare grafici temporali
 * 3. Tracciare lo stato emotivo nel tempo
 */
const checkInSchema = new mongoose.Schema({
    // Riferimento all'obiettivo (relazione 1:N)
    goalId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Goal',
        required: true 
    },
    
    // Data del check-in
    date: { 
        type: Date, 
        required: true,
        default: Date.now
    },
    
    // Valore aggiunto in questo check-in
    // Es: +50€ risparmiati, +2 ore studiate, +1 (per abitudini binarie)
    value: { 
        type: Number, 
        required: true 
    },
    
    // Stato emotivo (1=triste, 2=neutro, 3=felice)
    // Utile per capire quando l'utente è più motivato
    mood: { 
        type: Number,
        min: 1,
        max: 3,
        default: 2
    },
    
    // Note opzionali (micro-journaling)
    notes: { 
        type: String,
        default: ''
    },
    
    // Timestamp di creazione
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Trasformazione ID per coerenza con frontend
checkInSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        delete ret._id;
    }
});

module.exports = mongoose.model('CheckIn', checkInSchema);
