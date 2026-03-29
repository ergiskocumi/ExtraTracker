/**
 * 📧 EMAIL SERVICE
 * 
 * Servizio per invio email transazionali:
 * - Verifica email
 * - Reset password
 * 
 * Supporta:
 * - Sviluppo: Ethereal (email di test)
 * - Produzione: SMTP configurabile (Gmail, SendGrid, etc.)
 */

const nodemailer = require('nodemailer');
const crypto = require('crypto');
const logger = require('../utils/logger');

// ==========================================
// CONFIGURAZIONE
// ==========================================

/**
 * Crea transporter email basato sull'ambiente
 */
const createTransporter = async () => {
    // In sviluppo, usa Ethereal (account di test gratuito)
    if (process.env.NODE_ENV !== 'production') {
        // Crea account Ethereal dinamicamente
        const testAccount = await nodemailer.createTestAccount();
        
        logger.info('EmailService', 'Email Test Account creato', {
            user: testAccount.user,
            pass: testAccount.pass,
        });
        
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }
    
    // In produzione, usa le variabili d'ambiente
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

// Transporter singleton
let transporter = null;

const getTransporter = async () => {
    if (!transporter) {
        transporter = await createTransporter();
    }
    return transporter;
};

// ==========================================
// GENERAZIONE TOKEN
// ==========================================

/**
 * Genera token sicuro per verifica/reset
 */
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Genera hash del token per storage sicuro
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

// ==========================================
// TEMPLATE EMAIL
// ==========================================

const getBaseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Silvi</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            color: #8b5cf6;
            margin: 0;
            font-size: 28px;
        }
        .content {
            text-align: center;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: white !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
        }
        .button:hover {
            opacity: 0.9;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #888;
            font-size: 12px;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 8px;
            padding: 12px;
            margin-top: 20px;
            font-size: 13px;
            color: #856404;
        }
        .code {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            font-family: monospace;
            font-size: 24px;
            letter-spacing: 3px;
            color: #8b5cf6;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>🎯 Silvi</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Silvi. Tutti i diritti riservati.</p>
            <p>Questa email è stata inviata automaticamente, non rispondere.</p>
        </div>
    </div>
</body>
</html>
`;

// ==========================================
// EMAIL TEMPLATES
// ==========================================

/**
 * Email di verifica
 */
const getVerificationEmailTemplate = (verifyUrl, userName) => {
    return getBaseTemplate(`
        <h2>Verifica il tuo indirizzo email</h2>
        <p>Ciao${userName ? ` ${userName}` : ''}!</p>
        <p>Grazie per esserti registrato su Silvi. Per completare la registrazione, verifica il tuo indirizzo email cliccando il pulsante qui sotto:</p>
        
        <a href="${verifyUrl}" class="button">Verifica Email</a>
        
        <p style="font-size: 14px; color: #666;">
            Oppure copia e incolla questo link nel browser:<br>
            <a href="${verifyUrl}" style="color: #8b5cf6; word-break: break-all;">${verifyUrl}</a>
        </p>
        
        <div class="warning">
            ⚠️ Questo link scade tra <strong>24 ore</strong>.<br>
            Se non hai richiesto questa email, puoi ignorarla.
        </div>
    `);
};

/**
 * Email di reset password
 */
const getPasswordResetTemplate = (resetUrl, userName) => {
    return getBaseTemplate(`
        <h2>Reset della Password</h2>
        <p>Ciao${userName ? ` ${userName}` : ''}!</p>
        <p>Hai richiesto il reset della password per il tuo account Silvi. Clicca il pulsante qui sotto per creare una nuova password:</p>
        
        <a href="${resetUrl}" class="button">Reimposta Password</a>
        
        <p style="font-size: 14px; color: #666;">
            Oppure copia e incolla questo link nel browser:<br>
            <a href="${resetUrl}" style="color: #8b5cf6; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <div class="warning">
            ⚠️ Questo link scade tra <strong>1 ora</strong>.<br>
            Se non hai richiesto il reset, ignora questa email. La tua password rimarrà invariata.
        </div>
    `);
};

/**
 * Email di conferma cambio password
 */
const getPasswordChangedTemplate = (userName) => {
    return getBaseTemplate(`
        <h2>Password Modificata</h2>
        <p>Ciao${userName ? ` ${userName}` : ''}!</p>
        <p>Ti confermiamo che la password del tuo account Silvi è stata modificata con successo.</p>
        
        <p style="margin-top: 20px;">📅 Data: <strong>${new Date().toLocaleString('it-IT')}</strong></p>
        
        <div class="warning">
            ⚠️ Se non sei stato tu a modificare la password, contattaci immediatamente.
        </div>
    `);
};

/**
 * Email aggiornamento feedback
 */
const getFeedbackUpdateTemplate = ({ userName, issueKey, title, statusLabel, comment, feedbackUrl }) => {
    const escapeHtml = (value) =>
        String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

    const commentBlock = comment
        ? `
            <div class="warning">
                <strong>Nuovo commento dal team:</strong><br>
                ${escapeHtml(comment).replace(/\n/g, '<br>')}
            </div>
        `
        : '';

    return getBaseTemplate(`
        <h2>Aggiornamento feedback</h2>
        <p>Ciao${userName ? ` ${userName}` : ''}!</p>
        <p>Il tuo ticket <strong>${issueKey}</strong> è stato aggiornato.</p>
        <p><strong>${title}</strong></p>
        <p>Stato attuale: <strong>${statusLabel}</strong></p>
        ${commentBlock}
        <a href="${feedbackUrl}" class="button">Apri i miei feedback</a>
        <p style="font-size: 14px; color: #666;">
            Se non riesci ad aprire il link, copia e incolla questo URL nel browser:<br>
            <a href="${feedbackUrl}" style="color: #8b5cf6; word-break: break-all;">${feedbackUrl}</a>
        </p>
    `);
};

// ==========================================
// SERVIZIO EMAIL
// ==========================================

class EmailService {
    /**
     * Invia email di verifica
     */
    async sendVerificationEmail(email, token) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
        const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
        
        const mailOptions = {
            from: `"Silvi" <${process.env.SMTP_FROM || 'noreply@silvi.com'}>`,
            to: email,
            subject: '✉️ Verifica il tuo indirizzo email - Silvi',
            html: getVerificationEmailTemplate(verifyUrl),
        };
        
        return this.sendEmail(mailOptions);
    }

    /**
     * Invia email di reset password
     */
    async sendPasswordResetEmail(email, token) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
        
        const mailOptions = {
            from: `"Silvi" <${process.env.SMTP_FROM || 'noreply@silvi.com'}>`,
            to: email,
            subject: '🔐 Reset Password - Silvi',
            html: getPasswordResetTemplate(resetUrl),
        };
        
        return this.sendEmail(mailOptions);
    }

    /**
     * Invia email di conferma cambio password
     */
    async sendPasswordChangedEmail(email) {
        const mailOptions = {
            from: `"Silvi" <${process.env.SMTP_FROM || 'noreply@silvi.com'}>`,
            to: email,
            subject: '✅ Password Modificata - Silvi',
            html: getPasswordChangedTemplate(),
        };
        
        return this.sendEmail(mailOptions);
    }

    /**
     * Invia email aggiornamento feedback
     */
    async sendFeedbackUpdateEmail({ to, userName, issueKey, title, status, comment }) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
        const feedbackUrl = `${frontendUrl}/settings?tab=feedback`;
        const statusLabels = {
            open: 'Aperto',
            in_progress: 'In lavorazione',
            resolved: 'Risolto',
            closed: 'Chiuso',
            wont_fix: 'Non verrà risolto',
        };
        const statusLabel = statusLabels[status] || status;
        const mailOptions = {
            from: `"Silvi" <${process.env.SMTP_FROM || 'noreply@silvi.com'}>`,
            to,
            subject: `Aggiornamento ticket ${issueKey} - Silvi`,
            html: getFeedbackUpdateTemplate({
                userName,
                issueKey,
                title,
                statusLabel,
                comment,
                feedbackUrl,
            }),
        };

        return this.sendEmail(mailOptions);
    }

    /**
     * Metodo base per invio email
     */
    async sendEmail(mailOptions) {
        try {
            const transport = await getTransporter();
            const info = await transport.sendMail(mailOptions);
            
            // In sviluppo, mostra URL per visualizzare email
            if (process.env.NODE_ENV !== 'production') {
                const previewUrl = nodemailer.getTestMessageUrl(info);
                logger.info('EmailService', 'Email inviata (test)', {
                    to: mailOptions.to,
                    subject: mailOptions.subject,
                    preview: previewUrl,
                });
                return { success: true, previewUrl };
            }
            
            logger.success('EmailService', `Email inviata a ${mailOptions.to}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            logger.error('EmailService', 'Errore invio email', error);
            throw error;
        }
    }
}

// Singleton
const emailService = new EmailService();

module.exports = {
    emailService,
    generateToken,
    hashToken,
};
