/**
 * 🧠 STUDY SERVICE - Assembler (Mixin Pattern)
 * =============================================
 * Assembla tutti i moduli dello StudyService su un'unica classe
 * che estende BaseService. Ogni modulo esporta un plain object
 * di metodi, assegnati al prototype via Object.assign().
 *
 * L'ordine di assign è rilevante solo in caso di conflitto nomi
 * (non dovrebbe accadere: ogni metodo vive in un solo modulo).
 */

const BaseService = require('../BaseService');
const Deck = require('../../models/Deck');

// Mixin modules
const helpers = require('./helpers');
const deckCrud = require('./deckCrud');
const studySession = require('./studySession');
const reviewLogic = require('./reviewLogic');
const pdfGeneration = require('./pdfGeneration');
const aiTutor = require('./aiTutor');
const examSolver = require('./examSolver');
const quizHelpers = require('./quizHelpers');
const recoveryPlan = require('./recoveryPlan');

class StudyService extends BaseService {
    constructor() {
        super(Deck, {
            searchFields: ['title', 'description', 'tags'],
            defaultSort: { createdAt: -1 },
            entityName: 'Mazzo',
        });
    }
}

// Mixin assignment — ordine: utilities → CRUD → session → review → generation → AI → quiz → recovery
Object.assign(StudyService.prototype, helpers);
Object.assign(StudyService.prototype, deckCrud);
Object.assign(StudyService.prototype, studySession);
Object.assign(StudyService.prototype, reviewLogic);
Object.assign(StudyService.prototype, pdfGeneration);
Object.assign(StudyService.prototype, aiTutor);
Object.assign(StudyService.prototype, examSolver);
Object.assign(StudyService.prototype, quizHelpers);
Object.assign(StudyService.prototype, recoveryPlan);

module.exports = new StudyService();
