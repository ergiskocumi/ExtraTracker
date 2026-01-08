/**
 * 🏷️ TAG MODEL - Multi-Tenant
 * ============================
 *
 * Schema per i tag trasversali per categorizzare i mazzi.
 *
 * RELAZIONI:
 * - Appartiene a un User (multi-tenancy)
 * - Many-to-many con Deck (via deck.tags array)
 */

const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const tagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Il nome del tag è obbligatorio'],
        trim: true,
        maxlength: [30, 'Il nome non può superare 30 caratteri'],
        lowercase: true, // Normalizza per evitare duplicati case-sensitive
    },
    color: {
        type: String,
        default: '#888888',
        match: [/^#[0-9A-Fa-f]{6}$/, 'Il colore deve essere in formato hex (#RRGGBB)'],
    },
    icon: {
        type: String,
        default: '🏷️',
        maxlength: [10, 'L\'icona non può superare 10 caratteri'],
    },
    order: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

// Plugin multi-tenancy
tagSchema.plugin(multiTenancyPlugin);

// Index per query veloci (name deve essere unico per utente)
tagSchema.index({ user: 1, name: 1 }, { unique: true });
tagSchema.index({ user: 1, order: 1 });

// Pre-save: normalizza il nome
tagSchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.name = this.name.trim().toLowerCase();
    }
    next();
});

// Metodo per contare i deck con questo tag
tagSchema.methods.getDeckCount = async function() {
    const Deck = mongoose.model('Deck');
    return await Deck.countDocuments({
        user: this.user,
        tags: { $in: [this.name] },
    });
};

// =========================================
// SERIALIZATION
// =========================================

tagSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
        ret.id = ret._id?.toString() || ret._id;
        delete ret._id;
        delete ret.user;
    }
});

tagSchema.set('toObject', {
    virtuals: true,
});

module.exports = mongoose.model('Tag', tagSchema);
