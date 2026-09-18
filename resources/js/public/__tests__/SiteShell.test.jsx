import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import SiteShell from '../layout/SiteShell.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

describe('SiteShell', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url) => {
            if (url.includes('/site-settings')) {
                return Promise.resolve(jsonResponse({ data: { contact_email: 'hello@artniyyetli.az', phone: null, address: null, opening_hours: null, footer_text: 'ArtNiyyətli qalereyası' } }));
            }
            if (url.includes('/social-links')) {
                return Promise.resolve(jsonResponse({ data: [{ platform: 'instagram', url: 'https://instagram.com/artniyyetli', sort_order: 0 }] }));
            }
            return Promise.resolve(jsonResponse({ data: {} }));
        });
    });

    it('renders nav links, footer contact info, and social links, guarding null fields', async () => {
        render(
            <LocaleProvider>
                <SiteShell>
                    <p>Page content</p>
                </SiteShell>
            </LocaleProvider>
        );

        expect(screen.getByRole('link', { name: 'Əsərlər' })).toHaveAttribute('href', '/artworks');
        expect(screen.getByRole('link', { name: 'Rəssamlar' })).toHaveAttribute('href', '/artists');
        expect(screen.getByRole('link', { name: 'Əlaqə' })).toHaveAttribute('href', '/contact');
        expect(screen.getByText('Page content')).toBeInTheDocument();

        expect(await screen.findByText('hello@artniyyetli.az')).toBeInTheDocument();
        expect(screen.getByText('ArtNiyyətli qalereyası')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'instagram' })).toHaveAttribute('href', 'https://instagram.com/artniyyetli');
        expect(screen.queryByText('null')).not.toBeInTheDocument();

        expect(screen.getByRole('link', { name: 'Məxfilik siyasəti' })).toHaveAttribute('href', '/privacy-policy');
        expect(screen.getByRole('link', { name: 'İstifadə şərtləri' })).toHaveAttribute('href', '/terms');
        expect(screen.getByRole('link', { name: 'Çatdırılma və qaytarılma' })).toHaveAttribute('href', '/shipping-returns');
        expect(screen.getByRole('link', { name: 'Müəllif hüquqları' })).toHaveAttribute('href', '/copyright');
    });

    it('switches nav and footer legal labels to English, keeping the Contact link intact', async () => {
        render(
            <LocaleProvider>
                <SiteShell>
                    <p>Page content</p>
                </SiteShell>
            </LocaleProvider>
        );

        await screen.findByRole('link', { name: 'Məxfilik siyasəti' });

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await waitFor(() => expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy-policy'));
        expect(screen.getByRole('link', { name: 'Terms & Conditions' })).toHaveAttribute('href', '/terms');
        expect(screen.getByRole('link', { name: 'Shipping & Returns' })).toHaveAttribute('href', '/shipping-returns');
        expect(screen.getByRole('link', { name: 'Copyright' })).toHaveAttribute('href', '/copyright');
        expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');
        expect(screen.queryByText('Məxfilik siyasəti')).not.toBeInTheDocument();
    });
});
