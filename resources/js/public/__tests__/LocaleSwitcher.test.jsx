import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { LocaleProvider, useLocale } from '../i18n/LocaleContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';

function CurrentLocale() {
    const { locale } = useLocale();
    return <p>Current: {locale}</p>;
}

describe('LocaleSwitcher', () => {
    it('marks the current locale as active and switches on click', async () => {
        render(
            <LocaleProvider>
                <LocaleSwitcher />
                <CurrentLocale />
            </LocaleProvider>
        );

        expect(screen.getByRole('button', { name: 'AZ' })).toHaveAttribute('aria-current', 'true');
        expect(screen.getByRole('button', { name: 'EN' })).not.toHaveAttribute('aria-current');

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        expect(screen.getByText('Current: en')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-current', 'true');
    });
});
