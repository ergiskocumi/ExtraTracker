/**
 * 📝 SETTINGS FIELD - Container base per campi form
 * 
 * Wrapper unificato per tutti i campi delle impostazioni con:
 * - Label con icona
 * - Gestione errori
 * - Spacing ottimizzato per mobile
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { SettingsTooltip } from '../SettingsTooltip';

interface SettingsFieldProps {
    label: string;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    required?: boolean;
    error?: string;
    hint?: string;
    tooltipTitle?: string;
    tooltipContent?: string;
    children: React.ReactNode;
    className?: string;
}

export const SettingsField: React.FC<SettingsFieldProps> = ({
    label,
    icon: Icon,
    required = false,
    error,
    hint,
    tooltipTitle,
    tooltipContent,
    children,
    className = '',
}) => {
    return (
        <div className={`space-y-2.5 md:space-y-2 ${className}`}>
            <label className="flex items-center gap-2 text-sm font-semibold text-white/80">
                {Icon && <Icon className="w-4 h-4 text-white/50 flex-shrink-0" />}
                <span>{label}</span>
                {required && <span className="text-red-400">*</span>}
                {tooltipTitle && tooltipContent && (
                    <SettingsTooltip
                        title={tooltipTitle}
                        content={tooltipContent}
                    />
                )}
            </label>
            
            {children}
            
            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-xs text-red-400 flex items-center gap-1.5"
                    >
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span>{error}</span>
                    </motion.p>
                )}
            </AnimatePresence>
            
            {/* Hint Message */}
            {hint && !error && (
                <p className="text-xs text-white/50">
                    {hint}
                </p>
            )}
        </div>
    );
};
