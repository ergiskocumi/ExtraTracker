/**
 * PDF VALIDATOR
 *
 * Utility per validare file PDF prima del processing.
 * Controlla magic bytes, struttura base e integrità del file.
 */

const fs = require('fs').promises;
const logger = require('./logger');

/**
 * Verifica se un buffer è un PDF valido controllando il magic bytes header
 * @param {Buffer} buffer - Buffer del file PDF
 * @returns {boolean} true se è un PDF valido
 */
const isPdfValid = (buffer) => {
    if (!buffer || buffer.length < 5) {
        return false;
    }

    // Check PDF magic bytes: deve iniziare con "%PDF-1.x"
    const header = buffer.slice(0, 5).toString('ascii');
    return header === '%PDF-';
};

/**
 * Verifica se un buffer PDF contiene anche il footer %%EOF
 * @param {Buffer} buffer - Buffer del file PDF
 * @returns {boolean} true se contiene %%EOF
 */
const hasPdfEof = (buffer) => {
    if (!buffer || buffer.length < 1024) {
        return false;
    }

    // Controlla gli ultimi 1024 bytes per il marker %%EOF
    const lastBytes = buffer.slice(-1024).toString('ascii');
    return lastBytes.includes('%%EOF');
};

/**
 * Valida un file PDF completo
 * @param {string} filePath - Path del file PDF
 * @returns {Promise<{isValid: boolean, error?: string}>} Risultato validazione
 */
const validatePdfFile = async (filePath) => {
    try {
        // Leggi file
        const buffer = await fs.readFile(filePath);

        // Check 1: Magic bytes header
        if (!isPdfValid(buffer)) {
            return {
                isValid: false,
                error: 'File non è un PDF valido (magic bytes mancanti)',
            };
        }

        // Check 2: EOF marker
        if (!hasPdfEof(buffer)) {
            logger.warn('PdfValidator', 'PDF potrebbe essere corrotto (%%EOF mancante), procedo comunque');
            // Non blocchiamo, solo warning
        }

        // Check 3: Dimensione minima (PDF vuoto = ~200 bytes)
        if (buffer.length < 200) {
            return {
                isValid: false,
                error: 'File PDF troppo piccolo o corrotto',
            };
        }

        // Check 4: Contenuti potenzialmente pericolosi (JS embedded, azioni automatiche)
        const contentSample = buffer.slice(0, Math.min(buffer.length, 512 * 1024)).toString('ascii');
        const dangerousPatterns = [
            '/JavaScript',   // Embedded JS
            '/JS',           // Embedded JS (compact)
            '/Launch',       // Launch action
            '/SubmitForm',   // Form submission
            '/GoToE',        // Embedded file goto
            '/GoToR',        // Remote goto
            '/RichMedia',    // Rich media
        ];
        for (const pattern of dangerousPatterns) {
            if (contentSample.includes(pattern) && !contentSample.includes(`/${pattern} (valid)`) /* false positive guard */) {
                // Verifica se è un pattern reale (non dentro una stringa o commento)
                const idx = contentSample.indexOf(pattern);
                const context = contentSample.substring(Math.max(0, idx - 2), idx + pattern.length + 20);
                if (/\/JavaScript\s*[\n\r{]/.test(context) ||
                    /\/JS\s*[\n\r{]/.test(context) ||
                    /\/Launch\s*[\n\r{]/.test(context) ||
                    /\/SubmitForm\s*[\n\r{]/.test(context)) {
                    return {
                        isValid: false,
                        error: `PDF contiene contenuti potenzialmente pericolosi (${pattern.slice(1)})`,
                    };
                }
            }
        }

        return { isValid: true };

    } catch (err) {
        logger.error('PdfValidator', 'validatePdfFile error', err);
        return {
            isValid: false,
            error: `Errore durante la validazione: ${err.message}`,
        };
    }
};

/**
 * Valida un buffer PDF senza leggere da file
 * @param {Buffer} buffer - Buffer del file PDF
 * @returns {{isValid: boolean, error?: string}} Risultato validazione
 */
const validatePdfBuffer = (buffer) => {
    try {
        // Check 1: Magic bytes header
        if (!isPdfValid(buffer)) {
            return {
                isValid: false,
                error: 'File non è un PDF valido (magic bytes mancanti)',
            };
        }

        // Check 2: EOF marker (opzionale)
        if (!hasPdfEof(buffer)) {
            logger.warn('PdfValidator', 'PDF potrebbe essere corrotto (%%EOF mancante), procedo comunque');
        }

        // Check 3: Dimensione minima
        if (buffer.length < 200) {
            return {
                isValid: false,
                error: 'File PDF troppo piccolo o corrotto',
            };
        }

        // Check 4: Contenuti potenzialmente pericolosi
        const contentSample = buffer.slice(0, Math.min(buffer.length, 512 * 1024)).toString('ascii');
        const dangerousPatterns = ['/JavaScript', '/JS', '/Launch', '/SubmitForm', '/GoToE', '/GoToR', '/RichMedia'];
        for (const pattern of dangerousPatterns) {
            if (contentSample.includes(pattern)) {
                const idx = contentSample.indexOf(pattern);
                const context = contentSample.substring(Math.max(0, idx - 2), idx + pattern.length + 20);
                if (/\/JavaScript\s*[\n\r{]/.test(context) ||
                    /\/JS\s*[\n\r{]/.test(context) ||
                    /\/Launch\s*[\n\r{]/.test(context) ||
                    /\/SubmitForm\s*[\n\r{]/.test(context)) {
                    return {
                        isValid: false,
                        error: `PDF contiene contenuti potenzialmente pericolosi (${pattern.slice(1)})`,
                    };
                }
            }
        }

        return { isValid: true };

    } catch (err) {
        logger.error('PdfValidator', 'validatePdfBuffer error', err);
        return {
            isValid: false,
            error: `Errore durante la validazione: ${err.message}`,
        };
    }
};

/**
 * Estrae metadati base dal PDF (per debugging)
 * @param {Buffer} buffer - Buffer del file PDF
 * @returns {{version: string | null, isLinearized: boolean}} Metadati
 */
const extractPdfMetadata = (buffer) => {
    try {
        const header = buffer.slice(0, 20).toString('ascii');

        // Estrai versione PDF (es: "1.4", "1.7")
        const versionMatch = header.match(/%PDF-(\d+\.\d+)/);
        const version = versionMatch ? versionMatch[1] : null;

        // Check se è linearized (ottimizzato per web)
        const isLinearized = buffer.slice(0, 1024).toString('ascii').includes('/Linearized');

        return {
            version,
            isLinearized,
        };
    } catch (err) {
        logger.error('PdfValidator', 'extractPdfMetadata error', err);
        return {
            version: null,
            isLinearized: false,
        };
    }
};

module.exports = {
    isPdfValid,
    hasPdfEof,
    validatePdfFile,
    validatePdfBuffer,
    extractPdfMetadata,
};
