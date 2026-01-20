/**
 * 🧠 STUDY CONTROLLER
 * ==================
 *
 * Gestisce le richieste HTTP per Learning & Flashcards.
 */

const studyService = require('../services/studyService');
const { asyncHandler } = require('../middleware/errorHandler');
const { validatePdfFile } = require('../utils/pdfValidator');

// =========================================
// DECKS
// =========================================

/**
 * POST /api/study
 * Crea un nuovo mazzo di flashcard
 */
const createDeck = asyncHandler(async (req, res) => {
    const deck = await studyService.createDeck(req.tenantScope, {
        goalId: req.body.goalId,
        title: req.body.title,
        description: req.body.description,
        tags: req.body.tags,
    });

    res.status(201).json({ success: true, data: deck });
});

/**
 * PATCH /api/study/:id
 * Aggiorna un mazzo (titolo, descrizione, tags)
 */
const updateDeck = asyncHandler(async (req, res) => {
    const deck = await studyService.updateDeck(req.tenantScope, req.params.id, {
        title: req.body.title,
        description: req.body.description,
        tags: req.body.tags,
        folderId: req.body.folderId,
        goalId: req.body.goalId,
    });
    res.json({ success: true, data: deck });
});

/**
 * DELETE /api/study/:id
 * Elimina un mazzo di flashcard
 */
const deleteDeck = asyncHandler(async (req, res) => {
    await studyService.deleteDeck(req.tenantScope, req.params.id);
    res.json({ success: true, message: 'Mazzo eliminato' });
});

/**
 * GET /api/study/:id
 * Recupera un singolo mazzo con tutte le sue carte
 */
const getDeckById = asyncHandler(async (req, res) => {
    const deck = await studyService.getDeckById(req.tenantScope, req.params.id);
    res.json({ success: true, data: deck });
});

/**
 * GET /api/study/:id/session
 * Recupera una sessione di studio (flashcard | quiz | typing)
 */
const getSession = asyncHandler(async (req, res) => {
    const requestedMode = String(req.query.mode || 'flashcard').toLowerCase();
    const mode = ['flashcard', 'quiz', 'typing'].includes(requestedMode)
        ? requestedMode
        : 'flashcard';

    const session = await studyService.getStudySession(
        req.tenantScope,
        req.params.id,
        mode
    );

    res.json({ success: true, data: session });
});

// =========================================
// CARDS
// =========================================

/**
 * POST /api/study/:id/cards
 * Aggiunge una card a un mazzo
 */
const addCard = asyncHandler(async (req, res) => {
    const deck = await studyService.addCard(req.tenantScope, req.params.id, {
        front: req.body.front,
        back: req.body.back,
    });

    res.status(201).json({ success: true, data: deck });
});

/**
 * PUT /api/study/:id/cards/:cardId
 * Modifica una card esistente
 */
const updateCard = asyncHandler(async (req, res) => {
    const deck = await studyService.updateCard(
        req.tenantScope,
        req.params.id,
        req.params.cardId,
        {
            front: req.body.front,
            back: req.body.back,
        }
    );

    res.json({ success: true, data: deck });
});

/**
 * PATCH /api/study/:id/cards/:cardId/answer
 * Aggiorna solo la risposta (back) di una flashcard
 */
const updateCardAnswer = asyncHandler(async (req, res) => {
    const { answer } = req.body;
    
    if (!answer || typeof answer !== 'string') {
        return res.status(400).json({
            success: false,
            error: { message: 'La risposta è obbligatoria' }
        });
    }

    const deck = await studyService.updateCardAnswer(
        req.tenantScope,
        req.params.id,
        req.params.cardId,
        answer
    );

    res.json({ success: true, data: deck });
});

/**
 * DELETE /api/study/:id/cards/:cardId
 * Elimina una card da un mazzo
 */
const deleteCard = asyncHandler(async (req, res) => {
    const deck = await studyService.deleteCard(
        req.tenantScope,
        req.params.id,
        req.params.cardId
    );

    res.json({ success: true, data: deck });
});

/**
 * PUT /api/study/:id/cards/reorder
 * Riordina le card di un mazzo
 * Body: { cardIds: string[] } - Array di card IDs nell'ordine desiderato
 */
const reorderCards = asyncHandler(async (req, res) => {
    const { cardIds } = req.body;

    if (!Array.isArray(cardIds)) {
        return res.status(400).json({
            success: false,
            error: { message: 'cardIds deve essere un array' }
        });
    }

    const deck = await studyService.reorderCards(
        req.tenantScope,
        req.params.id,
        cardIds
    );

    res.json({ success: true, data: deck });
});

/**
 * POST /api/study/:id/cards/insert
 * Aggiunge una card in una posizione specifica
 * Body: { front: string, back: string, position?: number }
 */
const addCardAtPosition = asyncHandler(async (req, res) => {
    const { front, back, position } = req.body;

    const deck = await studyService.addCardAtPosition(
        req.tenantScope,
        req.params.id,
        { front, back, position }
    );

    res.status(201).json({ success: true, data: deck });
});

// =========================================
// DASHBOARD
// =========================================

/**
 * GET /api/study/dashboard
 * Restituisce TUTTI i mazzi dell'utente con conteggio carte in scadenza
 */
const getDashboard = asyncHandler(async (req, res) => {
    const result = await studyService.getAllDecks(req.tenantScope);
    res.json({ success: true, data: result });
});

// =========================================
// REVIEW
// =========================================

/**
 * POST /api/study/:id/session-complete
 * Salva le statistiche di fine sessione e assegna XP
 */
const completeSession = asyncHandler(async (req, res) => {
    const result = await studyService.completeSession(
        req.tenantScope,
        req.params.id,
        {
            mode: req.body.mode,
            stats: req.body.stats,
        }
    );

    res.json({ success: true, data: result });
});

/**
 * POST /api/study/:id/review
 * Processa una review SM-2
 */
const submitReview = asyncHandler(async (req, res) => {
    const result = await studyService.processCardReview(
        req.tenantScope,
        req.params.id,
        req.body.cardId,
        req.body.rating,
        req.body.sessionMeta || req.body.sessionSummary || null
    );

    res.json({ success: true, data: result });
});

/**
 * POST /api/study/:id/verify-answer
 * Verifica una risposta per Typing Mode
 */
const verifyAnswer = asyncHandler(async (req, res) => {
    const result = await studyService.verifyAnswer(
        req.tenantScope,
        req.params.id,
        req.body.cardId,
        req.body.userAnswer
    );

    res.json({ success: true, data: result });
});

// =========================================
// 🪄 MAGIC GENERATE FROM PDF
// =========================================

/**
 * POST /api/study/:id/generate-pdf
 * Carica un PDF e genera flashcards con AI
 */
const uploadAndGenerate = asyncHandler(async (req, res) => {
    console.log('🪄 uploadAndGenerate called');
    console.log('   - req.file:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'UNDEFINED');
    console.log('   - req.params.id:', req.params.id);
    console.log('   - req.tenantScope:', req.tenantScope?.userId);

    // Verifica che il file sia stato caricato
    if (!req.file) {
        console.log('❌ No file in request');
        return res.status(400).json({
            success: false,
            error: { message: 'Nessun file caricato. Carica un file PDF.' },
        });
    }

    // Verifica che sia un PDF
    if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({
            success: false,
            error: 'Il file deve essere un PDF.',
        });
    }

    // Limite dimensione file (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
        return res.status(400).json({
            success: false,
            error: 'Il file è troppo grande. Massimo 10MB.',
        });
    }

    const result = await studyService.generateCardsFromPDF(
        req.tenantScope,
        req.params.id,
        req.file.path
    );

    res.json({
        success: true,
        data: result,
        message: `✨ Generate ${result.generatedCount} flashcard con successo!`,
    });
});

/**
 * POST /api/study/:id/chat
 * Chat contestuale con AI Tutor (RAG Lite sul testo estratto dal PDF).
 */
const chatWithTutor = asyncHandler(async (req, res) => {
    const result = await studyService.askTutor(
        req.tenantScope,
        req.params.id,
        req.body?.message,
        req.body?.history
    );

    res.json({ success: true, data: result });
});

/**
 * POST /api/study/:id/answer-question
 * Risponde a una domanda d'esame usando ESCLUSIVAMENTE il contesto fornito dal PDF.
 */
const answerExamQuestion = asyncHandler(async (req, res) => {
    const { question } = req.body;
    
    if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({
            success: false,
            error: { message: 'La domanda è obbligatoria' }
        });
    }

    const result = await studyService.answerExamQuestion(
        req.tenantScope,
        req.params.id,
        question.trim()
    );

    res.json({ success: true, data: result });
});

/**
 * PUT /api/study/:id/settings
 * Aggiorna le impostazioni del deck (algoritmo e AI)
 */
const updateDeckSettings = asyncHandler(async (req, res) => {
    const deck = await studyService.updateDeckSettings(
        req.tenantScope,
        req.params.id,
        req.body
    );

    res.json({ success: true, data: deck });
});

/**
 * GET /api/study/:id/analytics
 * Ottiene analytics dettagliate per un deck
 */
const getDeckAnalytics = asyncHandler(async (req, res) => {
    const analytics = await studyService.getDeckAnalytics(
        req.tenantScope,
        req.params.id
    );

    res.json({ success: true, data: analytics });
});

// =========================================
// RECOVERY PLAN
// =========================================

/**
 * POST /api/study/exam/:examId/reset-cards
 * Resetta le carte di tutti i deck associati a un esame
 * Body: { type: 'all' | 'hard-only' }
 */
const resetExamCards = asyncHandler(async (req, res) => {
    console.log('[StudyController] resetExamCards chiamato:', { examId: req.params.examId, type: req.body.type });
    const { type } = req.body;
    
    if (!type || !['all', 'hard-only'].includes(type)) {
        console.error('[StudyController] Tipo non valido:', type);
        return res.status(400).json({
            success: false,
            error: { message: 'type deve essere "all" o "hard-only"' }
        });
    }

    const result = await studyService.resetExamCards(
        req.tenantScope,
        req.params.examId,
        type
    );

    console.log('[StudyController] resetExamCards completato:', result);
    res.json({ success: true, data: result });
});

/**
 * POST /api/study/exam/:examId/generate-recovery-questions
 * Genera domande AI di approfondimento basate sulle difficoltà
 * Body: { difficulties: string[] }
 */
const generateRecoveryQuestions = asyncHandler(async (req, res) => {
    console.log('[StudyController] generateRecoveryQuestions chiamato:', { examId: req.params.examId, difficulties: req.body.difficulties });
    const { difficulties } = req.body;
    
    if (!Array.isArray(difficulties)) {
        console.error('[StudyController] difficulties non è un array:', difficulties);
        return res.status(400).json({
            success: false,
            error: { message: 'difficulties deve essere un array' }
        });
    }

    const result = await studyService.generateRecoveryQuestions(
        req.tenantScope,
        req.params.examId,
        difficulties
    );

    console.log('[StudyController] generateRecoveryQuestions completato:', result);
    res.json({ success: true, data: result });
});

/**
 * POST /api/study/exam-solver/extract-questions
 * Estrae domande da un documento (Livello 1 - Preview)
 * Multipart form-data:
 *   - questionsFile: PDF o TXT con le domande
 */
const extractQuestions = asyncHandler(async (req, res) => {
    console.log('📋 extractQuestions called');
    console.log('   - req.file:', req.file ? req.file.originalname : 'UNDEFINED');
    
    // Con multer.single(), il file è in req.file, non req.files
    const questionsFile = req.file;
    if (!questionsFile) {
        return res.status(400).json({
            success: false,
            error: { message: 'File domande (questionsFile) obbligatorio' }
        });
    }

    const questionsIsPdf = questionsFile.mimetype === 'application/pdf';
    const questionsIsTxt = questionsFile.mimetype === 'text/plain' ||
                           questionsFile.originalname.toLowerCase().endsWith('.txt');

    if (!questionsIsPdf && !questionsIsTxt) {
        return res.status(400).json({
            success: false,
            error: { message: 'File domande deve essere PDF o TXT' }
        });
    }

    const maxSize = 10 * 1024 * 1024;
    if (questionsFile.size > maxSize) {
        return res.status(400).json({
            success: false,
            error: { message: 'File domande troppo grande. Massimo 10MB.' }
        });
    }

    // Validate PDF integrity (magic bytes check)
    if (questionsIsPdf) {
        const pdfValidation = await validatePdfFile(questionsFile.path);
        if (!pdfValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: { message: `PDF corrotto: ${pdfValidation.error}` }
            });
        }
    }

    try {
        const result = await studyService.extractExamQuestions(
            req.tenantScope,
            questionsFile.path
        );

        console.log('✅ extractQuestions completato:', {
            questionsCount: result.questions.length
        });

        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error('❌ extractQuestions error:', err.message);
        throw err;
    }
});

/**
 * POST /api/study/exam-solver/generate-answers
 * Genera risposte per domande selezionate (Livello 1 - Preview)
 * Usa Server-Sent Events (SSE) per inviare progress in tempo reale
 * Multipart form-data:
 *   - sourceFile: PDF con il materiale di studio
 *   - selectedQuestions: JSON array di domande selezionate
 *   - deckId: (opzionale) ID deck esistente da aggiornare
 *   - title: (opzionale) Titolo per nuovo deck
 *   - goalId: (opzionale) ID goal per nuovo deck
 */
const generateAnswers = asyncHandler(async (req, res) => {
    console.log('🤖 generateAnswers called (SSE mode)');
    console.log('   - req.file:', req.file ? req.file.originalname : 'UNDEFINED');
    
    // Con multer.single(), il file è in req.file, non req.files
    const sourceFile = req.file;
    if (!sourceFile) {
        return res.status(400).json({
            success: false,
            error: { message: 'File materiale (sourceFile) obbligatorio' }
        });
    }

    if (sourceFile.mimetype !== 'application/pdf') {
        return res.status(400).json({
            success: false,
            error: { message: 'File materiale deve essere un PDF' }
        });
    }

    const maxSize = 10 * 1024 * 1024;
    if (sourceFile.size > maxSize) {
        return res.status(400).json({
            success: false,
            error: { message: 'File materiale troppo grande. Massimo 10MB.' }
        });
    }

    // Validate PDF integrity (magic bytes check)
    const pdfValidation = await validatePdfFile(sourceFile.path);
    if (!pdfValidation.isValid) {
        return res.status(400).json({
            success: false,
            error: { message: `PDF corrotto: ${pdfValidation.error}` }
        });
    }

    // Parse selectedQuestions
    let selectedQuestions = [];
    try {
        const questionsStr = req.body?.selectedQuestions;
        if (questionsStr) {
            selectedQuestions = JSON.parse(questionsStr);
        }
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: { message: 'selectedQuestions deve essere un JSON array valido' }
        });
    }

    if (!Array.isArray(selectedQuestions) || selectedQuestions.length === 0) {
        return res.status(400).json({
            success: false,
            error: { message: 'Devi selezionare almeno una domanda' }
        });
    }

    const deckId = req.body?.deckId || null;
    const title = req.body?.title || null;
    const goalId = req.body?.goalId || null;

    if (!deckId && (!title || !goalId)) {
        return res.status(400).json({
            success: false,
            error: { 
                message: 'Se non specifichi deckId, devi fornire sia title che goalId per creare un nuovo deck' 
            }
        });
    }

    // Configura SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disabilita buffering nginx

    // Helper per inviare eventi SSE
    const sendEvent = (type, data) => {
        res.write(`event: ${type}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        const result = await studyService.generateExamAnswers(
            req.tenantScope,
            sourceFile.path,
            selectedQuestions,
            { deckId, title, goalId },
            (event) => {
                // Callback per inviare eventi SSE (progress o flashcard)
                if (event.type === 'flashcard') {
                    sendEvent('flashcard', event);
                } else if (event.type === 'progress') {
                    sendEvent('progress', event);
                } else {
                    // Default: progress
                    sendEvent('progress', event);
                }
            }
        );

        console.log('✅ generateAnswers completato:', {
            questionsExtracted: result.stats.questionsExtracted,
            totalFlashcards: result.stats.totalFlashcards,
            processingTimeMs: result.stats.processingTimeMs,
            flashcardsCount: result.flashcards?.length || 0,
            hasFlashcards: !!result.flashcards,
        });

        // Verifica che le flashcards siano presenti
        if (!result.flashcards || !Array.isArray(result.flashcards)) {
            console.error('❌ generateAnswers: flashcards mancanti o non array:', result);
        }

        // Invia evento finale
        sendEvent('complete', result);
        res.end();
    } catch (err) {
        console.error('❌ generateAnswers error:', err.message);
        sendEvent('error', { message: err.message || 'Errore durante la generazione' });
        res.end();
    }
});

/**
 * POST /api/study/exam-solver
 * Exam Solver: estrae domande da un documento e genera risposte da un altro (LEGACY)
 * Multipart form-data:
 *   - questionsFile: PDF o TXT con le domande
 *   - sourceFile: PDF con il materiale di studio
 *   - deckId: (opzionale) ID deck esistente da aggiornare
 *   - title: (opzionale) Titolo per nuovo deck
 *   - goalId: (opzionale) ID goal per nuovo deck
 */
const examSolver = asyncHandler(async (req, res) => {
    console.log('🎯 examSolver called');
    console.log('   - req.files:', req.files ? Object.keys(req.files) : 'UNDEFINED');
    console.log('   - req.body:', req.body);

    // Verifica file domande (multer.fields() restituisce un oggetto con array)
    const questionsFile = req.files?.questionsFile?.[0];
    if (!questionsFile) {
        return res.status(400).json({
            success: false,
            error: { message: 'File domande (questionsFile) obbligatorio' }
        });
    }

    // Verifica file materiale
    const sourceFile = req.files?.sourceFile?.[0];
    if (!sourceFile) {
        return res.status(400).json({
            success: false,
            error: { message: 'File materiale (sourceFile) obbligatorio' }
        });
    }

    // Validazione tipo file domande (PDF o TXT)
    const questionsIsPdf = questionsFile.mimetype === 'application/pdf';
    const questionsIsTxt = questionsFile.mimetype === 'text/plain' || 
                           questionsFile.originalname.toLowerCase().endsWith('.txt');
    
    if (!questionsIsPdf && !questionsIsTxt) {
        return res.status(400).json({
            success: false,
            error: { message: 'File domande deve essere PDF o TXT' }
        });
    }

    // Validazione tipo file materiale (solo PDF)
    if (sourceFile.mimetype !== 'application/pdf') {
        return res.status(400).json({
            success: false,
            error: { message: 'File materiale deve essere un PDF' }
        });
    }

    // Limite dimensione file (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (questionsFile.size > maxSize) {
        return res.status(400).json({
            success: false,
            error: { message: 'File domande troppo grande. Massimo 10MB.' }
        });
    }
    if (sourceFile.size > maxSize) {
        return res.status(400).json({
            success: false,
            error: { message: 'File materiale troppo grande. Massimo 10MB.' }
        });
    }

    // Opzioni
    const deckId = req.body?.deckId || null;
    const title = req.body?.title || null;
    const goalId = req.body?.goalId || null;

    // Validazione opzioni
    if (!deckId && (!title || !goalId)) {
        return res.status(400).json({
            success: false,
            error: { 
                message: 'Se non specifichi deckId, devi fornire sia title che goalId per creare un nuovo deck' 
            }
        });
    }

    try {
        const result = await studyService.examSolver(
            req.tenantScope,
            questionsFile.path,
            sourceFile.path,
            { deckId, title, goalId }
        );

        console.log('✅ examSolver completato:', {
            questionsExtracted: result.stats.questionsExtracted,
            totalFlashcards: result.stats.totalFlashcards,
            processingTimeMs: result.stats.processingTimeMs
        });

        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error('❌ examSolver error:', err.message);
        throw err; // L'asyncHandler gestirà l'errore
    }
});

module.exports = {
    createDeck,
    updateDeck,
    deleteDeck,
    getDeckById,
    getSession,
    addCard,
    addCardAtPosition,
    updateCard,
    updateCardAnswer,
    deleteCard,
    reorderCards,
    getDashboard,
    completeSession,
    submitReview,
    verifyAnswer,
    uploadAndGenerate,
    chatWithTutor,
    answerExamQuestion,
    examSolver,
    extractQuestions,
    generateAnswers,
    updateDeckSettings,
    getDeckAnalytics,
    resetExamCards,
    generateRecoveryQuestions,
};
