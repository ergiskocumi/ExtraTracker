/**
 * 🧠 STUDY SERVICE - Constants & AI Configuration
 * =================================================
 */

const OpenAI = require('openai');
const path = require('path');
const logger = require('../../utils/logger');

// =========================================
// COSTANTI BASE
// =========================================
const MIN_EASINESS_FACTOR = 1.3;
const DEFAULT_EASINESS_FACTOR = 2.5;
const MAX_EXTRACTED_TEXT_STORE_LENGTH = 200000;
const MAX_TUTOR_CONTEXT_LENGTH = 50000;
const MAX_TUTOR_MESSAGE_LENGTH = 2000;
const MAX_TUTOR_HISTORY_MESSAGES = 12;
const MAX_TUTOR_HISTORY_MESSAGE_LENGTH = 1000;
const PDF_UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'pdfs');
const QUIZ_FALLBACK_OPTIONS = [
    'La formulazione appare coerente ma introduce un dettaglio teorico non supportato dal contenuto studiato.',
    'L\'affermazione mantiene il lessico corretto ma altera il nesso logico centrale richiesto dalla domanda.',
    'La risposta include elementi plausibili ma combina in modo improprio concetti distinti trattati separatamente.',
    'La spiegazione sembra completa, ma sostituisce un passaggio chiave con un\'interpretazione non valida.',
];
const MIN_QUIZ_CARDS_REQUIRED = 10;
const QUIZ_TYPES = {
    MULTIPLE_CHOICE: 'multiple_choice',
    TRUE_FALSE: 'true_false',
};
const QUIZ_OPTION_WORD_MIN = 5;
const QUIZ_OPTION_WORD_MAX = 20;
// Bump questo valore ogni volta che il prompt AI cambia significativamente.
// Le card con versione diversa vengono rigenerate automaticamente alla prossima sessione.
const DISTRACTOR_PROMPT_VERSION = 'v3';
const QUIZ_OPTION_LENGTH_MIN_RATIO = 0.8;
const QUIZ_OPTION_LENGTH_MAX_RATIO = 1.25;
const QUIZ_OPTION_WORD_SPREAD_MAX = 4;
const QUIZ_DEBUG_LOGS = process.env.NODE_ENV !== 'production'
    || String(process.env.QUIZ_DEBUG_LOGS || '').toLowerCase() === 'true';
const INCOMPLETE_TRAILING_WORDS = new Set([
    'a', 'ad', 'al', 'alla', 'alle', 'allo', 'all', 'agli', 'ai',
    'da', 'dal', 'dalla', 'dalle', 'dallo', 'dei', 'degli', 'delle',
    'di', 'del', 'della', 'dello', 'dei', 'e', 'ed',
    'il', 'la', 'le', 'lo', 'gli', 'i', 'l',
    'in', 'nel', 'nella', 'nelle', 'nello', 'nei', 'negli',
    'per', 'su', 'sul', 'sulla', 'sulle', 'sugli', 'tra', 'con', 'come',
    'che', 'cui', 'oppure', 'o', 'ma',
    'piu', 'più', 'meno', 'migliore', 'peggiore',
]);
const QUIZ_PADDING_SEGMENTS = [
    'nel contesto tecnico descritto',
    'in modo coerente con i vincoli indicati',
    'secondo la logica operativa richiesta',
    'mantenendo l\'allineamento con la domanda',
    'senza introdurre elementi estranei',
];

// =========================================
// 🆕 SMART GENERATION V3 - OPTIMIZED CONFIGURATION
// =========================================
const SEMANTIC_CHUNK_SIZE = 12000;
const SEMANTIC_CHUNK_OVERLAP = 500;
const MIN_SEMANTIC_CHUNK = 300;
const MIN_CHUNK_LENGTH = 200;

const BATCH_SIZE = 2;

const MIN_CARDS_PER_CHUNK = 2;
const MAX_CARDS_PER_CHUNK = 10;
const DEFAULT_MAX_TOTAL_CARDS = 140;
const MAX_TOTAL_CARDS_HARD_CAP = 260;
const ENV_MAX_TOTAL_CARDS = Number.parseInt(
    process.env.STUDY_GENERATION_MAX_CARDS || String(DEFAULT_MAX_TOTAL_CARDS),
    10
);
const MAX_TOTAL_CARDS = Number.isFinite(ENV_MAX_TOTAL_CARDS) && ENV_MAX_TOTAL_CARDS > 0
    ? Math.min(MAX_TOTAL_CARDS_HARD_CAP, Math.max(40, ENV_MAX_TOTAL_CARDS))
    : DEFAULT_MAX_TOTAL_CARDS;

const SIMILARITY_THRESHOLD = 0.65;

const QUESTION_TYPES = {
    definition: { weight: 2, prompt: 'domande di DEFINIZIONE (Cosa significa/è X?)' },
    explanation: { weight: 2, prompt: 'domande di SPIEGAZIONE (Come funziona X? Perché X?)' },
    causeEffect: { weight: 1.5, prompt: 'domande CAUSA-EFFETTO (Cosa succede se X? Perché X causa Y?)' },
    application: { weight: 1.5, prompt: 'domande di APPLICAZIONE (Come si usa X? In quale caso si applica?)' },
    comparison: { weight: 1, prompt: 'domande di CONFRONTO (Differenza tra X e Y?)' },
    process: { weight: 1, prompt: 'domande su PROCESSI/SEQUENZE (Quali sono i passaggi per X?)' },
};

// =========================================
// CONFIGURAZIONE MODELLO AI
// =========================================
const FALLBACK_AI_MODEL = 'gpt-5.2';
const KNOWN_OPENAI_MODELS = new Set([
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-5.2',
    'gpt-4-turbo',
    'gpt-4-turbo-preview',
    'gpt-4',
    'gpt-3.5-turbo',
    'o1',
    'o1-mini',
]);
const envModel = (process.env.OPENAI_MODEL || FALLBACK_AI_MODEL).trim();
const ACTIVE_AI_MODEL = KNOWN_OPENAI_MODELS.has(envModel) ? envModel : FALLBACK_AI_MODEL;
const DISTRACTOR_AI_MODEL = KNOWN_OPENAI_MODELS.has((process.env.OPENAI_DISTRACTOR_MODEL || '').trim())
    ? (process.env.OPENAI_DISTRACTOR_MODEL || '').trim()
    : ACTIVE_AI_MODEL;

function getValidModel(envValue) {
    const v = (envValue || ACTIVE_AI_MODEL).trim();
    return KNOWN_OPENAI_MODELS.has(v) ? v : ACTIVE_AI_MODEL;
}

if (!global.__studyServiceModelLogged) {
    if (envModel !== ACTIVE_AI_MODEL) {
        logger.warn('StudyService', `OPENAI_MODEL="${envModel}" non valido; uso fallback: ${ACTIVE_AI_MODEL}`);
    }
    logger.info('StudyService', `Modello AI: ${ACTIVE_AI_MODEL} | Distractor: ${DISTRACTOR_AI_MODEL}`);
    global.__studyServiceModelLogged = true;
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

module.exports = {
    MIN_EASINESS_FACTOR,
    DEFAULT_EASINESS_FACTOR,
    MAX_EXTRACTED_TEXT_STORE_LENGTH,
    MAX_TUTOR_CONTEXT_LENGTH,
    MAX_TUTOR_MESSAGE_LENGTH,
    MAX_TUTOR_HISTORY_MESSAGES,
    MAX_TUTOR_HISTORY_MESSAGE_LENGTH,
    PDF_UPLOADS_DIR,
    QUIZ_FALLBACK_OPTIONS,
    MIN_QUIZ_CARDS_REQUIRED,
    QUIZ_TYPES,
    QUIZ_OPTION_WORD_MIN,
    QUIZ_OPTION_WORD_MAX,
    DISTRACTOR_PROMPT_VERSION,
    QUIZ_OPTION_LENGTH_MIN_RATIO,
    QUIZ_OPTION_LENGTH_MAX_RATIO,
    QUIZ_OPTION_WORD_SPREAD_MAX,
    QUIZ_DEBUG_LOGS,
    INCOMPLETE_TRAILING_WORDS,
    QUIZ_PADDING_SEGMENTS,
    SEMANTIC_CHUNK_SIZE,
    SEMANTIC_CHUNK_OVERLAP,
    MIN_SEMANTIC_CHUNK,
    MIN_CHUNK_LENGTH,
    BATCH_SIZE,
    MIN_CARDS_PER_CHUNK,
    MAX_CARDS_PER_CHUNK,
    DEFAULT_MAX_TOTAL_CARDS,
    MAX_TOTAL_CARDS_HARD_CAP,
    MAX_TOTAL_CARDS,
    SIMILARITY_THRESHOLD,
    QUESTION_TYPES,
    FALLBACK_AI_MODEL,
    KNOWN_OPENAI_MODELS,
    ACTIVE_AI_MODEL,
    DISTRACTOR_AI_MODEL,
    getValidModel,
    openai,
};
