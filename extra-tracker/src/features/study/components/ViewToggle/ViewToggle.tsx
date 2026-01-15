import React from 'react';
import { LayoutGrid, List, Grid3x3 } from 'lucide-react';
import { motion } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export type ViewMode = 'grid' | 'list' | 'compact';

interface ViewToggleProps {
    view: ViewMode;
    onChange: (view: ViewMode) => void;
    className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const ViewToggle: React.FC<ViewToggleProps> = ({
    view,
    onChange,
    className = '',
}) => {
    const views: Array<{ mode: ViewMode; icon: React.ElementType; label: string }> = [
        { mode: 'grid', icon: LayoutGrid, label: 'Griglia' },
        { mode: 'list', icon: List, label: 'Lista' },
        { mode: 'compact', icon: Grid3x3, label: 'Compatta' },
    ];

    return (
        <div className={`flex items-center gap-1 p-1 rounded-lg bg-zinc-900/50 border border-white/10 ${className}`}>
            {views.map(({ mode, icon: Icon, label }) => {
                const isActive = view === mode;
                return (
                    <motion.button
                        key={mode}
                        onClick={() => onChange(mode)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                            relative px-3 py-1.5 rounded-md text-xs font-medium transition-all
                            flex items-center gap-1.5
                            ${isActive
                                ? 'text-white bg-primary-500/20 border border-primary-500/30'
                                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                            }
                        `}
                        title={label}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="activeView"
                                className="absolute inset-0 rounded-md bg-primary-500/20 border border-primary-500/30"
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        )}
                        <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-primary-400' : 'text-white/50'}`} />
                        <span className="hidden sm:inline relative z-10">{label}</span>
                    </motion.button>
                );
            })}
        </div>
    );
};
