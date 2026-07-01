/**
 * 🏷️ TAGS CONTROLLER
 * ==================
 * Gestisce le richieste HTTP per i tag.
 * Delega tutta la business logic a tagService.
 */

const tagService = require('../services/tagService');
const { asyncHandler } = require('../middleware/errorHandler');

const getAllTags = asyncHandler(async (req, res) => {
    const data = await tagService.getAll(req.tenantScope);
    res.json({ success: true, data });
});

const createTag = asyncHandler(async (req, res) => {
    const data = await tagService.create(req.tenantScope, req.body);
    res.status(201).json({ success: true, data });
});

const updateTag = asyncHandler(async (req, res) => {
    const data = await tagService.update(req.tenantScope, req.params.id, req.body);
    res.json({ success: true, data });
});

const deleteTag = asyncHandler(async (req, res) => {
    await tagService.delete(req.tenantScope, req.params.id);
    res.json({ success: true, message: 'Tag eliminato', data: null });
});

module.exports = {
    getAllTags,
    createTag,
    updateTag,
    deleteTag,
};
