/**
 * Theme Toggle Component
 * Switch style button with sun/moon icons for direct theme switching
 */
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
        <button
            type="button"
            onClick={toggleTheme}
            className="relative w-14 h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            style={{
                background: isDark 
                    ? 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)' 
                    : 'linear-gradient(135deg, #87CEEB 0%, #FFD700 100%)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            }}
            aria-label={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
            title={isDark ? 'Tema chiaro' : 'Tema scuro'}
        >
            {/* Track decorations */}
            {isDark ? (
                // Stars for dark mode
                <>
                    <span className="absolute top-1.5 left-2 w-1 h-1 bg-white/60 rounded-full" />
                    <span className="absolute top-3 left-4 w-0.5 h-0.5 bg-white/40 rounded-full" />
                    <span className="absolute bottom-2 left-3 w-0.5 h-0.5 bg-white/50 rounded-full" />
                </>
            ) : (
                // Clouds for light mode
                <>
                    <span className="absolute top-2 right-3 w-2 h-1 bg-white/70 rounded-full" />
                    <span className="absolute bottom-2.5 right-4 w-1.5 h-0.5 bg-white/50 rounded-full" />
                </>
            )}
            
            {/* Toggle knob with icon */}
            <span
                className="absolute top-1 flex items-center justify-center w-6 h-6 rounded-full shadow-md transition-all duration-300"
                style={{
                    left: isDark ? '4px' : 'calc(100% - 28px)',
                    background: isDark 
                        ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' 
                        : 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)',
                    boxShadow: isDark 
                        ? '0 2px 8px rgba(0,0,0,0.3)' 
                        : '0 2px 8px rgba(245,158,11,0.4)',
                }}
            >
                {isDark ? (
                    // Moon icon
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                ) : (
                    // Sun icon
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            </span>
        </button>
    );
};

export default ThemeToggle;
