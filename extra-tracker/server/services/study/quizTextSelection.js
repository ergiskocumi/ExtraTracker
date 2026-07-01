const {
    QUIZ_FAST_PATH_MAX_QUESTIONS,
    QUIZ_FAST_PATH_TEXT_BUDGET,
    QUIZ_FAST_PATH_TASK_SIZE,
    QUIZ_FAST_PATH_MAX_TASKS,
} = require('./constants');

// Ogni task fast-path deve avere abbastanza testo per generare domande sensate.
const FAST_PATH_MIN_SEGMENT_CHARS = 400;

function materialize(value) {
    return Buffer.from(value, 'utf8').toString('utf8');
}

function trimSegmentBoundaries(segment) {
    return segment
        .replace(/^\S{1,80}\s+/, '')
        .replace(/\s+\S{1,80}$/, '')
        .trim();
}

function buildRepresentativeQuizText(text, textBudget = QUIZ_FAST_PATH_TEXT_BUDGET) {
    if (!text || typeof text !== 'string') return '';

    const source = text.trim();
    const safeBudget = Math.max(1000, Math.floor(Number(textBudget) || QUIZ_FAST_PATH_TEXT_BUDGET));
    if (source.length <= safeBudget) {
        return materialize(source);
    }

    const separator = '\n\n--- ESTRATTO SUCCESSIVO ---\n\n';
    const segmentCount = 4;
    const availableForText = Math.max(1000, safeBudget - separator.length * (segmentCount - 1));
    const segmentBudget = Math.max(500, Math.floor(availableForText / segmentCount));
    const midpointOffset = Math.floor(segmentBudget / 2);
    const anchors = [
        0,
        Math.max(0, Math.floor(source.length * 0.25) - midpointOffset),
        Math.max(0, Math.floor(source.length * 0.55) - midpointOffset),
        Math.max(0, source.length - segmentBudget),
    ];

    const segments = anchors.map((start) => {
        const boundedStart = Math.min(Math.max(0, start), Math.max(0, source.length - segmentBudget));
        const rawSegment = source.slice(boundedStart, boundedStart + segmentBudget);
        return trimSegmentBoundaries(rawSegment) || rawSegment.trim();
    }).filter(Boolean);

    return materialize(segments.join(separator).slice(0, safeBudget));
}

function shouldUseQuizFastPath(questionCount) {
    const safeQuestionCount = Math.max(1, Math.floor(Number(questionCount) || 0));
    return safeQuestionCount <= QUIZ_FAST_PATH_MAX_QUESTIONS;
}

/**
 * Quante chiamate AI parallele usare nel fast path per un dato numero di domande.
 * Es. 10 domande, task-size 5 → 2 task; 3 domande → 1 task.
 */
function computeFastPathTaskCount(questionCount) {
    const safeQuestionCount = Math.max(1, Math.floor(Number(questionCount) || 0));
    const byBatch = Math.ceil(safeQuestionCount / QUIZ_FAST_PATH_TASK_SIZE);
    return Math.max(1, Math.min(QUIZ_FAST_PATH_MAX_TASKS, byBatch));
}

/**
 * Costruisce `taskCount` testi indipendenti per la generazione parallela.
 *
 * Con 1 solo task ritorna il testo rappresentativo classico. Con più task il
 * documento viene diviso in fette contigue (una per task) così ogni chiamata AI
 * lavora su una porzione diversa → meno domande duplicate e output più piccolo
 * per chiamata. Testi corti (≤ budget) vengono ripetuti tali e quali.
 */
function buildFastPathTaskTexts(text, taskCount, textBudget = QUIZ_FAST_PATH_TEXT_BUDGET) {
    const safeTaskCount = Math.max(1, Math.floor(Number(taskCount) || 1));
    if (!text || typeof text !== 'string') return [];

    const source = text.trim();
    if (safeTaskCount === 1) {
        const single = buildRepresentativeQuizText(source, textBudget);
        return single ? [single] : [];
    }

    // Testo troppo corto per fette distinte: ogni task riceve l'intero testo.
    if (source.length < safeTaskCount * FAST_PATH_MIN_SEGMENT_CHARS) {
        const single = buildRepresentativeQuizText(source, textBudget);
        return single ? Array.from({ length: safeTaskCount }, () => single) : [];
    }

    const sliceLength = Math.floor(source.length / safeTaskCount);
    const texts = [];
    for (let i = 0; i < safeTaskCount; i++) {
        const start = i * sliceLength;
        const end = i === safeTaskCount - 1 ? source.length : start + sliceLength;
        const slice = source.slice(start, end);
        // Ogni fetta passa comunque per il selettore rappresentativo per rispettare
        // il budget e materializzare una stringa indipendente (GC-friendly).
        const built = buildRepresentativeQuizText(slice, textBudget);
        if (built) texts.push(built);
    }
    return texts.filter(Boolean);
}

module.exports = {
    buildRepresentativeQuizText,
    shouldUseQuizFastPath,
    computeFastPathTaskCount,
    buildFastPathTaskTexts,
};
