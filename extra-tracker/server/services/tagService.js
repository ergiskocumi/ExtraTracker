/**
 * 🏷️ TAG SERVICE
 * ==============
 * Business logic per i tag.
 * Il controller chiama solo questo service.
 */

const tagRepository = require('../repositories/TagRepository');
const Deck = require('../models/Deck');
const AppError = require('../utils/AppError');
const { serializeDocument, serializeDocuments } = require('../utils/serializeDocument');
const logger = require('../utils/logger');

class TagService {
    /**
     * Ottieni tutti i tag dell'utente con conteggi deck.
     */
    async getAll(tenantScope) {
        const userId = tenantScope.userId || tenantScope.tenantId;

        const tags = await tagRepository.find(tenantScope, {}, {
            sort: { order: 1, createdAt: 1 },
        });

        logger.debug('TagService', `getAll: Found ${tags.length} tags`);
        const serializedTags = serializeDocuments(tags);

        // Conta i deck per ogni tag
        const tagNames = serializedTags.map(t => t.name);
        // ATTENZIONE: Il filtro { user: userId } deve SEMPRE essere nel $match — il plugin multi-tenancy non si applica a aggregate()
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

        return serializedTags.map(tag => ({
            ...tag,
            count: countMap[tag.name] || 0,
        }));
    }

    /**
     * Crea un nuovo tag.
     */
    async create(tenantScope, data) {
        const { name, color, icon } = data;

        if (!name || !name.trim()) {
            throw AppError.validation('Il nome del tag è obbligatorio');
        }

        // Verifica se esiste già (case-insensitive)
        const existing = await tagRepository.findOne(tenantScope, {
            name: name.trim().toLowerCase(),
        });

        if (existing) {
            throw AppError.validation('Un tag con questo nome esiste già');
        }

        const tag = await tagRepository.create(tenantScope, {
            name: name.trim().toLowerCase(),
            color: color || '#888888',
            icon: icon || '🏷️',
        });

        logger.success('TagService', `Created tag: ${tag._id}`, { tagName: tag.name });
        return serializeDocument(tag);
    }

    /**
     * Aggiorna un tag esistente.
     */
    async update(tenantScope, id, data) {
        const { name, color, icon, order } = data;
        const userId = tenantScope.userId || tenantScope.tenantId;

        const tag = await tagRepository.findById(tenantScope, id, { throwIfNotFound: true });

        // Se si cambia il nome, verifica duplicati e aggiorna nei deck
        if (name !== undefined && name.trim().toLowerCase() !== tag.name) {
            const existing = await tagRepository.findOne(tenantScope, {
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
        return serializeDocument(tag);
    }

    /**
     * Elimina un tag e rimuovilo da tutti i deck.
     */
    async delete(tenantScope, id) {
        const userId = tenantScope.userId || tenantScope.tenantId;
        const tag = await tagRepository.findById(tenantScope, id, { throwIfNotFound: true });

        // Rimuovi il tag da tutti i deck
        await Deck.updateMany(
            { user: userId, tags: tag.name },
            { $pull: { tags: tag.name } }
        );

        await tag.deleteOne();
        return { message: 'Tag eliminato' };
    }
}

module.exports = new TagService();
