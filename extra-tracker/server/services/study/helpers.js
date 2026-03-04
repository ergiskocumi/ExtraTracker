/**
 * 🔧 STUDY SERVICE - Shared Helpers & Utilities
 * ================================================
 * Cross-cutting private methods used across multiple modules.
 */

const examRepository = require('../../repositories/ExamRepository');
const fs = require('fs/promises');
const path = require('path');
const logger = require('../../utils/logger');
const {
    PDF_UPLOADS_DIR,
    MIN_EASINESS_FACTOR,
    DEFAULT_EASINESS_FACTOR,
    MAX_TUTOR_CONTEXT_LENGTH,
    MAX_TUTOR_HISTORY_MESSAGES,
    MAX_TUTOR_HISTORY_MESSAGE_LENGTH,
    QUIZ_TYPES,
} = require('./constants');

module.exports = {

    // =========================================
    // ID / PATH RESOLUTION
    // =========================================

    _resolveDeckId(deck) {
        if (!deck) return '';
        if (deck._id) return String(deck._id);
        if (deck.id) return String(deck.id);
        return '';
    },

    _resolvePdfAbsolutePath(pdfUrl) {
        if (!pdfUrl || typeof pdfUrl !== 'string') return null;
        const fileName = path.basename(pdfUrl.trim());
        if (!fileName || !fileName.toLowerCase().endsWith('.pdf')) return null;
        return path.join(PDF_UPLOADS_DIR, fileName);
    },

    async _fileExists(filePath) {
        if (!filePath || typeof filePath !== 'string') return false;
        try {
            await fs.access(filePath);
            return true;
        } catch (_err) {
            return false;
        }
    },

    async _isDeckPdfUrlValid(pdfUrl) {
        const absolutePath = this._resolvePdfAbsolutePath(pdfUrl);
        if (!absolutePath) return false;
        return this._fileExists(absolutePath);
    },

    _extractDeckPdfTimestamp(fileName, deckId) {
        if (!fileName || !deckId) return 0;
        const prefix = `${deckId}-`;
        if (!fileName.startsWith(prefix) || !fileName.toLowerCase().endsWith('.pdf')) {
            return 0;
        }
        const timestampPart = fileName.slice(prefix.length, -4);
        const parsed = Number(timestampPart);
        return Number.isFinite(parsed) ? parsed : 0;
    },

    async _findLatestDeckPdfUrl(deckId) {
        if (!deckId) return null;

        let files = [];
        try {
            files = await fs.readdir(PDF_UPLOADS_DIR);
        } catch (err) {
            logger.warn('Helpers', 'Impossibile leggere directory PDF uploads', { message: err.message });
            return null;
        }

        const prefix = `${deckId}-`;
        const candidates = files.filter((fileName) => (
            fileName.startsWith(prefix) && fileName.toLowerCase().endsWith('.pdf')
        ));

        if (candidates.length === 0) return null;

        candidates.sort((a, b) => {
            const tsA = this._extractDeckPdfTimestamp(a, deckId);
            const tsB = this._extractDeckPdfTimestamp(b, deckId);
            if (tsA !== tsB) return tsB - tsA;
            return b.localeCompare(a);
        });

        return `/uploads/pdfs/${candidates[0]}`;
    },

    async _ensureDeckPdfUrlIntegrity(deck) {
        if (!deck) return false;

        const currentPdfUrl = typeof deck.pdfUrl === 'string' ? deck.pdfUrl.trim() : '';
        if (!currentPdfUrl) return false;

        const hasCurrentPdf = await this._isDeckPdfUrlValid(currentPdfUrl);
        if (hasCurrentPdf) return false;

        const deckId = this._resolveDeckId(deck);
        const recoveredPdfUrl = await this._findLatestDeckPdfUrl(deckId);
        const nextPdfUrl = recoveredPdfUrl || '';
        if (nextPdfUrl === currentPdfUrl) return false;

        deck.pdfUrl = nextPdfUrl;
        await deck.save({ validateModifiedOnly: true });

        logger.warn('Helpers', 'Riparato pdfUrl non valido', {
            deckId,
            previousPdfUrl: currentPdfUrl,
            recoveredPdfUrl: nextPdfUrl || null,
        });

        return true;
    },

    // =========================================
    // OWNERSHIP / AUTH
    // =========================================

    async _validateExamOwnership(tenantScope, examId) {
        // Lancia AppError.notFound automaticamente se non trovato
        await examRepository.findById(tenantScope, examId, { throwIfNotFound: true });
    },

    // =========================================
    // CARD STATUS / SERIALIZATION
    // =========================================

    _resolveCardStatus({ quality, repetitions, interval, card = null }) {
        if (quality < 3) {
            return 'learning';
        }

        if (repetitions <= 1) {
            return 'learning';
        }

        let recentQuality = quality;
        let consecutiveGood = 1;

        if (card && Array.isArray(card.reviewHistory) && card.reviewHistory.length > 0) {
            const recentHistory = card.reviewHistory.slice(-5);

            for (let i = recentHistory.length - 1; i >= 0; i--) {
                if (recentHistory[i].rating >= 3) {
                    consecutiveGood++;
                } else {
                    break;
                }
            }

            const lastThree = recentHistory.slice(-3);
            if (lastThree.length > 0) {
                const avgQuality = lastThree.reduce((sum, r) => sum + (r.rating || 0), 0) / lastThree.length;
                recentQuality = (avgQuality + quality) / 2;
            }
        }

        const isMastered =
            repetitions >= 5 &&
            interval >= 30 &&
            consecutiveGood >= 3 &&
            recentQuality >= 3.5;

        if (isMastered) {
            return 'mastered';
        }

        const isReview =
            repetitions >= 2 &&
            interval > 1 &&
            recentQuality >= 3;

        if (isReview) {
            return 'review';
        }

        return 'learning';
    },

    _serializeCard(card) {
        if (!card) return null;
        const obj = card.toObject({ virtuals: true });
        obj.id = obj._id?.toString() || obj.id;
        delete obj._id;
        return obj;
    },

    _resolveCardId(card) {
        if (!card) return '';
        return String(card.id || card._id || '');
    },

    // =========================================
    // AI RESPONSE PARSING
    // =========================================

    _extractGeneratedCards(parsed) {
        if (Array.isArray(parsed)) return parsed;
        if (!parsed || typeof parsed !== 'object') return [];

        if (Array.isArray(parsed.cards)) return parsed.cards;
        if (Array.isArray(parsed.flashcards)) return parsed.flashcards;
        if (Array.isArray(parsed.items)) return parsed.items;
        if (Array.isArray(parsed.data)) return parsed.data;

        if (parsed.front && parsed.back) return [parsed];

        const values = Object.values(parsed).filter(value => value && typeof value === 'object');
        const hasCardShape = values.some(value => value.front || value.back || value.question || value.answer || value.q || value.a);
        return hasCardShape
            ? values.filter(v => (v.front || v.question || v.q) && (v.back || v.answer || v.a))
            : [];
    },

    _normalizeGeneratedCard(card) {
        if (!card || typeof card !== 'object') return {};

        const rawFront = card.front ?? card.question ?? card.q;
        const rawBack = card.back ?? card.answer ?? card.a;

        const normalized = {
            front: this._sanitizeGeneratedCardText(rawFront, { isFront: true }),
            back: this._sanitizeGeneratedCardText(rawBack, { isFront: false }),
        };

        if (card.source_metadata || card.sourceMetadata) {
            const sourceMeta = card.source_metadata || card.sourceMetadata;
            if (sourceMeta && typeof sourceMeta === 'object') {
                const pageNumber = Number.isFinite(Number(sourceMeta.page_number ?? sourceMeta.pageNumber))
                    ? Number(sourceMeta.page_number ?? sourceMeta.pageNumber)
                    : null;
                const originalQuote = typeof sourceMeta.original_quote === 'string'
                    ? sourceMeta.original_quote.trim()
                    : (typeof sourceMeta.originalQuote === 'string' ? sourceMeta.originalQuote.trim() : null);

                if (pageNumber !== null && pageNumber > 0 && originalQuote && originalQuote.length >= 50) {
                    normalized.sourceMetadata = {
                        pageNumber: pageNumber,
                        originalText: originalQuote,
                    };
                }
            }
        }

        return normalized;
    },

    _sanitizeGeneratedCardText(value, { isFront = false } = {}) {
        if (value === null || value === undefined) return '';
        if (typeof value !== 'string') return String(value).trim();

        let cleaned = value
            .replace(/\r\n/g, '\n')
            .replace(/^\s+|\s+$/g, '');

        cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '').trim();

        if (isFront) {
            cleaned = cleaned
                .replace(/^(?:domanda|question|quesito|q)\s*[:\-]\s*/i, '')
                .replace(/^\s*(?:\d{1,3}\s*[\.\)]|[-*•▪]+)\s+/, '')
                .trim();
        } else {
            cleaned = cleaned
                .replace(/^(?:risposta|answer|a)\s*[:\-]\s*/i, '')
                .trim();
        }

        return cleaned;
    },

    _cleanJSON(dirtyJSON) {
        if (!dirtyJSON || typeof dirtyJSON !== 'string') return '';

        let cleaned = dirtyJSON.trim();
        cleaned = cleaned.replace(/```json\s*/gi, '');
        cleaned = cleaned.replace(/```\s*/g, '');
        cleaned = cleaned.replace(/^(Ecco|Here|JSON|Risposta|Response):\s*/i, '');

        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }

        return cleaned.trim();
    },

    // =========================================
    // TEXT PROCESSING
    // =========================================

    _normalizeExtractedText(text) {
        if (!text || typeof text !== 'string') return '';
        return text
            .replace(/\r\n/g, '\n')
            .replace(/(\w)-\n(\w)/g, '$1$2')
            .replace(/[^\S\n]{2,}/g, ' ')
            .replace(/\n\n\s*\d{1,4}\s*\n\n/g, '\n\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    },

    _formatPdfTextWithPages(pdfTextResult) {
        const pages = Array.isArray(pdfTextResult?.pages) ? pdfTextResult.pages : [];
        const fallback = typeof pdfTextResult?.text === 'string' ? pdfTextResult.text : '';

        if (pages.length === 0) {
            if (fallback) {
                return `--- PAGE 1 ---\n${fallback}`;
            }
            return fallback;
        }

        return pages
            .map((page, index) => {
                const pageNumber = Number.isFinite(Number(page?.num)) ? Number(page.num) : index + 1;
                const text = typeof page?.text === 'string' ? page.text.trim() : '';
                return `--- PAGE ${pageNumber} ---\n${text}`;
            })
            .join('\n\n');
    },

    _truncateText(text, maxLength, suffix = '') {
        if (!text || typeof text !== 'string') return '';
        if (!Number.isFinite(maxLength) || maxLength <= 0) return '';
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + (typeof suffix === 'string' ? suffix : '');
    },

    // =========================================
    // NORMALIZERS
    // =========================================

    _normalizeStudyMode(value) {
        const normalized = typeof value === 'string' ? value.toLowerCase() : 'flashcard';
        const allowed = ['flashcard', 'quiz', 'typing', 'mix', 'sprint', 'focus', 'exam'];
        return allowed.includes(normalized) ? normalized : 'flashcard';
    },

    _normalizeSessionFocus(value) {
        const normalized = typeof value === 'string' ? value.toLowerCase() : 'smart';
        const allowed = ['smart', 'due', 'weak', 'all'];
        return allowed.includes(normalized) ? normalized : 'smart';
    },

    _normalizeSessionDirection(value) {
        const normalized = typeof value === 'string' ? value.toLowerCase() : 'front';
        const allowed = ['front', 'back', 'mixed'];
        return allowed.includes(normalized) ? normalized : 'front';
    },

    _getDefaultSessionLimit(mode) {
        const defaults = {
            flashcard: 20,
            quiz: 20,
            typing: 20,
            mix: 30,
            sprint: 15,
            focus: 20,
            exam: 30,
        };
        return defaults[mode] || 20;
    },

    _normalizeQuizType(value) {
        const normalized = typeof value === 'string' ? value.toLowerCase() : QUIZ_TYPES.MULTIPLE_CHOICE;
        if (['true_false', 'true-false', 'truefalse', 'vero_falso', 'vero-falso'].includes(normalized)) {
            return QUIZ_TYPES.TRUE_FALSE;
        }
        if (['multiple', 'multiple_choice', 'multiple-choice', 'multiplechoice', 'quiz'].includes(normalized)) {
            return QUIZ_TYPES.MULTIPLE_CHOICE;
        }
        return QUIZ_TYPES.MULTIPLE_CHOICE;
    },

    _normalizeQuizSnapshotSource(value) {
        const normalized = typeof value === 'string' ? value.trim().toLowerCase() : 'chapter';
        if (['repeat', 'errors', 'saved'].includes(normalized)) {
            return normalized;
        }
        return 'chapter';
    },

    _normalizeAnswerValue(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim().toLowerCase();
    },

    // =========================================
    // TUTOR CONTEXT HELPERS
    // =========================================

    _sanitizeTutorHistory(history) {
        if (!Array.isArray(history)) return [];

        return history
            .filter((item) => item && typeof item === 'object')
            .map((item) => {
                const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
                const content = typeof item.content === 'string' ? item.content.trim() : '';
                if (!role || !content) return null;
                return {
                    role,
                    content: this._truncateText(content, MAX_TUTOR_HISTORY_MESSAGE_LENGTH),
                };
            })
            .filter(Boolean)
            .slice(-MAX_TUTOR_HISTORY_MESSAGES);
    },

    _buildTutorContext(extractedText, question, maxLength = MAX_TUTOR_CONTEXT_LENGTH) {
        const normalizedText = this._normalizeExtractedText(extractedText);
        if (!normalizedText) return '';

        const safeMax = Number.isFinite(Number(maxLength)) ? Math.max(2000, Number(maxLength)) : MAX_TUTOR_CONTEXT_LENGTH;
        if (normalizedText.length <= safeMax) return normalizedText;

        const tokens = this._extractQueryTokens(question);

        if (tokens.length === 0) {
            return normalizedText.slice(-safeMax);
        }

        const chunkSize = Math.min(2600, safeMax);
        const step = Math.max(900, Math.floor(chunkSize * 0.6));
        const chunks = [];

        for (let start = 0; start < normalizedText.length; start += step) {
            const text = normalizedText.slice(start, start + chunkSize);
            const haystack = text.toLowerCase();
            const score = tokens.reduce((acc, token) => (haystack.includes(token) ? acc + 1 : acc), 0);
            chunks.push({ start, score, text });
        }

        const ranked = chunks.filter(c => c.score > 0).sort((a, b) => b.score - a.score);

        if (ranked.length === 0) {
            return normalizedText.slice(-safeMax);
        }

        const selected = [];
        for (const candidate of ranked) {
            if (selected.length >= 10) break;
            const overlaps = selected.some((s) => Math.abs(s.start - candidate.start) < step);
            if (!overlaps) selected.push(candidate);
        }

        selected.sort((a, b) => a.start - b.start);

        let stitched = '';
        for (const chunk of selected) {
            const separator = stitched.length ? '\n\n---\n\n' : '';
            if (stitched.length + separator.length + chunk.text.length > safeMax) break;
            stitched += separator + chunk.text.trim();
        }

        return stitched || normalizedText.slice(-safeMax);
    },

    _extractQueryTokens(question) {
        if (!question || typeof question !== 'string') return [];

        const stopwords = new Set([
            'come', 'cosa', 'cos', 'che', 'per', 'una', 'uno', 'dei', 'del', 'della',
            'delle', 'degli', 'gli', 'alla', 'alle', 'allo', 'sul', 'sulla', 'sulle',
            'nel', 'nella', 'nelle', 'dai', 'dal', 'dallo', 'ai', 'al', 'allo',
            'il', 'lo', 'la', 'le', 'i', 'e', 'o', 'di', 'da', 'in', 'su', 'con',
            'spiega', 'spiegami', 'spiegare', 'pagina', 'pagine',
        ]);

        return question
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .split(/\s+/)
            .map((t) => t.trim())
            .filter((t) => t.length >= 4 && !stopwords.has(t))
            .slice(0, 20);
    },

    // =========================================
    // LOGGING / DIAGNOSTICS
    // =========================================

    _logExtractionQuality(pdfData, normalizedText) {
        const pages = Array.isArray(pdfData?.pages) ? pdfData.pages : [];
        if (pages.length === 0) return;

        const markerCount = typeof normalizedText === 'string'
            ? (normalizedText.match(/--- PAGE \d+ ---/g) || []).length
            : 0;
        const emptyPages = pages.filter((p) => (typeof p?.text === 'string' ? p.text.trim().length : 0) < 30);
        const shortPages = pages.filter((p) => (typeof p?.text === 'string' ? p.text.trim().length : 0) < 200);

        const lineFreq = new Map();
        for (const page of pages) {
            const rawText = typeof page?.text === 'string' ? page.text : '';
            const uniqueLines = new Set(
                rawText
                    .split(/\n+/)
                    .map((line) => line.trim())
                    .filter((line) => line.length >= 8)
            );
            for (const line of uniqueLines) {
                lineFreq.set(line, (lineFreq.get(line) || 0) + 1);
            }
        }

        const repeatThreshold = Math.max(3, Math.ceil(pages.length * 0.45));
        const repeatedLines = [...lineFreq.entries()].filter(([, count]) => count >= repeatThreshold);

        logger.debug('Helpers', `PDF Quality: pages=${pages.length}, markers=${markerCount}, emptyPages=${emptyPages.length}, shortPages=${shortPages.length}, repeatedLines=${repeatedLines.length}`);

        if (markerCount !== pages.length) {
            logger.warn('Helpers', `PDF Quality: Marker mismatch attesi ${pages.length}, trovati ${markerCount}`);
        }
        if (emptyPages.length > 0) {
            logger.warn('Helpers', `PDF Quality: Pagine quasi vuote: ${emptyPages.map((p) => p.num).join(', ')}`);
        }
        if (repeatedLines.length > 0) {
            const sample = repeatedLines.slice(0, 3).map(([line, count]) => `(${count}x) ${line.slice(0, 80)}`);
            logger.warn('Helpers', `PDF Quality: Possibili header/footer ripetuti: ${sample.join(' | ')}`);
        }
    },

    // =========================================
    // GENERIC UTILITIES
    // =========================================

    _shuffleArray(values = []) {
        const arr = [...values];
        for (let i = arr.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    _toNumber(value, fallback = 0) {
        return Number.isFinite(Number(value)) ? Number(value) : fallback;
    },

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // =========================================
    // JSON PARSING
    // =========================================

    _parseJSONResponse(content) {
        if (!content || typeof content !== 'string') return null;

        const cleaned = content
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        try {
            return JSON.parse(cleaned);
        } catch (e) {
            const extractedObject = cleaned.match(/\{[\s\S]*\}/)?.[0];
            const extractedArray = cleaned.match(/\[[\s\S]*\]/)?.[0];
            const extracted = extractedObject || extractedArray || '';

            const sanitize = (value) => this._sanitizePotentialJson(value);

            const candidates = [
                extracted,
                sanitize(extracted),
                extracted.replace(/[\u0000-\u0019]/g, ' '),
                sanitize(extracted.replace(/[\u0000-\u0019]/g, ' ')),
                cleaned.replace(/[\u0000-\u0019]/g, ' '),
                sanitize(cleaned),
                sanitize(cleaned.replace(/[\u0000-\u0019]/g, ' ')),
                cleaned.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t'),
            ].filter(Boolean);

            for (const candidate of candidates) {
                try {
                    return JSON.parse(candidate);
                } catch (_ignored) {
                    // continua su prossimo tentativo
                }
            }

            logger.warn('Helpers', '_parseJSONResponse: Fallito parsing JSON', {
                message: e.message,
                preview: cleaned.slice(0, 240),
                length: cleaned.length,
            });
            return null;
        }
    },

    _sanitizePotentialJson(content) {
        if (!content || typeof content !== 'string') return '';

        const normalizedQuotes = content
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, '\'')
            .replace(/\u00A0/g, ' ');

        let result = '';
        let inString = false;
        let escaped = false;

        for (const char of normalizedQuotes) {
            const code = char.charCodeAt(0);

            if (inString) {
                if (escaped) {
                    result += char;
                    escaped = false;
                    continue;
                }

                if (char === '\\') {
                    result += char;
                    escaped = true;
                    continue;
                }

                if (char === '"') {
                    result += char;
                    inString = false;
                    continue;
                }

                if (char === '\n') { result += '\\n'; continue; }
                if (char === '\r') { result += '\\r'; continue; }
                if (char === '\t') { result += '\\t'; continue; }
                if (code < 0x20) { result += ' '; continue; }

                result += char;
                continue;
            }

            if (char === '"') {
                inString = true;
                result += char;
                continue;
            }

            if (code < 0x20 && char !== '\n' && char !== '\r' && char !== '\t') {
                continue;
            }

            result += char;
        }

        return result
            .replace(/,\s*([}\]])/g, '$1')
            .trim();
    },
};
