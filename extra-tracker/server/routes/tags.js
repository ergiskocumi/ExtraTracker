/**
 * 🏷️ TAGS ROUTES
 * ===============
 *
 * Base path: /api/tags
 */

const express = require('express');
const router = express.Router();

// Middleware
const { requireAuth } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenantContext');

// Controller
const tagsController = require('../controllers/tagsController');

// =========================================
// MIDDLEWARE: Auth + Tenant Context
// =========================================

router.use(requireAuth);
router.use(tenantContext({ required: true }));

// =========================================
// ROUTES
// =========================================

router.get('/', tagsController.getAllTags);
router.post('/', tagsController.createTag);
router.patch('/:id', tagsController.updateTag);
router.delete('/:id', tagsController.deleteTag);

module.exports = router;
