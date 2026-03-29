const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const quizAttemptResultSchema = new mongoose.Schema({
    questionId: {
        type: String,
        required: true,
        trim: true,
    },
    shownIndex: {
        type: Number,
        required: true,
        min: 0,
    },
    selectedAnswer: {
        type: String,
        default: '',
    },
    correctAnswer: {
        type: String,
        required: true,
    },
    isCorrect: {
        type: Boolean,
        required: true,
    },
    responseMs: {
        type: Number,
        default: null,
        min: 0,
    },
    skipped: {
        type: Boolean,
        default: false,
    },
}, { _id: false });

const quizAttemptSchema = new mongoose.Schema({
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuizDefinition',
        required: true,
        index: true,
    },
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
    strategy: {
        type: {
            mode: {
                type: String,
                enum: ['full', 'weak_first', 'errors_only', 'spaced_mix'],
                default: 'full',
            },
            targetCount: {
                type: Number,
                default: 0,
                min: 0,
            },
            seed: {
                type: String,
                default: '',
            },
            params: {
                type: {
                    wrongWeight: { type: Number, default: 0.4 },
                    recencyWeight: { type: Number, default: 0.25 },
                    difficultyWeight: { type: Number, default: 0.15 },
                    noveltyWeight: { type: Number, default: 0.1 },
                    shuffleStrength: { type: Number, default: 0.1 },
                },
                default: () => ({}),
                _id: false,
            },
        },
        default: () => ({}),
        _id: false,
    },
    orderedQuestionIds: {
        type: [String],
        default: [],
    },
    results: {
        type: [quizAttemptResultSchema],
        default: [],
    },
    score: {
        type: Number,
        required: true,
        min: 0,
    },
    accuracy: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
    timeSeconds: {
        type: Number,
        default: 0,
        min: 0,
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    completedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

quizAttemptSchema.index({ user: 1, quizId: 1, createdAt: -1 });
quizAttemptSchema.index({ user: 1, deckId: 1, createdAt: -1 });

quizAttemptSchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});

quizAttemptSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(_doc, ret) {
        ret.id = ret._id?.toString() || ret.id;
        delete ret._id;
        delete ret.user;
    },
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
