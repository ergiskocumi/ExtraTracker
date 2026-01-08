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
    const tags = await req.tenantScope.model(Tag)
        .find()
        .sort({ order: 1, createdAt: 1 });
    
    const serializedTags = serializeDocuments(tags);
    
    // Conta i deck per ogni tag
    const tagNames = serializedTags.map(t => t.name);
    const deckCounts = await Deck.aggregate([
        { $match: { ...req.tenantScope.filter, tags: { $in: tagNames } } },
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
    
    // Verifica se esiste già (case-insensitive)
    const existing = await req.tenantScope.model(Tag).findOne({
        name: name.trim().toLowerCase(),
    });
    
    if (existing) {
        throw AppError.validation('Un tag con questo nome esiste già');
    }
    
    const tag = await req.tenantScope.create(Tag, {
        name: name.trim().toLowerCase(),
        color: color || '#888888',
        icon: icon || '🏷️',
    });
    
    res.status(201).json({ success: true, data: serializeDocument(tag) });
});

// =========================================
// UPDATE TAG
// =========================================

const updateTag = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, color, icon, order } = req.body;
    
    const tag = await req.tenantScope.model(Tag).findOne({ _id: id });
    if (!tag) {
        throw AppError.notFound('Tag non trovato');
    }
    
    // Se si cambia il nome, verifica duplicati
    if (name !== undefined && name.trim().toLowerCase() !== tag.name) {
        const existing = await req.tenantScope.model(Tag).findOne({
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
            { ...req.tenantScope.filter, tags: oldName },
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
    
    const tag = await req.tenantScope.model(Tag).findOne({ _id: id });
    if (!tag) {
        throw AppError.notFound('Tag non trovato');
    }
    
    // Rimuovi il tag da tutti i deck
    await Deck.updateMany(
        { ...req.tenantScope.filter, tags: tag.name },
        { $pull: { tags: tag.name } }
    );
    
    await tag.remove();
    
    res.json({ success: true, message: 'Tag eliminato' });
});

module.exports = {
    getAllTags,
    createTag,
    updateTag,
    deleteTag,
};
