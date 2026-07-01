/**
 * 📝 FRONTEND LOGGER UTILITY
 * ==========================
 *
 * Silenzia log non critici nel browser in produzione.
 * console.error rimane sempre attivo per diagnostica.
 */

// Override globale di console per silenziare log non critici nel browser
if (typeof window !== 'undefined') {
    if (import.meta.env.PROD) {
        console.log = () => {};
        console.warn = () => {};
        console.info = () => {};
        console.debug = () => {};
        // console.error MUST work — critical for debugging
    } else {
        console.log = () => {};
        console.warn = () => {};
        console.info = () => {};
        console.debug = () => {};
        // console.error kept intact for development diagnostics
    }
}

export const logger = {
    log: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
};
