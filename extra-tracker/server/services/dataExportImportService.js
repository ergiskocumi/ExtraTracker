/**
 * 📦 DATA EXPORT/IMPORT SERVICE
 * =============================
 * 
 * Esporta e importa i dati utente in modo sicuro.
 */

const Exam = require('../models/Exam');
const WorkLog = require('../models/WorkLog');
const Deck = require('../models/Deck');
const Folder = require('../models/Folder');
const Tag = require('../models/Tag');
const WorkTodo = require('../models/WorkTodo');
const AppError = require('../utils/AppError');

// =========================================
// EXPORT DATA
// =========================================

async function exportUserData(userId) {
    try {
        const [exams, workLogs, decks, folders, tags, workTodos] = await Promise.all([
            Exam.find({ user: userId }).lean(),
            WorkLog.find({ user: userId }).lean(),
            Deck.find({ user: userId }).lean(),
            Folder.find({ user: userId }).lean(),
            Tag.find({ user: userId }).lean(),
            WorkTodo.find({ user: userId }).lean(),
        ]);

        const cleanExams = exams.map(exam => {
            const { user, __v, ...cleanExam } = exam;
            return cleanExam;
        });

        const cleanWorkLogs = workLogs.map(log => {
            const { user, __v, ...cleanLog } = log;
            return cleanLog;
        });

        const cleanDecks = decks.map(deck => {
            const { user, __v, extractedText, ...cleanDeck } = deck;
            return cleanDeck;
        });

        const cleanFolders = folders.map(folder => {
            const { user, __v, ...cleanFolder } = folder;
            return cleanFolder;
        });

        const cleanTags = tags.map(tag => {
            const { user, __v, ...cleanTag } = tag;
            return cleanTag;
        });

        const cleanWorkTodos = workTodos.map(todo => {
            const { user, __v, ...cleanTodo } = todo;
            return cleanTodo;
        });

        return {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            data: {
                exams: cleanExams,
                workLogs: cleanWorkLogs,
                decks: cleanDecks,
                folders: cleanFolders,
                tags: cleanTags,
                workTodos: cleanWorkTodos,
            },
            metadata: {
                counts: {
                    exams: cleanExams.length,
                    workTodos: cleanWorkTodos.length,
                },
            },
        };
    } catch (error) {
        throw new AppError(
            `Errore durante l'esportazione: ${error.message}`,
            500,
            'EXPORT_ERROR'
        );
    }
}

// =========================================
// IMPORT DATA - VALIDATION
// =========================================

function validateImportData(data) {
    if (!data || typeof data !== 'object') {
        throw new AppError('File di import non valido: formato JSON non riconosciuto', 400, 'INVALID_FORMAT');
    }

    if (!data.version || !data.exportDate) {
        throw new AppError('File di import non valido: mancano metadati richiesti', 400, 'INVALID_FORMAT');
    }

    if (!data.data || typeof data.data !== 'object') {
        throw new AppError('File di import non valido: struttura dati non valida', 400, 'INVALID_FORMAT');
    }

    const { data: importData } = data;
    const requiredSections = ['exams', 'workLogs', 'decks', 'folders', 'tags', 'workTodos'];
    for (const section of requiredSections) {
        if (!Array.isArray(importData[section])) {
            throw new AppError(
                `File di import non valido: sezione '${section}' deve essere un array`,
                400,
                'INVALID_FORMAT'
            );
        }
    }

    return true;
}

function validateDocument(doc, type) {
    if (!doc || typeof doc !== 'object') {
        return { valid: false, error: 'Documento non valido' };
    }

    switch (type) {
        case 'exam':
            if (!doc.title || !doc.deadline) {
                return { valid: false, error: 'Exam: campi obbligatori mancanti' };
            }
            break;
        case 'deck':
            if (!doc.title) {
                return { valid: false, error: 'Deck: titolo mancante' };
            }
            break;
        case 'workLog':
            if (!doc.projectId || !doc.date || !doc.title) {
                return { valid: false, error: 'WorkLog: campi obbligatori mancanti' };
            }
            break;
        case 'workTodo':
            if (!doc.project || !doc.title) {
                return { valid: false, error: 'WorkTodo: campi obbligatori mancanti' };
            }
            break;
    }

    return { valid: true };
}

// =========================================
// IMPORT DATA - COMPARISON & VALIDATION
// =========================================

async function compareImportData(userId, importData) {
    const [existingExams, existingWorkLogs, existingDecks, existingFolders, existingTags, existingWorkTodos] = await Promise.all([
        Exam.find({ user: userId }).lean(),
        WorkLog.find({ user: userId }).lean(),
        Deck.find({ user: userId }).lean(),
        Folder.find({ user: userId }).lean(),
        Tag.find({ user: userId }).lean(),
        WorkTodo.find({ user: userId }).lean(),
    ]);

    const existing = {
        exams: existingExams.length,
        workLogs: existingWorkLogs.length,
        decks: existingDecks.length,
        folders: existingFolders.length,
        tags: existingTags.length,
        workTodos: existingWorkTodos.length,
    };

    const importing = {
        exams: importData.data.exams.length,
        workLogs: importData.data.workLogs.length,
        decks: importData.data.decks.length,
        folders: importData.data.folders.length,
        tags: importData.data.tags.length,
        workTodos: importData.data.workTodos.length,
    };

    const isIdentical = Object.keys(existing).every((key) => existing[key] === importing[key]);

    const hasLessData = importing.exams < existing.exams ||
                        importing.workLogs < existing.workLogs ||
                        importing.decks < existing.decks ||
                        importing.folders < existing.folders ||
                        importing.tags < existing.tags ||
                        importing.workTodos < existing.workTodos;

    const differences = {
        exams: importing.exams - existing.exams,
        workLogs: importing.workLogs - existing.workLogs,
        decks: importing.decks - existing.decks,
        folders: importing.folders - existing.folders,
        tags: importing.tags - existing.tags,
        workTodos: importing.workTodos - existing.workTodos,
    };

    return { existing, importing, isIdentical, hasLessData, differences };
}

// =========================================
// IMPORT DATA
// =========================================

async function importUserData(userId, importData, force = false) {
    validateImportData(importData);

    const comparison = await compareImportData(userId, importData);
    if (comparison.isIdentical) {
        throw new AppError(
            'I dati da importare sono identici a quelli già presenti nel tuo account. Non è necessario importarli.',
            400,
            'IDENTICAL_DATA'
        );
    }

    if (comparison.hasLessData && !force) {
        throw new AppError(
            'I dati da importare contengono meno elementi di quelli attualmente presenti. Vuoi continuare?',
            400,
            'LESS_DATA_WARNING',
            { comparison }
        );
    }

    const { data } = importData;
    const idMappings = {
        exams: new Map(),
        folders: new Map(),
        tags: new Map(),
    };

    const validationErrors = [];
    data.exams.forEach((exam, index) => {
        const validation = validateDocument(exam, 'exam');
        if (!validation.valid) {
            validationErrors.push(`Exam ${index}: ${validation.error}`);
        }
    });
    data.decks.forEach((deck, index) => {
        const validation = validateDocument(deck, 'deck');
        if (!validation.valid) {
            validationErrors.push(`Deck ${index}: ${validation.error}`);
        }
    });

    if (validationErrors.length > 0) {
        throw new AppError(
            `Errori di validazione: ${validationErrors.join('; ')}`,
            400,
            'VALIDATION_ERROR'
        );
    }

    // 1. Folders
    const importedFolders = [];
    for (const folder of data.folders) {
        const { _id, ...folderData } = folder;
        const newFolder = await Folder.create({
            ...folderData,
            user: userId,
        });
        if (_id) {
            idMappings.folders.set(_id.toString(), newFolder._id);
        }
        importedFolders.push(newFolder);
    }

    // 2. Tags - OTTIMIZZATO: Batch query invece di N+1
    const importedTags = [];
    if (data.tags && data.tags.length > 0) {
        // Query batch per trovare tutti i tags esistenti in una sola query
        const tagNames = data.tags.map(t => t.name);
        const existingTags = await Tag.find({ user: userId, name: { $in: tagNames } });
        const existingTagMap = new Map(existingTags.map(t => [t.name, t]));

        for (const tag of data.tags) {
            const { _id, ...tagData } = tag;
            const existingTag = existingTagMap.get(tagData.name);

            if (existingTag) {
                if (_id) {
                    idMappings.tags.set(_id.toString(), existingTag._id);
                }
                importedTags.push(existingTag);
            } else {
                const newTag = await Tag.create({
                    ...tagData,
                    user: userId,
                });
                if (_id) {
                    idMappings.tags.set(_id.toString(), newTag._id);
                }
                importedTags.push(newTag);
            }
        }
    }

    // 3. Exams
    const importedExams = [];
    for (const exam of data.exams) {
        const { _id, ...examData } = exam;
        const newExam = await Exam.create({
            ...examData,
            user: userId,
        });
        if (_id) {
            idMappings.exams.set(_id.toString(), newExam._id);
        }
        importedExams.push(newExam);
    }

    // 4. Decks
    const importedDecks = [];
    for (const deck of data.decks) {
        const { _id, examId, folderId, ...deckData } = deck;

        let newExamId = examId || null;
        if (examId && idMappings.exams.has(examId.toString())) {
            newExamId = idMappings.exams.get(examId.toString());
        } else if (examId) {
            const examExists = await Exam.findOne({ _id: examId, user: userId });
            if (!examExists) {
                throw new AppError(
                    `Deck "${deckData.title}": examId non valido`,
                    400,
                    'INVALID_REFERENCE'
                );
            }
        }

        let newFolderId = folderId || null;
        if (folderId && idMappings.folders.has(folderId.toString())) {
            newFolderId = idMappings.folders.get(folderId.toString());
        } else if (folderId) {
            const folderExists = await Folder.findOne({ _id: folderId, user: userId });
            if (!folderExists) {
                newFolderId = null;
            }
        }

        const newDeck = await Deck.create({
            ...deckData,
            examId: newExamId,
            folderId: newFolderId,
            user: userId,
        });
        importedDecks.push(newDeck);
    }

    // 5. WorkLogs
    const importedWorkLogs = [];
    for (const workLog of data.workLogs) {
        const { _id, ...workLogData } = workLog;
        const newWorkLog = await WorkLog.create({
            ...workLogData,
            user: userId,
        });
        importedWorkLogs.push(newWorkLog);
    }

    // 6. WorkTodos
    const importedWorkTodos = [];
    for (const workTodo of data.workTodos) {
        const { _id, ...workTodoData } = workTodo;
        const newWorkTodo = await WorkTodo.create({
            ...workTodoData,
            user: userId,
        });
        importedWorkTodos.push(newWorkTodo);
    }

    return {
        success: true,
        imported: {
            exams: importedExams.length,
            workLogs: importedWorkLogs.length,
            decks: importedDecks.length,
            folders: importedFolders.length,
            tags: importedTags.length,
            workTodos: importedWorkTodos.length,
        },
    };
}

module.exports = {
    exportUserData,
    importUserData,
    validateImportData,
    compareImportData,
};
