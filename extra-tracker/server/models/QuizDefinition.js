const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const questionStatsSchema = new mongoose.Schema({
    shownCount: { type: Number, default: 0, min: 0 },
    correctCount: { type: Number, default: 0, min: 0 },
    wrongCount: { type: Number, default: 0, min: 0 },
    wrongStreak: { type: Number, default: 0, min: 0 },
    lastSeenAt: { type: Date, default: null },
    lastCorrectAt: { type: Date, default: null },
    averageResponseMs: { type: Number, default: null, min: 0 },
    masteryScore: { type: Number, default: 0, min: 0 },
    reviewPriority: { type: Number, default: 0, min: 0 },
}, { _id: false });

const quizQuestionSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true,
        trim: true,
        maxlength: [120, 'questionId troppo lungo'],
    },
    positionSeed: {
        type: Number,
        default: 0,
    },
    questionText: {
        type: String,
        required: true,
        trim: true,
        maxlength: [4000, 'Il testo della domanda non puo\' superare 4000 caratteri'],
    },
    correctAnswer: {
        type: String,
        required: true,
        trim: true,
        maxlength: [4000, 'La risposta corretta non puo\' superare 4000 caratteri'],
    },
    options: {
        type: [String],
        default: [],
    },
    distractors: {
        type: [String],
        default: [],
    },
    distractorExplanations: {
        type: [String],
        default: [],
    },
    correctAnswerExplanation: {
        type: String,
        default: '',
        maxlength: [4000, 'La spiegazione della risposta corretta non puo\' superare 4000 caratteri'],
    },
    difficulty: {
        type: String,
        enum: ['standard', 'hard'],
        default: 'standard',
    },
    questionType: {
        type: String,
        enum: ['multiple_choice', 'true_false'],
        required: true,
    },
    correctStatement: {
        type: String,
        default: null,
    },
    sourceCardId: {
        type: String,
        default: null,
    },
    stats: {
        type: questionStatsSchema,
        default: () => ({}),
    },
}, { _id: false });

const quizDefinitionSchema = new mongoose.Schema({
    deckId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deck',
        required: true,
        index: true,
    },
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        default: null,
        index: true,
    },
    name: {
        type: String,
        default: '',
        trim: true,
        maxlength: [180, 'Il nome del quiz non puo\' superare 180 caratteri'],
    },
    quizType: {
        type: String,
        enum: ['multiple_choice', 'true_false'],
        required: true,
        index: true,
    },
    source: {
        type: String,
        enum: ['chapter', 'repeat', 'errors', 'saved'],
        default: 'chapter',
    },
    origin: {
        type: {
            kind: {
                type: String,
                enum: ['ai_pdf', 'ai_cards', 'legacy_embedded'],
                default: 'ai_pdf',
            },
            pdfBased: {
                type: Boolean,
                default: true,
            },
            sourceCardIds: {
                type: [String],
                default: [],
            },
            generatedFromTextHash: {
                type: String,
                default: '',
            },
            aiModel: {
                type: String,
                default: '',
            },
            promptVersion: {
                type: String,
                default: '',
            },
        },
        default: () => ({}),
        _id: false,
    },
    questionCount: {
        type: Number,
        required: true,
        min: [1, 'Il quiz deve contenere almeno una domanda'],
    },
    questions: {
        type: [quizQuestionSchema],
        default: [],
    },
    status: {
        type: String,
        enum: ['ready', 'archived'],
        default: 'ready',
    },
}, {
    timestamps: true,
});

quizDefinitionSchema.index({ user: 1, deckId: 1, createdAt: -1 });
quizDefinitionSchema.index({ user: 1, examId: 1, createdAt: -1 });

quizDefinitionSchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});

quizDefinitionSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(_doc, ret) {
        ret.id = ret._id?.toString() || ret.id;
        delete ret._id;
        delete ret.user;
    },
});

module.exports = mongoose.model('QuizDefinition', quizDefinitionSchema);
