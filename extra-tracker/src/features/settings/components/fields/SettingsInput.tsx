/**
 * 📝 SETTINGS INPUT - Input text unificato
 * 
 * Input standardizzato con:
 * - Validazione visiva
 * - Icona di successo
 * - Touch-friendly (44px min-height, 16px font-size)
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { SettingsField } from './SettingsField';

interface SettingsInputProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: 'text' | 'email' | 'tel' | 'url' | 'password' | 'search';
    placeholder?: string;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    required?: boolean;
    error?: string;
    hint?: string;
    tooltipTitle?: string;
    tooltipContent?: string;
    autoComplete?: string;
    disabled?: boolean;
    id?: string;
}

export const SettingsInput: React.FC<SettingsInputProps> = ({
    label,
    name,
    value,
    onChange,
    type = 'text',
    placeholder,
    icon,
    required = false,
    error,
    hint,
    tooltipTitle,
    tooltipContent,
    autoComplete,
    disabled = false,
    id,
}) => {
    const hasValue = value.length > 0;
    const showSuccess = hasValue && !error;

    // Determina autoComplete se non fornito
    const getAutoComplete = () => {
        if (autoComplete) return autoComplete;
        if (type === 'email') return 'email';
        if (type === 'tel') return 'tel';
        if (type === 'url') return 'url';
        if (name.includes('password')) return name.includes('current') ? 'current-password' : 'new-password';
        return 'off';
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
                    type={type}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    placeholder={placeholder || `Inserisci ${label.toLowerCase()}`}
                    autoComplete={getAutoComplete()}
                    className={`w-full input ${
                        error 
                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' 
                            : showSuccess
                            ? 'border-emerald-500/30 focus:border-emerald-500/50'
                            : ''
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        >
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </SettingsField>
    );
};
