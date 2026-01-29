/**
 * 🎓 EXAM MODEL - Multi-Tenant
 * ============================
 *
 * Schema per gli esami (separati dai goals).
 */

const mongoose = require('mongoose');
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const outcomeSchema = new mongoose.Schema({
    grade: {
        type: Number,
        default: null,
        min: [0, 'Il voto non può essere negativo'],
    },
    date: {
        type: Date,
        default: null,
    },
    notes: {
        type: String,
        default: '',
        trim: true,
        maxlength: [1000, 'Le note non possono superare 1000 caratteri'],
    },
    difficulties: [{
        type: String,
        trim: true,
    }],
}, { _id: false });

const examSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Il titolo è obbligatorio'],
        trim: true,
        maxlength: [120, 'Il titolo non può superare 120 caratteri'],
    },
    description: {
        type: String,
        default: '',
        trim: true,
        maxlength: [1000, 'La descrizione non può superare 1000 caratteri'],
    },
    deadline: {
        type: Date,
        required: [true, 'La data dell\'esame è obbligatoria'],
    },
    status: {
        type: String,
        enum: ['active', 'passed', 'failed', 'archived', 'completed'],
        default: 'active',
    },
    outcome: {
        type: outcomeSchema,
        default: null,
    },
}, {
    timestamps: true,
});

examSchema.index({ user: 1, deadline: 1 });

examSchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});

examSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.user;
    }
});

module.exports = mongoose.model('Exam', examSchema);
