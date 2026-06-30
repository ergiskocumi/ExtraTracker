/**
 * 🧠 STUDY SERVICE - Constants & AI Configuration
 * =================================================
 */

const path = require('path');

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

// =========================================
// CHUNK RETRY & TIMEOUT
// =========================================
const CHUNK_AI_TIMEOUT_MS = 60_000;   // 60s per chunk — reasonable for 4096 token response
const CHUNK_MAX_RETRIES = 2;          // 2 retries = 3 total attempts per chunk
const CHUNK_RETRY_BASE_DELAY_MS = 1_000;
const CHUNK_CIRCUIT_BREAKER_THRESHOLD = 0.6; // allow 1 failure in first 2 chunks
const MAX_CONCURRENT_AI_JOBS = 2;

// =========================================
// TRUE/FALSE AI GENERATION
// =========================================
const TF_MIN_TEXT_CHARS = 500;
const TF_CHARS_PER_STATEMENT = 1000;
const TF_MIN_STATEMENTS = 3;
const TF_MAX_STATEMENTS = 50;
const TF_TEMPERATURE = 0.4;
// Bump questo valore ogni volta che il prompt AI cambia significativamente.
// Le card con versione diversa vengono rigenerate automaticamente alla prossima sessione.
const DISTRACTOR_PROMPT_VERSION = 'v3';
const QUIZ_OPTION_LENGTH_MIN_RATIO = 0.8;
const QUIZ_OPTION_LENGTH_MAX_RATIO = 1.25;
const QUIZ_OPTION_WORD_SPREAD_MAX = 4;
const QUIZ_DEBUG_LOGS = String(process.env.QUIZ_DEBUG_LOGS || '').toLowerCase() === 'true';
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
// 🆕 PAGE-FIRST GENERATION V4 - CONFIGURATION
// =========================================
const PAGE_CHUNK_BUDGET = 10000;
const CHARS_PER_CARD_BASE = 1400;
const MIN_CHUNK_LENGTH = 200;

const BATCH_SIZE = 2;

const MIN_CARDS_PER_CHUNK = 2;
const MAX_CARDS_PER_CHUNK = 15;
const DEFAULT_MAX_TOTAL_CARDS = 140;
const MAX_TOTAL_CARDS_HARD_CAP = 260;
const ENV_MAX_TOTAL_CARDS = Number.parseInt(
    process.env.STUDY_GENERATION_MAX_CARDS || String(DEFAULT_MAX_TOTAL_CARDS),
    10
);
const MAX_TOTAL_CARDS = Number.isFinite(ENV_MAX_TOTAL_CARDS) && ENV_MAX_TOTAL_CARDS > 0
    ? Math.min(MAX_TOTAL_CARDS_HARD_CAP, Math.max(40, ENV_MAX_TOTAL_CARDS))
    : DEFAULT_MAX_TOTAL_CARDS;

const SIMILARITY_THRESHOLD = 0.55;

// =========================================
// CONFIGURAZIONE MODELLO AI — DeepSeek via Anthropic API
// =========================================

const {
    anthropic,
    DEEPSEEK_DEFAULT_MODEL,
    DEEPSEEK_FLASH_MODEL,
    KNOWN_DEEPSEEK_MODELS,
    createCompletion,
} = require('./deepseekClient');

const DEEPSEEK_MODEL = process.env.ANTHROPIC_MODEL || DEEPSEEK_DEFAULT_MODEL;
const ACTIVE_AI_MODEL = DEEPSEEK_MODEL;
const DISTRACTOR_AI_MODEL = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || DEEPSEEK_MODEL;
const FALLBACK_AI_MODEL = DEEPSEEK_DEFAULT_MODEL;

function getValidModel(envValue) {
    const v = (envValue || ACTIVE_AI_MODEL).trim();
    return KNOWN_DEEPSEEK_MODELS.has(v) ? v : ACTIVE_AI_MODEL;
}

if (!global.__studyServiceModelLogged) {
    const logger = require('../../utils/logger');
    logger.info('StudyService', `AI Backend: DeepSeek | Model: ${ACTIVE_AI_MODEL} | Distractor: ${DISTRACTOR_AI_MODEL}`);
    global.__studyServiceModelLogged = true;
}

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
    PAGE_CHUNK_BUDGET,
    CHARS_PER_CARD_BASE,

    MIN_CHUNK_LENGTH,
    BATCH_SIZE,
    MIN_CARDS_PER_CHUNK,
    MAX_CARDS_PER_CHUNK,
    DEFAULT_MAX_TOTAL_CARDS,
    MAX_TOTAL_CARDS_HARD_CAP,
    MAX_TOTAL_CARDS,
    SIMILARITY_THRESHOLD,

    CHUNK_AI_TIMEOUT_MS,
    CHUNK_MAX_RETRIES,
    CHUNK_RETRY_BASE_DELAY_MS,
    CHUNK_CIRCUIT_BREAKER_THRESHOLD,

    TF_MIN_TEXT_CHARS,
    TF_CHARS_PER_STATEMENT,
    TF_MIN_STATEMENTS,
    TF_MAX_STATEMENTS,
    TF_TEMPERATURE,

    FALLBACK_AI_MODEL,
    KNOWN_DEEPSEEK_MODELS,
    ACTIVE_AI_MODEL,
    DISTRACTOR_AI_MODEL,
    DEEPSEEK_MODEL,
    DEEPSEEK_DEFAULT_MODEL,
    DEEPSEEK_FLASH_MODEL,
    getValidModel,
    anthropic,
    createCompletion,
};
