/**
 * ⬅️ SETTINGS BACK BUTTON - Pulsante back per mobile
 * 
 * Pulsante di navigazione indietro ottimizzato per mobile
 */

import { motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft } from 'lucide-react';

interface SettingsBackButtonProps {
    onClick: () => void;
    label?: string;
    variant?: 'arrow' | 'chevron';
    className?: string;
}

export const SettingsBackButton: React.FC<SettingsBackButtonProps> = ({
    onClick,
    label = 'Indietro',
    variant = 'chevron',
    className = '',
}) => {
    const Icon = variant === 'arrow' ? ArrowLeft : ChevronLeft;

    return (
        <motion.button
            onClick={onClick}
            whileTap={{ scale: 0.95 }}
            className={`touch-target flex items-center gap-2 px-3 py-2 rounded-xl 
                       text-white/70 hover:text-white hover:bg-white/[0.08] 
                       transition-colors ${className}`}
            aria-label={label}
        >
            <Icon className="w-5 h-5" />
            {label && (
                <span className="text-sm font-medium hidden sm:inline">{label}</span>
            )}
        </motion.button>
    );
};
