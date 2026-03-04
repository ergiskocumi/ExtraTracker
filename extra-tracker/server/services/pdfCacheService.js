/**
 * Polyfill minimi per Node: pdfjs-dist tenta di usare 'canvas' per DOMMatrix/Path2D.
 * Per la sola estrazione testo (getTextContent) non serve rendering; definiamo
 * classi no-op per evitare il require('canvas') e i warning in console.
 */
if (typeof globalThis.DOMMatrix === 'undefined') {
    globalThis.DOMMatrix = class DOMMatrix {
        constructor() {}
    };
}
if (typeof globalThis.Path2D === 'undefined') {
    globalThis.Path2D = class Path2D {
        constructor() {}
    };
}

const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * PDF Cache Service
 *
 * Servizio di caching in-memory per parsing PDF.
 * Usa pdfjs-dist direttamente per estrazione testo per-pagina.
 * Utilizza strategia LRU (Least Recently Used) per limitare l'uso di memoria.
 *
 * Features:
 * - Estrazione testo pagina per pagina (risolve il bug di pdf-parse)
 * - Cache con hash MD5 del file come chiave
 * - TTL (Time To Live) di 5 minuti
 * - Limite massimo di 50 PDF in cache
 * - Auto-cleanup di entries scaduti
 * - Stats per monitoring
 */
class PDFCacheService {
    constructor() {
        this.cache = new Map();
        this.MAX_CACHE_SIZE = 50; // Max 50 PDF in cache
        this.TTL = 5 * 60 * 1000; // 5 minuti in millisecondi
        this.assets = this._resolvePdfJsAssets();

        // Stats
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            errors: 0,
        };

        logger.debug('PDFCacheService', 'Initialized with pdfjs-dist (max size: 50, TTL: 5min)');
    }

    /**
     * Risolve i path asset pdfjs (cmaps + standard fonts) per migliorare
     * la decodifica dei font embedded e ridurre warning rumorosi.
     */
    _resolvePdfJsAssets() {
        try {
            const pkgPath = require.resolve('pdfjs-dist/package.json');
            const baseDir = path.dirname(pkgPath);
            return {
                cMapUrl: path.join(baseDir, 'cmaps') + path.sep,
                standardFontDataUrl: path.join(baseDir, 'standard_fonts') + path.sep,
            };
        } catch (err) {
            logger.warn('PDFCacheService', 'Impossibile risolvere asset pdfjs', { error: err.message });
            return { cMapUrl: undefined, standardFontDataUrl: undefined };
        }
    }

    /**
     * Calcola hash MD5 del file per cache key
     * @param {string} filePath - Path del file PDF
     * @returns {Promise<string>} Hash MD5
     */
    async _getFileHash(filePath) {
        try {
            const buffer = await fs.readFile(filePath);
            return crypto.createHash('md5').update(buffer).digest('hex');
        } catch (err) {
            logger.error('PDFCacheService', 'Hash calculation error', { error: err.message });
            throw err;
        }
    }

    /**
     * Pulisce cache entries scaduti
     */
    _cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.TTL) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug('PDFCacheService', `Cleanup: removed ${cleaned} expired entries`);
        }
    }

    /**
     * Pulisce cache se troppo grande (LRU eviction)
     */
    _evictIfNeeded() {
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const entries = [...this.cache.entries()];
            const oldest = entries.sort((a, b) => a[1].timestamp - b[1].timestamp)[0];

            if (oldest) {
                this.cache.delete(oldest[0]);
                this.stats.evictions++;
                logger.debug('PDFCacheService', `Evicted (LRU): ${oldest[0].substring(0, 12)}... (size: ${this.cache.size})`);
            }
        }
    }

    /**
     * Aggiorna timestamp per LRU
     * @param {string} key - Cache key
     */
    _touchEntry(key) {
        const entry = this.cache.get(key);
        if (entry) {
            entry.timestamp = Date.now();
            this.cache.set(key, entry);
        }
    }

    /**
     * Estrae testo da una singola pagina con gestione spazi e newline migliorata
     * @param {Object} page - Pagina pdfjs
     * @returns {Promise<string>} Testo della pagina
     */
    async _extractPageText(page) {
        const content = await page.getTextContent({
            normalizeWhitespace: true,
            disableCombineTextItems: false,
        });

        if (!content.items || content.items.length === 0) return '';

        const items = content.items
            .filter((item) => typeof item?.str === 'string' && item.str.trim().length > 0)
            .map((item) => {
                const x = Number(item.transform?.[4] ?? 0);
                const y = Number(item.transform?.[5] ?? 0);
                const width = Math.max(0, Number(item.width ?? 0));
                const heightFromTransform = Math.abs(Number(item.transform?.[3] ?? 0));
                const height = Math.max(1, Number(item.height ?? heightFromTransform ?? 1));
                const rawText = item.str.replace(/\s+/g, ' ');
                const text = rawText.trim();
                const avgCharWidth = Math.max(0.2, width / Math.max(1, text.length || rawText.length || 1));
                return {
                    str: text,
                    x,
                    y,
                    width,
                    height,
                    avgCharWidth,
                };
            });

        if (items.length === 0) return '';

        const avgHeight = items.reduce((sum, item) => sum + item.height, 0) / items.length;
        const lineTolerance = Math.max(1.5, Math.min(4.5, avgHeight * 0.45));

        // Ordina in ordine di lettura: righe dall'alto verso il basso, poi da sinistra a destra.
        items.sort((a, b) => {
            const yDiff = Math.abs(b.y - a.y);
            if (yDiff > lineTolerance) return b.y - a.y;
            return a.x - b.x;
        });

        const lines = [];
        let current = { y: items[0].y, items: [items[0]] };

        for (let i = 1; i < items.length; i++) {
            const item = items[i];
            if (Math.abs(item.y - current.y) <= lineTolerance) {
                current.items.push(item);
                current.y = (current.y + item.y) / 2;
            } else {
                lines.push(current);
                current = { y: item.y, items: [item] };
            }
        }
        lines.push(current);

        const pageLines = [];
        for (const line of lines) {
            line.items.sort((a, b) => a.x - b.x);

            let lineText = '';
            let lastRight = null;
            let prev = null;

            for (const item of line.items) {
                if (!item.str) continue;

                if (lastRight !== null && prev) {
                    const gap = item.x - lastRight;
                    const avgChar = Math.max(prev.avgCharWidth || 0.6, item.avgCharWidth || 0.6);
                    const threshold = Math.max(0.55, Math.min(4, avgChar * 0.8));
                    if (gap > threshold) lineText += ' ';
                }

                lineText += item.str;
                lastRight = item.x + item.width;
                prev = item;
            }

            const cleanedLine = lineText.replace(/\s+/g, ' ').trim();
            if (!cleanedLine) continue;

            // Evita duplicati consecutivi generati da text-layer sovrapposti.
            if (pageLines.length > 0 && pageLines[pageLines.length - 1] === cleanedLine) continue;
            pageLines.push(cleanedLine);
        }

        return pageLines.join('\n');
    }

    /**
     * Parsa PDF con caching - estrae testo pagina per pagina usando pdfjs-dist
     * @param {string} filePath - Path del file PDF
     * @param {Buffer} [buffer] - Buffer del PDF (opzionale, altrimenti legge da filePath)
     * @returns {Promise<Object>} PDF parsed data con { numpages, text, pages: [{num, text}] }
     */
    async parsePDF(filePath, buffer = null) {
        try {
            // Cleanup periodico ogni 10 richieste
            if ((this.stats.hits + this.stats.misses) % 10 === 0) {
                this._cleanup();
            }

            // Calcola hash per cache key
            let hash;
            if (buffer) {
                hash = crypto.createHash('md5').update(buffer).digest('hex');
            } else {
                hash = await this._getFileHash(filePath);
            }

            const cacheKey = `pdf_${hash}`;

            // Check cache
            const cached = this.cache.get(cacheKey);
            if (cached) {
                this.stats.hits++;
                this._touchEntry(cacheKey);
                logger.debug('PDFCacheService', `CACHE HIT: ${cacheKey.substring(0, 16)}... (hits: ${this.stats.hits})`);
                return cached.data;
            }

            // Cache MISS: parsa PDF con pdfjs-dist
            this.stats.misses++;
            logger.debug('PDFCacheService', `CACHE MISS (nuovo hash file): ${cacheKey.substring(0, 16)}... (misses: ${this.stats.misses})`);

            const startTime = Date.now();
            const pdfBuffer = buffer || await fs.readFile(filePath);
            const uint8Array = new Uint8Array(pdfBuffer);

            const doc = await pdfjsLib.getDocument({
                data: uint8Array,
                useSystemFonts: true,
                cMapUrl: this.assets.cMapUrl,
                cMapPacked: true,
                standardFontDataUrl: this.assets.standardFontDataUrl,
                verbosity: pdfjsLib.VerbosityLevel?.ERRORS ?? 0,
            }).promise;

            const pages = [];
            let fullText = '';

            for (let i = 1; i <= doc.numPages; i++) {
                const page = await doc.getPage(i);
                const pageText = await this._extractPageText(page);
                pages.push({ num: i, text: pageText });
                fullText += pageText + '\n';
            }

            const pdfData = {
                numpages: doc.numPages,
                text: fullText.trim(),
                pages,
            };

            const parseTime = Date.now() - startTime;
            logger.debug('PDFCacheService', `Parsed in ${parseTime}ms (${pdfData.numpages} pages, ${pdfData.text.length} chars, per-page extraction)`);

            // Salva in cache
            this._evictIfNeeded();

            this.cache.set(cacheKey, {
                data: pdfData,
                timestamp: Date.now(),
                filePath: filePath,
                size: pdfBuffer.length,
            });

            logger.debug('PDFCacheService', `CACHE SET: ${cacheKey.substring(0, 16)}... (cache size: ${this.cache.size}/${this.MAX_CACHE_SIZE})`);
            return pdfData;

        } catch (err) {
            this.stats.errors++;
            if (err?.name === 'PasswordException' || /password/i.test(err?.message || '')) {
                throw AppError.fileUpload('PDF protetto da password. Rimuovi la protezione e ricarica il file.');
            }
            if (/Invalid PDF structure/i.test(err?.message || '')) {
                throw AppError.fileUpload('Il file PDF non è leggibile o è corrotto.');
            }
            logger.error('PDFCacheService', 'Parse error inatteso', { error: err.message });
            throw AppError.fileUpload('Impossibile leggere il PDF.');
        }
    }

    /**
     * Clear cache manualmente (per tutti i PDF)
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        logger.debug('PDFCacheService', `Cache cleared (${size} entries removed)`);
    }

    /**
     * Clear cache per singolo file
     * @param {string} filePath - Path del file PDF
     */
    async clearFile(filePath) {
        try {
            const hash = await this._getFileHash(filePath);
            const cacheKey = `pdf_${hash}`;

            if (this.cache.has(cacheKey)) {
                this.cache.delete(cacheKey);
                logger.debug('PDFCacheService', `Cleared: ${cacheKey.substring(0, 16)}...`);
                return true;
            }
            return false;
        } catch (err) {
            logger.error('PDFCacheService', 'clearFile error', { error: err.message });
            return false;
        }
    }

    /**
     * Stats per debugging e monitoring
     * @returns {Object} Cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
            : '0.00';

        return {
            size: this.cache.size,
            maxSize: this.MAX_CACHE_SIZE,
            ttl: this.TTL,
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: `${hitRate}%`,
            evictions: this.stats.evictions,
            errors: this.stats.errors,
            entries: [...this.cache.entries()].map(([key, value]) => ({
                key: key.substring(0, 16) + '...',
                filePath: value.filePath,
                size: value.size,
                age: Math.floor((Date.now() - value.timestamp) / 1000) + 's',
            })),
        };
    }

    /**
     * Check se un file è in cache
     * @param {string} filePath - Path del file PDF
     * @returns {Promise<boolean>} true se in cache
     */
    async isCached(filePath) {
        try {
            const hash = await this._getFileHash(filePath);
            const cacheKey = `pdf_${hash}`;
            return this.cache.has(cacheKey);
        } catch (err) {
            return false;
        }
    }
}

// Singleton instance
const pdfCacheService = new PDFCacheService();

module.exports = pdfCacheService;
