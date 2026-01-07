import { describe, expect, it } from 'vitest';
import { 
    emailSchema, 
    passwordSchema, 
    loginSchema, 
    registerSchema, 
    changePasswordSchema 
} from './authValidators';

describe('Auth Validators (Zod Schemas)', () => {

    // TEST SCHEMA EMAIL
    describe('emailSchema', () => {
        it('accetta email valide', () => {
            const result = emailSchema.safeParse('test@example.com');
            expect(result.success).toBe(true);
        });

        it('rifiuta email non valide', () => {
            const invalidEmails = ['plainstring', 'test@', '@domain.com', 'test@.com'];
            invalidEmails.forEach(email => {
                const result = emailSchema.safeParse(email);
                expect(result.success).toBe(false);
                if (!result.success) {
                    // Verifica che il messaggio sia quello di Zod ("Formato email non valido")
                    expect(result.error.issues[0].message).toBe('Formato email non valido');
                }
            });
        });

        it('rifiuta stringa vuota', () => {
            const result = emailSchema.safeParse('');
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe('Email obbligatoria');
            }
        });
    });

    // TEST SCHEMA PASSWORD (COMPLESSITÀ)
    describe('passwordSchema', () => {
        it('accetta password forti', () => {
            // 8+ chars, 1 Maiusc, 1 Minusc, 1 Numero
            const validPass = 'Password123'; 
            const result = passwordSchema.safeParse(validPass);
            expect(result.success).toBe(true);
        });

        it('rifiuta password troppo corte (< 8)', () => {
            const result = passwordSchema.safeParse('Pass12');
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe('Password deve essere almeno 8 caratteri');
            }
        });

        it('rifiuta password senza numeri', () => {
            const result = passwordSchema.safeParse('PasswordOnly');
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Deve contenere almeno');
            }
        });

        it('rifiuta password senza maiuscole', () => {
            const result = passwordSchema.safeParse('password123');
            expect(result.success).toBe(false);
        });

        it('rifiuta password senza minuscole', () => {
            const result = passwordSchema.safeParse('PASSWORD123');
            expect(result.success).toBe(false);
        });
    });

    // TEST REGISTER (MATCH PASSWORD)
    describe('registerSchema', () => {
        const validData = {
            email: 'newuser@example.com',
            password: 'Password123',
            confirmPassword: 'Password123',
            acceptTerms: true
        };

        it('accetta dati validi completi', () => {
            const result = registerSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('rifiuta se le password non coincidono', () => {
            const mismatchData = { ...validData, confirmPassword: 'Password123_DIVERSA' };
            const result = registerSchema.safeParse(mismatchData);
            
            expect(result.success).toBe(false);
            if (!result.success) {
                // Cerchiamo l'errore specifico nel campo confirmPassword
                const error = result.error.issues.find(i => i.path.includes('confirmPassword'));
                expect(error?.message).toBe('Le password non coincidono');
            }
        });

        it('rifiuta se non accetti i termini', () => {
            const noTermsData = { ...validData, acceptTerms: false };
            const result = registerSchema.safeParse(noTermsData);
            
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe('Devi accettare i termini e condizioni');
            }
        });
    });

    // TEST CHANGE PASSWORD (NEW != OLD)
    describe('changePasswordSchema', () => {
        const validChange = {
            currentPassword: 'OldPassword123',
            newPassword: 'NewPassword123',
            confirmPassword: 'NewPassword123'
        };

        it('accetta cambio password valido', () => {
            const result = changePasswordSchema.safeParse(validChange);
            expect(result.success).toBe(true);
        });

        it('rifiuta se la nuova password è uguale alla vecchia', () => {
            const samePassData = { 
                currentPassword: 'SamePassword123',
                newPassword: 'SamePassword123',
                confirmPassword: 'SamePassword123'
            };
            const result = changePasswordSchema.safeParse(samePassData);

            expect(result.success).toBe(false);
            if (!result.success) {
                const error = result.error.issues.find(i => i.path.includes('newPassword'));
                expect(error?.message).toBe('La nuova password deve essere diversa dalla precedente');
            }
        });
    });

    // TEST SCENARI STRESS & TAMPERING
    describe('stress & tampering scenarios', () => {
        it('rifiuta email sopra i 255 caratteri', () => {
            const longEmail = `${'a'.repeat(256)}@example.com`;
            const result = emailSchema.safeParse(longEmail);
            expect(result.success).toBe(false);
            if (!result.success) {
                const messages = result.error.issues.map(i => i.message);
                expect(messages).toContain('Email troppo lunga');
            }
        });

        
        it('rifiuta email non stringa (payload manomesso)', () => {
            const result = emailSchema.safeParse({ toString: () => 'test@example.com' });
            expect(result.success).toBe(false);
            if (!result.success) {
                const messages = result.error.issues.map(i => i.message);
                expect(messages.some(msg => msg.toLowerCase().includes('expected string'))).toBe(true);
            }
        });

        it('rifiuta password superiore a 128 caratteri', () => {
            const longPassword = 'A1a'.repeat(43) + 'B';
            const result = passwordSchema.safeParse(longPassword);
            expect(result.success).toBe(false);
            if (!result.success) {
                const messages = result.error.issues.map(i => i.message);
                expect(messages).toContain('Password troppo lunga');
            }
        });

        it('loginSchema non accetta payload incompleto o tipi errati', () => {
            const result = loginSchema.safeParse({ email: 'test@example.com' });
            expect(result.success).toBe(false);
            if (!result.success) {
                const passwordIssue = result.error.issues.find(i => i.path.includes('password'));
                expect(passwordIssue).toBeDefined();
                expect(passwordIssue?.message).toBeDefined();
            }

            const wrongTypeResult = loginSchema.safeParse({ email: 1234, password: 'abc' });
            expect(wrongTypeResult.success).toBe(false);
            if (!wrongTypeResult.success) {
                const emailIssue = wrongTypeResult.error.issues.find(i => i.path.includes('email'));
                expect(emailIssue).toBeDefined();
                expect(emailIssue?.message.toLowerCase()).toContain('expected string');
            }
        });

        it('registerSchema rifiuta tolleranze sul tipo di acceptTerms', () => {
            const payload = {
                email: 'valid@example.com',
                password: 'Password123',
                confirmPassword: 'Password123',
                acceptTerms: 'true',
            };
            const result = registerSchema.safeParse(payload as any);
            expect(result.success).toBe(false);
            if (!result.success) {
                const issue = result.error.issues.find(i => i.path.includes('acceptTerms'));
                expect(issue?.message).toContain('expected boolean');
            }
        });

        it('changePasswordSchema difende il confirmPassword mancante e i tipi sbagliati', () => {
            const noConfirm = {
                currentPassword: 'OldPassword123',
                newPassword: 'NewPassword123',
            } as any;
            const result = changePasswordSchema.safeParse(noConfirm);
            expect(result.success).toBe(false);
            if (!result.success) {
                const issue = result.error.issues.find(i => i.path.includes('confirmPassword'));
                expect(issue?.message.toLowerCase()).toContain('expected string');
            }

            const wrongType = {
                currentPassword: 'OldPassword123',
                newPassword: 'NewPassword123',
                confirmPassword: 123,
            } as any;
            const typeResult = changePasswordSchema.safeParse(wrongType);
            expect(typeResult.success).toBe(false);
            if (!typeResult.success) {
                const messages = typeResult.error.issues.map(i => i.message);
                expect(messages.some(msg => msg.toLowerCase().includes('expected string'))).toBe(true);
            }
        });
    });
});