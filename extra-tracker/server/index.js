/**
 * 🚀 EXPRESS SERVER - PRODUCTION READY
 * 
 * Configurazione sicura con:
 * - Helmet (security headers)
 * - CORS configurato correttamente
 * - Cookie parser per HttpOnly cookies
 * - Rate limiting
 * - Error handling centralizzato
 * - HPP (HTTP Parameter Pollution protection)
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Config e Middleware
const securityConfig = require('./config/security');
const { initRedis, closeRedis } = require('./config/redis');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const logger = require('./utils/logger');

// Subscribers (Pattern Observer)
const { initializeSubscribers } = require('./subscribers/activitySubscriber');

// Queue e Metriche
const { initializeQueue, closeQueue } = require('./queues/activityQueue');
const eventMetrics = require('./utils/eventMetrics');

// Routes
const apiRoutes = require('./routes/api');
const goalsRoutes = require('./routes/goals');
const studyRoutes = require('./routes/study');
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const analyticsRoutes = require('./routes/analytics');
const dashboardRoutes = require('./routes/dashboard');
const sseRoutes = require('./routes/sse');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ==========================================
// 0. CORS - PRIMA DI TUTTO (anche prima di express parsing)
// ==========================================

// Handler CORS come primissima cosa - gestisce OPTIONS immediatamente
app.options('*', (req, res) => {
    const origin = req.headers.origin;
    logger.debug('CORS', `OPTIONS Preflight from: ${origin}`);
    
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Origin, X-Request-ID, Cookie');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    return res.status(200).end();
});

// Middleware CORS per tutte le altre richieste
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Origin, X-Request-ID, Cookie');
        res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');
    }
    
    next();
});

// ==========================================
// 1. SECURITY MIDDLEWARE
// ==========================================

// Helmet: imposta headers di sicurezza HTTP
app.use(helmet(securityConfig.helmet));

// HPP: previene HTTP Parameter Pollution
app.use(hpp());

// Trust proxy: fidati del primo hop del proxy (Nginx, AWS ELB, Cloudflare, Heroku, etc.)
// Questo rende req.ip automaticamente corretto e funziona meglio con rate limiting
// Valore 1 = fidati del primo proxy (sicuro per la maggior parte dei casi)
// In sviluppo, funziona anche con Vite proxy
app.set('trust proxy', 1);

// ==========================================
// 3. REQUEST ID MIDDLEWARE (per tracciamento errori)
// ==========================================

// Aggiunge request ID a ogni richiesta per tracciamento errori
app.use((req, res, next) => {
    const crypto = require('crypto');
    req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    next();
});

// ==========================================
// 3.5. REQUEST LOGGER (dopo request ID, prima delle routes)
// ==========================================

app.use(requestLogger);

// ==========================================
// 4. BODY PARSING
// ==========================================

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ==========================================
// 5. RATE LIMITING
// ==========================================

app.use('/api', generalLimiter);

// ==========================================
// 6. ROUTES
// ==========================================

// Static uploads (PDF, ecc.)
const uploadsDir = path.join(__dirname, 'uploads');
const pdfUploadsDir = path.join(uploadsDir, 'pdfs');
fs.mkdirSync(pdfUploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sse', sseRoutes);
app.use('/api', apiRoutes);
app.use('/api', goalsRoutes);
app.use('/api/study', studyRoutes);

app.get('/', (req, res) => {
    res.json({ 
        message: 'Silvi API',
        version: '0.0.1',
    });
});

// ==========================================
// 7. ERROR HANDLING
// ==========================================

// Gestione route non trovate (404) - DEVE essere prima del global error handler
app.all('*', (req, res, next) => {
    const AppError = require('./utils/AppError');
    next(new AppError(`Impossibile trovare ${req.originalUrl} su questo server!`, 404));
});

// GLOBAL ERROR HANDLER (Deve essere l'ultimo middleware!)
// Questo cattura TUTTI gli errori (da route, middleware, etc.)
app.use(errorHandler);

// ==========================================
// 8. DATABASE CONNECTION
// ==========================================

const MONGO_URI = process.env.MONGO_URI;

// Fail Secure: non tollerare credenziali mancanti
if (!MONGO_URI) {
    console.error('❌ ERRORE CRITICO: Variabile di ambiente MONGO_URI non configurata');
    console.error('📝 Configura MONGO_URI nel file .env prima di avviare il server');
    process.exit(1);
}

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
        });
        logger.success('Server', 'Connesso al database MongoDB');
    } catch (err) {
        logger.error('Server', 'Errore connessione database', err);
        if (isProduction) process.exit(1);
    }
};

// ==========================================
// 9. GRACEFUL SHUTDOWN
// ==========================================

const gracefulShutdown = async (signal) => {
    logger.warn('Server', `Ricevuto ${signal}. Chiusura graceful...`);
    try {
        // Chiudi queue gracefulmente
        await closeQueue();
        
        // Chiudi Redis
        await closeRedis();
        
        // Chiudi MongoDB
        await mongoose.connection.close();
        logger.success('Server', 'Connessione MongoDB chiusa');
        
        process.exit(0);
    } catch (err) {
        logger.error('Server', 'Errore shutdown', err);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==========================================
// 10. START SERVER
// ==========================================

const startServer = async () => {
    // Inizializza Redis (opzionale, fallback a memoria locale se non disponibile)
    await initRedis();
    
    // Connetti a MongoDB
    await connectDB();
    
    // Inizializza activity queue (con retry automatico)
    // Deve essere fatto dopo la connessione a Redis
    initializeQueue();
    
    // Inizializza subscribers (Pattern Observer)
    // Deve essere fatto dopo la connessione al DB
    initializeSubscribers();
    
    // Log metriche ogni 5 minuti (solo in sviluppo)
    if (process.env.NODE_ENV !== 'production') {
        setInterval(() => {
            const summary = eventMetrics.getSummary();
            logger.debug('EventMetrics', 'Summary', summary);
        }, 5 * 60 * 1000);
    }
    
    app.listen(PORT, () => {
        logger.success('Server', `Server in ascolto sulla porta ${PORT}`);
        logger.info('Server', `Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info('Server', 'Security: Helmet, CORS, Rate Limiting attivi');
        logger.info('Server', 'Event Bus: Pattern Observer attivo');
        logger.info('Server', 'Activity Queue: Retry automatico attivo');
        logger.info('Server', 'Event Metrics: Monitoring attivo');
    });
};

startServer();

module.exports = app;
