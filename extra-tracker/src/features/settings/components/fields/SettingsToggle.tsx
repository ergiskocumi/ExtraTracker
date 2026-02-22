/**
 * 📝 SETTINGS TOGGLE - Toggle switch unificato
 * 
 * Toggle switch standardizzato con:
 * - Animazioni smooth
 * - Touch-friendly (44px min-height)
 * - Feedback visivo
 */

import React from 'react';
import { motion } from 'framer-motion';
import { SettingsField } from './SettingsField';

interface SettingsToggleProps {
    label: string;
    name?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    required?: boolean;
    error?: string;
    hint?: string;
    description?: string;
    tooltipTitle?: string;
    tooltipContent?: string;
    disabled?: boolean;
    id?: string;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({
    label,
    name,
    checked,
    onChange,
    icon,
    required = false,
    error,
    hint,
    description,
    tooltipTitle,
    tooltipContent,
    disabled = false,
    id,
}) => {
    return (
        <SettingsField
            label={label}
            description={description}
            icon={icon}
            required={required}
            error={error}
            hint={hint}
            tooltipTitle={tooltipTitle}
            tooltipContent={tooltipContent}
        >
            <button
                id={id || (name ? `setting-${name}` : undefined)}
                type="button"
                onClick={() => !disabled && onChange(!checked)}
                disabled={disabled}
                className={`
                    relative inline-flex items-center w-14 h-8 rounded-full transition-colors
                    focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-2 focus:ring-offset-dark-500
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${checked ? 'bg-primary-500' : 'bg-white/[0.15]'}
                `}
                role="switch"
                aria-checked={checked}
                aria-label={label}
            >
                <motion.div
                    className="absolute left-1 top-1 bottom-1 w-6 bg-white rounded-full shadow-lg"
                    animate={{
                        x: checked ? 24 : 0,
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                    }}
                />
            </button>
            {checked && (
                <span className="text-xs text-emerald-400 font-medium ml-2">Attivo</span>
            )}
        </SettingsField>
    );
};
