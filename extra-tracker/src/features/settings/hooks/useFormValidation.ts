/**
 * 🎯 USE FORM VALIDATION - Hook per gestione validazione form
 * 
 * Hook standardizzato per gestire validazione in tempo reale e al submit
 */

import { useState, useCallback, useMemo } from 'react';
import type { ValidationRules } from '../utils/validation';
import { validateField, validateForm } from '../utils/validation';

interface UseFormValidationOptions {
    validationRules: ValidationRules;
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
}

interface UseFormValidationReturn<T extends Record<string, string>> {
    errors: Record<string, string>;
    validateField: (fieldName: keyof T, value: string) => string | null;
    validateForm: (formData: T) => Record<string, string>;
    setError: (fieldName: keyof T, error: string | null) => void;
    clearError: (fieldName: keyof T) => void;
    clearAllErrors: () => void;
    hasErrors: boolean;
    isValid: (formData: T) => boolean;
}

export const useFormValidation = <T extends Record<string, string>>(
    options: UseFormValidationOptions
): UseFormValidationReturn<T> => {
    const { validationRules, validateOnChange = true, validateOnBlur = true } = options;
    const [errors, setErrors] = useState<Record<string, string>>({});

    /**
     * Valida un singolo campo
     */
    const validateSingleField = useCallback(
        (fieldName: keyof T, value: string): string | null => {
            const rule = validationRules[fieldName as string];
            if (!rule) return null;

            return validateField(value, rule);
        },
        [validationRules]
    );

    /**
     * Valida l'intero form
     */
    const validateEntireForm = useCallback(
        (formData: T): Record<string, string> => {
            return validateForm(formData, validationRules);
        },
        [validationRules]
    );

    /**
     * Imposta un errore per un campo specifico
     */
    const setError = useCallback((fieldName: keyof T, error: string | null) => {
        setErrors((prev) => {
            if (error === null) {
                const newErrors = { ...prev };
                delete newErrors[fieldName as string];
                return newErrors;
            }
            return { ...prev, [fieldName as string]: error };
        });
    }, []);

    /**
     * Rimuove l'errore di un campo specifico
     */
    const clearError = useCallback((fieldName: keyof T) => {
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[fieldName as string];
            return newErrors;
        });
    }, []);

    /**
     * Rimuove tutti gli errori
     */
    const clearAllErrors = useCallback(() => {
        setErrors({});
    }, []);

    /**
     * Verifica se ci sono errori
     */
    const hasErrors = useMemo(() => {
        return Object.keys(errors).length > 0;
    }, [errors]);

    /**
     * Verifica se il form è valido
     */
    const isValid = useCallback(
        (formData: T): boolean => {
            const formErrors = validateEntireForm(formData);
            return Object.keys(formErrors).length === 0;
        },
        [validateEntireForm]
    );

    return {
        errors,
        validateField: validateSingleField,
        validateForm: validateEntireForm,
        setError,
        clearError,
        clearAllErrors,
        hasErrors,
        isValid,
    };
};
