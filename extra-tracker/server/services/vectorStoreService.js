/**
 * 📦 VECTOR STORE SERVICE (Pinecone + LangChain)
 * =============================================
 *
 * Gestisce l'ingestione e la ricerca vettoriale dei chunk di testo dei PDF.
 * - Chunking: RecursiveCharacterTextSplitter (1000 chars, overlap 200)
 * - Embedding: OpenAI Embeddings (default text-embedding-3-small)
 * - Vector DB: Pinecone (filtrato per deckId)
 */

const AppError = require('../utils/AppError');

const DEFAULT_EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
const DEFAULT_TOP_K = 5;

let pineconeIndex = null;
let embedder = null;

const ensureEnv = () => {
    if (!process.env.PINECONE_API_KEY) {
        throw AppError.internal(
            { message: 'PINECONE_API_KEY mancante. Configura le variabili ambiente.' },
            null,
            {}
        );
    }
    if (!process.env.PINECONE_INDEX) {
        throw AppError.internal(
            { message: 'PINECONE_INDEX mancante. Configura le variabili ambiente.' },
            null,
            {}
        );
    }
    if (!process.env.OPENAI_API_KEY) {
        throw AppError.internal(
            { message: 'OPENAI_API_KEY mancante. Configura le variabili ambiente.' },
            null,
            {}
        );
    }
};

const getPineconeIndex = async () => {
    if (pineconeIndex) return pineconeIndex;
    ensureEnv();

    const { Pinecone } = await import('@pinecone-database/pinecone');
    const client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    pineconeIndex = client.index(process.env.PINECONE_INDEX);
    return pineconeIndex;
};

const getEmbedder = async () => {
    if (embedder) return embedder;
    ensureEnv();

    const { OpenAIEmbeddings } = await import('@langchain/openai');
    embedder = new OpenAIEmbeddings({
        apiKey: process.env.OPENAI_API_KEY,
        model: DEFAULT_EMBED_MODEL,
    });
    return embedder;
};

const getTextSplitter = async () => {
    const { RecursiveCharacterTextSplitter } = await import('langchain/text_splitter');
    return new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
};

const buildVectorId = (deckId, index) => `${deckId}-${Date.now()}-${index}`;

/**
 * Ingestione di un deck nel vector store.
 * @param {string} deckId
 * @param {string} text
 */
const ingestDeck = async (deckId, text) => {
    if (!deckId) throw AppError.validation('deckId mancante per ingestione vettoriale');
    if (!text || typeof text !== 'string' || text.trim().length < 20) {
        throw AppError.validation('Testo insufficiente per la creazione degli embedding');
    }

    const splitter = await getTextSplitter();
    const chunks = await splitter.splitText(text);
    if (!Array.isArray(chunks) || chunks.length === 0) {
        throw AppError.validation('Nessun chunk generato dal testo');
    }

    const [index, embeddings] = await Promise.all([getPineconeIndex(), getEmbedder()]);

    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        if (!chunkText || chunkText.trim().length === 0) continue;

        const values = await embeddings.embedQuery(chunkText);
        vectors.push({
            id: buildVectorId(deckId, i),
            values,
            metadata: {
                deckId,
                text: chunkText,
                chunkIndex: i,
            },
        });
    }

    if (vectors.length === 0) {
        throw AppError.validation('Nessun vettore valido generato dal testo');
    }

    await index.upsert(vectors);
    return { deckId, vectors: vectors.length };
};

/**
 * Query vettoriale su un deck.
 * @param {string} deckId
 * @param {string} question
 * @param {number} topK
 * @returns {Promise<string[]>} array di testi più rilevanti
 */
const queryDeck = async (deckId, question, topK = DEFAULT_TOP_K) => {
    if (!deckId) throw AppError.validation('deckId mancante per query vettoriale');
    if (!question || typeof question !== 'string' || question.trim().length < 2) {
        throw AppError.validation('Domanda non valida per la query vettoriale');
    }

    const [index, embeddings] = await Promise.all([getPineconeIndex(), getEmbedder()]);
    const queryVector = await embeddings.embedQuery(question);

    const result = await index.query({
        vector: queryVector,
        topK,
        includeMetadata: true,
        filter: { deckId },
    });

    const matches = Array.isArray(result?.matches) ? result.matches : [];
    return matches
        .map((m) => (m?.metadata?.text && typeof m.metadata.text === 'string' ? m.metadata.text : null))
        .filter(Boolean);
};

module.exports = {
    ingestDeck,
    queryDeck,
};
