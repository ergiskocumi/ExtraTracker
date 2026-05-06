export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

const THEME_ATTRIBUTE = 'data-theme';
const DARK_CLASSNAME = 'dark';
/** localStorage key used by the anti-FOUC inline script in index.html */
const THEME_STORAGE_KEY = 'et-theme';

const isBrowser = () => typeof window !== 'undefined';

export const resolveThemePreference = (theme: ThemePreference): ResolvedTheme => {
    if (theme === 'system') {
        if (!isBrowser()) return 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return theme;
};

export const applyResolvedTheme = (
    theme: ResolvedTheme,
    root: HTMLElement = document.documentElement
): ResolvedTheme => {
    root.setAttribute(THEME_ATTRIBUTE, theme);
    root.classList.toggle(DARK_CLASSNAME, theme === 'dark');
    // Persist resolved theme for the anti-FOUC inline script on next reload
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* noop */ }
    return theme;
};

export const applyThemePreference = (
    theme: ThemePreference,
    root: HTMLElement = document.documentElement
): ResolvedTheme => {
    const resolvedTheme = resolveThemePreference(theme);
    return applyResolvedTheme(resolvedTheme, root);
};

export const bootstrapTheme = (
    fallbackTheme: ThemePreference = 'dark',
    root: HTMLElement = document.documentElement
): ResolvedTheme => {
    const currentTheme = root.getAttribute(THEME_ATTRIBUTE);

    if (currentTheme === 'dark' || currentTheme === 'light') {
        root.classList.toggle(DARK_CLASSNAME, currentTheme === 'dark');
        // Ensure localStorage is in sync (handles first load after this code is deployed)
        try { localStorage.setItem(THEME_STORAGE_KEY, currentTheme); } catch { /* noop */ }
        return currentTheme;
    }

    // Fallback: check localStorage before using the hardcoded fallback
    let stored: string | null = null;
    try { stored = localStorage.getItem(THEME_STORAGE_KEY); } catch { /* noop */ }
    if (stored === 'dark' || stored === 'light') {
        return applyResolvedTheme(stored, root);
    }

    return applyThemePreference(fallbackTheme, root);
};
