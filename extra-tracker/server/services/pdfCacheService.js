const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs').promises;
const crypto = require('crypto');

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

        // Stats
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            errors: 0,
        };

        console.log('[PDFCache] Initialized with pdfjs-dist (max size: 50, TTL: 5min)');
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
            console.error('[PDFCache] Hash calculation error:', err.message);
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
            console.log(`[PDFCache] Cleanup: removed ${cleaned} expired entries`);
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
                console.log(`[PDFCache] Evicted (LRU): ${oldest[0].substring(0, 12)}... (size: ${this.cache.size})`);
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

        let text = '';
        let lastY = null;
        let lastX = null;
        let lastWidth = 0;

        for (const item of content.items) {
            if (!item.str && item.str !== '') continue;

            const x = item.transform[4];
            const y = item.transform[5];

            if (lastY !== null) {
                const yDiff = Math.abs(y - lastY);
                if (yDiff > 2) {
                    // Nuova riga
                    text += '\n';
                } else if (lastX !== null) {
                    // Stessa riga - aggiungi spazio se c'e' un gap orizzontale significativo
                    const expectedX = lastX + lastWidth;
                    const gap = x - expectedX;
                    if (gap > item.height * 0.3) {
                        text += ' ';
                    }
                }
            }

            text += item.str;
            lastY = y;
            lastX = x;
            lastWidth = item.width || 0;
        }

        return text;
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
                console.log(`[PDFCache] HIT: ${cacheKey.substring(0, 16)}... (hits: ${this.stats.hits})`);
                return cached.data;
            }

            // Cache MISS: parsa PDF con pdfjs-dist
            this.stats.misses++;
            console.log(`[PDFCache] MISS: ${cacheKey.substring(0, 16)}... (misses: ${this.stats.misses})`);

            const startTime = Date.now();
            const pdfBuffer = buffer || await fs.readFile(filePath);
            const uint8Array = new Uint8Array(pdfBuffer);

            const doc = await pdfjsLib.getDocument({
                data: uint8Array,
                useSystemFonts: true,
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
            console.log(`[PDFCache] Parsed in ${parseTime}ms (${pdfData.numpages} pages, ${pdfData.text.length} chars, per-page extraction)`);

            // Salva in cache
            this._evictIfNeeded();

            this.cache.set(cacheKey, {
                data: pdfData,
                timestamp: Date.now(),
                filePath: filePath,
                size: pdfBuffer.length,
            });

            console.log(`[PDFCache] Cached: ${cacheKey.substring(0, 16)}... (cache size: ${this.cache.size}/${this.MAX_CACHE_SIZE})`);
            return pdfData;

        } catch (err) {
            this.stats.errors++;
            console.error('[PDFCache] Parse error:', err.message);
            throw err;
        }
    }

    /**
     * Clear cache manualmente (per tutti i PDF)
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`[PDFCache] Cache cleared (${size} entries removed)`);
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
                console.log(`[PDFCache] Cleared: ${cacheKey.substring(0, 16)}...`);
                return true;
            }
            return false;
        } catch (err) {
            console.error('[PDFCache] clearFile error:', err.message);
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
