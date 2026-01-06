/**
 * 👤 MODELLO UTENTE MONGOOSE
 * 
 * Principi GDPR applicati:
 * 1. Minimizzazione dati: solo email e password hashata
 * 2. Nessun tracciamento IP persistente
 * 3. Campo per consenso esplicito
 * 4. Timestamps per audit trail
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        // Email: unico identificatore (no username per privacy)
        email: {
            type: String,
            required: [true, 'Email obbligatoria'],
            unique: true,
            lowercase: true,
            trim: true,
            // Index per query veloci
            index: true,
            // Validazione formato (backup, Zod fa il lavoro principale)
            match: [/^\S+@\S+\.\S+$/, 'Formato email non valido'],
        },

        // Password: SEMPRE hashata, mai in chiaro
        password: {
            type: String,
            required: [true, 'Password obbligatoria'],
            // Non includere password nelle query di default
            select: false,
        },

        // ==========================================
        // PROFILO UTENTE
        // ==========================================
        profile: {
            firstName: {
                type: String,
                trim: true,
                maxlength: [50, 'Nome troppo lungo'],
            },
            lastName: {
                type: String,
                trim: true,
                maxlength: [50, 'Cognome troppo lungo'],
            },
            displayName: {
                type: String,
                trim: true,
                maxlength: [100, 'Nome visualizzato troppo lungo'],
            },
            phone: {
                type: String,
                trim: true,
            },
            bio: {
                type: String,
                maxlength: [500, 'Bio troppo lunga'],
            },
            avatar: {
                type: String, // URL avatar o base64
            },
            company: {
                type: String,
                trim: true,
                maxlength: [100, 'Nome azienda troppo lungo'],
            },
            jobTitle: {
                type: String,
                trim: true,
                maxlength: [100, 'Titolo professionale troppo lungo'],
            },
            location: {
                type: String,
                trim: true,
            },
            website: {
                type: String,
                trim: true,
            },
        },

        // ==========================================
        // PREFERENZE UTENTE
        // ==========================================
        preferences: {
            // Preferenze generali
            language: {
                type: String,
                enum: ['it', 'en', 'es', 'de', 'fr'],
                default: 'it',
            },
            timezone: {
                type: String,
                default: 'Europe/Rome',
            },
            dateFormat: {
                type: String,
                enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
                default: 'DD/MM/YYYY',
            },
            timeFormat: {
                type: String,
                enum: ['24h', '12h'],
                default: '24h',
            },
            
            // Preferenze valuta/pagamenti
            currency: {
                type: String,
                enum: ['EUR', 'USD', 'GBP', 'CHF'],
                default: 'EUR',
            },
            defaultHourlyRate: {
                type: Number,
                min: 0,
                default: 0,
            },
            
            // Preferenze tema/UI
            theme: {
                type: String,
                enum: ['dark', 'light', 'system'],
                default: 'dark',
            },
            compactMode: {
                type: Boolean,
                default: false,
            },
            
            // Preferenze dashboard
            dashboardLayout: {
                type: String,
                enum: ['default', 'compact', 'expanded'],
                default: 'default',
            },
            showMotivationalMessages: {
                type: Boolean,
                default: true,
            },
            defaultView: {
                type: String,
                enum: ['dashboard', 'timeline', 'goals'],
                default: 'dashboard',
            },
            
            // Preferenze lavoro
            weekStartsOn: {
                type: Number,
                enum: [0, 1], // 0 = Domenica, 1 = Lunedì
                default: 1,
            },
            workingDays: {
                type: [Number],
                default: [1, 2, 3, 4, 5], // Lun-Ven
            },
            dailyGoalHours: {
                type: Number,
                min: 0,
                max: 24,
                default: 8,
            },
            weeklyGoalHours: {
                type: Number,
                min: 0,
                max: 168,
                default: 40,
            },
        },

        // ==========================================
        // PREFERENZE NOTIFICHE
        // ==========================================
        notifications: {
            email: {
                enabled: {
                    type: Boolean,
                    default: true,
                },
                weeklyReport: {
                    type: Boolean,
                    default: true,
                },
                goalReminders: {
                    type: Boolean,
                    default: true,
                },
                projectUpdates: {
                    type: Boolean,
                    default: false,
                },
            },
            push: {
                enabled: {
                    type: Boolean,
                    default: false,
                },
                dailyReminder: {
                    type: Boolean,
                    default: false,
                },
                reminderTime: {
                    type: String,
                    default: '09:00',
                },
            },
        },

        // ==========================================
        // GAMIFICATION & STATS
        // ==========================================
        gamification: {
            xp: {
                type: Number,
                default: 0,
            },
            level: {
                type: Number,
                default: 1,
            },
            streak: {
                current: {
                    type: Number,
                    default: 0,
                },
                lastActivityDate: {
                    type: Date,
                    default: null,
                },
                best: {
                    type: Number,
                    default: 0,
                },
            },
            stats: {
                totalStudySessions: {
                    type: Number,
                    default: 0,
                },
                totalFlashcardsReviewed: {
                    type: Number,
                    default: 0,
                },
                correctAnswers: {
                    type: Number,
                    default: 0,
                },
            },
        },

        // Array di refresh tokens per supportare multi-device
        // Ogni elemento rappresenta una sessione attiva su un dispositivo
        refreshTokens: [{
            hash: {
                type: String,
                required: true,
            },
            device: {
                type: String,
                required: true,
                trim: true,
            },
            userAgent: {
                type: String,
                trim: true,
            },
            ip: {
                type: String,
                trim: true,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
            lastUsedAt: {
                type: Date,
                default: Date.now,
            },
        }],

        // Grace period tokens: token vecchi ancora validi per breve periodo
        // Previene race conditions durante refresh token rotation
        // Formato: [{ hash: String, expiresAt: Date }]
        gracePeriodTokens: [{
            hash: {
                type: String,
                required: true,
            },
            expiresAt: {
                type: Date,
                required: true,
            },
        }],

        // Stato account
        isActive: {
            type: Boolean,
            default: true,
        },

        // Verifica email (opzionale, consigliato per produzione)
        isEmailVerified: {
            type: Boolean,
            default: false,
        },

        // Token per verifica email
        emailVerificationToken: {
            type: String,
            select: false,
        },
        emailVerificationExpires: {
            type: Date,
            select: false,
        },

        // Token per reset password
        passwordResetToken: {
            type: String,
            select: false,
        },

        passwordResetExpires: {
            type: Date,
            select: false,
        },

        // GDPR: Consenso esplicito con timestamp
        consent: {
            termsAccepted: {
                type: Boolean,
                required: true,
            },
            termsAcceptedAt: {
                type: Date,
                required: true,
            },
            // Privacy policy version accettata
            privacyVersion: {
                type: String,
                default: '1.0',
            },
        },

        // Ultimo login (per audit, senza IP)
        lastLoginAt: {
            type: Date,
        },

        // Contatore tentativi login falliti (per lockout)
        failedLoginAttempts: {
            type: Number,
            default: 0,
            select: false,
        },

        // Lockout fino a questa data
        lockUntil: {
            type: Date,
            select: false,
        },
    },
    {
        // Timestamps automatici (createdAt, updatedAt)
        timestamps: true,

        // Virtual fields non salvati nel DB
        toJSON: {
            virtuals: true,
            // Rimuovi campi sensibili quando converti in JSON
            transform: (doc, ret) => {
                delete ret.password;
                delete ret.refreshTokens;  // Array di sessioni sensibile
                delete ret.gracePeriodTokens;  // Grace period tokens sensibili
                delete ret.__v;
                delete ret.failedLoginAttempts;
                delete ret.lockUntil;
                delete ret.passwordResetToken;
                delete ret.passwordResetExpires;
                delete ret.emailVerificationToken;
                delete ret.emailVerificationExpires;
                return ret;
            },
        },
    }
);

// ==========================================
// PRE-SAVE HOOK: Limite FIFO Sessioni
// ==========================================

/**
 * Pre-save hook: garantisce che l'array refreshTokens non superi mai il limite
 * Previene DoS e crescita infinita dell'array
 */
userSchema.pre('save', function (next) {
    if (!this.refreshTokens || this.refreshTokens.length === 0) {
        return next();
    }

    const { MAX_ACTIVE_SESSIONS } = require('../config/security');
    
    // Se supera il limite, rimuovi le sessioni più vecchie (FIFO)
    if (this.refreshTokens.length > MAX_ACTIVE_SESSIONS) {
        // Ordina per lastUsedAt (più vecchia prima)
        this.refreshTokens.sort((a, b) => {
            const dateA = new Date(a.lastUsedAt || a.createdAt);
            const dateB = new Date(b.lastUsedAt || b.createdAt);
            return dateA - dateB;
        });
        
        // Mantieni solo le MAX_ACTIVE_SESSIONS più recenti
        this.refreshTokens = this.refreshTokens.slice(-MAX_ACTIVE_SESSIONS);
    }

    next();
});

// ==========================================
// INDEXES
// ==========================================

// Index composto per query frequenti
userSchema.index({ email: 1, isActive: 1 });

// ==========================================
// VIRTUAL FIELDS
// ==========================================

// Verifica se account è bloccato
userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Incrementa tentativi login falliti
 */
userSchema.methods.incrementFailedAttempts = async function () {
    // Se lockout è scaduto, resetta
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { failedLoginAttempts: 1 },
            $unset: { lockUntil: 1 },
        });
    }

    // Incrementa contatore
    const updates = { $inc: { failedLoginAttempts: 1 } };

    // Se raggiunti 5 tentativi, blocca per 15 minuti
    if (this.failedLoginAttempts + 1 >= 5) {
        updates.$set = { lockUntil: Date.now() + 15 * 60 * 1000 };
    }

    return this.updateOne(updates);
};

/**
 * Resetta tentativi falliti dopo login riuscito
 */
userSchema.methods.resetFailedAttempts = async function () {
    return this.updateOne({
        $set: { failedLoginAttempts: 0, lastLoginAt: new Date() },
        $unset: { lockUntil: 1 },
    });
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Trova utente per login (include campi nascosti)
 */
userSchema.statics.findForLogin = function (email) {
    return this.findOne({ email, isActive: true })
        .select('+password +failedLoginAttempts +lockUntil');
};

/**
 * Trova utente per refresh token (include array refreshTokens e gracePeriodTokens)
 */
userSchema.statics.findByRefreshToken = function (userId) {
    return this.findOne({ _id: userId, isActive: true })
        .select('+refreshTokens +gracePeriodTokens');
};

/**
 * Trova token nel grace period (per gestire race conditions)
 */
userSchema.methods.findInGracePeriod = function (tokenHash) {
    if (!this.gracePeriodTokens || this.gracePeriodTokens.length === 0) {
        return null;
    }
    // Cerca token e verifica che non sia scaduto
    const graceToken = this.gracePeriodTokens.find(
        gt => gt.hash === tokenHash && gt.expiresAt > new Date()
    );
    return graceToken || null;
};

/**
 * Aggiungi token al grace period (durata in millisecondi, default 30 secondi)
 */
userSchema.methods.addToGracePeriod = async function (tokenHash, gracePeriodMs = 30000) {
    if (!this.gracePeriodTokens) {
        this.gracePeriodTokens = [];
    }
    
    // Rimuovi eventuali token scaduti prima di aggiungere
    this.cleanExpiredGracePeriodTokens();
    
    // Aggiungi nuovo token al grace period
    this.gracePeriodTokens.push({
        hash: tokenHash,
        expiresAt: new Date(Date.now() + gracePeriodMs),
    });
    
    return this.save();
};

/**
 * Rimuovi token dal grace period
 */
userSchema.methods.removeFromGracePeriod = async function (tokenHash) {
    if (!this.gracePeriodTokens) {
        return this;
    }
    
    this.gracePeriodTokens = this.gracePeriodTokens.filter(
        gt => gt.hash !== tokenHash
    );
    
    return this.save();
};

/**
 * Pulisci token scaduti dal grace period
 */
userSchema.methods.cleanExpiredGracePeriodTokens = function () {
    if (!this.gracePeriodTokens) {
        return;
    }
    
    const now = new Date();
    this.gracePeriodTokens = this.gracePeriodTokens.filter(
        gt => gt.expiresAt > now
    );
};

/**
 * Trova sessione specifica per hash token
 */
userSchema.methods.findSessionByHash = function (tokenHash) {
    if (!this.refreshTokens || this.refreshTokens.length === 0) {
        return null;
    }
    return this.refreshTokens.find(session => session.hash === tokenHash);
};

/**
 * Rimuovi sessione specifica per hash token
 */
userSchema.methods.removeSessionByHash = async function (tokenHash) {
    this.refreshTokens = this.refreshTokens.filter(
        session => session.hash !== tokenHash
    );
    return this.save();
};

/**
 * Rimuovi tutte le sessioni (logout da tutti i dispositivi)
 */
userSchema.methods.removeAllSessions = async function () {
    this.refreshTokens = [];
    return this.save();
};

/**
 * Aggiorna lastUsedAt per una sessione
 */
userSchema.methods.updateSessionLastUsed = async function (tokenHash) {
    const session = this.findSessionByHash(tokenHash);
    if (session) {
        session.lastUsedAt = new Date();
        return this.save();
    }
    return this;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
