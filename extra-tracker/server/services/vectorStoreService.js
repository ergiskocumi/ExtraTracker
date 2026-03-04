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
const aiUsageService = require('./aiUsageService');

const DEFAULT_EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
const DEFAULT_TOP_K = 5;

let pineconeIndex = null;
let embedder = null;

const getMissingEnvVars = () => {
    const missing = [];
    if (!process.env.PINECONE_API_KEY) missing.push('PINECONE_API_KEY');
    if (!process.env.PINECONE_INDEX) missing.push('PINECONE_INDEX');
    if (!process.env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
    return missing;
};

const isConfigured = () => getMissingEnvVars().length === 0;

const ensureEnv = () => {
    const missing = getMissingEnvVars();
    if (missing.length > 0) {
        throw AppError.validation(
            `Vector store non configurato: mancano ${missing.join(', ')}`
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
const ingestDeck = async (deckId, text, options = {}) => {
    const startedAt = Date.now();
    const {
        userId = null,
        mode = 'vector',
        feature = 'vector_ingest',
    } = options || {};

    if (!deckId) throw AppError.validation('deckId mancante per ingestione vettoriale');
    if (!text || typeof text !== 'string' || text.trim().length < 20) {
        throw AppError.validation('Testo insufficiente per la creazione degli embedding');
    }

    let chunks = [];
    let totalChars = 0;
    try {
        const splitter = await getTextSplitter();
        chunks = await splitter.splitText(text);
        if (!Array.isArray(chunks) || chunks.length === 0) {
            throw AppError.validation('Nessun chunk generato dal testo');
        }

        const [index, embeddings] = await Promise.all([getPineconeIndex(), getEmbedder()]);

        const vectors = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i];
            if (!chunkText || chunkText.trim().length === 0) continue;
            totalChars += chunkText.length;

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

        void aiUsageService.trackEmbeddingEvent({
            userId,
            mode,
            feature,
            model: DEFAULT_EMBED_MODEL,
            inputChars: totalChars,
            latencyMs: Date.now() - startedAt,
            status: 'success',
            metadata: {
                deckId: String(deckId),
                chunks: chunks.length,
                vectors: vectors.length,
            },
        });

        return { deckId, vectors: vectors.length };
    } catch (err) {
        totalChars = totalChars || (typeof text === 'string' ? text.length : 0);
        void aiUsageService.trackEmbeddingEvent({
            userId,
            mode,
            feature,
            model: DEFAULT_EMBED_MODEL,
            inputChars: totalChars,
            latencyMs: Date.now() - startedAt,
            status: 'error',
            errorMessage: err?.message || 'Embedding ingest error',
            metadata: {
                deckId: String(deckId || ''),
                chunksAttempted: Array.isArray(chunks) ? chunks.length : 0,
            },
        });
        throw err;
    }
};

/**
 * Query vettoriale su un deck.
 * @param {string} deckId
 * @param {string} question
 * @param {number} topK
 * @returns {Promise<string[]>} array di testi più rilevanti
 */
const queryDeck = async (deckId, question, topK = DEFAULT_TOP_K, options = {}) => {
    const startedAt = Date.now();
    if (typeof topK === 'object' && topK !== null) {
        options = topK;
        topK = DEFAULT_TOP_K;
    }

    const {
        userId = null,
        mode = 'vector',
        feature = 'vector_query',
    } = options || {};

    if (!deckId) throw AppError.validation('deckId mancante per query vettoriale');
    if (!question || typeof question !== 'string' || question.trim().length < 2) {
        throw AppError.validation('Domanda non valida per la query vettoriale');
    }

    try {
        const [index, embeddings] = await Promise.all([getPineconeIndex(), getEmbedder()]);
        const queryVector = await embeddings.embedQuery(question);

        const result = await index.query({
            vector: queryVector,
            topK,
            includeMetadata: true,
            filter: { deckId },
        });

        const matches = Array.isArray(result?.matches) ? result.matches : [];
        const texts = matches
            .map((m) => (m?.metadata?.text && typeof m.metadata.text === 'string' ? m.metadata.text : null))
            .filter(Boolean);

        void aiUsageService.trackEmbeddingEvent({
            userId,
            mode,
            feature,
            model: DEFAULT_EMBED_MODEL,
            inputChars: question.length,
            latencyMs: Date.now() - startedAt,
            status: 'success',
            metadata: {
                deckId: String(deckId),
                topK: Number(topK),
                matches: texts.length,
            },
        });

        return texts;
    } catch (err) {
        void aiUsageService.trackEmbeddingEvent({
            userId,
            mode,
            feature,
            model: DEFAULT_EMBED_MODEL,
            inputChars: typeof question === 'string' ? question.length : 0,
            latencyMs: Date.now() - startedAt,
            status: 'error',
            errorMessage: err?.message || 'Embedding query error',
            metadata: {
                deckId: String(deckId || ''),
                topK: Number(topK),
            },
        });
        throw err;
    }
};

module.exports = {
    isConfigured,
    ingestDeck,
    queryDeck,
};
