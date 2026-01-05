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

// =========================================
// MILESTONE SUB-SCHEMA (Embedded Document)
// =========================================

const actionStepSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Il titolo dello step è obbligatorio'],
        trim: true,
        maxlength: [200, 'Il titolo dello step non può superare 200 caratteri'],
    },
    isCompleted: {
        type: Boolean,
        default: false,
    },
}, { _id: false });

const milestoneSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Il titolo della milestone è obbligatorio'],
        trim: true,
        maxlength: [100, 'Il titolo non può superare 100 caratteri'],
    },
    notes: {
        type: String,
        default: '',
        trim: true,
        maxlength: [1000, 'Le note non possono superare 1000 caratteri'],
    },
    notesUpdatedAt: {
        type: Date,
        default: null,
    },
    notesHistory: {
        type: [
            {
                text: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: [1000, 'Le note non possono superare 1000 caratteri'],
                },
                savedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        default: [],
    },
    isCompleted: {
        type: Boolean,
        default: false,
    },
    weight: {
        type: Number,
        default: 1,
        min: [1, 'Il peso deve essere almeno 1'],
        max: [10, 'Il peso non può superare 10'],
    },
    completedAt: {
        type: Date,
        default: null,
    },
    // 🆕 AI-Generated Fields for Smart Goal Wizard
    deadline: {
        type: Date,
        default: null,
    },
    reasoning: {
        type: String,
        default: '',
        trim: true,
        maxlength: [500, 'Il reasoning non può superare 500 caratteri'],
    },
    actionSteps: {
        type: [actionStepSchema],
        default: [],
        validate: {
            validator: function(v) {
                return v.length <= 5; // Max 5 action steps per milestone
            },
            message: 'Una milestone può avere al massimo 5 action steps',
        },
    },
    resources: {
        type: [String],
        default: [],
        validate: {
            validator: function(v) {
                return v.length <= 5; // Max 5 resources per milestone
            },
            message: 'Una milestone può avere al massimo 5 risorse',
        },
    },
}, { _id: true });

// =========================================
// BACKWARD COMPATIBILITY
// =========================================
// Legacy data may store actionSteps as string[]. Normalize to {title,isCompleted:false}
milestoneSchema.pre('validate', function(next) {
    if (!Array.isArray(this.actionSteps)) {
        this.actionSteps = [];
        return next();
    }

    const normalized = [];
    for (const step of this.actionSteps) {
        if (typeof step === 'string') {
            const title = step.trim();
            if (title) normalized.push({ title, isCompleted: false });
            continue;
        }

        if (step && typeof step === 'object') {
            const title = typeof step.title === 'string' ? step.title.trim() : '';
            if (!title) continue;
            normalized.push({
                title,
                isCompleted: Boolean(step.isCompleted),
            });
        }
    }

    this.actionSteps = normalized;
    next();
});

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
            values: ['finance', 'health', 'learning', 'career', 'personal', 'relationships', 'creativity', 'mindfulness'],
            message: 'Categoria non valida',
        },
    },
    
    // Tipo di obiettivo: determina la logica di calcolo progresso
    type: { 
        type: String, 
        required: [true, 'Il tipo è obbligatorio'],
        enum: {
            values: ['target', 'habit', 'milestone', 'challenge', 'project'],
            message: 'Tipo non valido (usa "target", "habit", "milestone", "challenge" o "project")',
        },
    },
    
    // Valore target da raggiungere (solo per type: 'target' e 'challenge')
    targetValue: { 
        type: Number, 
        default: null,
        min: [0, 'Il valore target non può essere negativo'],
    },
    
    // Unità di misura (€, ore, km, libri, ecc.) - opzionale per habit/milestone/project
    unit: { 
        type: String, 
        default: '',
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
    
    // Micro-obiettivi (Milestones) - Embedded Documents
    milestones: {
        type: [milestoneSchema],
        default: [],
        validate: {
            validator: function(v) {
                return v.length <= 20; // Max 20 milestones per goal
            },
            message: 'Un obiettivo può avere al massimo 20 milestones',
        },
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
// VIRTUALS
// =========================================

/**
 * Calcola il progresso basato sulle milestones.
 * Se il goal ha milestones, il progresso è la % di milestones completate (pesate).
 * Altrimenti ritorna null (il progresso sarà calcolato dai check-ins).
 */
goalSchema.virtual('milestoneProgress').get(function() {
    if (!this.milestones || this.milestones.length === 0) {
        return null;
    }

    // Support partial progress via actionSteps when present.
    const totals = this.milestones.reduce(
        (acc, m) => {
            const weight = Number(m.weight) || 1;
            const steps = Array.isArray(m.actionSteps) ? m.actionSteps : [];
            const hasSteps = steps.length > 0;

            acc.total += weight;

            if (hasSteps) {
                const completedSteps = steps.filter(s => s && s.isCompleted).length;
                acc.completed += weight * (completedSteps / steps.length);
            } else {
                acc.completed += m.isCompleted ? weight : 0;
            }

            return acc;
        },
        { total: 0, completed: 0 }
    );

    return totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;
});

/**
 * Conta le milestones completate.
 */
goalSchema.virtual('completedMilestones').get(function() {
    if (!this.milestones) return 0;
    return this.milestones.filter(m => m.isCompleted).length;
});

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
        
        // Trasforma anche gli _id delle milestones in id
        if (ret.milestones && Array.isArray(ret.milestones)) {
            ret.milestones = ret.milestones.map(m => ({
                ...m,
                id: m._id?.toString() || m.id,
                _id: undefined,
            }));
        }
    }
});

module.exports = mongoose.model('Goal', goalSchema);