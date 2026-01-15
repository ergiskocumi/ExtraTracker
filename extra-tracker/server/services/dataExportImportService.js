/**
 * 📦 DATA EXPORT/IMPORT SERVICE
 * =============================
 * 
 * Servizio per esportare e importare i dati utente in modo sicuro.
 * 
 * SICUREZZA:
 * - Export: Solo dati "lavoro" (no email, password, level, XP, tokens)
 * - Import: Validazione rigorosa, non permette modifiche a dati sensibili
 * - Relazioni: Mantiene integrità referenziale
 */

const Goal = require('../models/Goal');
const Project = require('../models/Project');
const WorkLog = require('../models/WorkLog');
const Deck = require('../models/Deck');
const Folder = require('../models/Folder');
const Tag = require('../models/Tag');
const CheckIn = require('../models/CheckIn');
const WorkTodo = require('../models/WorkTodo');
const AppError = require('../utils/AppError');

// =========================================
// EXPORT DATA
// =========================================

/**
 * Esporta tutti i dati "lavoro" dell'utente
 * NON include: email, password, level, XP, tokens, gamification
 */
async function exportUserData(userId) {
    try {
        // Raccogli tutti i dati in parallelo
        const [goals, projects, workLogs, decks, folders, tags, checkIns, workTodos] = await Promise.all([
            Goal.find({ user: userId }).lean(),
            Project.find({ user: userId }).lean(),
            WorkLog.find({ user: userId }).lean(),
            Deck.find({ user: userId }).lean(),
            Folder.find({ user: userId }).lean(),
            Tag.find({ user: userId }).lean(),
            CheckIn.find({ user: userId }).lean(),
            WorkTodo.find({ user: userId }).lean(),
        ]);

        // Rimuovi campi sensibili e non necessari
        const cleanGoals = goals.map(goal => {
            const { user, __v, ...cleanGoal } = goal;
            return cleanGoal;
        });

        const cleanProjects = projects.map(project => {
            const { user, __v, ...cleanProject } = project;
            return cleanProject;
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

        const cleanCheckIns = checkIns.map(checkIn => {
            const { user, __v, ...cleanCheckIn } = checkIn;
            return cleanCheckIn;
        });

        const cleanWorkTodos = workTodos.map(todo => {
            const { user, __v, ...cleanTodo } = todo;
            return cleanTodo;
        });

        // Struttura dati esportati
        const exportData = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            data: {
                goals: cleanGoals,
                projects: cleanProjects,
                workLogs: cleanWorkLogs,
                decks: cleanDecks,
                folders: cleanFolders,
                tags: cleanTags,
                checkIns: cleanCheckIns,
                workTodos: cleanWorkTodos,
            },
            metadata: {
                counts: {
                    goals: cleanGoals.length,
                    projects: cleanProjects.length,
                    workLogs: cleanWorkLogs.length,
                    decks: cleanDecks.length,
                    folders: cleanFolders.length,
                    tags: cleanTags.length,
                    checkIns: cleanCheckIns.length,
                    workTodos: cleanWorkTodos.length,
                },
            },
        };

        return exportData;
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

/**
 * Valida la struttura del file di import
 */
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

    // Valida che ogni sezione sia un array
    const requiredSections = ['goals', 'projects', 'workLogs', 'decks', 'folders', 'tags', 'checkIns', 'workTodos'];
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

/**
 * Valida i dati di un singolo documento
 */
function validateDocument(doc, type) {
    if (!doc || typeof doc !== 'object') {
        return { valid: false, error: 'Documento non valido' };
    }

    // Validazioni base per ogni tipo
    switch (type) {
        case 'goal':
            if (!doc.title || !doc.category || !doc.type || !doc.deadline) {
                return { valid: false, error: 'Goal: campi obbligatori mancanti' };
            }
            break;
        case 'project':
            if (!doc.name) {
                return { valid: false, error: 'Project: nome mancante' };
            }
            break;
        case 'deck':
            if (!doc.title || !doc.goalId) {
                return { valid: false, error: 'Deck: titolo o goalId mancante' };
            }
            break;
        case 'folder':
            if (!doc.name) {
                return { valid: false, error: 'Folder: nome mancante' };
            }
            break;
        case 'checkIn':
            if (!doc.goalId || doc.value === undefined) {
                return { valid: false, error: 'CheckIn: goalId o value mancante' };
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

/**
 * Confronta i dati esistenti con quelli da importare
 * Restituisce informazioni su differenze e potenziali problemi
 */
async function compareImportData(userId, importData) {
    validateImportData(importData);

    // Raccogli dati esistenti
    const [existingGoals, existingProjects, existingWorkLogs, existingDecks, existingFolders, existingTags, existingCheckIns, existingWorkTodos] = await Promise.all([
        Goal.find({ user: userId }).lean(),
        Project.find({ user: userId }).lean(),
        WorkLog.find({ user: userId }).lean(),
        Deck.find({ user: userId }).lean(),
        Folder.find({ user: userId }).lean(),
        Tag.find({ user: userId }).lean(),
        CheckIn.find({ user: userId }).lean(),
        WorkTodo.find({ user: userId }).lean(),
    ]);

    const existing = {
        goals: existingGoals.length,
        projects: existingProjects.length,
        workLogs: existingWorkLogs.length,
        decks: existingDecks.length,
        folders: existingFolders.length,
        tags: existingTags.length,
        checkIns: existingCheckIns.length,
        workTodos: existingWorkTodos.length,
    };

    const importing = {
        goals: importData.data.goals.length,
        projects: importData.data.projects.length,
        workLogs: importData.data.workLogs.length,
        decks: importData.data.decks.length,
        folders: importData.data.folders.length,
        tags: importData.data.tags.length,
        checkIns: importData.data.checkIns.length,
        workTodos: importData.data.workTodos.length,
    };

    // Verifica se i dati sono identici (stesso numero di elementi per tipo)
    const isIdentical = 
        existing.goals === importing.goals &&
        existing.projects === importing.projects &&
        existing.workLogs === importing.workLogs &&
        existing.decks === importing.decks &&
        existing.folders === importing.folders &&
        existing.tags === importing.tags &&
        existing.checkIns === importing.checkIns &&
        existing.workTodos === importing.workTodos;

    // Verifica se i dati importati sono minori (almeno un tipo ha meno elementi)
    const hasLessData = 
        importing.goals < existing.goals ||
        importing.projects < existing.projects ||
        importing.workLogs < existing.workLogs ||
        importing.decks < existing.decks ||
        importing.folders < existing.folders ||
        importing.tags < existing.tags ||
        importing.checkIns < existing.checkIns ||
        importing.workTodos < existing.workTodos;

    // Calcola differenze per tipo
    const differences = {
        goals: importing.goals - existing.goals,
        projects: importing.projects - existing.projects,
        workLogs: importing.workLogs - existing.workLogs,
        decks: importing.decks - existing.decks,
        folders: importing.folders - existing.folders,
        tags: importing.tags - existing.tags,
        checkIns: importing.checkIns - existing.checkIns,
        workTodos: importing.workTodos - existing.workTodos,
    };

    return {
        isIdentical,
        hasLessData,
        existing,
        importing,
        differences,
    };
}

// =========================================
// IMPORT DATA
// =========================================

/**
 * Importa dati utente in modo sicuro
 * 
 * STRATEGIA:
 * 1. Valida struttura file
 * 2. Confronta con dati esistenti
 * 3. Valida ogni documento
 * 4. Crea mapping ID vecchi -> nuovi
 * 5. Importa in ordine: folders, tags, goals, projects, decks, workLogs, checkIns, workTodos
 * 6. Aggiorna riferimenti (goalId, projectId, folderId)
 */
async function importUserData(userId, importData, options = {}) {
    const { merge = false, force = false } = options; // force: true = ignora warning

    // 1. Valida struttura
    validateImportData(importData);

    // 2. Confronta con dati esistenti
    const comparison = await compareImportData(userId, importData);

    // 2.1 Blocca se dati identici
    if (comparison.isIdentical && !force) {
        throw new AppError(
            'I dati da importare sono identici a quelli già presenti nel tuo account. Non è necessario importarli.',
            400,
            'IDENTICAL_DATA'
        );
    }

    // 2.2 Avvisa se dati minori (ma permette se force=true)
    if (comparison.hasLessData && !force) {
        // Lancia errore speciale che il controller gestirà
        throw new AppError(
            'I dati da importare contengono meno elementi di quelli attualmente presenti. Vuoi continuare?',
            400,
            'LESS_DATA_WARNING',
            { comparison }
        );
    }

    const { data } = importData;

    // 2. Mapping ID vecchi -> nuovi (per mantenere relazioni)
    const idMappings = {
        goals: new Map(),
        projects: new Map(),
        folders: new Map(),
        tags: new Map(),
    };

    // 3. Valida tutti i documenti
    const validationErrors = [];
    
    data.goals.forEach((goal, index) => {
        const validation = validateDocument(goal, 'goal');
        if (!validation.valid) {
            validationErrors.push(`Goal ${index}: ${validation.error}`);
        }
    });

    data.projects.forEach((project, index) => {
        const validation = validateDocument(project, 'project');
        if (!validation.valid) {
            validationErrors.push(`Project ${index}: ${validation.error}`);
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

    // 4. Se merge=false, elimina dati esistenti (opzionale, per ora non lo facciamo per sicurezza)
    // In futuro potremmo aggiungere questa opzione

    // 5. Importa in ordine di dipendenze
    
    // 5.1 Folders (nessuna dipendenza)
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

    // 5.2 Tags (nessuna dipendenza)
    const importedTags = [];
    for (const tag of data.tags) {
        const { _id, ...tagData } = tag;
        // Controlla se tag esiste già (per nome)
        const existingTag = await Tag.findOne({ user: userId, name: tagData.name });
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

    // 5.3 Goals (dipende da nulla, ma referenziato da decks e checkIns)
    const importedGoals = [];
    for (const goal of data.goals) {
        const { _id, ...goalData } = goal;
        const newGoal = await Goal.create({
            ...goalData,
            user: userId,
        });
        if (_id) {
            idMappings.goals.set(_id.toString(), newGoal._id);
        }
        importedGoals.push(newGoal);
    }

    // 5.4 Projects (dipende da nulla, ma referenziato da workLogs e workTodos)
    const importedProjects = [];
    for (const project of data.projects) {
        const { _id, ...projectData } = project;
        const newProject = await Project.create({
            ...projectData,
            user: userId,
        });
        if (_id) {
            idMappings.projects.set(_id.toString(), newProject._id);
        }
        importedProjects.push(newProject);
    }

    // 5.5 Decks (dipende da goals e folders)
    const importedDecks = [];
    for (const deck of data.decks) {
        const { _id, goalId, folderId, ...deckData } = deck;
        
        // Mappa goalId
        let newGoalId = goalId;
        if (goalId && idMappings.goals.has(goalId.toString())) {
            newGoalId = idMappings.goals.get(goalId.toString());
        } else if (goalId) {
            // Se goalId non esiste nel mapping, verifica che esista nel DB
            const goalExists = await Goal.findOne({ _id: goalId, user: userId });
            if (!goalExists) {
                throw new AppError(
                    `Deck "${deckData.title}": goalId non valido`,
                    400,
                    'INVALID_REFERENCE'
                );
            }
        }

        // Mappa folderId (opzionale)
        let newFolderId = folderId || null;
        if (folderId && idMappings.folders.has(folderId.toString())) {
            newFolderId = idMappings.folders.get(folderId.toString());
        } else if (folderId) {
            const folderExists = await Folder.findOne({ _id: folderId, user: userId });
            if (!folderExists) {
                newFolderId = null; // Se folder non esiste, rimuovi riferimento
            }
        }

        const newDeck = await Deck.create({
            ...deckData,
            goalId: newGoalId,
            folderId: newFolderId,
            user: userId,
        });
        importedDecks.push(newDeck);
    }

    // 5.6 WorkLogs (dipende da projects)
    const importedWorkLogs = [];
    for (const workLog of data.workLogs) {
        const { _id, projectId, ...workLogData } = workLog;
        
        // Mappa projectId
        let newProjectId = projectId;
        if (projectId && idMappings.projects.has(projectId.toString())) {
            newProjectId = idMappings.projects.get(projectId.toString());
        } else if (projectId) {
            const projectExists = await Project.findOne({ _id: projectId, user: userId });
            if (!projectExists) {
                throw new AppError(
                    `WorkLog: projectId non valido`,
                    400,
                    'INVALID_REFERENCE'
                );
            }
        }

        const newWorkLog = await WorkLog.create({
            ...workLogData,
            projectId: newProjectId,
            user: userId,
        });
        importedWorkLogs.push(newWorkLog);
    }

    // 5.7 CheckIns (dipende da goals)
    const importedCheckIns = [];
    for (const checkIn of data.checkIns) {
        const { _id, goalId, ...checkInData } = checkIn;
        
        // Mappa goalId
        let newGoalId = goalId;
        if (goalId && idMappings.goals.has(goalId.toString())) {
            newGoalId = idMappings.goals.get(goalId.toString());
        } else if (goalId) {
            const goalExists = await Goal.findOne({ _id: goalId, user: userId });
            if (!goalExists) {
                throw new AppError(
                    `CheckIn: goalId non valido`,
                    400,
                    'INVALID_REFERENCE'
                );
            }
        }

        const newCheckIn = await CheckIn.create({
            ...checkInData,
            goalId: newGoalId,
            user: userId,
        });
        importedCheckIns.push(newCheckIn);
    }

    // 5.8 WorkTodos (dipende da projects)
    const importedWorkTodos = [];
    for (const workTodo of data.workTodos) {
        const { _id, project, ...workTodoData } = workTodo;
        
        // Mappa project
        let newProjectId = project;
        if (project && idMappings.projects.has(project.toString())) {
            newProjectId = idMappings.projects.get(project.toString());
        } else if (project) {
            const projectExists = await Project.findOne({ _id: project, user: userId });
            if (!projectExists) {
                throw new AppError(
                    `WorkTodo: project non valido`,
                    400,
                    'INVALID_REFERENCE'
                );
            }
        }

        const newWorkTodo = await WorkTodo.create({
            ...workTodoData,
            project: newProjectId,
            user: userId,
        });
        importedWorkTodos.push(newWorkTodo);
    }

    return {
        success: true,
        imported: {
            goals: importedGoals.length,
            projects: importedProjects.length,
            workLogs: importedWorkLogs.length,
            decks: importedDecks.length,
            folders: importedFolders.length,
            tags: importedTags.length,
            checkIns: importedCheckIns.length,
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
