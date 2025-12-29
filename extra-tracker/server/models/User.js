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
