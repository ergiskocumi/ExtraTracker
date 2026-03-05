/**
 * 🎯 EXAM SOLVER SERVICE
 * =======================
 * Service autonomo per estrazione domande, generazione risposte e exam solver legacy.
 * examSolver chiama this.create() da BaseService per creare nuovi deck → estende BaseService.
 * Dipende da: BaseService, helpers, examSolver
 */

const BaseService = require('../BaseService');
const Deck = require('../../models/Deck');

const helpers = require('./helpers');
const examSolver = require('./examSolver');

class ExamSolverService extends BaseService {
    constructor() {
        super(Deck, {
            searchFields: ['title', 'description', 'tags'],
            defaultSort: { createdAt: -1 },
            entityName: 'Mazzo',
        });
    }
}

Object.assign(ExamSolverService.prototype, helpers);
Object.assign(ExamSolverService.prototype, examSolver);

module.exports = new ExamSolverService();
