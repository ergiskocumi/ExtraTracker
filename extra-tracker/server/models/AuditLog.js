/**
 * 📊 AUDIT LOG MODEL
 * 
 * Traccia tutte le azioni di sicurezza per compliance e monitoring
 * GDPR compliant - dati necessari solo per sicurezza
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        // Utente coinvolto (può essere null per azioni non autenticate)
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: true,
            required: false,
        },
        
        // Email utente (per ricerca anche se utente eliminato)
        userEmail: {
            type: String,
            lowercase: true,
            index: true,
        },
        
        // Tipo di azione
        action: {
            type: String,
            required: true,
            enum: [
                'LOGIN_SUCCESS',
                'LOGIN_FAILURE',
                'LOGOUT',
                'LOGOUT_ALL',
                'TOKEN_REFRESH',
                'TOKEN_REVOKED',
                'PASSWORD_CHANGE',
                'PASSWORD_RESET_REQUEST',
                'PASSWORD_RESET_COMPLETE',
                '2FA_ENABLED',
                '2FA_DISABLED',
                '2FA_SETUP',
                '2FA_VERIFICATION',
                '2FA_BACKUP_USED',
                'REGISTER',
                'EMAIL_VERIFIED',
                'ACCOUNT_LOCKED',
                'ACCOUNT_UNLOCKED',
                'SUSPICIOUS_ACTIVITY',
                'DEVICE_TRUSTED',
                'DEVICE_REVOKED',
                'SESSION_EXPIRED',
            ],
            index: true,
        },
        
        // Dettagli azione
        description: {
            type: String,
            required: true,
        },
        
        // Informazioni richiesta
        ip: {
            type: String,
            required: false,
            default: 'unknown',
        },
        
        userAgent: {
            type: String,
            required: false,
            default: 'unknown',
        },
        
        // Fingerprint del dispositivo (hash)
        deviceFingerprint: {
            type: String,
            index: true,
        },
        
        // Geolocalizzazione (dal IP)
        location: {
            country: String,
            city: String,
            region: String,
            timezone: String,
            coordinates: {
                lat: Number,
                lon: Number,
            },
        },
        
        // Risultato
        success: {
            type: Boolean,
            required: true,
            index: true,
        },
        
        // Motivo fallimento (se success = false)
        failureReason: {
            type: String,
        },
        
        // ID sessione (se applicabile)
        sessionId: {
            type: String,
            index: true,
        },
        
        // Metadata extra (JSON)
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        
        // Severity (per alerting)
        severity: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            default: 'LOW',
            index: true,
        },
    },
    {
        timestamps: true,
        // TTL: elimina log dopo 2 anni (GDPR - retention limitata)
        expireAfterSeconds: 2 * 365 * 24 * 60 * 60,
    }
);

// TTL index per auto-eliminazione log dopo 2 anni (GDPR - retention limitata)
// Dichiarato esplicitamente perché expireAfterSeconds nelle schema options è ignorato da Mongoose
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });

// Index composti per query comuni
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ ip: 1, createdAt: -1 });
auditLogSchema.index({ success: 1, severity: 1, createdAt: -1 });

// Metodo statico per creare log
auditLogSchema.statics.createLog = async function(data) {
    try {
        return await this.create({
            ...data,
            createdAt: new Date(),
        });
    } catch (error) {
        console.error('❌ Errore creazione audit log:', error.message);
        // Non bloccare la richiesta se il logging fallisce
        return null;
    }
};

// Metodo per ottenere statistiche di login
auditLogSchema.statics.getLoginStats = async function(userId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return this.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                createdAt: { $gte: since },
                action: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILURE'] },
            },
        },
        {
            $group: {
                _id: '$success',
                count: { $sum: 1 },
                lastAttempt: { $max: '$createdAt' },
                ips: { $addToSet: '$ip' },
            },
        },
    ]);
};

// Metodo per rilevare attività sospetta
auditLogSchema.statics.detectSuspiciousActivity = async function(userId, currentIp, currentFingerprint) {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Trova login precedenti da IP diversi
    const recentLogins = await this.find({
        userId: new mongoose.Types.ObjectId(userId),
        action: 'LOGIN_SUCCESS',
        createdAt: { $gte: last7d },
        ip: { $ne: currentIp },
    }).select('ip location').lean();
    
    const uniqueIps = [...new Set(recentLogins.map(l => l.ip))];
    const uniqueCountries = [...new Set(recentLogins.map(l => l.location?.country).filter(Boolean))];
    
    // Se più di 3 IP diversi in 24h
    const ipChanges24h = await this.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        action: 'LOGIN_SUCCESS',
        createdAt: { $gte: last24h },
        ip: { $ne: currentIp },
    });
    
    return {
        isSuspicious: ipChanges24h > 3 || uniqueCountries.length > 2,
        riskFactors: {
            multipleIps24h: ipChanges24h > 3,
            multipleCountries: uniqueCountries.length > 2,
            newDevice: !currentFingerprint,
        },
        details: {
            uniqueIpsCount: uniqueIps.length,
            uniqueCountriesCount: uniqueCountries.length,
            previousCountries: uniqueCountries,
        },
    };
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
