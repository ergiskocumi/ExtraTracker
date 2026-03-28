/**
 * 🔒 SETTINGS PASSWORD INPUT - Input password con show/hide
 * 
 * Input password standardizzato con:
 * - Toggle show/hide password
 * - Indicatore forza password (opzionale)
 * - Touch-friendly button
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { SettingsField } from './SettingsField';

interface PasswordStrength {
    strength: number;
    label: string;
    color: string;
}

const getPasswordStrength = (password: string): PasswordStrength => {
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

interface SettingsPasswordInputProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    required?: boolean;
    error?: string;
    hint?: string;
    tooltipTitle?: string;
    tooltipContent?: string;
    showStrength?: boolean;
    autoComplete?: 'current-password' | 'new-password';
    disabled?: boolean;
    id?: string;
}

export const SettingsPasswordInput: React.FC<SettingsPasswordInputProps> = ({
    label,
    name,
    value,
    onChange,
    placeholder,
    icon = Lock,
    required = false,
    error,
    hint,
    tooltipTitle,
    tooltipContent,
    showStrength = false,
    autoComplete,
    disabled = false,
    id,
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const strength = showStrength ? getPasswordStrength(value) : null;
    const hasValue = value.length > 0;
    const showSuccess = hasValue && !error;

    // Determina autoComplete se non fornito
    const getAutoComplete = () => {
        if (autoComplete) return autoComplete;
        return name.includes('current') ? 'current-password' : 'new-password';
    };

    return (
        <SettingsField
            label={label}
            icon={icon}
            required={required}
            error={error}
            hint={hint}
            tooltipTitle={tooltipTitle}
            tooltipContent={tooltipContent}
        >
            <div className="relative">
                <input
                    id={id || `setting-${name}`}
                    name={name}
                    type={showPassword ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    placeholder={placeholder || `Inserisci ${label.toLowerCase()}`}
                    autoComplete={getAutoComplete()}
                    className={`w-full input pr-12 ${
                        error 
                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' 
                            : showSuccess
                            ? 'border-emerald-500/30 focus:border-emerald-500/50'
                            : ''
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <button
                    type="button"
                    onClick={() => !disabled && setShowPassword(!showPassword)}
                    disabled={disabled}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                    aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            </div>
            
            {/* Password Strength Indicator */}
            {showStrength && value && strength && strength.strength > 0 && (
                <div className="space-y-2">
                    <div className="flex gap-1 h-1.5">
                        {[1, 2, 3, 4, 5].map((level) => (
                            <motion.div
                                key={level}
                                initial={{ scaleX: 0 }}
                                animate={{ 
                                    scaleX: level <= strength.strength ? 1 : 0,
                                    backgroundColor: level <= strength.strength 
                                        ? strength.color.replace('bg-', '') 
                                        : 'rgba(255, 255, 255, 0.1)'
                                }}
                                transition={{ duration: 0.3 }}
                                className="flex-1 rounded-full"
                            />
                        ))}
                    </div>
                    <p className={`text-xs font-medium ${
                        strength.strength <= 2 ? 'text-red-400' :
                        strength.strength === 3 ? 'text-yellow-400' :
                        'text-emerald-400'
                    }`}>
                        Forza: {strength.label}
                    </p>
                </div>
            )}
        </SettingsField>
    );
};
