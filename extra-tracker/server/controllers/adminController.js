/**
 * 🛡️ ADMIN CONTROLLER
 *
 * Endpoints amministrativi generici (gestione utenti, etc.)
 */

const User = require('../models/User');

/**
 * GET /api/admin/users
 * Lista utenti (filtrabile per ruolo)
 */
const listUsers = async (req, res, next) => {
    try {
        const { role, search = '', limit = 50 } = req.query;
        const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));

        const query = {};
        if (role) {
            query.role = role;
        }

        if (search) {
            const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'i');
            query.$or = [
                { email: regex },
                { 'profile.firstName': regex },
                { 'profile.lastName': regex },
                { 'profile.displayName': regex },
            ];
        }

        const users = await User.find(query)
            .select('email profile.firstName profile.lastName profile.displayName role')
            .sort({ 'profile.displayName': 1, email: 1 })
            .limit(safeLimit)
            .exec();

        res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listUsers,
};
