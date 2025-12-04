const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const WorkLog = require('../models/WorkLog');

//! ROTTE PER I PROGETTI - API 

//! API GET per poter prendere tutti i progetti dal database
router.get('/projects', async (req, res) => {
    try {
        const projects = await Project.find({});  // certo tutti i clienti(project) che ho nel db
        res.json(projects); //qui mandi il JSON al frontend
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//! API POST per creare un nuovo progetto
router.post('/projects', async (req, res) => {
    const project = new Project({
        name: req.body.name,
        code: req.body.code,
        description: req.body.description,
        rate: req.body.rate
    });

    try {
        const newProject = await project.save();
        res.status(201).json(newProject);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

//! API GET per leggere tutti i log di lavoro
router.get('/worklogs', async (req, res) => {
    try {
        const log = await WorkLog.find({});
        res.json(log);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//!API POST per creare un nuovo log di lavoro
router.post('/worklogs', async (req, res) => {
    const log = new WorkLog({
        projectId: req.body.projectId,
        date: req.body.date,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        description: req.body.description
    });

    try {
        const newLog = await log.save();
        res.status(201).json(newLog);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

//! API DELETE per eliminare un log di lavoro
router.delete('/worklogs/:id', async (req, res) => {
    try {
        await WorkLog.findOneAndDelete(req.params.id);
        res.json({ message: 'Log di lavoro eliminato' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//! API PUT per modifica dei log
router.put('/worklogs/:id', async (req, res) => {
    try {
        const updatedLog = await WorkLog.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updatedLog);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;