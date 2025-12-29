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
require('dotenv').config();

// Config e Middleware
const securityConfig = require('./config/security');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
const apiRoutes = require('./routes/api');
const goalsRoutes = require('./routes/goals');
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ==========================================
// 1. SECURITY MIDDLEWARE (prima di tutto!)
// ==========================================

// Helmet: imposta headers di sicurezza HTTP
app.use(helmet(securityConfig.helmet));

// HPP: previene HTTP Parameter Pollution
app.use(hpp());

// Trust proxy (se dietro nginx/cloudflare)
if (isProduction) {
    app.set('trust proxy', 1);
}

// ==========================================
// 2. CORS CONFIGURATION
// ==========================================

app.use(cors(securityConfig.cors));

// ==========================================
// 3. BODY PARSING
// ==========================================

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ==========================================
// 4. RATE LIMITING
// ==========================================

app.use('/api', generalLimiter);

// ==========================================
// 5. ROUTES
// ==========================================

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
app.use('/api', apiRoutes);
app.use('/api', goalsRoutes);

app.get('/', (req, res) => {
    res.json({ 
        message: 'Extra Tracker API',
        version: '1.0.0',
    });
});

// ==========================================
// 6. ERROR HANDLING
// ==========================================

app.use(notFoundHandler);
app.use(errorHandler);

// ==========================================
// 7. DATABASE CONNECTION
// ==========================================

const MONGO_URI = process.env.MONGO_URI || 
    'mongodb://admin:password123@localhost:27017/extra-tracker?authSource=admin';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
        });
        console.log('✅ Connesso al database MongoDB');
    } catch (err) {
        console.error('❌ Errore connessione database:', err.message);
        if (isProduction) process.exit(1);
    }
};

// ==========================================
// 8. GRACEFUL SHUTDOWN
// ==========================================

const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 Ricevuto ${signal}. Chiusura graceful...`);
    try {
        await mongoose.connection.close();
        console.log('✅ Connessione MongoDB chiusa');
        process.exit(0);
    } catch (err) {
        console.error('❌ Errore shutdown:', err);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==========================================
// 9. START SERVER
// ==========================================

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`
🚀 Server in ascolto sulla porta ${PORT}
📍 Environment: ${process.env.NODE_ENV || 'development'}
🔒 Security: Helmet, CORS, Rate Limiting attivi
        `);
    });
};

startServer();

module.exports = app;