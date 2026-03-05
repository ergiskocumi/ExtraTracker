const BaseService = require('../services/BaseService');
const Exam = require('../models/Exam');

class ExamRepository extends BaseService {
    constructor() {
        super(Exam, { entityName: 'Esame' });
    }
}

module.exports = new ExamRepository();
