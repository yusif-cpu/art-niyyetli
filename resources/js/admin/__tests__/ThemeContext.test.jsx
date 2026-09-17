import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeProvider, useTheme } from '../components/ThemeContext.jsx';

function Harness() {
    const { theme, toggle } = useTheme();

    return (
        <div>
            <p>Current theme: {theme}</p>
            <button type="button" onClick={toggle}>
                Toggle
            </button>
        </div>
    );
}

function mockMatchMedia(matchesDark) {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)' && matchesDark,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));
}

describe('ThemeContext', () => {
    beforeEach(() => {
        localStorage.clear();
        mockMatchMedia(false);
    });

    it('defaults to light when localStorage is empty and the OS has no dark preference', async () => {
        render(
            <ThemeProvider>
                <Harness />
            </ThemeProvider>
        );

        expect(await screen.findByText('Current theme: light')).toBeInTheDocument();
    });

    it('flips the theme and persists it to localStorage when toggle() is called', async () => {
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
        const user = userEvent.setup();

        render(
            <ThemeProvider>
                <Harness />
            </ThemeProvider>
        );

        await screen.findByText('Current theme: light');

        await user.click(screen.getByRole('button', { name: 'Toggle' }));

        expect(await screen.findByText('Current theme: dark')).toBeInTheDocument();
        expect(setItemSpy).toHaveBeenCalledWith('admin-theme', 'dark');
    });

    it('respects a pre-existing admin-theme value in localStorage on mount', async () => {
        localStorage.setItem('admin-theme', 'dark');

        render(
            <ThemeProvider>
                <Harness />
            </ThemeProvider>
        );

        expect(await screen.findByText('Current theme: dark')).toBeInTheDocument();
    });
});
