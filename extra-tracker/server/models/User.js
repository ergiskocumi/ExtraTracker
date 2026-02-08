/**
 * 👤 MODELLO UTENTE MONGOOSE - Enhanced Security Version
 * 
 * Aggiornamenti:
 * - Campi 2FA/TOTP
 * - Trusted devices
 * - Password history
 * - Audit timestamps
 */

const mongoose = require('mongoose');
const argon2 = require('argon2');

const userSchema = new mongoose.Schema(
    {
        // Email: unico identificatore
        email: {
            type: String,
            required: [true, 'Email obbligatoria'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Formato email non valido'],
        },

        // Password: SEMPRE hashata
        password: {
            type: String,
            required: [true, 'Password obbligatoria'],
            select: false,
        },

        // Storico password (ultime 5 per prevenire riutilizzo)
        passwordHistory: [{
            hash: String,
            changedAt: { type: Date, default: Date.now },
        }],

        // Data ultimo cambio password
        passwordChangedAt: {
            type: Date,
            default: Date.now,
        },

        // Ruolo utente
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },

        // ==========================================
        // 2FA / TOTP
        // ==========================================
        twoFactorEnabled: {
            type: Boolean,
            default: false,
        },
        
        twoFactorSecret: {
            type: String,
            select: false, // Non includere nelle query di default
        },
        
        twoFactorBackupCodes: [{
            type: String,
            select: false,
        }],
        
        twoFactorSetupAt: {
            type: Date,
        },

        // ==========================================
        // TRUSTED DEVICES
        // ==========================================
        trustedDevices: [{
            fingerprint: {
                type: String,
                required: true,
            },
            name: String, // "Chrome su Windows", "iPhone Safari"
            browser: String,
            os: String,
            ip: String,
            trustedAt: {
                type: Date,
                default: Date.now,
            },
            lastUsedAt: {
                type: Date,
                default: Date.now,
            },
        }],

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
                type: String,
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
            theme: {
                type: String,
                enum: ['dark', 'light', 'system'],
                default: 'dark',
            },
            compactMode: {
                type: Boolean,
                default: false,
            },
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
                enum: ['dashboard', 'calendar', 'list'],
                default: 'dashboard',
            },
            weekStartsOn: {
                type: Number,
                min: 0,
                max: 6,
                default: 1, // Lunedì
            },
            workingDays: [{
                type: Number,
                min: 0,
                max: 6,
            }],
            // Preferenze notifiche
            notifications: {
                email: {
                    enabled: { type: Boolean, default: true },
                    weeklyReport: { type: Boolean, default: true },
                    projectUpdates: { type: Boolean, default: false },
                    securityAlerts: { type: Boolean, default: true }, // Nuovo
                },
                push: {
                    enabled: { type: Boolean, default: false },
                    dailyReminder: { type: Boolean, default: false },
                    reminderTime: { type: String, default: '09:00' },
                },
            },
        },

        // ==========================================
        // SESSION MANAGEMENT
        // ==========================================
        refreshTokens: [{
            hash: { type: String, required: true },
            jti: String,
            device: String,
            userAgent: String,
            ip: String,
            createdAt: { type: Date, default: Date.now },
            lastUsedAt: { type: Date, default: Date.now },
        }],

        gracePeriodTokens: [{
            hash: { type: String, required: true },
            expiresAt: { type: Date, required: true },
        }],

        maxSessions: {
            type: Number,
            default: 5,
        },

        // ==========================================
        // EMAIL VERIFICATION
        // ==========================================
        isEmailVerified: {
            type: Boolean,
            default: false,
        },

        emailVerificationToken: {
            type: String,
            select: false,
        },

        emailVerificationExpires: {
            type: Date,
            select: false,
        },

        // ==========================================
        // PASSWORD RESET
        // ==========================================
        passwordResetToken: {
            type: String,
            select: false,
        },

        passwordResetExpires: {
            type: Date,
            select: false,
        },

        // ==========================================
        // ACCOUNT SECURITY
        // ==========================================
        isActive: {
            type: Boolean,
            default: true,
        },

        isLocked: {
            type: Boolean,
            default: false,
        },

        lockUntil: {
            type: Date,
        },

        failedLoginAttempts: {
            type: Number,
            default: 0,
        },

        lastFailedLogin: {
            type: Date,
        },

        // ==========================================
        // GDPR & CONSENT
        // ==========================================
        consent: {
            termsAccepted: {
                type: Boolean,
                default: false,
            },
            termsAcceptedAt: {
                type: Date,
            },
            privacyVersion: {
                type: String,
                default: '1.0',
            },
            marketingEmails: {
                type: Boolean,
                default: false,
            },
            analyticsConsent: {
                type: Boolean,
                default: true,
            },
        },

        // Timestamps
        lastLoginAt: {
            type: Date,
        },

        lastLoginIp: {
            type: String,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        },

        updatedAt: {
            type: Date,
            default: Date.now,
        },

        // Soft delete per GDPR
        deletedAt: {
            type: Date,
            default: null,
        },

        deletedReason: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// ==========================================
// INDEXES
// ==========================================

// Index per query email (login)
userSchema.index({ email: 1 });

// Index per verifica email
userSchema.index({ emailVerificationToken: 1 });

// Index per password reset
userSchema.index({ passwordResetToken: 1 });

// Index per utenti attivi
userSchema.index({ isActive: 1, isEmailVerified: 1 });

// Index per trusted devices
userSchema.index({ 'trustedDevices.fingerprint': 1 });

// ==========================================
// METHODS
// ==========================================

/**
 * Trova utente per login (include campi nascosti)
 */
userSchema.statics.findForLogin = function(email) {
    return this.findOne({ email: email.toLowerCase() }).select('+password +twoFactorSecret +twoFactorBackupCodes');
};

/**
 * Trova utente da refresh token
 */
userSchema.statics.findByRefreshToken = function(userId) {
    return this.findById(userId).select('+refreshTokens +gracePeriodTokens +twoFactorEnabled +twoFactorSecret');
};

/**
 * Incrementa tentativi di login falliti
 */
userSchema.methods.incrementFailedAttempts = async function() {
    this.failedLoginAttempts += 1;
    this.lastFailedLogin = new Date();

    // Blocca account dopo 5 tentativi falliti
    if (this.failedLoginAttempts >= 5) {
        this.isLocked = true;
        this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minuti
    }

    await this.save();
};

/**
 * Resetta tentativi falliti
 */
userSchema.methods.resetFailedAttempts = async function() {
    this.failedLoginAttempts = 0;
    this.lastFailedLogin = undefined;
    this.isLocked = false;
    this.lockUntil = undefined;
    this.lastLoginAt = new Date();
    await this.save();
};

/**
 * Verifica se account è bloccato
 */
userSchema.methods.isAccountLocked = function() {
    if (!this.isLocked || !this.lockUntil) return false;
    
    // Sblocca automaticamente se lock è scaduto
    if (this.lockUntil < Date.now()) {
        this.isLocked = false;
        this.lockUntil = undefined;
        this.failedLoginAttempts = 0;
        return false;
    }
    
    return true;
};

/**
 * Trova sessione da hash
 */
userSchema.methods.findSessionByHash = function(hash) {
    if (!this.refreshTokens) return null;
    return this.refreshTokens.find(session => session.hash === hash);
};

/**
 * Trova in grace period
 */
userSchema.methods.findInGracePeriod = function(hash) {
    if (!this.gracePeriodTokens) return null;
    return this.gracePeriodTokens.find(token => token.hash === hash && token.expiresAt > Date.now());
};

/**
 * Rimuovi da grace period
 */
userSchema.methods.removeFromGracePeriod = async function(hash) {
    this.gracePeriodTokens = this.gracePeriodTokens.filter(
        token => token.hash !== hash
    );
    await this.save();
};

/**
 * Pulisci token scaduti dal grace period
 */
userSchema.methods.cleanExpiredGracePeriodTokens = function() {
    if (!this.gracePeriodTokens) return;
    this.gracePeriodTokens = this.gracePeriodTokens.filter(
        token => token.expiresAt > Date.now()
    );
};

/**
 * Rimuovi sessione da hash
 */
userSchema.methods.removeSessionByHash = async function(hash) {
    this.refreshTokens = this.refreshTokens.filter(
        session => session.hash !== hash
    );
    await this.save();
};

/**
 * Rimuovi tutte le sessioni
 */
userSchema.methods.removeAllSessions = async function() {
    this.refreshTokens = [];
    this.gracePeriodTokens = [];
    this.trustedDevices = []; // Revoca anche dispositivi trusted
    await this.save();
};

/**
 * Aggiungi dispositivo trusted
 */
userSchema.methods.addTrustedDevice = async function(deviceInfo) {
    // Rimuovi duplicati
    this.trustedDevices = this.trustedDevices.filter(
        d => d.fingerprint !== deviceInfo.fingerprint
    );
    
    // Aggiungi nuovo
    this.trustedDevices.push({
        ...deviceInfo,
        trustedAt: new Date(),
        lastUsedAt: new Date(),
    });
    
    // Mantieni solo ultimi 10 dispositivi
    if (this.trustedDevices.length > 10) {
        this.trustedDevices = this.trustedDevices.slice(-10);
    }
    
    await this.save();
};

/**
 * Verifica se dispositivo è trusted
 */
userSchema.methods.isTrustedDevice = function(fingerprint) {
    return this.trustedDevices.some(d => d.fingerprint === fingerprint);
};

/**
 * Revoca dispositivo trusted
 */
userSchema.methods.revokeTrustedDevice = async function(fingerprint) {
    this.trustedDevices = this.trustedDevices.filter(
        d => d.fingerprint !== fingerprint
    );
    await this.save();
};

/**
 * Aggiungi password allo storico
 */
userSchema.methods.addToPasswordHistory = async function(passwordHash) {
    this.passwordHistory.push({
        hash: passwordHash,
        changedAt: new Date(),
    });
    
    // Mantieni solo ultime 5
    if (this.passwordHistory.length > 5) {
        this.passwordHistory = this.passwordHistory.slice(-5);
    }
    
    this.passwordChangedAt = new Date();
    await this.save();
};

/**
 * Verifica se password è nello storico
 */
userSchema.methods.isPasswordInHistory = async function(password) {
    for (const entry of this.passwordHistory) {
        try {
            const isMatch = await argon2.verify(entry.hash, password);
            if (isMatch) return true;
        } catch {
            // Se l'hash è corrotto, ignora
            continue;
        }
    }
    return false;
};

/**
 * Soft delete (GDPR)
 */
userSchema.methods.softDelete = async function(reason) {
    this.deletedAt = new Date();
    this.deletedReason = reason;
    this.email = `deleted_${this._id}_${this.email}`; // Anonimizza email
    this.isActive = false;
    
    // Rimuovi dati sensibili
    this.password = undefined;
    this.refreshTokens = [];
    this.twoFactorSecret = undefined;
    this.twoFactorBackupCodes = [];
    this.trustedDevices = [];
    
    await this.save();
};

// ==========================================
// PRE/POST HOOKS
// ==========================================

// Aggiorna updatedAt prima di ogni save
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
