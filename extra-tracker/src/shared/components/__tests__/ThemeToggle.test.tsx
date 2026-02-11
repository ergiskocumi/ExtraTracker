import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';
import { useSettings } from '../../../features/settings/context/SettingsContext';

vi.mock('../../../features/settings/context/SettingsContext', () => ({
    useSettings: vi.fn(),
}));

const mockedUseSettings = vi.mocked(useSettings);

const buildSettingsMock = (theme: 'dark' | 'light' | 'system', updatePreferences = vi.fn()) =>
    ({
        preferences: { theme },
        updatePreferences,
    }) as unknown as ReturnType<typeof useSettings>;

describe('ThemeToggle', () => {
    it('switches from dark to light when clicked', () => {
        const updatePreferences = vi.fn();
        mockedUseSettings.mockReturnValue(buildSettingsMock('dark', updatePreferences));

        render(<ThemeToggle />);
        fireEvent.click(screen.getByRole('button', { name: /Passa al tema chiaro/i }));

        expect(updatePreferences).toHaveBeenCalledWith({ theme: 'light' });
    });

    it('switches from light to dark when clicked', () => {
        const updatePreferences = vi.fn();
        mockedUseSettings.mockReturnValue(buildSettingsMock('light', updatePreferences));

        render(<ThemeToggle />);
        fireEvent.click(screen.getByRole('button', { name: /Passa al tema scuro/i }));

        expect(updatePreferences).toHaveBeenCalledWith({ theme: 'dark' });
    });
});
