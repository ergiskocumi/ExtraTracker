const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const crypto = require('crypto');

/**
 * PDF Cache Service
 *
 * Servizio di caching in-memory per parsing PDF.
 * Utilizza strategia LRU (Least Recently Used) per limitare l'uso di memoria.
 *
 * Features:
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

        console.log('[PDFCache] Initialized (max size: 50, TTL: 5min)');
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
            // Trova l'entry meno recente (Least Recently Used)
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
     * Parsa PDF con caching
     * @param {string} filePath - Path del file PDF
     * @param {Buffer} [buffer] - Buffer del PDF (opzionale, altrimenti legge da filePath)
     * @returns {Promise<Object>} PDF parsed data
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
                this._touchEntry(cacheKey); // Update LRU timestamp
                console.log(`[PDFCache] ✅ HIT: ${cacheKey.substring(0, 16)}... (hits: ${this.stats.hits})`);
                return cached.data;
            }

            // Cache MISS: parsa PDF
            this.stats.misses++;
            console.log(`[PDFCache] ❌ MISS: ${cacheKey.substring(0, 16)}... (misses: ${this.stats.misses})`);

            const startTime = Date.now();
            const pdfBuffer = buffer || await fs.readFile(filePath);
            const pdfData = await pdfParse(pdfBuffer);
            const parseTime = Date.now() - startTime;

            console.log(`[PDFCache] Parsed in ${parseTime}ms (${pdfData.numpages} pages, ${pdfData.text.length} chars)`);

            // Salva in cache
            this._evictIfNeeded(); // Evict se necessario PRIMA di aggiungere

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
