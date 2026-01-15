/**
 * 📝 SETTINGS SELECT - Select dropdown unificato
 * 
 * Select standardizzato con:
 * - Icona personalizzata
 * - Touch-friendly
 * - Stile consistente
 */

import React from 'react';
import { Globe } from 'lucide-react';
import { SettingsField } from './SettingsField';

interface SelectOption {
    value: string;
    label: string;
}

interface SettingsSelectProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: SelectOption[];
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    required?: boolean;
    error?: string;
    hint?: string;
    tooltipTitle?: string;
    tooltipContent?: string;
    disabled?: boolean;
    id?: string;
}

export const SettingsSelect: React.FC<SettingsSelectProps> = ({
    label,
    name,
    value,
    onChange,
    options,
    icon = Globe,
    required = false,
    error,
    hint,
    tooltipTitle,
    tooltipContent,
    disabled = false,
    id,
}) => {
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
            <select
                id={id || `setting-${name}`}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                aria-label={label}
                className={`w-full select ${
                    error 
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' 
                        : value && !error
                        ? 'border-emerald-500/30 focus:border-emerald-500/50'
                        : ''
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-dark-300 text-white">
                        {opt.label}
                    </option>
                ))}
            </select>
        </SettingsField>
    );
};
