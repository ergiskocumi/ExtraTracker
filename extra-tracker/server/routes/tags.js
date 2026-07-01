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

// Validators
const { validateMiddleware, createTagSchema, updateTagSchema } = require('../validators/tagValidators');

// =========================================
// MIDDLEWARE: Auth + Tenant Context
// =========================================

router.use(requireAuth);
router.use(tenantContext({ required: true }));

// =========================================
// ROUTES
// =========================================

router.get('/', tagsController.getAllTags);
router.post('/', validateMiddleware(createTagSchema), tagsController.createTag);
router.patch('/:id', validateMiddleware(updateTagSchema), tagsController.updateTag);
router.delete('/:id', tagsController.deleteTag);

module.exports = router;
