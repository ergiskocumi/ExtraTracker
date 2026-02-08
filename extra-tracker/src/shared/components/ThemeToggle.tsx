/**
 * THEME TOGGLE - Versione Migliorata
 * 
 * Toggle moderno con:
 * - Animazioni 3D fluide
 * - Effetto giorno/notte realistico
 * - Stelle e nuvole animate
 * - Transizioni morbide
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../../features/settings/context/SettingsContext';

export const ThemeToggle = () => {
    const { preferences, updatePreferences } = useSettings();
    
    const currentTheme = preferences?.theme || 'dark';
    const isDark = currentTheme === 'dark' || 
        (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const toggleTheme = () => {
        const newTheme = isDark ? 'light' : 'dark';
        updatePreferences({ theme: newTheme });
    };

    return (
        <motion.button
            type="button"
            onClick={toggleTheme}
            className="relative w-16 h-9 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
            title={isDark ? 'Tema chiaro' : 'Tema scuro'}
            style={{
                background: isDark 
                    ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #334155 100%)' 
                    : 'linear-gradient(180deg, #38bdf8 0%, #7dd3fc 50%, #bae6fd 100%)',
                boxShadow: isDark
                    ? 'inset 0 2px 4px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)'
                    : 'inset 0 2px 4px rgba(255,255,255,0.4), 0 2px 8px rgba(56, 189, 248, 0.3)',
            }}
        >
            {/* Background Elements */}
            <AnimatePresence mode="wait">
                {isDark ? (
                    // Night Sky Elements
                    <motion.div
                        key="night"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0"
                    >
                        {/* Stars */}
                        {[...Array(6)].map((_, i) => (
                            <motion.span
                                key={`star-${i}`}
                                className="absolute w-1 h-1 bg-white rounded-full"
                                style={{
                                    top: `${15 + Math.random() * 50}%`,
                                    left: `${10 + Math.random() * 60}%`,
                                }}
                                animate={{
                                    opacity: [0.3, 1, 0.3],
                                    scale: [0.8, 1.2, 0.8],
                                }}
                                transition={{
                                    duration: 2 + Math.random() * 2,
                                    repeat: Infinity,
                                    delay: Math.random() * 2,
                                }}
                            />
                        ))}
                        {/* Moon glow */}
                        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-8 h-8 bg-white/10 rounded-full blur-xl" />
                    </motion.div>
                ) : (
                    // Day Sky Elements
                    <motion.div
                        key="day"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0"
                    >
                        {/* Clouds */}
                        <motion.div
                            className="absolute top-2 left-2 w-4 h-2 bg-white/60 rounded-full"
                            animate={{ x: [0, 3, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                        />
                        <motion.div
                            className="absolute top-3 left-1 w-3 h-1.5 bg-white/40 rounded-full"
                            animate={{ x: [0, 2, 0] }}
                            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                        />
                        <motion.div
                            className="absolute bottom-2 right-4 w-3 h-1.5 bg-white/50 rounded-full"
                            animate={{ x: [0, -2, 0] }}
                            transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
                        />
                        {/* Sun rays */}
                        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-10 h-10 bg-yellow-300/20 rounded-full blur-xl" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Track Line */}
            <div className="absolute top-1/2 left-2 right-2 h-0.5 -translate-y-1/2 bg-black/10 rounded-full" />

            {/* Sliding Knob */}
            <motion.div
                className="absolute top-1 w-7 h-7 rounded-full shadow-lg"
                animate={{
                    left: isDark ? '4px' : 'calc(100% - 32px)',
                    rotate: isDark ? 0 : 180,
                }}
                transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                }}
                style={{
                    background: isDark 
                        ? 'linear-gradient(145deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)' 
                        : 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                    boxShadow: isDark 
                        ? '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.5)' 
                        : '0 2px 8px rgba(245,158,11,0.5), inset 0 1px 2px rgba(255,255,255,0.5)',
                }}
            >
                {/* Icon inside knob */}
                <motion.div
                    className="w-full h-full flex items-center justify-center"
                    animate={{ rotate: isDark ? 0 : -180 }}
                    transition={{ duration: 0.3 }}
                >
                    {isDark ? (
                        // Moon Icon
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                    ) : (
                        // Sun Icon
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5" />
                            <line x1="12" y1="1" x2="12" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="23" />
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                            <line x1="1" y1="12" x2="3" y2="12" />
                            <line x1="21" y1="12" x2="23" y2="12" />
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                        </svg>
                    )}
                </motion.div>

                {/* Shine effect */}
                <div 
                    className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white/50"
                    style={{ filter: 'blur(1px)' }}
                />
            </motion.div>

            {/* Labels */}
            <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                {/* Moon label (left side - visible in dark mode) */}
                <motion.span
                    className="text-[8px] font-bold text-white/70 ml-1"
                    animate={{ opacity: isDark ? 1 : 0, y: isDark ? 0 : 5 }}
                    transition={{ duration: 0.2 }}
                >
                    
                </motion.span>
                {/* Sun label (right side - visible in light mode) */}
                <motion.span
                    className="text-[8px] font-bold text-white/70 mr-1"
                    animate={{ opacity: isDark ? 0 : 1, y: isDark ? 5 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    
                </motion.span>
            </div>
        </motion.button>
    );
};

export default ThemeToggle;
