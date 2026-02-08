import { describe, expect, it } from 'vitest';
import {
    commonRules,
    validateField,
    validateForm,
    validationSchemas,
} from './validation';

describe('settings validation utilities', () => {
    describe('commonRules', () => {
        it('required validates empty values', () => {
            const requiredName = commonRules.required('Nome');
            expect(requiredName('')).toBe('Nome è obbligatorio');
            expect(requiredName('  ')).toBe('Nome è obbligatorio');
            expect(requiredName('Mario')).toBeNull();
        });

        it('minLength and maxLength validate boundaries', () => {
            const min = commonRules.minLength(3, 'Campo');
            const max = commonRules.maxLength(5, 'Campo');

            expect(min('ab')).toMatch(/almeno 3/);
            expect(min('abc')).toBeNull();
            expect(max('abcdef')).toMatch(/non può superare 5/);
            expect(max('abc')).toBeNull();
        });

        it('email validator accepts valid emails and rejects invalid ones', () => {
            const email = commonRules.email();
            expect(email('')).toBeNull();
            expect(email('test@example.com')).toBeNull();
            expect(email('bad-email')).toBe('Formato email non valido');
        });

        it('url validator enforces http/https and valid URL shape', () => {
            const url = commonRules.url();
            expect(url('')).toBeNull();
            expect(url('https://example.com/path')).toBeNull();
            expect(url('ftp://example.com')).toMatch(/iniziare con http/i);
            expect(url('http://')).toMatch(/iniziare con http/i);
        });

        it('phone validator enforces format and digit count', () => {
            const phone = commonRules.phone();
            expect(phone('')).toBeNull();
            expect(phone('+39 333 1234567')).toBeNull();
            expect(phone('abc123')).toMatch(/Formato telefono non valido/);
            expect(phone('123')).toMatch(/tra 7 e 15 cifre/);
        });

        it('password and passwordMatch validators work as expected', () => {
            const password = commonRules.password(8);
            const passwordMatch = commonRules.passwordMatch('MyPass123');

            expect(password('')).toBeNull();
            expect(password('short')).toMatch(/almeno 8/);
            expect(password('long-enough')).toBeNull();
            expect(passwordMatch('Different123')).toMatch(/non corrispondono/);
            expect(passwordMatch('MyPass123')).toBeNull();
        });

        it('pattern validator applies custom regex', () => {
            const onlyUppercase = commonRules.pattern(/^[A-Z]+$/, 'Solo maiuscole');
            expect(onlyUppercase('ABC')).toBeNull();
            expect(onlyUppercase('AbC')).toBe('Solo maiuscole');
        });
    });

    describe('validateField', () => {
        it('returns first error from rule chain', () => {
            const rules = [
                commonRules.required('Email'),
                commonRules.email(),
            ];
            expect(validateField('', rules)).toBe('Email è obbligatorio');
            expect(validateField('invalid', rules)).toBe('Formato email non valido');
            expect(validateField('ok@test.com', rules)).toBeNull();
        });
    });

    describe('validateForm', () => {
        it('validates multiple fields and returns field-keyed errors', () => {
            const rules = {
                name: commonRules.required('Nome'),
                email: [commonRules.required('Email'), commonRules.email()],
                website: commonRules.url(),
            };

            const errors = validateForm(
                {
                    name: '',
                    email: 'bad',
                    website: 'ftp://example.com',
                },
                rules,
            );

            expect(errors).toEqual({
                name: 'Nome è obbligatorio',
                email: 'Formato email non valido',
                website: 'URL deve iniziare con http:// o https://',
            });
        });

        it('returns empty errors object for valid form data', () => {
            const errors = validateForm(
                {
                    email: 'test@example.com',
                    password: 'password123',
                },
                {
                    email: validationSchemas.requiredEmail,
                    password: validationSchemas.requiredPassword,
                },
            );

            expect(errors).toEqual({});
        });
    });
});
