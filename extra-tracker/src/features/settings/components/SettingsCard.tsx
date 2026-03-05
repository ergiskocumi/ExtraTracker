/**
 * 🎴 SETTINGS CARD - Componente base per sezioni settings
 * 
 * Card moderna con:
 * - Header opzionale con icona e titolo
 * - Contenuto flessibile
 * - Footer opzionale per azioni
 * - Supporto tema chiaro/scuro
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';

interface SettingsCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: React.ElementType;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  children,
  title,
  description,
  icon: Icon,
  className,
  headerClassName,
  contentClassName,
  footer,
  noPadding = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-theme-surface border border-theme-default rounded-2xl overflow-hidden",
        "shadow-sm hover:shadow-md transition-shadow duration-200",
        className
      )}
    >
      {/* Header */}
      {(title || Icon) && (
        <div className={cn(
          "px-6 py-4 border-b border-theme-default bg-theme-subtle/30",
          headerClassName
        )}>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-lg bg-primary-500/10 text-primary-500">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-theme-primary">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-theme-secondary mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={cn(!noPadding && "p-6", contentClassName)}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-6 py-4 border-t border-theme-default bg-theme-subtle/20">
          {footer}
        </div>
      )}
    </motion.div>
  );
};

export default SettingsCard;
