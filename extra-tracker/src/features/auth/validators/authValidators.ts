/**
 * 📝 VALIDATORI ZOD - Frontend
 * 
 * Stessi schemi del backend per validazione client-side
 * Vantaggi: feedback immediato, riduce chiamate API inutili
 */

import { z } from 'zod';

// ==========================================
// SCHEMI
// ==========================================

export const emailSchema = z
    .string()
    .min(1, 'Email obbligatoria')
    .email('Formato email non valido')
    .max(255, 'Email troppo lunga');

export const passwordSchema = z
    .string()
    .min(8, 'Password deve essere almeno 8 caratteri')
    .max(128, 'Password troppo lunga')
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Deve contenere almeno: 1 maiuscola, 1 minuscola, 1 numero'
    );

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password obbligatoria'),
});

export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Conferma password obbligatoria'),
    acceptTerms: z.boolean().refine((val) => val === true, {
        message: 'Devi accettare i termini e condizioni',
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Password attuale obbligatoria'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Conferma password obbligatoria'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nuova password deve essere diversa dalla precedente',
    path: ['newPassword'],
});

// ==========================================
// TIPI DERIVATI
// ==========================================

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
