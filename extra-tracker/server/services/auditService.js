/**
 * 📊 AUDIT SERVICE
 * 
 * Centralizza la gestione dei log di sicurezza
 * Integrazione con geolocalizzazione e device fingerprinting
 */

const AuditLog = require('../models/AuditLog');
const geoip = require('geoip-lite');
const { UAParser } = require('ua-parser-js');
const logger = require('../utils/logger');

class AuditService {
    /**
     * Crea un log di audit
     */
    async log(data) {
        const {
            userId,
            userEmail,
            action,
            description,
            ip,
            userAgent,
            deviceFingerprint,
            success,
            failureReason,
            sessionId,
            metadata = {},
        } = data;

        // Ottieni geolocalizzazione
        const location = this.getLocation(ip);
        
        // Parse user agent
        const uaInfo = this.parseUserAgent(userAgent);

        // Determina severity
        const severity = this.calculateSeverity(action, success);

        return AuditLog.createLog({
            userId,
            userEmail,
            action,
            description,
            ip,
            userAgent,
            deviceFingerprint,
            location,
            success,
            failureReason,
            sessionId,
            metadata: {
                ...metadata,
                deviceInfo: uaInfo,
            },
            severity,
        });
    }

    /**
     * Ottieni geolocalizzazione da IP
     */
    getLocation(ip) {
        try {
            // Gestisci IP undefined/null
            if (!ip) return null;

            // Sanitizza IP (rimuovi IPv6 prefix)
            const cleanIp = ip.replace('::ffff:', '');
            
            // Non tracciare IP locali
            if (this.isLocalIp(cleanIp)) {
                return {
                    country: 'Local',
                    city: 'Local',
                    region: 'Local',
                };
            }

            const geo = geoip.lookup(cleanIp);
            
            if (!geo) {
                return null;
            }

            return {
                country: geo.country,
                city: geo.city,
                region: geo.region,
                timezone: geo.timezone,
                coordinates: {
                    lat: geo.ll?.[0],
                    lon: geo.ll?.[1],
                },
            };
        } catch (error) {
            logger.error('AuditService', 'Errore geolocalizzazione: ' + error.message);
            return null;
        }
    }

    /**
     * Parse user agent per info dispositivo
     */
    parseUserAgent(userAgent) {
        try {
            if (!userAgent) return null;
            const parser = new UAParser(userAgent);
            return {
                browser: parser.getBrowser(),
                os: parser.getOS(),
                device: parser.getDevice(),
                engine: parser.getEngine(),
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Verifica se IP è locale
     */
    isLocalIp(ip) {
        if (!ip) return true;
        
        const localRanges = [
            '127.0.0.1',
            'localhost',
            '::1',
            '10.',
            '192.168.',
            '172.16.',
            '172.17.',
            '172.18.',
            '172.19.',
            '172.20.',
            '172.21.',
            '172.22.',
            '172.23.',
            '172.24.',
            '172.25.',
            '172.26.',
            '172.27.',
            '172.28.',
            '172.29.',
            '172.30.',
            '172.31.',
        ];
        
        return localRanges.some(range => ip.startsWith(range) || ip === range);
    }

    /**
     * Calcola severity dell'evento
     */
    calculateSeverity(action, success) {
        const criticalActions = [
            'PASSWORD_CHANGE',
            '2FA_ENABLED',
            '2FA_DISABLED',
            'SUSPICIOUS_ACTIVITY',
            'ACCOUNT_LOCKED',
        ];
        
        const highActions = [
            'LOGIN_FAILURE',
            'PASSWORD_RESET_COMPLETE',
            'DEVICE_REVOKED',
            'LOGOUT_ALL',
        ];

        if (criticalActions.includes(action)) {
            return 'CRITICAL';
        }
        
        if (highActions.includes(action)) {
            return success ? 'MEDIUM' : 'HIGH';
        }
        
        if (!success) {
            return 'MEDIUM';
        }
        
        return 'LOW';
    }

    /**
     * Log specifici per azioni comuni
     */
    async logLogin({ userId, userEmail, ip, userAgent, deviceFingerprint, success, failureReason, sessionId }) {
        return this.log({
            userId,
            userEmail,
            action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
            description: success ? 'Login effettuato con successo' : `Login fallito: ${failureReason}`,
            ip,
            userAgent,
            deviceFingerprint,
            success,
            failureReason,
            sessionId,
        });
    }

    async logLogout({ userId, userEmail, ip, userAgent, sessionId, allDevices = false }) {
        return this.log({
            userId,
            userEmail,
            action: allDevices ? 'LOGOUT_ALL' : 'LOGOUT',
            description: allDevices ? 'Logout da tutti i dispositivi' : 'Logout effettuato',
            ip,
            userAgent,
            success: true,
            sessionId,
        });
    }

    async logPasswordChange({ userId, userEmail, ip, userAgent, success, failureReason }) {
        return this.log({
            userId,
            userEmail,
            action: 'PASSWORD_CHANGE',
            description: 'Cambio password',
            ip,
            userAgent,
            success,
            failureReason,
            severity: 'CRITICAL',
        });
    }

    async log2FA({ userId, userEmail, action, ip, userAgent, success, failureReason, metadata = {} }) {
        const descriptions = {
            '2FA_ENABLED': 'Autenticazione a due fattori abilitata',
            '2FA_DISABLED': 'Autenticazione a due fattori disabilitata',
            '2FA_SETUP': 'Setup 2FA iniziato',
            '2FA_VERIFICATION': 'Verifica codice 2FA',
            '2FA_BACKUP_USED': 'Codice di backup 2FA utilizzato',
        };

        return this.log({
            userId,
            userEmail,
            action,
            description: descriptions[action] || 'Azione 2FA',
            ip,
            userAgent,
            success,
            failureReason,
            metadata,
            severity: 'CRITICAL',
        });
    }

    async logSuspiciousActivity({ userId, userEmail, ip, userAgent, reason, metadata = {} }) {
        return this.log({
            userId,
            userEmail,
            action: 'SUSPICIOUS_ACTIVITY',
            description: `Attività sospetta rilevata: ${reason}`,
            ip,
            userAgent,
            success: false,
            metadata,
            severity: 'CRITICAL',
        });
    }

    /**
     * Ottieni storico login per utente
     */
    async getUserLoginHistory(userId, options = {}) {
        const { limit = 50, skip = 0, startDate, endDate } = options;
        
        const query = { userId };
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        return AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
    }

    /**
     * Ottieni statistiche sicurezza per utente
     */
    async getUserSecurityStats(userId) {
        const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const stats = await AuditLog.aggregate([
            {
                $match: {
                    userId: new require('mongoose').Types.ObjectId(userId),
                    createdAt: { $gte: last30Days },
                },
            },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 },
                    successes: { $sum: { $cond: ['$success', 1, 0] } },
                    failures: { $sum: { $cond: ['$success', 0, 1] } },
                    uniqueIps: { $addToSet: '$ip' },
                    lastOccurrence: { $max: '$createdAt' },
                },
            },
        ]);

        // Formatta risultati
        const formatted = {
            totalEvents: 0,
            loginAttempts: { success: 0, failure: 0 },
            passwordChanges: 0,
            twoFactorEvents: 0,
            suspiciousActivities: 0,
            uniqueIps: new Set(),
        };

        stats.forEach(stat => {
            formatted.totalEvents += stat.count;
            
            if (stat._id === 'LOGIN_SUCCESS') {
                formatted.loginAttempts.success = stat.count;
            } else if (stat._id === 'LOGIN_FAILURE') {
                formatted.loginAttempts.failure = stat.count;
            } else if (stat._id === 'PASSWORD_CHANGE') {
                formatted.passwordChanges = stat.count;
            } else if (stat._id.startsWith('2FA')) {
                formatted.twoFactorEvents += stat.count;
            } else if (stat._id === 'SUSPICIOUS_ACTIVITY') {
                formatted.suspiciousActivities = stat.count;
            }

            stat.uniqueIps.forEach(ip => formatted.uniqueIps.add(ip));
        });

        formatted.uniqueIps = formatted.uniqueIps.size;
        formatted.failureRate = formatted.totalEvents > 0 
            ? ((formatted.loginAttempts.failure / (formatted.loginAttempts.success + formatted.loginAttempts.failure)) * 100).toFixed(2)
            : 0;

        return formatted;
    }

    /**
     * Rileva attività sospetta per utente
     */
    async detectSuspiciousActivity(userId, currentIp, currentFingerprint) {
        return AuditLog.detectSuspiciousActivity(userId, currentIp, currentFingerprint);
    }
}

module.exports = new AuditService();
