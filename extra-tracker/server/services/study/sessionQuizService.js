/**
 * 📚 SESSION QUIZ SERVICE
 * ========================
 * Service autonomo per sessioni di studio e generazione quiz AI.
 * studySession e quizHelpers devono stare insieme: studySession chiama
 * this.generateQuizFromFullPDF, this._mapAiQuestionsToCards, this._transformToTrueFalse,
 * this._logQuizDebug — tutti definiti in quizHelpers.
 *
 * Dipende da: BaseService, helpers, studySession, quizHelpers
 */

const BaseService = require('../BaseService');
const Deck = require('../../models/Deck');

const helpers = require('./helpers');
const studySession = require('./studySession');
const quizHelpers = require('./quizHelpers');

class SessionQuizService extends BaseService {
    constructor() {
        super(Deck, {
            searchFields: ['title', 'description', 'tags'],
            defaultSort: { createdAt: -1 },
            entityName: 'Mazzo',
        });
    }
}

Object.assign(SessionQuizService.prototype, helpers);
Object.assign(SessionQuizService.prototype, studySession);
Object.assign(SessionQuizService.prototype, quizHelpers);

module.exports = new SessionQuizService();
