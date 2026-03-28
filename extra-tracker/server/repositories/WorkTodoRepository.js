const BaseService = require('../services/BaseService');
const WorkTodo = require('../models/WorkTodo');

class WorkTodoRepository extends BaseService {
    constructor() {
        super(WorkTodo, {
            entityName: 'Todo',
            defaultSort: { createdAt: -1 },
        });
    }
}

module.exports = new WorkTodoRepository();
