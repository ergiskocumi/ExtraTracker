/**
 * 🔁 MIGRATION: Goals -> Exams (learning goals only)
 * 
 * Crea esami a partire dagli obiettivi "learning" e
 * sposta i riferimenti dei deck da goalId a examId.
 */

const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Deck = require('../models/Deck');
const logger = require('./logger');

async function migrateExamsFromGoals() {
    const db = mongoose.connection.db;
    if (!db) return;

    const collections = await db.listCollections().toArray();
    const hasGoals = collections.some(c => c.name === 'goals');
    if (!hasGoals) return;

    const existingExams = await Exam.countDocuments();
    if (existingExams > 0) {
        return;
    }

    const goalsCollection = db.collection('goals');
    const learningGoals = await goalsCollection.find({ category: 'learning' }).toArray();
    if (learningGoals.length === 0) {
        return;
    }

    const exams = learningGoals.map(goal => ({
        _id: goal._id,
        title: goal.title,
        description: goal.description || '',
        deadline: goal.deadline || new Date(),
        status: goal.status || 'active',
        outcome: goal.outcome || null,
        user: goal.user,
        createdAt: goal.createdAt || new Date(),
        updatedAt: goal.updatedAt || new Date(),
    }));

    try {
        await Exam.collection.insertMany(exams, { ordered: false });
        logger.success('Migration', `Creati ${exams.length} esami da goals learning`);
    } catch (err) {
        logger.warn('Migration', 'Inserimento esami parziale', err);
    }

    try {
        await Deck.collection.updateMany(
            { goalId: { $exists: true } },
            [
                { $set: { examId: '$goalId' } },
                { $unset: 'goalId' }
            ]
        );
        logger.success('Migration', 'Deck aggiornati con examId');
    } catch (err) {
        logger.warn('Migration', 'Aggiornamento deck non riuscito', err);
    }
}

module.exports = { migrateExamsFromGoals };
