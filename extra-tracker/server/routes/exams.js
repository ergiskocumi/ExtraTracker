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

router.use(requireAuth);
router.use(tenantContext({ required: true }));

router.get('/', examsController.getAllExams);
router.post('/', examsController.createExam);
router.get('/:id', examsController.getExamById);
router.patch('/:id', examsController.updateExam);
router.delete('/:id', examsController.deleteExam);

module.exports = router;
