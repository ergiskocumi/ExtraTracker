/**
 * 📝 FRONTEND LOGGER UTILITY
 * ==========================
 * 
 * Wrapper per console.log che NON stampa mai nel browser.
 * Tutti i log vengono silenziati per evitare inquinamento della console.
 * 
 * IMPORTANTE: I log devono essere gestiti solo dal backend.
 * Questo file esiste solo per evitare errori quando il codice
 * cerca di usare console.log/error/warn.
 */

// Override globale di console per silenziare tutti i log nel browser
if (typeof window !== 'undefined') {
    // In produzione, silenzia completamente
    if (import.meta.env.PROD) {
        console.log = () => {};
        console.error = () => {};
        console.warn = () => {};
        console.info = () => {};
        console.debug = () => {};
    } else {
        // In sviluppo, mantieni solo gli errori critici
        const originalError = console.error;
        console.log = () => {};
        console.warn = () => {};
        console.info = () => {};
        console.debug = () => {};
        
        // Mantieni console.error solo per errori veramente critici
        // ma con un prefisso per distinguerli
        console.error = (...args: any[]) => {
            // Log solo errori che iniziano con [CRITICAL]
            if (args[0] && typeof args[0] === 'string' && args[0].includes('[CRITICAL]')) {
                originalError(...args);
            }
        };
    }
}

/**
 * Logger utility per il frontend
 * Non fa nulla, i log devono essere gestiti dal backend
 */
export const logger = {
    log: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
};
