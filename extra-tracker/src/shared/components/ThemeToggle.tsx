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

    // Stelle performanti
    const stars = [
        { x: 30, y: 15, size: 0.8, delay: 0 },
        { x: 50, y: 10, size: 1.2, delay: 0.2 },
        { x: 70, y: 25, size: 0.6, delay: 0.4 },
        { x: 45, y: 35, size: 1.0, delay: 0.6 },
        { x: 65, y: 40, size: 0.9, delay: 0.8 },
        { x: 80, y: 15, size: 1.5, delay: 1 },
        { x: 90, y: 30, size: 0.7, delay: 0.3 },
        { x: 85, y: 45, size: 1.1, delay: 0.7 },
        { x: 55, y: 5, size: 0.5, delay: 1.2 },
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
            style={{
                background: isDark ? '#0f172a' : '#38bdf8',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
                transition: 'background 0.5s ease-in-out'
            }}
        >
            <AnimatePresence mode="wait">
                {isDark ? (
                    <motion.div
                        key="night"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 z-0 bg-slate-900"
                        style={{ background: 'linear-gradient(to bottom, #020617, #0f172a)' }}
                    >
                        {/* Luna Glow */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-60">
                            <div className="absolute top-[-10px] left-[-10px] w-[70px] h-[70px] rounded-full"
                                style={{ background: 'radial-gradient(circle, rgba(148,163,184,0.4) 0%, rgba(148,163,184,0.1) 50%, transparent 70%)', filter: 'blur(6px)' }} />
                        </div>

                        {/* Stars Layer */}
                        <svg viewBox="0 0 100 50" className="absolute inset-0 w-full h-full drop-shadow-md">
                            <defs>
                                <filter id="star-glow">
                                    <feGaussianBlur stdDeviation="0.8" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                                <linearGradient id="shooting-star-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                </linearGradient>
                            </defs>

                            {stars.map((star, i) => (
                                <motion.circle
                                    key={`star-${i}`}
                                    cx={star.x}
                                    cy={star.y}
                                    r={star.size}
                                    fill="#ffffff"
                                    animate={{
                                        opacity: [0.2, 1, 0.2],
                                        scale: [0.7, 1.3, 0.7]
                                    }}
                                    transition={{
                                        duration: 2 + Math.random() * 2,
                                        repeat: Infinity,
                                        delay: star.delay,
                                        ease: "easeInOut"
                                    }}
                                    style={{ transformOrigin: `${star.x}px ${star.y}px`, filter: "url(#star-glow)" }}
                                />
                            ))}

                            {/* Shooting Star */}
                            <motion.g
                                initial={{ x: 120, y: -10, opacity: 0 }}
                                animate={{ x: [40, -20], y: [10, 40], opacity: [0, 1, 0] }}
                                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 6, ease: "easeOut" }}
                            >
                                <circle cx="0" cy="0" r="1.5" fill="#fff" filter="url(#star-glow)" />
                                <path d="M 0 0 L 25 -15" stroke="url(#shooting-star-grad)" strokeWidth="0.8" />
                            </motion.g>
                        </svg>
                    </motion.div>
                ) : (
                    <motion.div
                        key="day"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 z-0 bg-sky-400"
                        style={{ background: 'linear-gradient(to bottom, #38bdf8, #7dd3fc)' }}
                    >
                        {/* Sole Glow */}
                        <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-80">
                            <div className="absolute top-[-20px] right-[-10px] w-[80px] h-[80px] rounded-full"
                                style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.6) 0%, rgba(251,191,36,0.1) 40%, transparent 70%)', filter: 'blur(8px)' }} />
                        </div>

                        {/* Clouds Layer */}
                        <svg viewBox="0 0 100 50" className="absolute inset-0 w-full h-full">
                            {/* Cloud back */}
                            <motion.g
                                fill="rgba(255, 255, 255, 0.65)"
                                animate={{ x: [0, 6, 0] }}
                                transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                                className="drop-shadow-sm"
                            >
                                <circle cx="20" cy="38" r="3.5" />
                                <circle cx="26" cy="34" r="5" />
                                <circle cx="32" cy="37" r="4" />
                                <rect x="20" y="34.5" width="12" height="7" rx="2" />
                            </motion.g>

                            {/* Cloud mid */}
                            <motion.g
                                fill="rgba(255, 255, 255, 0.85)"
                                animate={{ x: [0, -8, 0] }}
                                transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                                className="drop-shadow-sm"
                            >
                                <circle cx="65" cy="28" r="4.5" />
                                <circle cx="72" cy="25" r="6" />
                                <circle cx="79" cy="28" r="5" />
                                <rect x="65" y="25.5" width="14" height="8" rx="2" />
                            </motion.g>

                            {/* Cloud front */}
                            <motion.g
                                fill="#ffffff"
                                animate={{ x: [0, 10, 0] }}
                                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                                style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.1))' }}
                            >
                                <circle cx="35" cy="24" r="5.5" />
                                <circle cx="43" cy="20" r="7.5" />
                                <circle cx="51" cy="24" r="6" />
                                <rect x="35" y="21" width="16" height="9" rx="2" />
                            </motion.g>
                        </svg>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Inset shadow */}
            <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] pointer-events-none z-10" />

            {/* Sliding Knob */}
            <motion.div
                className="absolute top-1 w-8 h-8 rounded-full shadow-lg z-20 flex items-center justify-center overflow-hidden"
                animate={{
                    left: isDark ? '4px' : 'calc(100% - 36px)',
                }}
                transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                }}
                style={{
                    background: isDark
                        ? 'linear-gradient(145deg, #f8fafc 0%, #cbd5e1 50%, #94a3b8 100%)'
                        : 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                    boxShadow: isDark
                        ? '0 3px 10px rgba(0,0,0,0.5), inset 0 2px 2px rgba(255,255,255,0.8)'
                        : '0 3px 10px rgba(245,158,11,0.6), inset 0 2px 2px rgba(255,255,255,0.8)',
                }}
            >
                <motion.div
                    className="w-full h-full flex items-center justify-center relative"
                    initial={false}
                    animate={{ rotate: isDark ? 0 : 360 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    {isDark ? (
                        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-90">
                            <defs>
                                <linearGradient id="crater-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#64748B" stopOpacity="0.7" />
                                    <stop offset="100%" stopColor="#475569" stopOpacity="0.3" />
                                </linearGradient>
                            </defs>

                            {/* Moon Craters */}
                            <g fill="url(#crater-shadow)">
                                <circle cx="35" cy="40" r="10" />
                                <circle cx="68" cy="30" r="7" />
                                <circle cx="55" cy="70" r="14" />
                                <circle cx="78" cy="55" r="5" />
                                <circle cx="30" cy="70" r="6" />
                                <circle cx="45" cy="18" r="4" />
                            </g>

                            {/* Crater Highlights */}
                            <g fill="#FFFFFF" opacity="0.3">
                                <circle cx="34" cy="38" r="9.5" />
                                <circle cx="67.5" cy="29" r="6.5" />
                                <circle cx="54" cy="68" r="13.5" />
                                <circle cx="77.5" cy="54" r="4.5" />
                                <circle cx="29" cy="69" r="5.5" />
                                <circle cx="44.5" cy="17.5" r="3.5" />
                            </g>
                        </svg>
                    ) : (
                        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-100">
                            <defs>
                                <radialGradient id="sun-core" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#FFFFFF" />
                                    <stop offset="40%" stopColor="#FFF59D" />
                                    <stop offset="100%" stopColor="#FBC02D" />
                                </radialGradient>
                            </defs>

                            {/* Animated Sun Rays */}
                            <motion.g
                                stroke="#FFF59D"
                                strokeWidth="5.5"
                                strokeLinecap="round"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                                style={{ transformOrigin: "50px 50px" }}
                                className="drop-shadow-sm"
                            >
                                <line x1="50" y1="12" x2="50" y2="24" />
                                <line x1="50" y1="76" x2="50" y2="88" />
                                <line x1="12" y1="50" x2="24" y2="50" />
                                <line x1="76" y1="50" x2="88" y2="50" />
                                <line x1="23.13" y1="23.13" x2="31.62" y2="31.62" />
                                <line x1="76.87" y1="76.87" x2="68.38" y2="68.38" />
                                <line x1="23.13" y1="76.87" x2="31.62" y2="68.38" />
                                <line x1="76.87" y1="23.13" x2="68.38" y2="31.62" />
                            </motion.g>

                            {/* Sun Core */}
                            <circle cx="50" cy="50" r="21" fill="url(#sun-core)" className="drop-shadow-md" />
                        </svg>
                    )}
                </motion.div>

                {/* Outer Shine */}
                <div className="absolute inset-0 rounded-full shadow-[inset_0_4px_6px_rgba(255,255,255,0.4)] pointer-events-none" />
                <div
                    className="absolute top-1 left-1 w-3 h-3 rounded-full bg-white/70"
                    style={{ filter: 'blur(1.5px)' }}
                />
            </motion.div>
        </motion.button>
    );
};

export default ThemeToggle;
