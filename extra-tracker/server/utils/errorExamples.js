/**
 * 📚 ESEMPI DI UTILIZZO DEL SISTEMA ERRORI CENTRALIZZATO
 * 
 * Questo file contiene esempi pratici di come usare AppError
 * in diversi scenari comuni.
 * 
 * NON importare questo file in produzione - è solo per riferimento!
 */

const AppError = require('./AppError');

// ==========================================
// ESEMPI BASE
// ==========================================

/**
 * Esempio 1: Errore di validazione semplice
 */
function exampleValidation() {
    // Validazione campo email
    if (!email || !email.includes('@')) {
        throw AppError.validation('Email non valida', {
            field: 'email',
            value: email,
        });
    }
}

/**
 * Esempio 2: Errore con metadata e suggerimento
 */
function exampleWithMetadata() {
    throw AppError.notFound('Progetto', {
        metadata: {
            projectId: '123',
            userId: '456',
        },
        suggestion: 'Verifica che il progetto esista e che tu abbia accesso',
    });
}

/**
 * Esempio 3: Errore wrapping errore originale
 */
async function exampleWrappingError() {
    try {
        await someDatabaseOperation();
    } catch (error) {
        // Wrappare errore originale per logging
        throw AppError.database(
            'Impossibile salvare i dati',
            error, // Errore originale
            {
                metadata: {
                    operation: 'saveProject',
                    projectId: projectId,
                },
            }
        );
    }
}

// ==========================================
// ESEMPI PER CATEGORIE
// ==========================================

/**
 * Esempio: Errore autenticazione
 */
function exampleAuth() {
    if (!user) {
        throw AppError.unauthorized('Email o password non corretti', {
            metadata: {
                email: email, // Loggato ma non inviato al client
            },
        });
    }
}

/**
 * Esempio: Errore autorizzazione
 */
function exampleAuthorization() {
    if (user.id !== resource.ownerId) {
        throw AppError.forbidden('Non hai i permessi per questa azione', {
            metadata: {
                userId: user.id,
                resourceId: resource.id,
                requiredOwnerId: resource.ownerId,
            },
        });
    }
}

/**
 * Esempio: Errore conflitto (duplicato)
 */
function exampleConflict() {
    if (existingUser) {
        throw AppError.conflict('Email già registrata', {
            metadata: {
                email: email,
            },
        });
    }
}

/**
 * Esempio: Errore rate limit
 */
function exampleRateLimit() {
    if (attempts > MAX_ATTEMPTS) {
        throw AppError.tooManyRequests(
            'Troppi tentativi di login. Account temporaneamente bloccato.',
            15 * 60, // retryAfter in secondi
            {
                metadata: {
                    attempts: attempts,
                    ip: req.ip,
                },
            }
        );
    }
}

// ==========================================
// ESEMPI PER SERVIZI ESTERNI
// ==========================================

/**
 * Esempio: Errore API esterna (OpenAI, etc.)
 */
async function exampleExternalAPI() {
    try {
        await openai.chat.completions.create({ model: 'gpt-4', messages: [] });
    } catch (error) {
        throw AppError.externalAPI(
            'OpenAI',
            'Errore nel servizio AI',
            error,
            {
                metadata: {
                    model: 'gpt-4',
                    promptLength: prompt.length,
                },
            }
        );
    }
}

/**
 * Esempio: Errore upload file
 */
function exampleFileUpload() {
    if (file.size > MAX_FILE_SIZE) {
        throw AppError.fileUpload(
            'File troppo grande',
            {
                sizeExceeded: true,
                maxSize: MAX_FILE_SIZE,
                actualSize: file.size,
            },
            {
                metadata: {
                    fileName: file.name,
                    mimeType: file.mimetype,
                },
            }
        );
    }
}

/**
 * Esempio: Errore email
 */
async function exampleEmail() {
    try {
        await transporter.sendMail({ to: user.email, subject: 'Verifica Email', html: '<p>Clicca per verificare</p>' });
    } catch (error) {
        throw AppError.email(
            'Impossibile inviare l\'email di verifica',
            error,
            {
                metadata: {
                    recipient: user.email,
                    emailType: 'verification',
                },
            }
        );
    }
}

// ==========================================
// ESEMPI CON REQUEST ID
// ==========================================

/**
 * Esempio: Aggiungere request ID manualmente
 */
function exampleWithRequestId(req) {
    const error = AppError.internal({}, null, {
        requestId: req.requestId, // Aggiunto automaticamente dal middleware
    });
    throw error;
}

// ==========================================
// ESEMPI METADATA DINAMICI
// ==========================================

/**
 * Esempio: Aggiungere metadata dopo creazione errore
 */
function exampleAddMetadata() {
    const error = AppError.notFound('Risorsa');
    
    // Aggiungi metadata dinamicamente
    error
        .addMetadata('userId', req.user.id)
        .addMetadata('resourceType', 'project')
        .addMetadata('action', 'delete')
        .setRequestId(req.requestId);
    
    throw error;
}

// ==========================================
// ESEMPI ERROR HANDLING NEL CONTROLLER
// ==========================================

/**
 * Esempio: Controller con error handling
 */
async function exampleController(req, res, next) {
    try {
        const { id } = req.params;
        const project = await Project.findById(id);
        
        if (!project) {
            return next(AppError.notFound('Progetto', {
                metadata: { projectId: id },
            }));
        }
        
        if (project.userId.toString() !== req.user.id) {
            return next(AppError.forbidden('Non puoi modificare questo progetto'));
        }
        
        // ... logica ...
        
        res.json({ success: true, data: project });
    } catch (error) {
        // Se è già un AppError, passa al global handler
        if (error instanceof AppError) {
            return next(error);
        }
        
        // Altrimenti, wrappa come errore interno
        return next(AppError.internal({}, error, {
            metadata: {
                endpoint: req.path,
                method: req.method,
            },
        }));
    }
}

// ==========================================
// ESEMPI VALIDAZIONE CON DETTAGLI
// ==========================================

/**
 * Esempio: Validazione con multiple errori
 */
function exampleValidationMultiple() {
    const errors = [];
    
    if (!email) errors.push({ field: 'email', message: 'Email obbligatoria' });
    if (!password) errors.push({ field: 'password', message: 'Password obbligatoria' });
    if (password && password.length < 8) {
        errors.push({ field: 'password', message: 'Password deve essere almeno 8 caratteri' });
    }
    
    if (errors.length > 0) {
        throw AppError.validation('Dati non validi', {
            errors, // Array di errori per campo
        });
    }
}

// ==========================================
// ESEMPI CATEGORIE ERRORI
// ==========================================

/**
 * Esempio: Usare categorie per filtering
 */
function exampleCategories() {
    // Tutti gli errori hanno una categoria
    const error = AppError.validation('Email non valida');
    console.log(error.category); // 'VALIDATION'
    
    // Categorie disponibili:
    // - AppError.CATEGORIES.VALIDATION
    // - AppError.CATEGORIES.AUTHENTICATION
    // - AppError.CATEGORIES.AUTHORIZATION
    // - AppError.CATEGORIES.NOT_FOUND
    // - AppError.CATEGORIES.CONFLICT
    // - AppError.CATEGORIES.RATE_LIMIT
    // - AppError.CATEGORIES.DATABASE
    // - AppError.CATEGORIES.NETWORK
    // - AppError.CATEGORIES.EXTERNAL_API
    // - AppError.CATEGORIES.FILE_UPLOAD
    // - AppError.CATEGORIES.EMAIL
    // - AppError.CATEGORIES.INTERNAL
}

module.exports = {
    // Esporta solo per riferimento, non usare in produzione
    exampleValidation,
    exampleWithMetadata,
    exampleWrappingError,
    exampleAuth,
    exampleAuthorization,
    exampleConflict,
    exampleRateLimit,
    exampleExternalAPI,
    exampleFileUpload,
    exampleEmail,
    exampleWithRequestId,
    exampleAddMetadata,
    exampleController,
    exampleValidationMultiple,
    exampleCategories,
};
