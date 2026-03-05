/**
 * 🔒 SECURITY SETTINGS v2 - Design moderno e pulito
 * 
 * Features:
 * - Card organizzata per cambio password
 * - Password strength indicator
 * - Checklist requisiti in tempo reale
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import type { FormStatus } from './types';
import { SettingsCard } from './SettingsCard';
import { useFormValidation } from '../hooks/useFormValidation';
import { commonRules, validationSchemas } from '../utils/validation';
import { cn } from '../../../lib/utils';

interface SecuritySettingsProps {
  onChangePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<boolean>;
  status: FormStatus;
}

export const SecuritySettings = ({ onChangePassword, status }: SecuritySettingsProps) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

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

    if (name === 'newPassword') {
      const error = validation.validateField(name, value);
      validation.setError(name, error);
      if (newFormData.confirmPassword) {
        const confirmError = commonRules.passwordMatch(value)(newFormData.confirmPassword);
        validation.setError('confirmPassword', confirmError);
      }
    } else if (name === 'confirmPassword') {
      const confirmError = commonRules.passwordMatch(formData.newPassword)(value);
      validation.setError('confirmPassword', confirmError);
    } else {
      const error = validation.validateField(name as keyof typeof formData, value);
      validation.setError(name as keyof typeof formData, error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalErrors: Record<string, string> = {};
    const currentError = commonRules.required('Password attuale')(formData.currentPassword);
    if (currentError) finalErrors.currentPassword = currentError;

    const newError = validation.validateField('newPassword', formData.newPassword);
    if (newError) finalErrors.newPassword = newError;

    const confirmError = commonRules.passwordMatch(formData.newPassword)(formData.confirmPassword);
    if (confirmError) finalErrors.confirmPassword = confirmError;

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

  // Calcola forza password
  const getStrength = (password: string) => {
    if (!password) return { level: 0, label: '', color: '' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    const levels = [
      { label: 'Molto debole', color: 'bg-red-500' },
      { label: 'Debole', color: 'bg-orange-500' },
      { label: 'Media', color: 'bg-yellow-500' },
      { label: 'Forte', color: 'bg-emerald-500' },
      { label: 'Molto forte', color: 'bg-green-500' },
    ];

    return {
      level: score,
      label: levels[Math.min(score - 1, 4)]?.label || '',
      color: levels[Math.min(score - 1, 4)]?.color || '',
    };
  };

  const strength = getStrength(formData.newPassword);

  const passwordRequirements = [
    { check: formData.newPassword.length >= 8, text: 'Almeno 8 caratteri' },
    { check: /[a-z]/.test(formData.newPassword) && /[A-Z]/.test(formData.newPassword), text: 'Maiuscole e minuscole' },
    { check: /\d/.test(formData.newPassword), text: 'Almeno un numero' },
    { check: /[^a-zA-Z\d]/.test(formData.newPassword), text: 'Almeno un simbolo' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Password Change Card */}
      <SettingsCard
        title="Cambia Password"
        description="Aggiorna la password del tuo account"
        icon={KeyRound}
      >
        <div className="space-y-5">
          {/* Current Password */}
          <PasswordField
            label="Password attuale"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            showPassword={showPasswords.current}
            onToggleShow={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
            error={validation.errors.currentPassword}
          />

          {/* New Password */}
          <div>
            <PasswordField
              label="Nuova password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              showPassword={showPasswords.new}
              onToggleShow={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
              error={validation.errors.newPassword}
            />
            
            {/* Strength Bar */}
            {formData.newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-theme-subtle rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(strength.level / 5) * 100}%` }}
                      className={cn("h-full rounded-full", strength.color)}
                    />
                  </div>
                  <span className="text-xs text-theme-muted min-w-[80px] text-right">
                    {strength.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <PasswordField
            label="Conferma nuova password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            showPassword={showPasswords.confirm}
            onToggleShow={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
            error={validation.errors.confirmPassword}
          />
        </div>

        {/* Requirements Checklist */}
        {formData.newPassword && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-5 p-4 rounded-xl bg-theme-subtle/30 border border-theme-default"
          >
            <p className="text-xs font-medium text-theme-secondary mb-3">Requisiti password:</p>
            <div className="grid grid-cols-2 gap-2">
              {passwordRequirements.map((req, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  {req.check ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-theme-muted shrink-0" />
                  )}
                  <span className={req.check ? 'text-theme-primary' : 'text-theme-muted'}>
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </SettingsCard>

      {/* Security Tips Card */}
      <SettingsCard
        title="Consigli di Sicurezza"
        description="Mantieni il tuo account al sicuro"
        icon={Shield}
      >
        <div className="space-y-3">
          {[
            'Usa una password univoca per questo account',
            'Non condividere la tua password con nessuno',
            'Cambia la password ogni 3-6 mesi',
            'Attiva l\'autenticazione a due fattori se disponibile',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <Shield className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
              <span className="text-theme-secondary">{tip}</span>
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Status Messages */}
      <AnimatePresence>
        {status.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{status.error}</p>
          </motion.div>
        )}
        {status.success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="text-sm">Password aggiornata con successo!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <div className="flex justify-end">
        <motion.button
          type="submit"
          disabled={status.loading || validation.hasErrors || !formData.newPassword}
          whileHover={!validation.hasErrors && formData.newPassword ? { scale: 1.02 } : {}}
          whileTap={!validation.hasErrors && formData.newPassword ? { scale: 0.98 } : {}}
          className={cn(
            "px-8 py-3 rounded-xl font-semibold text-white transition-all",
            !validation.hasErrors && formData.newPassword && !status.loading
              ? "bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/25"
              : "bg-theme-subtle text-theme-muted cursor-not-allowed"
          )}
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

// ============================================
// PASSWORD FIELD COMPONENT
// ============================================

interface PasswordFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPassword: boolean;
  onToggleShow: () => void;
  error?: string;
}

const PasswordField = ({ label, name, value, onChange, showPassword, onToggleShow, error }: PasswordFieldProps) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-theme-primary">{label}</label>
    <div className="relative">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted">
        <Lock className="w-5 h-5" />
      </div>
      <input
        type={showPassword ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        className={cn(
          "w-full pl-11 pr-11 py-3 rounded-xl border bg-theme-card text-theme-primary",
          "placeholder:text-theme-muted",
          "focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500",
          "transition-all duration-200",
          error ? "border-red-500" : "border-theme-default hover:border-theme-strong"
        )}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors"
      >
        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

export default SecuritySettings;
