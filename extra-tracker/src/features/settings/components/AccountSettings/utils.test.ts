import { describe, expect, it } from 'vitest';
import {
    clearFileInput,
    getResetDeleteFormState,
    getResetImportState,
    isFileSizeError,
    validateDeleteForm,
    validateImportFile,
} from './utils';
import { MAX_FILE_SIZE_BYTES } from './constants';

describe('AccountSettings utils', () => {
    describe('validateImportFile', () => {
        it('accepts valid json file by mime type', () => {
            const file = { size: 1024, type: 'application/json', name: 'backup.txt' } as File;
            const result = validateImportFile(file);
            expect(result).toEqual({ isValid: true, error: null });
        });

        it('accepts valid json file by extension', () => {
            const file = { size: 1024, type: 'text/plain', name: 'backup.json' } as File;
            const result = validateImportFile(file);
            expect(result).toEqual({ isValid: true, error: null });
        });

        it('rejects oversized file', () => {
            const file = {
                size: MAX_FILE_SIZE_BYTES + 1,
                type: 'application/json',
                name: 'huge.json',
            } as File;

            const result = validateImportFile(file);
            expect(result.isValid).toBe(false);
            expect(result.error).toMatch(/troppo grande/i);
        });

        it('rejects invalid file type', () => {
            const file = { size: 1024, type: 'text/plain', name: 'notes.txt' } as File;
            const result = validateImportFile(file);
            expect(result).toEqual({
                isValid: false,
                error: 'Per favore seleziona un file JSON valido',
            });
        });
    });

    describe('isFileSizeError', () => {
        it('returns true for FILE_TOO_LARGE and PAYLOAD_TOO_LARGE backend codes', () => {
            const err1 = { response: { data: { error: { code: 'FILE_TOO_LARGE' } } } };
            const err2 = { response: { data: { error: { code: 'PAYLOAD_TOO_LARGE' } } } };
            expect(isFileSizeError(err1)).toBe(true);
            expect(isFileSizeError(err2)).toBe(true);
        });

        it('returns false for other shapes or codes', () => {
            expect(isFileSizeError({ response: { data: { error: { code: 'OTHER' } } } })).toBe(false);
            expect(isFileSizeError({})).toBe(false);
            expect(isFileSizeError(null)).toBe(false);
        });
    });

    describe('validateDeleteForm', () => {
        it('returns errors for missing password and wrong confirmation', () => {
            const errors = validateDeleteForm('   ', 'WRONG');
            expect(errors).toEqual({
                password: 'Password richiesta',
                confirmation: 'Devi scrivere DELETE per confermare',
            });
        });

        it('returns no errors when password exists and confirmation is DELETE', () => {
            const errors = validateDeleteForm('password123', 'DELETE');
            expect(errors).toEqual({});
        });
    });

    it('returns reset state for delete form', () => {
        expect(getResetDeleteFormState()).toEqual({
            password: '',
            confirmation: '',
            deleteErrors: {},
        });
    });

    it('returns reset state for import flow', () => {
        expect(getResetImportState()).toEqual({
            selectedFile: null,
            comparison: null,
            importResult: null,
            showLessDataWarning: false,
        });
    });

    it('clears file input when ref is available', () => {
        const input = { value: 'fake-path' } as HTMLInputElement;
        const ref = { current: input };

        clearFileInput(ref);
        expect(input.value).toBe('');
    });

    it('does nothing when file ref is null', () => {
        const ref = { current: null };
        expect(() => clearFileInput(ref)).not.toThrow();
    });
});
