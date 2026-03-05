/**
 * 🧠 STUDY CONTROLLER — Re-export
 * =================================
 * Compatibilità: aggrega i 3 controller specializzati.
 * Preferire gli import diretti dai controller specifici nelle nuove routes.
 */

const deckController = require('./deckController');
const studySessionController = require('./studySessionController');
const examController = require('./examController');

module.exports = {
    ...deckController,
    ...studySessionController,
    ...examController,
};
