/**
 * 📁 FOLDER SERVICE
 * =================
 * Business logic per le cartelle.
 * Il controller chiama solo questo service.
 */

const folderRepository = require('../repositories/FolderRepository');
const deckRepository = require('../repositories/DeckRepository');
const Deck = require('../models/Deck');
const Folder = require('../models/Folder');
const AppError = require('../utils/AppError');
const { serializeDocument, serializeDocuments } = require('../utils/serializeDocument');
const logger = require('../utils/logger');

class FolderService {
    /**
     * Ottieni tutte le cartelle dell'utente (flat list).
     */
    async getAll(tenantScope) {
        const folders = await folderRepository.find(tenantScope, {}, {
            sort: { order: 1, createdAt: 1 },
        });
        logger.debug('FolderService', `getAll: Found ${folders.length} folders`);
        return serializeDocuments(folders);
    }

    /**
     * Ottieni l'albero gerarchico delle cartelle con conteggi deck.
     */
    async getTree(tenantScope) {
        const userId = tenantScope.userId || tenantScope.tenantId;
        const folders = await folderRepository.find(tenantScope, {}, {
            sort: { order: 1, createdAt: 1 },
        });

        logger.debug('FolderService', `getTree: Found ${folders.length} folders`);
        const serializedFolders = serializeDocuments(folders);

        // Conta i deck per ogni cartella
        const folderObjectIds = folders.map(f => f._id);
        // ATTENZIONE: Il filtro { user: userId } deve SEMPRE essere nel $match — il plugin multi-tenancy non si applica a aggregate()
        const deckCounts = await Deck.aggregate([
            { $match: { user: userId, folderId: { $in: folderObjectIds } } },
            { $group: { _id: '$folderId', count: { $sum: 1 } } },
        ]);

        // Crea mappa id -> count
        const countMap = {};
        deckCounts.forEach(item => {
            if (item._id) {
                const folderObjectId = item._id.toString();
                const originalFolder = folders.find(f => f._id.toString() === folderObjectId);
                if (originalFolder) {
                    const serializedFolder = serializedFolders.find(f => {
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
                .filter(f => (f.parentId || null) === parentId)
                .map(folder => ({
                    ...folder,
                    count: countMap[folder.id] || 0,
                    children: buildTree(folder.id),
                }));
        };

        return buildTree();
    }

    /**
     * Crea una nuova cartella.
     */
    async create(tenantScope, data) {
        const { name, parentId, icon, color } = data;

        if (!name || !name.trim()) {
            throw AppError.validation('Il nome della cartella è obbligatorio');
        }

        // Verifica parent se specificato
        if (parentId) {
            const parent = await folderRepository.findById(tenantScope, parentId);
            if (!parent) {
                throw AppError.notFound('Cartella parent non trovata');
            }
        }

        const folder = await folderRepository.create(tenantScope, {
            name: name.trim(),
            parentId: parentId || null,
            icon: icon || '📁',
            color: color || '#888888',
        });

        logger.success('FolderService', `Created folder: ${folder._id}`, { folderName: folder.name });
        return serializeDocument(folder);
    }

    /**
     * Aggiorna una cartella esistente.
     */
    async update(tenantScope, id, data) {
        const { name, parentId, icon, color, order } = data;

        const folder = await folderRepository.findById(tenantScope, id, { throwIfNotFound: true });

        if (name !== undefined) folder.name = name.trim();
        if (icon !== undefined) folder.icon = icon;
        if (color !== undefined) folder.color = color;
        if (order !== undefined) folder.order = order;

        // Verifica parent se specificato
        if (parentId !== undefined) {
            if (parentId === null) {
                folder.parentId = null;
            } else {
                if (parentId === id) {
                    throw AppError.validation('Una cartella non può essere parent di se stessa');
                }
                const parent = await folderRepository.findById(tenantScope, parentId);
                if (!parent) {
                    throw AppError.notFound('Cartella parent non trovata');
                }
                folder.parentId = parentId;
            }
        }

        await folder.save();
        return serializeDocument(folder);
    }

    /**
     * Elimina una cartella e sposta i deck nella radice.
     */
    async delete(tenantScope, id) {
        const userId = tenantScope.userId || tenantScope.tenantId;
        const folder = await folderRepository.findById(tenantScope, id, { throwIfNotFound: true });

        // Sposta i deck nella cartella radice
        await Deck.updateMany(
            { user: userId, folderId: id },
            { $unset: { folderId: 1 } }
        );

        await folder.deleteOne();
        return { message: 'Cartella eliminata' };
    }

    /**
     * Sposta deck in una cartella.
     */
    async moveDecks(tenantScope, folderId, deckIds) {
        if (!Array.isArray(deckIds) || deckIds.length === 0) {
            throw AppError.validation('Devi specificare almeno un mazzo da spostare');
        }

        const userId = tenantScope.userId || tenantScope.tenantId;

        // Verifica che la cartella esista (se non root)
        if (folderId !== null) {
            const folder = await folderRepository.findById(tenantScope, folderId);
            if (!folder) {
                throw AppError.notFound('Cartella non trovata');
            }
        }

        await Deck.updateMany(
            { user: userId, _id: { $in: deckIds } },
            { folderId }
        );

        return { message: `${deckIds.length} mazzo/i spostato/i` };
    }
}

module.exports = new FolderService();
