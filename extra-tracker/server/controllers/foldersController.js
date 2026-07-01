/**
 * 📁 FOLDERS CONTROLLER
 * =====================
 * Gestisce le richieste HTTP per le cartelle.
 * Delega tutta la business logic a folderService.
 */

const folderService = require('../services/folderService');
const { asyncHandler } = require('../middleware/errorHandler');

const getAllFolders = asyncHandler(async (req, res) => {
    const data = await folderService.getAll(req.tenantScope);
    res.json({ success: true, data });
});

const getFolderTree = asyncHandler(async (req, res) => {
    const data = await folderService.getTree(req.tenantScope);
    res.json({ success: true, data });
});

const createFolder = asyncHandler(async (req, res) => {
    const data = await folderService.create(req.tenantScope, req.body);
    res.status(201).json({ success: true, data });
});

const updateFolder = asyncHandler(async (req, res) => {
    const data = await folderService.update(req.tenantScope, req.params.id, req.body);
    res.json({ success: true, data });
});

const deleteFolder = asyncHandler(async (req, res) => {
    await folderService.delete(req.tenantScope, req.params.id);
    res.json({ success: true, message: 'Cartella eliminata', data: null });
});

const moveDecksToFolder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const folderId = (id === 'null' || id === 'root') ? null : id;
    const result = await folderService.moveDecks(req.tenantScope, folderId, req.body.deckIds);
    res.json({ success: true, ...result });
});

module.exports = {
    getAllFolders,
    getFolderTree,
    createFolder,
    updateFolder,
    deleteFolder,
    moveDecksToFolder,
};
