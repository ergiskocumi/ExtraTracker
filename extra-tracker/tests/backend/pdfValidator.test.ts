// @vitest-environment node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
    isPdfValid,
    hasPdfEof,
    validatePdfFile,
    validatePdfBuffer,
    extractPdfMetadata,
} = require('../../server/utils/pdfValidator');

const buildPdfBuffer = ({
    version = '1.7',
    includeEof = true,
    includeLinearized = false,
    contentSize = 1400,
}: {
    version?: string;
    includeEof?: boolean;
    includeLinearized?: boolean;
    contentSize?: number;
} = {}) => {
    const linearized = includeLinearized ? '/Linearized ' : '';
    const header = `%PDF-${version}\n${linearized}`;
    const body = 'A'.repeat(contentSize);
    const eof = includeEof ? '\n%%EOF' : '';
    return Buffer.from(`${header}${body}${eof}`, 'ascii');
};

describe('server/utils/pdfValidator', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('validates PDF header magic bytes', () => {
        expect(isPdfValid(Buffer.from('%PDF-1.7 anything', 'ascii'))).toBe(true);
        expect(isPdfValid(Buffer.from('NOTPDF', 'ascii'))).toBe(false);
        expect(isPdfValid(Buffer.from('1234', 'ascii'))).toBe(false);
    });

    it('checks EOF marker in last 1024 bytes', () => {
        const withEof = buildPdfBuffer({ includeEof: true });
        const withoutEof = buildPdfBuffer({ includeEof: false });
        const tooShort = Buffer.from('%PDF-1.7\n%%EOF', 'ascii');

        expect(hasPdfEof(withEof)).toBe(true);
        expect(hasPdfEof(withoutEof)).toBe(false);
        expect(hasPdfEof(tooShort)).toBe(false);
    });

    it('rejects buffers that are not valid PDFs', () => {
        const result = validatePdfBuffer(Buffer.from('bad-file-content', 'ascii'));
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/magic bytes/i);
    });

    it('rejects PDFs that are too small', () => {
        const tinyBuffer = Buffer.from('%PDF-1.7\n12345\n%%EOF', 'ascii');
        const result = validatePdfBuffer(tinyBuffer);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/troppo piccolo/i);
    });

    it('accepts valid PDF buffers with header and minimum size', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = validatePdfBuffer(buildPdfBuffer({ includeEof: true }));

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('accepts valid PDF buffers even without EOF (warning only)', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = validatePdfBuffer(buildPdfBuffer({ includeEof: false }));

        expect(result.isValid).toBe(true);
        expect(warnSpy).toHaveBeenCalled();
    });

    it('extracts PDF metadata version and linearization flag', () => {
        const linearized = buildPdfBuffer({ version: '1.4', includeLinearized: true });
        const metadata = extractPdfMetadata(linearized);

        expect(metadata.version).toBe('1.4');
        expect(metadata.isLinearized).toBe(true);
    });

    it('returns safe metadata fallback for invalid buffers', () => {
        const metadata = extractPdfMetadata(Buffer.alloc(0));
        expect(metadata.version).toBeNull();
        expect(metadata.isLinearized).toBe(false);
    });

    it('validates a PDF file from filesystem', async () => {
        const tempPath = path.join(os.tmpdir(), `vitest-pdf-${Date.now()}.pdf`);
        await fs.writeFile(tempPath, buildPdfBuffer({ includeEof: true }));

        try {
            const result = await validatePdfFile(tempPath);
            expect(result.isValid).toBe(true);
        } finally {
            await fs.rm(tempPath, { force: true });
        }
    });

    it('returns validation error for missing files', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await validatePdfFile('/tmp/file-that-does-not-exist.pdf');

        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/Errore durante la validazione/i);
        expect(errorSpy).toHaveBeenCalled();
    });
});

