/**
 * 💡 SETTINGS TOOLTIP - Tooltip informativi per impostazioni
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';

interface SettingsTooltipProps {
    content: string;
    title?: string;
}

export const SettingsTooltip = ({ content, title }: SettingsTooltipProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative inline-flex">
            <button
                type="button"
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
                onClick={() => setIsOpen(!isOpen)}
                className="text-white/40 hover:text-white/60 transition-colors"
            >
                <HelpCircle className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        className="absolute left-0 top-6 z-50 w-64 rounded-xl border border-white/[0.15] bg-white/[0.08] backdrop-blur-xl p-3 shadow-xl card"
                        onMouseEnter={() => setIsOpen(true)}
                        onMouseLeave={() => setIsOpen(false)}
                    >
                        {title && (
                            <p className="text-sm font-semibold text-white mb-1">{title}</p>
                        )}
                        <p className="text-xs text-white/70 leading-relaxed">{content}</p>
                        <div className="absolute -top-1 left-4 w-2 h-2 rotate-45 bg-white/[0.08] border-l border-t border-white/[0.15]" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
