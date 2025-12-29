/**
 * 📝 VALIDATORI ZOD PER AUTENTICAZIONE
 * 
 * Perché Zod e non validazione manuale?
 * 1. Type-safe: genera tipi TypeScript automaticamente
 * 2. Composabile: puoi estendere e riutilizzare schemi
 * 3. Messaggi chiari: errori leggibili per il frontend
 * 4. Previene NoSQL Injection: valida tipi rigorosi
 */

const { z } = require('zod');

// ==========================================
// Schema Email Riutilizzabile
// ==========================================
const emailSchema = z
    .string({
        required_error: 'Email obbligatoria',
        invalid_type_error: 'Email deve essere una stringa',
    })
    .email('Formato email non valido')
    .min(5, 'Email troppo corta')
    .max(255, 'Email troppo lunga')
    .toLowerCase() // Normalizza a minuscolo
    .trim(); // Rimuovi spazi

// ==========================================
// Schema Password
// ==========================================
const passwordSchema = z
    .string({
        required_error: 'Password obbligatoria',
    })
    .min(8, 'Password deve essere almeno 8 caratteri')
    .max(128, 'Password troppo lunga (max 128 caratteri)')
    // Regex per sicurezza: almeno 1 maiuscola, 1 minuscola, 1 numero
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password deve contenere almeno: 1 maiuscola, 1 minuscola, 1 numero'
    );

// ==========================================
// Schema Registrazione
// ==========================================
const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    // Campo opzionale per GDPR: consenso esplicito
    acceptTerms: z
        .boolean({
            required_error: 'Devi accettare i termini e condizioni',
        })
        .refine((val) => val === true, {
            message: 'Devi accettare i termini e condizioni',
        }),
});

// ==========================================
// Schema Login
// ==========================================
const loginSchema = z.object({
    email: emailSchema,
    // Per login non validiamo complessità (l'utente potrebbe avere vecchia password)
    password: z
        .string({
            required_error: 'Password obbligatoria',
        })
        .min(1, 'Password obbligatoria')
        .max(128, 'Password troppo lunga'),
});

// ==========================================
// Schema Cambio Password
// ==========================================
const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Password attuale obbligatoria'),
        newPassword: passwordSchema,
        confirmPassword: z.string().min(1, 'Conferma password obbligatoria'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Le password non coincidono',
        path: ['confirmPassword'],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
        message: 'La nuova password deve essere diversa dalla precedente',
        path: ['newPassword'],
    });

// ==========================================
// Schema Reset Password Request
// ==========================================
const resetPasswordRequestSchema = z.object({
    email: emailSchema,
});

// ==========================================
// Schema Reset Password Confirm
// ==========================================
const resetPasswordConfirmSchema = z.object({
    token: z.string().min(1, 'Token obbligatorio'),
    newPassword: passwordSchema,
});

// ==========================================
// Funzione Helper per Validazione
// ==========================================

/**
 * Valida i dati con uno schema Zod
 * @param {z.ZodSchema} schema - Schema Zod
 * @param {object} data - Dati da validare
 * @returns {{ success: boolean, data?: object, errors?: array }}
 */
const validate = (schema, data) => {
    const result = schema.safeParse(data);
    
    if (result.success) {
        return { success: true, data: result.data };
    }
    
    // Formatta errori in modo leggibile
    const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
    }));
    
    return { success: false, errors };
};

/**
 * Middleware Express per validazione automatica
 * @param {z.ZodSchema} schema - Schema Zod
 */
const validateMiddleware = (schema) => {
    return (req, res, next) => {
        const result = validate(schema, req.body);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Errore di validazione',
                    code: 'VALIDATION_ERROR',
                    details: result.errors,
                },
            });
        }
        
        // Sostituisci req.body con dati validati e sanitizzati
        req.body = result.data;
        next();
    };
};

module.exports = {
    // Schemi
    registerSchema,
    loginSchema,
    changePasswordSchema,
    resetPasswordRequestSchema,
    resetPasswordConfirmSchema,
    // Helpers
    validate,
    validateMiddleware,
};
