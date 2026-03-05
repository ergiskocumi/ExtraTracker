/**
 * 📝 SETTINGS FORM FIELD - Input field moderno per settings
 * 
 * Features:
 * - Label con icona opzionale
 * - Error message
 * - Helper text
 * - Supporto per tutti i tipi di input
 */

import React from 'react';
import { cn } from '../../../lib/utils';

interface SettingsFormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  type?: 'text' | 'email' | 'tel' | 'url' | 'password' | 'textarea' | 'select';
  placeholder?: string;
  icon?: React.ElementType;
  error?: string;
  helper?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { value: string; label: string }[];
  rows?: number;
  maxLength?: number;
  className?: string;
}

export const SettingsFormField: React.FC<SettingsFormFieldProps> = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  icon: Icon,
  error,
  helper,
  required,
  disabled,
  options,
  rows = 4,
  maxLength,
  className,
}) => {
  const inputClasses = cn(
    "w-full rounded-xl border bg-theme-card px-4 py-3 text-theme-primary",
    "placeholder:text-theme-muted",
    "focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500",
    "transition-all duration-200",
    error 
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" 
      : "border-theme-default hover:border-theme-strong",
    disabled && "opacity-50 cursor-not-allowed bg-theme-subtle",
    Icon && "pl-11",
    className
  );

  return (
    <div className="space-y-1.5">
      {/* Label */}
      <label className="flex items-center gap-1.5 text-sm font-medium text-theme-primary">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>

      {/* Input Container */}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none">
            <Icon className="w-5 h-5" />
          </div>
        )}

        {type === 'textarea' ? (
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            maxLength={maxLength}
            className={cn(inputClasses, "resize-none min-h-[100px]")}
          />
        ) : type === 'select' ? (
          <select
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={inputClasses}
          >
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className={inputClasses}
          />
        )}
      </div>

      {/* Error or Helper */}
      {(error || helper) && (
        <p className={cn(
          "text-xs",
          error ? "text-red-500" : "text-theme-muted"
        )}>
          {error || helper}
        </p>
      )}

      {/* Max Length Counter */}
      {maxLength && type === 'textarea' && (
        <p className="text-xs text-theme-muted text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
};

export default SettingsFormField;
