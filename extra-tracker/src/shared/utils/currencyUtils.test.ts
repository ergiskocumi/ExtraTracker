import { describe, expect, it } from 'vitest';
import { formatCurrency, formatCurrencyCompact, getCurrencySymbol } from './currencyUtils';

describe('currencyUtils', () => {
    describe('formatCurrency', () => {
        it('formatta correttamente in Euro (default)', () => {
            // Nota: Intl.NumberFormat può variare tra ambienti (posizione simbolo, spazi, separatori)
            const result = formatCurrency(1234.56);
            // Verifichiamo la presenza dei componenti essenziali invece di una stringa esatta
            expect(result).toContain('1');
            expect(result).toContain('234,56');
            expect(result).toContain('€');
        });

        it('formatta correttamente in USD', () => {
            const result = formatCurrency(1234.56, 'USD');
            expect(result).toContain('1');
            expect(result).toContain('234.56');
            expect(result).toContain('$');
        });

        it('formatta correttamente in GBP', () => {
            const result = formatCurrency(1234.56, 'GBP');
            expect(result).toContain('1');
            expect(result).toContain('234.56');
            expect(result).toContain('£');
        });

        it('gestisce importi negativi', () => {
            const result = formatCurrency(-50, 'EUR');
            expect(result).toMatch(/-50,00/);
        });

        it('gestisce lo zero', () => {
            const result = formatCurrency(0, 'EUR');
            expect(result).toMatch(/0,00/);
        });

        it('usa il locale it-IT per valute sconosciute', () => {
            const result = formatCurrency(100, 'XYZ');
            expect(result).toMatch(/100,00/);
        });
    });

    describe('formatCurrencyCompact', () => {
        it('formatta in modo compatto per EUR', () => {
            const result = formatCurrencyCompact(1234.56);
            expect(result).toContain('€');
            expect(result).toContain('1');
            expect(result).toContain('234,56');
        });

        it('formatta in modo compatto per USD', () => {
            const result = formatCurrencyCompact(1234.56, 'USD');
            expect(result).toContain('$');
            expect(result).toContain('1');
            expect(result).toContain('234,56');
        });

        it('gestisce valute non in mappa con simbolo default €', () => {
            const result = formatCurrencyCompact(100, 'JPY');
            expect(result).toContain('€');
            expect(result).toContain('100,00');
        });
    });

    describe('getCurrencySymbol', () => {
        it('restituisce il simbolo corretto per EUR', () => {
            expect(getCurrencySymbol('EUR')).toBe('€');
        });

        it('restituisce il simbolo corretto per USD', () => {
            expect(getCurrencySymbol('USD')).toBe('$');
        });

        it('restituisce il simbolo corretto per GBP', () => {
            expect(getCurrencySymbol('GBP')).toBe('£');
        });

        it('restituisce il simbolo corretto per CHF', () => {
            expect(getCurrencySymbol('CHF')).toBe('CHF');
        });

        it('restituisce € come default per valute sconosciute', () => {
            expect(getCurrencySymbol('XYZ')).toBe('€');
        });
    });
});
