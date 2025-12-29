const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const WorkLog = require('../models/WorkLog');
const { asyncHandler } = require('../middleware/errorHandler');
const AppError = require('../utils/AppError');

//! ROTTE PER I PROGETTI - API 

//! API GET per poter prendere tutti i progetti dal database
router.get('/projects', asyncHandler(async (req, res) => {
    const projects = await Project.find({});
    res.json({ success: true, data: projects });
}));

//! API POST per creare un nuovo progetto
router.post('/projects', asyncHandler(async (req, res) => {
    const project = new Project({
        name: req.body.name,
        code: req.body.code,
        description: req.body.description,
        rate: req.body.rate
    });

    const newProject = await project.save();
    res.status(201).json({ success: true, data: newProject });
}));

//! API GET per leggere tutti i log di lavoro
router.get('/worklogs', asyncHandler(async (req, res) => {
    const log = await WorkLog.find({});
    res.json({ success: true, data: log });
}));

//!API POST per creare un nuovo log di lavoro
router.post('/worklogs', asyncHandler(async (req, res) => {
    const log = new WorkLog({
        projectId: req.body.projectId,
        date: req.body.date,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        description: req.body.description
    });

    const newLog = await log.save();
    res.status(201).json({ success: true, data: newLog });
}));

//! API DELETE per eliminare un log di lavoro
router.delete('/worklogs/:id', asyncHandler(async (req, res) => {
    const deletedLog = await WorkLog.findByIdAndDelete(req.params.id);
    if (!deletedLog) {
        throw AppError.notFound('Log di lavoro');
    }
    res.json({ success: true, message: 'Log di lavoro eliminato' });
}));

//! API PUT per modifica dei log
router.put('/worklogs/:id', asyncHandler(async (req, res) => {
    const updatedLog = await WorkLog.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    if (!updatedLog) {
        throw AppError.notFound('Log di lavoro');
    }
    res.json({ success: true, data: updatedLog });
}));

module.exports = router;
