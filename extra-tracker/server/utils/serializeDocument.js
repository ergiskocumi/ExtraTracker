/**
 * 🔄 SERIALIZE DOCUMENT - Utility per serializzare documenti Mongoose
 * 
 * Converte _id in id e rimuove campi sensibili
 */

/**
 * Serializza un documento Mongoose o un oggetto plain
 * @param {Object} doc - Documento Mongoose o oggetto plain
 * @returns {Object} - Documento serializzato
 */
function serializeDocument(doc) {
    if (!doc) return null;
    
    // Se è un documento Mongoose, usa toJSON (che applica il transform dello schema)
    if (doc.toJSON && typeof doc.toJSON === 'function') {
        const json = doc.toJSON();
        // Assicurati che id esista (il transform potrebbe non essere stato applicato)
        if (!json.id && json._id) {
            json.id = json._id.toString();
            delete json._id;
        }
        return json;
    }
    
    // Se è già un oggetto plain (da .lean() o JSON), serializza manualmente
    const serialized = JSON.parse(JSON.stringify(doc)); // Deep clone per evitare mutazioni
    
    // Converti _id in id se non esiste già
    if (serialized._id && !serialized.id) {
        serialized.id = serialized._id.toString ? serialized._id.toString() : String(serialized._id);
        delete serialized._id;
    }
    
    // Rimuovi campi sensibili
    delete serialized.user;
    delete serialized.__v;
    
    // Converti parentId se presente (ObjectId -> string)
    if (serialized.parentId) {
        if (serialized.parentId.toString && typeof serialized.parentId.toString === 'function') {
            serialized.parentId = serialized.parentId.toString();
        } else if (typeof serialized.parentId === 'object' && serialized.parentId._id) {
            serialized.parentId = serialized.parentId._id.toString();
        }
    }
    
    // Converti folderId se presente (per Deck)
    if (serialized.folderId) {
        if (serialized.folderId.toString && typeof serialized.folderId.toString === 'function') {
            serialized.folderId = serialized.folderId.toString();
        } else if (typeof serialized.folderId === 'object' && serialized.folderId._id) {
            serialized.folderId = serialized.folderId._id.toString();
        }
    }
    
    return serialized;
}

/**
 * Serializza un array di documenti
 * @param {Array} docs - Array di documenti
 * @returns {Array} - Array di documenti serializzati
 */
function serializeDocuments(docs) {
    if (!Array.isArray(docs)) return [];
    return docs.map(doc => serializeDocument(doc));
}

module.exports = {
    serializeDocument,
    serializeDocuments,
};
