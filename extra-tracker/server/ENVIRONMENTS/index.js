/**
 * 🔧 ENVIRONMENT LOADER
 * 
 * Carica la configurazione dell'ambiente corretto basandosi su NODE_ENV
 * o su una variabile ENVIRONMENT esplicita
 */

const devConfig = require('./environments');
const prodConfig = require('./environments.prod');

/**
 * Determina quale environment usare
 * Priorità:
 * 1. ENVIRONMENT (esplicito: 'development' o 'production')
 * 2. NODE_ENV === 'production' -> production
 * 3. Default: development
 */
const getEnvironment = () => {
    const explicitEnv = process.env.ENVIRONMENT;
    if (explicitEnv === 'production' || explicitEnv === 'prod') {
        return 'production';
    } else if (explicitEnv === 'development' || explicitEnv === 'dev') {
        return 'development';
    } else if (process.env.NODE_ENV === 'production') {
        // Fallback a NODE_ENV
        return 'production';
    } else {
        return 'development';
    }
};

const currentEnvironment = getEnvironment();
const config = currentEnvironment === 'production' ? prodConfig : devConfig;

// Validazione configurazione produzione
if (currentEnvironment === 'production') {
    const requiredVars = [
        'MONGO_URI',
        'JWT_SECRET',
        'FRONTEND_URL',
        'BACKEND_URL',
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.error('❌ ERRORE CRITICO: Variabili di ambiente mancanti per produzione:');
        missingVars.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error('📝 Configura tutte le variabili richieste nel file .env prima di avviare il server');
        process.exit(1);
    } else if (process.env.JWT_SECRET.length < 32) {
        // Validazione JWT_SECRET
        console.error('❌ ERRORE CRITICO: JWT_SECRET deve essere almeno 32 caratteri in produzione');
        console.error('📝 Genera un secret sicuro con: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
        process.exit(1);
    } else {
        // Configurazione produzione valida: nessuna azione richiesta.
    }
} else {
    // In sviluppo non servono validazioni bloccanti delle variabili richieste.
}

// Log ambiente corrente
console.log(`🔧 Environment: ${currentEnvironment}`);
console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 ENVIRONMENT: ${process.env.ENVIRONMENT || 'not set (using NODE_ENV)'}`);

module.exports = {
    config,
    environment: currentEnvironment,
    isProduction: currentEnvironment === 'production',
    isDevelopment: currentEnvironment === 'development',
};
