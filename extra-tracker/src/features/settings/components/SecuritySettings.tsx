/**
 * 🔒 SECURITY SETTINGS - Premium Security Management
 * 
 * Design premium con indicatori di forza password e validazione
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import type { FormStatus } from './types';
import { SettingsPasswordInput } from './fields';
import { useFormValidation } from '../hooks/useFormValidation';
import { commonRules, validationSchemas } from '../utils/validation';
import { SettingsError, SettingsSuccess } from './feedback';

interface SecuritySettingsProps {
    onChangePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<boolean>;
    status: FormStatus;
}

// Password Strength Indicator (per i requisiti)
const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    const levels = [
        { label: 'Molto debole', color: 'bg-red-500' },
        { label: 'Debole', color: 'bg-orange-500' },
        { label: 'Media', color: 'bg-yellow-500' },
        { label: 'Forte', color: 'bg-emerald-500' },
        { label: 'Molto forte', color: 'bg-green-500' },
    ];

    return {
        strength: Math.min(strength, 5),
        label: levels[Math.min(strength - 1, 4)]?.label || '',
        color: levels[Math.min(strength - 1, 4)]?.color || '',
    };
};

export const SecuritySettings = ({ onChangePassword, status }: SecuritySettingsProps) => {
    const [formData, setFormData] = useState({ 
        currentPassword: '', 
        newPassword: '', 
        confirmPassword: '' 
    });

    // Sistema di validazione standardizzato
    const validation = useFormValidation<typeof formData>({
        validationRules: {
            currentPassword: [commonRules.required('Password attuale')],
            newPassword: validationSchemas.requiredPassword,
            confirmPassword: [
                commonRules.required('Conferma password'),
                commonRules.passwordMatch(formData.newPassword),
            ],
        },
        validateOnChange: true,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value };
        setFormData(newFormData);
        
        // Validazione in tempo reale
        if (name === 'newPassword') {
            // Valida la nuova password
            const error = validation.validateField(name, value);
            validation.setError(name, error);
            
            // Valida anche la conferma se esiste (con la nuova password)
            if (newFormData.confirmPassword) {
                const confirmError = commonRules.passwordMatch(value)(newFormData.confirmPassword);
                validation.setError('confirmPassword', confirmError);
            }
        } else if (name === 'confirmPassword') {
            // Valida la conferma con la password corrente
            const confirmError = commonRules.passwordMatch(formData.newPassword)(value);
            validation.setError('confirmPassword', confirmError);
        } else {
            const error = validation.validateField(name as keyof typeof formData, value);
            validation.setError(name as keyof typeof formData, error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validazione finale - aggiorna le regole per confirmPassword con la password corrente
        const finalErrors: Record<string, string> = {};
        
        // Valida currentPassword
        const currentError = commonRules.required('Password attuale')(formData.currentPassword);
        if (currentError) finalErrors.currentPassword = currentError;
        
        // Valida newPassword
        const newError = validation.validateField('newPassword', formData.newPassword);
        if (newError) finalErrors.newPassword = newError;
        
        // Valida confirmPassword con la password corrente
        const confirmError = commonRules.passwordMatch(formData.newPassword)(formData.confirmPassword);
        if (confirmError) finalErrors.confirmPassword = confirmError;
        else {
            const requiredError = commonRules.required('Conferma password')(formData.confirmPassword);
            if (requiredError) finalErrors.confirmPassword = requiredError;
        }
        
        if (Object.keys(finalErrors).length > 0) {
            Object.entries(finalErrors).forEach(([key, value]) => {
                validation.setError(key as keyof typeof formData, value);
            });
            return;
        }

        const success = await onChangePassword(formData);
        if (success) {
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            validation.clearAllErrors();
        }
    };

    const strength = getPasswordStrength(formData.newPassword);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Security Info */}
            <div className="rounded-2xl border border-primary-500/20 bg-primary-500/10 p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary-400 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-white mb-1">Sicurezza password</p>
                    <p className="text-xs text-white/60">
                        Usa una password forte con almeno 8 caratteri, includendo lettere maiuscole, minuscole, numeri e simboli.
                    </p>
                </div>
            </div>

            {/* Password Fields */}
            <div className="space-y-4 md:space-y-5">
                <SettingsPasswordInput
                    label="Password attuale"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    error={validation.errors.currentPassword}
                    autoComplete="current-password"
                />

                <SettingsPasswordInput
                    label="Nuova password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    showStrength={true}
                    error={validation.errors.newPassword}
                    autoComplete="new-password"
                />

                <SettingsPasswordInput
                    label="Conferma nuova password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={validation.errors.confirmPassword}
                    autoComplete="new-password"
                />
            </div>

            {/* Password Requirements */}
            {formData.newPassword && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-xl border border-white/[0.1] bg-white/[0.03] p-4 space-y-2"
                >
                    <p className="text-xs font-semibold text-white/70 mb-2">Requisiti password:</p>
                    {[
                        { check: formData.newPassword.length >= 8, text: 'Almeno 8 caratteri' },
                        { check: /[a-z]/.test(formData.newPassword) && /[A-Z]/.test(formData.newPassword), text: 'Lettere maiuscole e minuscole' },
                        { check: /\d/.test(formData.newPassword), text: 'Almeno un numero' },
                        { check: /[^a-zA-Z\d]/.test(formData.newPassword), text: 'Almeno un simbolo speciale' },
                    ].map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                            {req.check ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-white/30" />
                            )}
                            <span className={req.check ? 'text-emerald-300' : 'text-white/50'}>
                                {req.text}
                            </span>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* Status Messages */}
            <AnimatePresence>
                {status.error && (
                    <SettingsError
                        message={status.error}
                        title="Errore nel cambio password"
                    />
                )}
                {status.success && (
                    <SettingsSuccess
                        message="Password aggiornata con successo!"
                        title="Password aggiornata"
                    />
                )}
            </AnimatePresence>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                <p className="text-sm text-white/50">
                    {formData.newPassword && formData.confirmPassword && !validation.errors.confirmPassword
                        ? 'Pronto per aggiornare'
                        : 'Compila tutti i campi'}
                </p>
                <motion.button
                type="submit"
                    disabled={status.loading || validation.hasErrors || !formData.newPassword}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`btn-primary px-6 py-3 ${
                        validation.hasErrors || !formData.newPassword
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                    }`}
                >
                    {status.loading ? (
                        <span className="flex items-center gap-2">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            />
                            Aggiornamento...
                        </span>
                    ) : (
                        'Aggiorna password'
                    )}
                </motion.button>
            </div>
        </form>
    );
};
