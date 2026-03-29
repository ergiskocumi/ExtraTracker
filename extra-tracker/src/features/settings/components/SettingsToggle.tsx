/**
 * 🔄 SETTINGS TOGGLE - Switch moderno per settings
 * 
 * Design pulito con:
 * - Label e description
 * - Animazione smooth
 * - Stati chiari
 * - Supporto per varianti 'card' e 'field'
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { SettingsField } from './fields/SettingsField';

interface SettingsToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'card' | 'field';
  // Props aggiuntive per variant='field'
  name?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  required?: boolean;
  error?: string;
  hint?: string;
  tooltipTitle?: string;
  tooltipContent?: string;
  id?: string;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className,
  variant = 'card',
  name,
  icon,
  required = false,
  error,
  hint,
  tooltipTitle,
  tooltipContent,
  id,
}) => {
  // Variant 'field' - usa SettingsField wrapper con stile legacy
  if (variant === 'field') {
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
        <div className="flex items-center">
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
        </div>
      </SettingsField>
    );
  }

  // Variant 'card' (default) - stile originale
  return (
    <div className={cn(
      "flex items-start justify-between gap-4 p-4 rounded-xl",
      "bg-theme-card border border-theme-default",
      "hover:border-theme-strong transition-colors",
      disabled && "opacity-50 cursor-not-allowed",
      className
    )}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-theme-primary">{label}</p>
        {description && (
          <p className="text-sm text-theme-secondary mt-0.5">{description}</p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200",
          checked 
            ? "bg-primary-500" 
            : "bg-theme-subtle border border-theme-default",
          disabled && "cursor-not-allowed"
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg",
            "transform ring-0 transition duration-200 ease-in-out",
            checked 
              ? "translate-x-6 bg-white" 
              : "translate-x-1 bg-theme-surface border border-theme-default"
          )}
        />
      </button>
    </div>
  );
};

export default SettingsToggle;
