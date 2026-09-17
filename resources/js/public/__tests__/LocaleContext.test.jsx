import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocaleProvider, useLocale } from '../i18n/LocaleContext.jsx';

function Consumer() {
    const { locale, setLocale } = useLocale();
    return (
        <div>
            <p>Current: {locale}</p>
            <button type="button" onClick={() => setLocale('en')}>Switch to EN</button>
        </div>
    );
}

describe('LocaleContext', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('defaults to az when nothing is stored', () => {
        render(<LocaleProvider><Consumer /></LocaleProvider>);
        expect(screen.getByText('Current: az')).toBeInTheDocument();
    });

    it('respects a pre-existing stored locale on mount', () => {
        localStorage.setItem('public-locale', 'en');
        render(<LocaleProvider><Consumer /></LocaleProvider>);
        expect(screen.getByText('Current: en')).toBeInTheDocument();
    });

    it('setLocale updates the rendered value and persists to localStorage', async () => {
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
        render(<LocaleProvider><Consumer /></LocaleProvider>);

        await userEvent.click(screen.getByRole('button', { name: 'Switch to EN' }));

        expect(screen.getByText('Current: en')).toBeInTheDocument();
        expect(setItemSpy).toHaveBeenCalledWith('public-locale', 'en');
    });

    it('useLocale throws when used outside the provider', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(<Consumer />)).toThrow('useLocale must be used within a LocaleProvider');
        spy.mockRestore();
    });
});
