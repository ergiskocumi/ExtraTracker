/**
 * 🔒 SECURITY SETTINGS - Premium Security Management
 * 
 * Design premium con indicatori di forza password e validazione
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Key, 
    Lock, 
    Eye, 
    EyeOff, 
    CheckCircle2, 
    AlertCircle,
    Shield,
    AlertTriangle
} from 'lucide-react';
import type { FormStatus } from './types';

interface SecuritySettingsProps {
    onChangePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<boolean>;
    status: FormStatus;
}

// Password Strength Indicator
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

// Password Field Component
const PasswordField = ({ 
    label, 
    name, 
    value, 
    onChange, 
    showStrength = false,
    error 
}: { 
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    showStrength?: boolean;
    error?: string;
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const strength = showStrength ? getPasswordStrength(value) : null;

    return (
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-white/80">
                <Lock className="w-4 h-4 text-white/50" />
                {label}
            </label>
            <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    name={name}
                    value={value}
                    onChange={onChange}
                    className={`w-full input pr-12 ${
                        error 
                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' 
                            : value && !error
                            ? 'border-emerald-500/30 focus:border-emerald-500/50'
                            : ''
                    }`}
                    placeholder={`Inserisci ${label.toLowerCase()}`}
                    autoComplete={name === 'currentPassword' ? 'current-password' : name === 'newPassword' ? 'new-password' : 'new-password'}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            </div>
            
            {/* Password Strength Indicator */}
            {showStrength && value && (
                <div className="space-y-2">
                    <div className="flex gap-1 h-1.5">
                        {[1, 2, 3, 4, 5].map((level) => (
                            <motion.div
                                key={level}
                                initial={{ scaleX: 0 }}
                                animate={{ 
                                    scaleX: level <= (strength?.strength || 0) ? 1 : 0,
                                    backgroundColor: level <= (strength?.strength || 0) 
                                        ? strength?.color.replace('bg-', '') 
                                        : 'rgba(255, 255, 255, 0.1)'
                                }}
                                transition={{ duration: 0.3 }}
                                className="flex-1 rounded-full"
                            />
                        ))}
                    </div>
                    {strength && strength.strength > 0 && (
                        <p className={`text-xs font-medium ${
                            strength.strength <= 2 ? 'text-red-400' :
                            strength.strength === 3 ? 'text-yellow-400' :
                            'text-emerald-400'
                        }`}>
                            Forza: {strength.label}
                        </p>
                    )}
                </div>
            )}

            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-400 flex items-center gap-1"
                >
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </motion.p>
            )}
        </div>
    );
};

export const SecuritySettings = ({ onChangePassword, status }: SecuritySettingsProps) => {
    const [formData, setFormData] = useState({ 
        currentPassword: '', 
        newPassword: '', 
        confirmPassword: '' 
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        // Validate confirm password in real-time
        if (name === 'confirmPassword' && value && value !== formData.newPassword) {
            setErrors(prev => ({ ...prev, confirmPassword: 'Le password non corrispondono' }));
        } else if (name === 'confirmPassword' && value === formData.newPassword) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.confirmPassword;
                return newErrors;
            });
        }

        // Validate new password when confirm changes
        if (name === 'newPassword' && formData.confirmPassword && value !== formData.confirmPassword) {
            setErrors(prev => ({ ...prev, confirmPassword: 'Le password non corrispondono' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        const newErrors: Record<string, string> = {};
        
        if (!formData.currentPassword) {
            newErrors.currentPassword = 'Password attuale richiesta';
        }
        
        if (!formData.newPassword) {
            newErrors.newPassword = 'Nuova password richiesta';
        } else if (formData.newPassword.length < 8) {
            newErrors.newPassword = 'La password deve essere di almeno 8 caratteri';
        }
        
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Conferma password richiesta';
        } else if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Le password non corrispondono';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const success = await onChangePassword(formData);
        if (success) {
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setErrors({});
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
                <PasswordField
                    label="Password attuale"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    error={errors.currentPassword}
                />

                <PasswordField
                    label="Nuova password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    showStrength={true}
                    error={errors.newPassword}
                />

                <PasswordField
                    label="Conferma nuova password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
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
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3"
                    >
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-sm text-red-300">{status.error}</p>
                    </motion.div>
                )}
                {status.success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3"
                    >
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <p className="text-sm text-emerald-300">Password aggiornata con successo!</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                <p className="text-sm text-white/50">
                    {formData.newPassword && formData.confirmPassword && !errors.confirmPassword
                        ? 'Pronto per aggiornare'
                        : 'Compila tutti i campi'}
                </p>
                <motion.button
                type="submit"
                    disabled={status.loading || Object.keys(errors).length > 0 || !formData.newPassword}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`btn-primary px-6 py-3 ${
                        Object.keys(errors).length > 0 || !formData.newPassword
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
