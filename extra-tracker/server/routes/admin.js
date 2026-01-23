/**
 * 🛡️ ADMIN ROUTES
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireAdmin');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Middleware: Auth + Admin
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * Lista utenti (filtrabile per ruolo)
 */
router.get('/users', adminController.listUsers);

module.exports = router;
