/**
 * 🔄 SETTINGS TOGGLE - Switch moderno per settings
 * 
 * Design pulito con:
 * - Label e description
 * - Animazione smooth
 * - Stati chiari
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';

interface SettingsToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled,
  className,
}) => {
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
