/**
 * 📝 LOGGER UTILITY
 * ================
 * 
 * Sistema di logging strutturato per il backend.
 * I log vengono stampati SOLO nel terminale del server, mai nel browser.
 */

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Colors
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    // Background
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
};

/**
 * Formatta il timestamp
 */
const getTimestamp = () => {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
};

/**
 * Formatta il contesto (controller/service)
 */
const formatContext = (context) => {
    if (!context) return '';
    return `[${context}]`;
};

/**
 * Formatta i dati aggiuntivi
 */
const formatData = (data) => {
    if (!data) return '';
    if (typeof data === 'string') return data;
    try {
        return JSON.stringify(data, null, 2);
    } catch {
        return String(data);
    }
};

/**
 * Logger principale
 */
class Logger {
    /**
     * Log di info (operazioni normali)
     */
    info(context, message, data = null) {
        const timestamp = getTimestamp();
        const contextStr = formatContext(context);
        const dataStr = data ? ` ${formatData(data)}` : '';
        
        console.log(
            `${colors.cyan}${timestamp}${colors.reset} ` +
            `${colors.bright}${colors.blue}INFO${colors.reset} ` +
            `${colors.dim}${contextStr}${colors.reset} ` +
            `${message}${dataStr}`
        );
    }

    /**
     * Log di success (operazioni completate con successo)
     */
    success(context, message, data = null) {
        const timestamp = getTimestamp();
        const contextStr = formatContext(context);
        const dataStr = data ? ` ${formatData(data)}` : '';
        
        console.log(
            `${colors.cyan}${timestamp}${colors.reset} ` +
            `${colors.bright}${colors.green}✓${colors.reset} ` +
            `${colors.dim}${contextStr}${colors.reset} ` +
            `${colors.green}${message}${colors.reset}${dataStr}`
        );
    }

    /**
     * Log di warning (situazioni anomale ma non critiche)
     */
    warn(context, message, data = null) {
        const timestamp = getTimestamp();
        const contextStr = formatContext(context);
        const dataStr = data ? ` ${formatData(data)}` : '';
        
        console.log(
            `${colors.cyan}${timestamp}${colors.reset} ` +
            `${colors.bright}${colors.yellow}⚠${colors.reset} ` +
            `${colors.dim}${contextStr}${colors.reset} ` +
            `${colors.yellow}${message}${colors.reset}${dataStr}`
        );
    }

    /**
     * Log di error (errori critici)
     */
    error(context, message, error = null) {
        const timestamp = getTimestamp();
        const contextStr = formatContext(context);
        
        let errorStr = '';
        if (error) {
            if (error instanceof Error) {
                errorStr = `\n${colors.red}Error: ${error.message}${colors.reset}`;
                if (error.stack) {
                    errorStr += `\n${colors.dim}${error.stack}${colors.reset}`;
                }
            } else {
                errorStr = ` ${formatData(error)}`;
            }
        }
        
        console.error(
            `${colors.cyan}${timestamp}${colors.reset} ` +
            `${colors.bright}${colors.red}✗ ERROR${colors.reset} ` +
            `${colors.dim}${contextStr}${colors.reset} ` +
            `${colors.red}${message}${colors.reset}${errorStr}`
        );
    }

    /**
     * Log di debug (solo in sviluppo)
     */
    debug(context, message, data = null) {
        if (process.env.NODE_ENV !== 'production') {
            const timestamp = getTimestamp();
            const contextStr = formatContext(context);
            const dataStr = data ? ` ${formatData(data)}` : '';
            
            console.log(
                `${colors.cyan}${timestamp}${colors.reset} ` +
                `${colors.bright}${colors.magenta}DEBUG${colors.reset} ` +
                `${colors.dim}${contextStr}${colors.reset} ` +
                `${colors.dim}${message}${colors.reset}${dataStr}`
            );
        }
    }

    /**
     * Log di richiesta HTTP
     */
    request(method, path, userId = null, statusCode = null, duration = null) {
        const timestamp = getTimestamp();
        const methodColor = {
            GET: colors.blue,
            POST: colors.green,
            PUT: colors.yellow,
            DELETE: colors.red,
            PATCH: colors.magenta,
        }[method] || colors.white;
        
        const statusColor = statusCode >= 500 ? colors.red :
                          statusCode >= 400 ? colors.yellow :
                          statusCode >= 200 ? colors.green : colors.white;
        
        let log = `${colors.cyan}${timestamp}${colors.reset} ` +
                  `${methodColor}${method}${colors.reset} ` +
                  `${path}`;
        
        if (userId) {
            log += ` ${colors.dim}(user: ${userId})${colors.reset}`;
        }
        
        if (statusCode !== null) {
            log += ` ${statusColor}${statusCode}${colors.reset}`;
        }
        
        if (duration !== null) {
            log += ` ${colors.dim}${duration}ms${colors.reset}`;
        }
        
        console.log(log);
    }
}

// Esporta un'istanza singleton
const logger = new Logger();

module.exports = logger;
