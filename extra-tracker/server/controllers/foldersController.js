/**
 * 📁 FOLDERS CONTROLLER
 * =====================
 *
 * Gestisce le richieste HTTP per le cartelle.
 */

const Folder = require('../models/Folder');
const Deck = require('../models/Deck');
const { asyncHandler } = require('../middleware/errorHandler');
const AppError = require('../utils/AppError');
const { serializeDocument, serializeDocuments } = require('../utils/serializeDocument');

// =========================================
// GET ALL FOLDERS
// =========================================

const getAllFolders = asyncHandler(async (req, res) => {
    const folders = await req.tenantScope.model(Folder)
        .find()
        .sort({ order: 1, createdAt: 1 });
    
    const serialized = serializeDocuments(folders);
    res.json({ success: true, data: serialized });
});

// =========================================
// GET FOLDER TREE (gerarchico)
// =========================================

const getFolderTree = asyncHandler(async (req, res) => {
    const folders = await req.tenantScope.model(Folder)
        .find()
        .sort({ order: 1, createdAt: 1 });
    
    const serializedFolders = serializeDocuments(folders);
    
    // Conta i deck per ogni cartella (usa ObjectId per il match)
    const folderObjectIds = folders.map(f => f._id);
    const deckCounts = await Deck.aggregate([
        { $match: { ...req.tenantScope.filter, folderId: { $in: folderObjectIds } } },
        { $group: { _id: '$folderId', count: { $sum: 1 } } },
    ]);
    
    // Crea mappa id -> count
    // Usa l'id serializzato delle cartelle per mappare i conteggi
    const countMap = {};
    deckCounts.forEach(item => {
        if (item._id) {
            const folderObjectId = item._id.toString();
            // Trova la cartella corrispondente usando l'ObjectId originale
            const originalFolder = folders.find(f => f._id.toString() === folderObjectId);
            if (originalFolder) {
                const serializedFolder = serializedFolders.find(f => {
                    // Confronta usando l'id serializzato o l'ObjectId originale
                    return (f.id && f.id === originalFolder._id.toString()) ||
                           (f._id && f._id.toString() === folderObjectId);
                });
                if (serializedFolder && serializedFolder.id) {
                    countMap[serializedFolder.id] = item.count;
                }
            }
        }
    });
    
    // Costruisci albero gerarchico
    const buildTree = (parentId = null) => {
        return serializedFolders
            .filter(f => {
                const fParentId = f.parentId || null;
                return fParentId === parentId;
            })
            .map(folder => ({
                ...folder,
                count: countMap[folder.id] || 0,
                children: buildTree(folder.id),
            }));
    };
    
    const tree = buildTree();
    
    res.json({ success: true, data: tree });
});

// =========================================
// CREATE FOLDER
// =========================================

const createFolder = asyncHandler(async (req, res) => {
    const { name, parentId, icon, color } = req.body;
    
    if (!name || !name.trim()) {
        throw AppError.validation('Il nome della cartella è obbligatorio');
    }
    
    // Verifica parent se specificato
    if (parentId) {
        const parent = await req.tenantScope.model(Folder).findOne({ _id: parentId });
        if (!parent) {
            throw AppError.notFound('Cartella parent non trovata');
        }
    }
    
    const folder = await req.tenantScope.create(Folder, {
        name: name.trim(),
        parentId: parentId || null,
        icon: icon || '📁',
        color: color || '#888888',
    });
    
    res.status(201).json({ success: true, data: serializeDocument(folder) });
});

// =========================================
// UPDATE FOLDER
// =========================================

const updateFolder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, parentId, icon, color, order } = req.body;
    
    const folder = await Folder.findOne({ _id: id, user: req.tenantScope.userId });
    if (!folder) {
        throw AppError.notFound('Cartella non trovata');
    }
    
    if (name !== undefined) folder.name = name.trim();
    if (icon !== undefined) folder.icon = icon;
    if (color !== undefined) folder.color = color;
    if (order !== undefined) folder.order = order;
    
    // Verifica parent se specificato
    if (parentId !== undefined) {
        if (parentId === null) {
            folder.parentId = null;
        } else {
            // Evita loop infiniti: non permettere di mettere una cartella dentro se stessa
            if (parentId === id) {
                throw AppError.validation('Una cartella non può essere parent di se stessa');
            }
            
            const parent = await req.tenantScope.model(Folder).findOne({ _id: parentId });
            if (!parent) {
                throw AppError.notFound('Cartella parent non trovata');
            }
            
            folder.parentId = parentId;
        }
    }
    
    await folder.save();
    
    res.json({ success: true, data: serializeDocument(folder) });
});

// =========================================
// DELETE FOLDER
// =========================================

const deleteFolder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const folder = await req.tenantScope.model(Folder).findOne({ _id: id });
    if (!folder) {
        throw AppError.notFound('Cartella non trovata');
    }
    
    // Sposta i deck nella cartella radice (null)
    await Deck.updateMany(
        { ...req.tenantScope.filter, folderId: id },
        { $unset: { folderId: 1 } }
    );
    
    // Elimina la cartella (i children vengono gestiti dal pre-remove hook)
    await folder.remove();
    
    res.json({ success: true, message: 'Cartella eliminata' });
});

// =========================================
// MOVE DECKS TO FOLDER
// =========================================

const moveDecksToFolder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { deckIds } = req.body;
    
    if (!Array.isArray(deckIds) || deckIds.length === 0) {
        throw AppError.validation('Devi specificare almeno un mazzo da spostare');
    }
    
    // Verifica che la cartella esista (se id non è null)
    if (id !== 'null' && id !== 'root') {
        const folder = await req.tenantScope.model(Folder).findOne({ _id: id });
        if (!folder) {
            throw AppError.notFound('Cartella non trovata');
        }
    }
    
    const folderId = (id === 'null' || id === 'root') ? null : id;
    
    // Sposta i deck
    await Deck.updateMany(
        { ...req.tenantScope.filter, _id: { $in: deckIds } },
        { folderId }
    );
    
    res.json({ success: true, message: `${deckIds.length} mazzo/i spostato/i` });
});

module.exports = {
    getAllFolders,
    getFolderTree,
    createFolder,
    updateFolder,
    deleteFolder,
    moveDecksToFolder,
};
