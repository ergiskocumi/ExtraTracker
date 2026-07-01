/**
 * 📁 FOLDER MODEL - Multi-Tenant
 * ===============================
 *
 * Schema per le cartelle gerarchiche per organizzare i mazzi.
 *
 * RELAZIONI:
 * - Appartiene a un User (multi-tenancy)
 * - Può avere un parent (annidamento gerarchico)
 * - Contiene molti Deck (via deck.folderId)
 */

const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const folderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Il nome della cartella è obbligatorio'],
        trim: true,
        maxlength: [50, 'Il nome non può superare 50 caratteri'],
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
        default: null,
        index: true,
    },
    icon: {
        type: String,
        default: '📁',
        maxlength: [10, 'L\'icona non può superare 10 caratteri'],
    },
    color: {
        type: String,
        default: '#888888',
        match: [/^#[0-9A-Fa-f]{6}$/, 'Il colore deve essere in formato hex (#RRGGBB)'],
    },
    order: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

// Plugin multi-tenancy
folderSchema.plugin(multiTenancyPlugin);

// Index per query veloci
folderSchema.index({ user: 1, parentId: 1 });
folderSchema.index({ user: 1, order: 1 });

// Virtual per contare i deck nella cartella
folderSchema.virtual('deckCount', {
    ref: 'Deck',
    localField: '_id',
    foreignField: 'folderId',
    count: true,
});

// =========================================
// SERIALIZATION
// =========================================

folderSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
        ret.id = ret._id?.toString() || ret._id;
        delete ret._id;
        delete ret.user;
        
        // Converti parentId se presente
        if (ret.parentId) {
            ret.parentId = ret.parentId.toString();
        }
    }
});

folderSchema.set('toObject', {
    virtuals: true,
});

// Metodo per ottenere il path completo della cartella
folderSchema.methods.getPath = async function() {
    const path = [this.name];
    let current = this;
    
    while (current.parentId) {
        current = await mongoose.model('Folder').findById(current.parentId);
        if (!current) break;
        path.unshift(current.name);
    }
    
    return path.join(' / ');
};

// Pre-save: normalizza il nome
folderSchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.name = this.name.trim();
    }
    next();
});

// Pre-remove: sposta i deck nella cartella radice (o elimina se necessario)
// IMPORTANTE: Filtra per user per garantire multi-tenancy
folderSchema.pre('remove', async function(next) {
    // Guard: se user è undefined, updateMany matcha TUTTI gli utenti — blocco per sicurezza
    if (!this.user) {
        return next(new Error('Folder user is required for cascade delete'));
    }
    const Deck = mongoose.model('Deck');
    await Deck.updateMany(
        { folderId: this._id, user: this.user },
        { $unset: { folderId: 1 } }
    );
    next();
});

module.exports = mongoose.model('Folder', folderSchema);
