/**
 * 📝 SETTINGS TEXTAREA - Textarea unificato
 * 
 * Textarea standardizzato con:
 * - Contatore caratteri
 * - Touch-friendly
 * - Validazione visiva
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { SettingsField } from './SettingsField';

interface SettingsTextareaProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    required?: boolean;
    error?: string;
    hint?: string;
    tooltipTitle?: string;
    tooltipContent?: string;
    rows?: number;
    maxLength?: number;
    disabled?: boolean;
    id?: string;
}

export const SettingsTextarea: React.FC<SettingsTextareaProps> = ({
    label,
    name,
    value,
    onChange,
    placeholder,
    icon = FileText,
    required = false,
    error,
    hint,
    tooltipTitle,
    tooltipContent,
    rows = 4,
    maxLength,
    disabled = false,
    id,
}) => {
    const characterCount = value.length;
    const showCount = maxLength !== undefined;

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
                <textarea
                    id={id || `setting-${name}`}
                    name={name}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    rows={rows}
                    maxLength={maxLength}
                    placeholder={placeholder || `Inserisci ${label.toLowerCase()}`}
                    className={`w-full input resize-none min-h-[120px] md:min-h-[100px] ${
                        error 
                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' 
                            : value && !error
                            ? 'border-emerald-500/30 focus:border-emerald-500/50'
                            : ''
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
            </div>
            {showCount && (
                <p className={`text-xs ${
                    characterCount >= maxLength 
                        ? 'text-red-400' 
                        : characterCount >= maxLength * 0.9
                        ? 'text-amber-400'
                        : 'text-white/40'
                }`}>
                    {characterCount} / {maxLength} caratteri
                </p>
            )}
        </SettingsField>
    );
};
