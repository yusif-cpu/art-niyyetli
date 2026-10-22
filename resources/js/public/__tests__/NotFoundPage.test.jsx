import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

describe('NotFoundPage', () => {
    it('sets a noindex robots meta tag and a generic title', async () => {
        render(<LocaleProvider><NotFoundPage /></LocaleProvider>);

        await waitFor(() => {
            expect(document.title).toBe('Səhifə tapılmadı | ArtNiyyətli');
            expect(document.querySelector('meta[name="robots"]').getAttribute('content')).toBe('noindex, follow');
        });
    });

    it('shows a short text and links to the home page and the catalogue', () => {
        render(<LocaleProvider><NotFoundPage /></LocaleProvider>);

        expect(screen.getByRole('heading', { level: 1, name: 'Səhifə tapılmadı' })).toHaveClass('text-banner');
        expect(screen.getByText('Axtardığınız səhifə mövcud deyil.')).toHaveClass('text-wine-muted');
        // The ways back are buttons: the first primary, the second secondary.
        expect(screen.getByRole('link', { name: 'Ana səhifəyə qayıt' })).toHaveClass('bg-wine', 'text-surface');
        expect(screen.getByRole('link', { name: 'Kataloqa bax' })).toHaveClass('border-wine', 'text-wine');
        expect(screen.getByRole('link', { name: 'Ana səhifəyə qayıt' })).toHaveAttribute('href', '/');
        expect(screen.getByRole('link', { name: 'Kataloqa bax' })).toHaveAttribute('href', '/artworks');
        screen.getAllByRole('link').forEach((link) => expect(link).toHaveClass('min-h-11')); // 44px touch targets
    });

    it('starts with the heading: no drawing above it', () => {
        const { container } = render(<LocaleProvider><NotFoundPage /></LocaleProvider>);

        expect(container.querySelector('svg')).toBeNull();
        expect(screen.getByRole('heading', { level: 1 }).previousElementSibling).toBeNull();
    });

    it('uses no Signal and none of the old classes', () => {
        const { container } = render(<LocaleProvider><NotFoundPage /></LocaleProvider>);

        expect(container.innerHTML).not.toMatch(/signal|rounded|neutral-|text-sm|text-xl/);
    });
});
