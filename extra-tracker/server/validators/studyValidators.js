/**
 * 📋 STUDY VALIDATORS
 * ====================
 * Schema Zod per la validazione dei query params e dei request body delle route di studio.
 */

const { z } = require('zod');

const VALID_MODES = ['flashcard', 'quiz', 'typing', 'mix', 'sprint', 'focus', 'exam'];

// =========================================
// QUERY PARAMS
// =========================================

/**
 * Schema per GET /api/study/:id/session
 */
const getSessionSchema = z.object({
    mode: z
        .string()
        .optional()
        .transform(v => {
            const lower = String(v || 'flashcard').toLowerCase();
            return VALID_MODES.includes(lower) ? lower : 'flashcard';
        }),

    focus: z
        .string()
        .optional()
        .transform(v => String(v || 'smart').toLowerCase()),

    limit: z
        .string()
        .optional()
        .transform(v => {
            const n = Number(v);
            return Number.isFinite(n) && n > 0 ? n : undefined;
        }),

    time: z
        .string()
        .optional()
        .transform(v => {
            const n = Number(v);
            return Number.isFinite(n) && n > 0 ? n : undefined;
        }),

    questions: z
        .string()
        .optional()
        .transform(v => {
            const n = Number(v);
            return Number.isFinite(n) && n > 0 ? n : undefined;
        }),

    direction: z
        .string()
        .optional()
        .transform(v => String(v || 'front').toLowerCase()),

    examType: z
        .string()
        .optional()
        .transform(v => (v ? String(v).toLowerCase() : undefined)),

    examDifficulty: z
        .string()
        .optional()
        .transform(v => (v ? String(v).toLowerCase() : undefined)),

    quizType: z
        .string()
        .optional()
        .transform(v => (v ? String(v).toLowerCase() : undefined)),

    sourceCardIds: z
        .string()
        .optional()
        .transform(v =>
            v
                ? String(v)
                    .split(',')
                    .map(id => id.trim())
                    .filter(Boolean)
                : undefined
        ),
});

// =========================================
// REQUEST BODY
// =========================================

const createDeckSchema = z.object({
    examId: z.string().optional().nullable(),
    title: z.string().min(1, 'Il titolo è obbligatorio'),
    description: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
});

const updateDeckSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    folderId: z.string().optional().nullable(),
    examId: z.string().optional().nullable(),
}).strict();

const cardBodySchema = z.object({
    front: z.string().min(1, 'Il fronte della carta è obbligatorio'),
    back: z.string().min(1, 'Il retro della carta è obbligatorio'),
});

const addCardAtPositionSchema = z.object({
    front: z.string().min(1, 'Il fronte della carta è obbligatorio'),
    back: z.string().min(1, 'Il retro della carta è obbligatorio'),
    position: z.number().int().nonnegative().optional(),
});

const updateCardAnswerSchema = z.object({
    answer: z.string().min(1, 'La risposta è obbligatoria'),
});

const reorderCardsSchema = z.object({
    cardIds: z.array(z.string()).min(1, 'Almeno un ID carta è richiesto'),
});

const submitReviewSchema = z.object({
    cardId: z.string().min(1, 'cardId è obbligatorio'),
    rating: z.number().int().min(1).max(5, 'Il rating deve essere tra 1 e 5'),
    sessionMeta: z.record(z.unknown()).optional().nullable(),
    sessionSummary: z.record(z.unknown()).optional().nullable(),
});

const verifyAnswerSchema = z.object({
    cardId: z.string().min(1, 'cardId è obbligatorio'),
    userAnswer: z.string().min(1, 'La risposta è obbligatoria'),
});

const completeSessionSchema = z.object({
    mode: z.string().optional(),
    stats: z.record(z.unknown()).optional(),
});

const chatWithTutorSchema = z.object({
    message: z.string().min(1, 'Il messaggio è obbligatorio'),
    history: z.array(z.unknown()).optional().default([]),
});

const answerExamQuestionSchema = z.object({
    question: z.string().min(1, 'La domanda è obbligatoria').transform(v => v.trim()),
});

const saveQuizSnapshotSchema = z.object({
    name: z.string().min(1, 'Il nome è obbligatorio'),
    quizType: z.string().min(1, 'Il tipo di quiz è obbligatorio'),
    questionCount: z.number().int().positive().optional(),
    sourceCardIds: z.array(z.string()).optional(),
    source: z.string().optional(),
    questions: z.array(z.object({
        questionText: z.string(),
        correctAnswer: z.string(),
        distractors: z.array(z.string()),
        distractorExplanations: z.array(z.string()).optional().default([]),
        correctAnswerExplanation: z.string().optional().default(''),
        difficulty: z.string().optional().default('standard'),
        options: z.array(z.string()).optional().default([]),
    })).optional().default([]),
});

const recordQuizAttemptSchema = z.object({
    score: z.number(),
    accuracy: z.number(),
    timeSeconds: z.number(),
    wrongQuestionIndices: z.array(z.number()).optional().default([]),
});

const resetExamCardsSchema = z.object({
    type: z.enum(['all', 'hard-only'], {
        errorMap: () => ({ message: 'type deve essere "all" o "hard-only"' }),
    }),
});

const generateRecoveryQuestionsSchema = z.object({
    difficulties: z.array(z.string()),
});

// =========================================
// SCHEMI AGGIUNTIVI (FASE A)
// =========================================

const uploadAndGenerateSchema = z.object({
    maxCards: z.preprocess(
        v => (v !== undefined && v !== '' ? Number(v) : undefined),
        z.number().int().min(1).max(260).optional()
    ),
});

const updateDeckSettingsSchema = z.object({
    algorithm: z.enum(['sm2', 'fsrs', 'leitner', 'anki']).optional(),
    aiSettings: z.object({
        style: z.enum(['comprehensive', 'conceptual', 'factual', 'application']).optional(),
        difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),
        questionTypes: z.array(z.string()).optional(),
    }).optional(),
}).passthrough();

const saveExamProgressSchema = z.object({
    examConfig: z.record(z.unknown()).optional().default({}),
    currentCardIndex: z.number().int().nonnegative().optional().default(0),
    stats: z.object({
        hard: z.number().int().nonnegative().optional().default(0),
        good: z.number().int().nonnegative().optional().default(0),
        easy: z.number().int().nonnegative().optional().default(0),
    }).optional(),
    elapsedSeconds: z.number().nonnegative().optional().default(0),
    answers: z.array(z.unknown()).optional().default([]),
    sessionCardIds: z.array(z.string()).optional().default([]),
}).passthrough();

const generateAnswersSchema = z.object({
    selectedQuestions: z.preprocess(
        v => (typeof v === 'string' ? JSON.parse(v) : v),
        z.array(z.record(z.unknown())).min(1, 'Seleziona almeno una domanda')
    ),
    deckId: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    examId: z.string().optional().nullable(),
}).refine(d => d.deckId || d.title, {
    message: 'Fornire deckId oppure title per creare un nuovo deck',
});

const examSolverSchema = z.object({
    deckId: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    examId: z.string().optional().nullable(),
}).refine(d => d.deckId || d.title, {
    message: 'Fornire deckId oppure title per creare un nuovo deck',
});

module.exports = {
    // Query params
    getSessionSchema,
    // Request bodies
    createDeckSchema,
    updateDeckSchema,
    cardBodySchema,
    addCardAtPositionSchema,
    updateCardAnswerSchema,
    reorderCardsSchema,
    submitReviewSchema,
    verifyAnswerSchema,
    completeSessionSchema,
    chatWithTutorSchema,
    answerExamQuestionSchema,
    saveQuizSnapshotSchema,
    recordQuizAttemptSchema,
    resetExamCardsSchema,
    generateRecoveryQuestionsSchema,
    // Fase A
    uploadAndGenerateSchema,
    updateDeckSettingsSchema,
    saveExamProgressSchema,
    generateAnswersSchema,
    examSolverSchema,
};
