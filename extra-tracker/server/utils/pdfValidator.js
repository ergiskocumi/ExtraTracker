/**
 * PDF VALIDATOR
 *
 * Utility per validare file PDF prima del processing.
 * Controlla magic bytes, struttura base e integrità del file.
 */

const fs = require('fs').promises;

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
            console.warn('⚠️ PDF potrebbe essere corrotto (%%EOF mancante), ma procedo...');
            // Non blocchiamo, solo warning
        }

        // Check 3: Dimensione minima (PDF vuoto = ~200 bytes)
        if (buffer.length < 200) {
            return {
                isValid: false,
                error: 'File PDF troppo piccolo o corrotto',
            };
        }

        return { isValid: true };

    } catch (err) {
        console.error('❌ validatePdfFile error:', err.message);
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
            console.warn('⚠️ PDF potrebbe essere corrotto (%%EOF mancante), ma procedo...');
        }

        // Check 3: Dimensione minima
        if (buffer.length < 200) {
            return {
                isValid: false,
                error: 'File PDF troppo piccolo o corrotto',
            };
        }

        return { isValid: true };

    } catch (err) {
        console.error('❌ validatePdfBuffer error:', err.message);
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
        console.error('❌ extractPdfMetadata error:', err.message);
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
