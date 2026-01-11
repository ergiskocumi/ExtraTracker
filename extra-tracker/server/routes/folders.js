/**
 * 📁 FOLDERS ROUTES
 * =================
 *
 * Base path: /api/folders
 */

const express = require('express');
const router = express.Router();

// Middleware
const { requireAuth } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenantContext');

// Controller
const foldersController = require('../controllers/foldersController');

// =========================================
// MIDDLEWARE: Auth + Tenant Context
// =========================================

router.use(requireAuth);
router.use(tenantContext({ required: true }));

// =========================================
// ROUTES
// =========================================

router.get('/', foldersController.getAllFolders);
router.get('/tree', foldersController.getFolderTree);
router.post('/', foldersController.createFolder);
router.patch('/:id', foldersController.updateFolder);
router.delete('/:id', foldersController.deleteFolder);
router.post('/:id/move-decks', foldersController.moveDecksToFolder);

module.exports = router;
