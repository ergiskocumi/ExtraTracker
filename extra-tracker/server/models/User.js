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

        // Refresh token hashato (per invalidazione)
        refreshTokenHash: {
            type: String,
            select: false,
        },

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
                delete ret.refreshTokenHash;
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
 * Trova utente per refresh token
 */
userSchema.statics.findByRefreshToken = function (userId) {
    return this.findOne({ _id: userId, isActive: true })
        .select('+refreshTokenHash');
};

const User = mongoose.model('User', userSchema);

module.exports = User;
