/**
 * THEME TOGGLE - Versione Migliorata con Stelle Visibili
 * 
 * Toggle moderno con:
 * - Animazioni 3D fluide
 * - Stelle luminose e visibili
 * - Nuvole soffici
 * - Effetto giorno/notte realistico
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

    // Configurazione stelle più visibili
    const stars = [
        { x: 15, y: 25, size: 2, delay: 0 },
        { x: 25, y: 15, size: 1.5, delay: 0.2 },
        { x: 35, y: 30, size: 2.5, delay: 0.4 },
        { x: 20, y: 45, size: 1.5, delay: 0.6 },
        { x: 30, y: 55, size: 2, delay: 0.8 },
        { x: 40, y: 40, size: 1, delay: 1 },
        { x: 12, y: 60, size: 1.5, delay: 0.3 },
    ];

    return (
        <motion.button
            type="button"
            onClick={toggleTheme}
            className={`relative w-20 h-10 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${isDark ? 'theme-toggle-is-dark' : 'theme-toggle-is-light'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
            title={isDark ? 'Tema chiaro' : 'Tema scuro'}
        >
            {/* Background Elements */}
            <AnimatePresence mode="wait">
                {isDark ? (
                    // Night Sky Elements - Stelle più visibili
                    <motion.div
                        key="night"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0"
                    >
                        {/* Stelle brillanti */}
                        {stars.map((star, i) => (
                            <motion.span
                                key={`star-${i}`}
                                className="absolute rounded-full"
                                style={{
                                    top: `${star.y}%`,
                                    left: `${star.x}%`,
                                    width: `${star.size * 2}px`,
                                    height: `${star.size * 2}px`,
                                    background: 'white',
                                    boxShadow: `0 0 ${star.size * 3}px ${star.size}px rgba(255,255,255,0.8), 0 0 ${star.size * 6}px ${star.size * 2}px rgba(255,255,255,0.4)`,
                                }}
                                animate={{
                                    opacity: [0.4, 1, 0.4],
                                    scale: [0.8, 1.2, 0.8],
                                }}
                                transition={{
                                    duration: 2 + Math.random(),
                                    repeat: Infinity,
                                    delay: star.delay,
                                }}
                            />
                        ))}
                        
                        {/* Stelle piccole extra */}
                        {[...Array(5)].map((_, i) => (
                            <motion.span
                                key={`small-star-${i}`}
                                className="absolute w-1 h-1 bg-white/70 rounded-full"
                                style={{
                                    top: `${20 + Math.random() * 50}%`,
                                    left: `${30 + Math.random() * 40}%`,
                                }}
                                animate={{
                                    opacity: [0.2, 0.8, 0.2],
                                }}
                                transition={{
                                    duration: 1.5 + Math.random(),
                                    repeat: Infinity,
                                    delay: Math.random() * 2,
                                }}
                            />
                        ))}

                        {/* Luna glow */}
                        <div 
                            className="absolute top-1/2 left-[15%] -translate-y-1/2 w-10 h-10 rounded-full"
                            style={{
                                background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
                                filter: 'blur(4px)',
                            }}
                        />
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
                        {/* Nuvole soffici */}
                        <motion.div
                            className="absolute top-2 left-3 w-6 h-3 bg-white/70 rounded-full"
                            animate={{ x: [0, 4, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            style={{ filter: 'blur(0.5px)' }}
                        />
                        <motion.div
                            className="absolute top-3 left-1 w-4 h-2 bg-white/50 rounded-full"
                            animate={{ x: [0, 3, 0] }}
                            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                        />
                        <motion.div
                            className="absolute bottom-3 right-4 w-5 h-2.5 bg-white/60 rounded-full"
                            animate={{ x: [0, -3, 0] }}
                            transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
                        />
                        <motion.div
                            className="absolute top-5 right-2 w-3 h-1.5 bg-white/40 rounded-full"
                            animate={{ x: [0, 2, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
                        />

                        {/* Sole glow */}
                        <div 
                            className="absolute top-1/2 right-[15%] -translate-y-1/2 w-12 h-12 rounded-full"
                            style={{
                                background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, rgba(251,191,36,0.1) 50%, transparent 70%)',
                                filter: 'blur(6px)',
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Track Line */}
            <div className="absolute top-1/2 left-2.5 right-2.5 h-0.5 -translate-y-1/2 bg-black/10 rounded-full" />

            {/* Sliding Knob */}
            <motion.div
                className="absolute top-1 w-8 h-8 rounded-full shadow-lg z-10"
                animate={{
                    left: isDark ? '4px' : 'calc(100% - 36px)',
                }}
                transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                }}
                style={{
                    background: isDark 
                        ? 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)' 
                        : 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                    boxShadow: isDark 
                        ? '0 3px 10px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.8)' 
                        : '0 3px 10px rgba(245,158,11,0.5), inset 0 1px 2px rgba(255,255,255,0.8)',
                }}
            >
                {/* Icon inside knob */}
                <motion.div
                    className="w-full h-full flex items-center justify-center"
                    initial={false}
                    animate={{ rotate: isDark ? 0 : 360 }}
                    transition={{ duration: 0.4 }}
                >
                    {isDark ? (
                        // Moon Icon
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                    ) : (
                        // Sun Icon
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                    className="absolute top-1 left-1 w-2.5 h-2.5 rounded-full bg-white/60"
                    style={{ filter: 'blur(1px)' }}
                />
            </motion.div>
        </motion.button>
    );
};

export default ThemeToggle;
