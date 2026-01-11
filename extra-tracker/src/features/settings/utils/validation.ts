/**
 * ✅ VALIDATION UTILITIES - Regole di validazione standardizzate
 * 
 * Sistema unificato per validare i campi form nelle impostazioni
 */

export type ValidationRule = (value: string) => string | null;

export interface ValidationRules {
    [key: string]: ValidationRule | ValidationRule[];
}

/**
 * Regole di validazione comuni
 */
export const commonRules = {
    /**
     * Valida un campo obbligatorio
     */
    required: (fieldName: string = 'Campo'): ValidationRule => (value: string) => {
        if (!value || value.trim().length === 0) {
            return `${fieldName} è obbligatorio`;
        }
        return null;
    },

    /**
     * Valida lunghezza minima
     */
    minLength: (min: number, fieldName: string = 'Campo'): ValidationRule => (value: string) => {
        if (value && value.length < min) {
            return `${fieldName} deve essere di almeno ${min} caratteri`;
        }
        return null;
    },

    /**
     * Valida lunghezza massima
     */
    maxLength: (max: number, fieldName: string = 'Campo'): ValidationRule => (value: string) => {
        if (value && value.length > max) {
            return `${fieldName} non può superare ${max} caratteri`;
        }
        return null;
    },

    /**
     * Valida formato email
     */
    email: (): ValidationRule => (value: string) => {
        if (!value) return null; // Non obbligatorio se vuoto
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return 'Formato email non valido';
        }
        return null;
    },

    /**
     * Valida formato URL
     */
    url: (): ValidationRule => (value: string) => {
        if (!value) return null; // Non obbligatorio se vuoto
        if (!/^https?:\/\/.+/.test(value)) {
            return 'URL deve iniziare con http:// o https://';
        }
        try {
            new URL(value);
            return null;
        } catch {
            return 'URL non valido';
        }
    },

    /**
     * Valida formato telefono
     */
    phone: (): ValidationRule => (value: string) => {
        if (!value) return null; // Non obbligatorio se vuoto
        // Permette numeri, spazi, +, -, (, )
        if (!/^[\d\s\+\-\(\)]+$/.test(value)) {
            return 'Formato telefono non valido';
        }
        // Rimuove caratteri non numerici per contare le cifre
        const digits = value.replace(/\D/g, '');
        if (digits.length < 7 || digits.length > 15) {
            return 'Il numero di telefono deve contenere tra 7 e 15 cifre';
        }
        return null;
    },

    /**
     * Valida password
     */
    password: (minLength: number = 8): ValidationRule => (value: string) => {
        if (!value) return null; // Non obbligatorio se vuoto
        if (value.length < minLength) {
            return `La password deve essere di almeno ${minLength} caratteri`;
        }
        return null;
    },

    /**
     * Valida corrispondenza password
     */
    passwordMatch: (otherPassword: string): ValidationRule => (value: string) => {
        if (!value) return null; // Non obbligatorio se vuoto
        if (value !== otherPassword) {
            return 'Le password non corrispondono';
        }
        return null;
    },

    /**
     * Valida pattern personalizzato
     */
    pattern: (regex: RegExp, message: string): ValidationRule => (value: string) => {
        if (!value) return null; // Non obbligatorio se vuoto
        if (!regex.test(value)) {
            return message;
        }
        return null;
    },
};

/**
 * Valida un campo con le regole specificate
 */
export const validateField = (
    value: string,
    rules: ValidationRule | ValidationRule[]
): string | null => {
    const rulesArray = Array.isArray(rules) ? rules : [rules];
    
    for (const rule of rulesArray) {
        const error = rule(value);
        if (error) {
            return error;
        }
    }
    
    return null;
};

/**
 * Valida un intero form
 */
export const validateForm = (
    formData: Record<string, string>,
    validationRules: ValidationRules
): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    Object.entries(validationRules).forEach(([fieldName, rules]) => {
        const value = formData[fieldName] || '';
        const rulesArray = Array.isArray(rules) ? rules : [rules];
        
        for (const rule of rulesArray) {
            const error = rule(value);
            if (error) {
                errors[fieldName] = error;
                break; // Mostra solo il primo errore per campo
            }
        }
    });
    
    return errors;
};

/**
 * Schemi di validazione predefiniti per tipi comuni
 */
export const validationSchemas = {
    email: [commonRules.email()],
    url: [commonRules.url()],
    phone: [commonRules.phone()],
    password: [commonRules.password(8)],
    requiredEmail: [commonRules.required('Email'), commonRules.email()],
    requiredPassword: [commonRules.required('Password'), commonRules.password(8)],
    optionalUrl: [commonRules.url()],
    optionalPhone: [commonRules.phone()],
};
