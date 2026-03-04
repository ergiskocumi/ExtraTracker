/**
 * 🛡️ VALIDATE PDF MIDDLEWARE
 * ============================
 * Centralizza la validazione dei file PDF caricati via multer:
 *   1. Verifica presenza file (req.file)
 *   2. Verifica mimetype (application/pdf)
 *   3. Verifica dimensione (max 15MB)
 *   4. Verifica integrità (magic bytes %PDF-)
 *
 * Usa `AppError.validation` per rispettare il global error handler.
 * Fa cleanup automatico del file in caso di validazione fallita.
 */

const fs = require('fs').promises;
const AppError = require('../utils/AppError');
const { validatePdfFile } = require('../utils/pdfValidator');

const MAX_PDF_SIZE = 15 * 1024 * 1024; // 15MB

/**
 * Middleware Express che valida il file PDF in `req.file`.
 * Deve essere usato DOPO multer (es. `upload.single('pdf')`).
 */
async function validatePdf(req, res, next) {
    const file = req.file;

    if (!file) {
        return next(AppError.validation('Nessun file caricato. Carica un file PDF.'));
    }

    if (file.mimetype !== 'application/pdf') {
        await fs.unlink(file.path).catch(() => {});
        return next(AppError.validation('Il file deve essere un PDF.'));
    }

    if (file.size > MAX_PDF_SIZE) {
        await fs.unlink(file.path).catch(() => {});
        return next(AppError.validation('Il file è troppo grande. Massimo 15MB.'));
    }

    const pdfValidation = await validatePdfFile(file.path);
    if (!pdfValidation.isValid) {
        await fs.unlink(file.path).catch(() => {});
        return next(AppError.validation(`PDF corrotto: ${pdfValidation.error}`));
    }

    next();
}

module.exports = { validatePdf };
