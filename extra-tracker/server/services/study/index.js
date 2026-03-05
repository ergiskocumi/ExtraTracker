/**
 * 🧠 STUDY SERVICE - (Thin wrapper, deprecated)
 * ===============================================
 * Tutti i mixin originali sono stati estratti in service autonomi:
 *   - helpers, studySession, quizHelpers → sessionQuizService.js
 *   - reviewLogic                        → cardReviewService.js
 *   - examSolver                         → examSolverService.js
 *   - recoveryPlan                       → recoveryPlanService.js
 *   - deckCrud                           → deckCrudService.js
 *   - aiTutor                            → aiTutorService.js
 *   - pdfGeneration                      → flashcardGenerationService.js
 *
 * Questo file rimane per compatibilità ma non esporta più logica di dominio.
 */

const BaseService = require('../BaseService');
const Deck = require('../../models/Deck');

class StudyService extends BaseService {
    constructor() {
        super(Deck, {
            searchFields: ['title', 'description', 'tags'],
            defaultSort: { createdAt: -1 },
            entityName: 'Mazzo',
        });
    }
}

module.exports = new StudyService();
