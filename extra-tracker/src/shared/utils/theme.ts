export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

const THEME_ATTRIBUTE = 'data-theme';
const DARK_CLASSNAME = 'dark';

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
        return currentTheme;
    }

    return applyThemePreference(fallbackTheme, root);
};
