/**
 * 🧠 DECK MODEL - Multi-Tenant
 * =============================
 *
 * Schema per i mazzi di flashcard (stile Anki).
 *
 * RELAZIONI:
 * - Appartiene a un User (multi-tenancy)
 * - Appartiene a un Goal (referenza)
 */

const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

// =========================================
// CARD SUB-SCHEMA (Embedded Document)
// =========================================

const cardSchema = new mongoose.Schema({
    front: {
        type: String,
        required: [true, 'Il fronte della card e\' obbligatorio'],
        trim: true,
        maxlength: [2000, 'Il fronte non puo\' superare 2000 caratteri'],
    },
    back: {
        type: String,
        required: [true, 'Il retro della card e\' obbligatorio'],
        trim: true,
        maxlength: [4000, 'Il retro non puo\' superare 4000 caratteri'],
    },
    // SM-2 parameters
    easinessFactor: {
        type: Number,
        default: 2.5,
        min: [1.3, 'L\'easiness factor minimo e\' 1.3'],
    },
    interval: {
        type: Number,
        default: 0,
        min: [0, 'L\'intervallo non puo\' essere negativo'],
    },
    repetitions: {
        type: Number,
        default: 0,
        min: [0, 'Le ripetizioni non possono essere negative'],
    },
    nextReviewDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['new', 'learning', 'review', 'mastered'],
        default: 'new',
    },
    // FSRS parameter
    stability: {
        type: Number,
        default: 0.4,
    },
    // Leitner parameter
    box: {
        type: Number,
        default: 1,
        min: [1, 'Il box minimo è 1'],
    },
    // Review history per tracciare le performance
    lastReviewed: {
        type: Date,
        default: null,
    },
    reviewHistory: [{
        date: { type: Date, default: Date.now },
        rating: { type: Number, min: 1, max: 5 },
        interval: Number,
        easinessFactor: Number,
        repetitions: Number,
        algorithm: String,
    }],
    // Source metadata per tracciare la fonte originale nel PDF (Source Grounding)
    sourceMetadata: {
        type: {
            pageNumber: {
                type: Number,
                required: true,
                min: [1, 'Il numero di pagina deve essere almeno 1'],
            },
            originalText: {
                type: String,
                required: true,
                trim: true,
                minlength: [20, 'Il testo originale deve essere almeno 20 caratteri'],
                maxlength: [2000, 'Il testo originale non può superare 2000 caratteri'],
            },
        },
        default: null,
        _id: false,
    },
}, { _id: true });

const normalizeTags = (tags) => {
    if (!Array.isArray(tags)) return [];
    const normalized = tags
        .map(tag => (typeof tag === 'string' ? tag.trim() : ''))
        .filter(tag => tag.length > 0);
    return [...new Set(normalized)];
};

const deckSchema = new mongoose.Schema({
    goalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Goal',
        required: [true, 'Il goal associato e\' obbligatorio'],
        index: true,
    },
    title: {
        type: String,
        required: [true, 'Il titolo del mazzo e\' obbligatorio'],
        trim: true,
        maxlength: [120, 'Il titolo non puo\' superare 120 caratteri'],
    },
    description: {
        type: String,
        default: '',
        trim: true,
        maxlength: [500, 'La descrizione non puo\' superare 500 caratteri'],
    },
    pdfUrl: {
        type: String,
        default: '',
        trim: true,
    },
    extractedText: {
        type: String,
        default: '',
        select: false,
    },
    tags: {
        type: [String],
        default: [],
        set: normalizeTags,
        validate: {
            validator: function(tags) {
                return tags.length <= 5;
            },
            message: 'Un mazzo può avere massimo 5 tag',
        },
    },
    folderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
        default: null,
        index: true,
    },
    cards: {
        type: [cardSchema],
        default: [],
    },
    // =========================================
    // ALGORITHM & AI SETTINGS
    // =========================================
    algorithm: {
        type: String,
        enum: ['sm2', 'fsrs', 'leitner', 'anki'],
        default: 'sm2',
    },
    aiSettings: {
        style: {
            type: String,
            enum: ['comprehensive', 'conceptual', 'factual', 'application'],
            default: 'comprehensive',
        },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard', 'mixed'],
            default: 'medium',
        },
        questionTypes: {
            type: [String],
            default: ['definition', 'concept', 'relationship'],
        },
    },
    // Analytics tracking
    analytics: {
        totalReviews: { type: Number, default: 0 },
        averageTimePerCard: { type: Number, default: 0 }, // in seconds
        retentionRate: { type: Number, default: 0 }, // 0-1
        lastStudied: { type: Date },
        studyStreak: { type: Number, default: 0 },
    },
}, {
    timestamps: true,
});

// =========================================
// INDEXES
// =========================================

deckSchema.index({ user: 1, goalId: 1 });
deckSchema.index({ user: 1, folderId: 1 });
deckSchema.index({ user: 1, tags: 1 });
deckSchema.index({ user: 1, 'cards.nextReviewDate': 1 });

// =========================================
// PLUGINS
// =========================================

deckSchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});

// =========================================
// SERIALIZATION
// =========================================

deckSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.user;
        delete ret.extractedText;

        // Converti folderId se presente (anche null deve essere incluso)
        if (ret.folderId !== undefined && ret.folderId !== null) {
            ret.folderId = ret.folderId.toString();
        } else {
            ret.folderId = null; // Esplicito per chiarezza
        }

        if (Array.isArray(ret.cards)) {
            ret.cards = ret.cards.map(card => ({
                ...card,
                id: card._id?.toString() || card.id,
                _id: undefined,
            }));
        }
    }
});

module.exports = mongoose.model('Deck', deckSchema);
