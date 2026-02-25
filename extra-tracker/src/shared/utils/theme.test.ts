import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    applyResolvedTheme,
    applyThemePreference,
    bootstrapTheme,
    resolveThemePreference,
} from './theme';

const createMatchMediaMock = (matches: boolean) =>
    vi.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));

describe('theme utils', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.classList.remove('dark');
    });

    it('applies resolved dark theme to data attribute and class', () => {
        applyResolvedTheme('dark');

        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('applies resolved light theme removing dark class', () => {
        applyResolvedTheme('dark');
        applyResolvedTheme('light');

        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('resolves system preference using matchMedia', () => {
        window.matchMedia = createMatchMediaMock(true) as unknown as typeof window.matchMedia;
        expect(resolveThemePreference('system')).toBe('dark');

        window.matchMedia = createMatchMediaMock(false) as unknown as typeof window.matchMedia;
        expect(resolveThemePreference('system')).toBe('light');
    });

    it('bootstraps from fallback when no theme is set', () => {
        bootstrapTheme('dark');

        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('keeps existing theme and syncs class during bootstrap', () => {
        document.documentElement.setAttribute('data-theme', 'light');
        bootstrapTheme('dark');

        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('applies system preference via applyThemePreference', () => {
        window.matchMedia = createMatchMediaMock(true) as unknown as typeof window.matchMedia;
        applyThemePreference('system');

        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
});
