/**
 * 🏷️ TAGS CONTROLLER
 * ==================
 *
 * Gestisce le richieste HTTP per i tag.
 */

const Tag = require('../models/Tag');
const Deck = require('../models/Deck');
const { asyncHandler } = require('../middleware/errorHandler');
const AppError = require('../utils/AppError');
const { serializeDocument, serializeDocuments } = require('../utils/serializeDocument');

// =========================================
// GET ALL TAGS
// =========================================

const getAllTags = asyncHandler(async (req, res) => {
    // SICUREZZA: Usa esplicitamente il filtro tenant
    const userId = req.tenantScope.userId || req.tenantScope.tenantId;
    console.log('[TagsController] getAllTags: userId:', userId);
    
    const tags = await Tag.find({ user: userId })
        .sort({ order: 1, createdAt: 1 });
    
    console.log('[TagsController] getAllTags: Found tags:', tags.length);
    
    const serializedTags = serializeDocuments(tags);
    
    // Conta i deck per ogni tag
    const tagNames = serializedTags.map(t => t.name);
    const deckCounts = await Deck.aggregate([
        { $match: { user: userId, tags: { $in: tagNames } } },
        { $unwind: '$tags' },
        { $match: { tags: { $in: tagNames } } },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
    ]);
    
    const countMap = {};
    deckCounts.forEach(item => {
        countMap[item._id] = item.count;
    });
    
    const tagsWithCounts = serializedTags.map(tag => ({
        ...tag,
        count: countMap[tag.name] || 0,
    }));
    
    res.json({ success: true, data: tagsWithCounts });
});

// =========================================
// CREATE TAG
// =========================================

const createTag = asyncHandler(async (req, res) => {
    const { name, color, icon } = req.body;
    
    if (!name || !name.trim()) {
        throw AppError.validation('Il nome del tag è obbligatorio');
    }
    
    // SICUREZZA: Usa esplicitamente il filtro tenant
    const userId = req.tenantScope.userId || req.tenantScope.tenantId;
    console.log('[TagsController] createTag: userId:', userId);
    
    // Verifica se esiste già (case-insensitive)
    const existing = await Tag.findOne({
        user: userId,
        name: name.trim().toLowerCase(),
    });
    
    if (existing) {
        throw AppError.validation('Un tag con questo nome esiste già');
    }
    
    const tag = await Tag.create({
        name: name.trim().toLowerCase(),
        color: color || '#888888',
        icon: icon || '🏷️',
        user: userId, // SICUREZZA: Imposta esplicitamente l'utente
    });
    
    console.log('[TagsController] createTag: Created tag:', tag._id, 'for user:', userId);
    
    res.status(201).json({ success: true, data: serializeDocument(tag) });
});

// =========================================
// UPDATE TAG
// =========================================

const updateTag = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, color, icon, order } = req.body;
    
    // SICUREZZA: Usa esplicitamente il filtro tenant
    const userId = req.tenantScope.userId || req.tenantScope.tenantId;
    const tag = await Tag.findOne({ _id: id, user: userId });
    if (!tag) {
        throw AppError.notFound('Tag non trovato');
    }
    
    // Se si cambia il nome, verifica duplicati
    if (name !== undefined && name.trim().toLowerCase() !== tag.name) {
        const existing = await Tag.findOne({
            user: userId,
            name: name.trim().toLowerCase(),
            _id: { $ne: id },
        });
        
        if (existing) {
            throw AppError.validation('Un tag con questo nome esiste già');
        }
        
        // Aggiorna il nome nei deck che usano questo tag
        const oldName = tag.name;
        const newName = name.trim().toLowerCase();
        
        await Deck.updateMany(
            { user: userId, tags: oldName },
            { $set: { 'tags.$': newName } }
        );
        
        tag.name = newName;
    }
    
    if (color !== undefined) tag.color = color;
    if (icon !== undefined) tag.icon = icon;
    if (order !== undefined) tag.order = order;
    
    await tag.save();
    
    res.json({ success: true, data: serializeDocument(tag) });
});

// =========================================
// DELETE TAG
// =========================================

const deleteTag = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // SICUREZZA: Usa esplicitamente il filtro tenant
    const userId = req.tenantScope.userId || req.tenantScope.tenantId;
    const tag = await Tag.findOne({ _id: id, user: userId });
    if (!tag) {
        throw AppError.notFound('Tag non trovato');
    }
    
    // Rimuovi il tag da tutti i deck
    await Deck.updateMany(
        { user: userId, tags: tag.name },
        { $pull: { tags: tag.name } }
    );
    
    await tag.deleteOne();
    
    res.json({ success: true, message: 'Tag eliminato' });
});

module.exports = {
    getAllTags,
    createTag,
    updateTag,
    deleteTag,
};
