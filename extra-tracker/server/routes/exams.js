/**
 * 🎓 EXAMS ROUTES
 * ===============
 *
 * Base path: /api/exams
 */

const express = require('express');
const router = express.Router();

// Middleware
const { requireAuth } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenantContext');

// Controller
const examsController = require('../controllers/examsController');

// Validators
const { validateMiddleware, createExamSchema, updateExamSchema } = require('../validators/examValidators');

router.use(requireAuth);
router.use(tenantContext({ required: true }));

router.get('/', examsController.getAllExams);
router.post('/', validateMiddleware(createExamSchema), examsController.createExam);
router.get('/:id', examsController.getExamById);
router.patch('/:id', validateMiddleware(updateExamSchema), examsController.updateExam);
router.delete('/:id', examsController.deleteExam);

module.exports = router;
