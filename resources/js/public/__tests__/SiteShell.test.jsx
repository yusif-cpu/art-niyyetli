import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import SiteShell from '../layout/SiteShell.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

const PAGES_AZ = [
    { slug: 'home', type: 'home', nav_placement: 'header', title: 'Ana səhifə' },
    { slug: 'about', type: 'about', nav_placement: 'header', title: 'Haqqımızda' },
    { slug: 'collectors', type: 'collectors', nav_placement: 'header', title: 'Kolleksionerlər üçün' },
    { slug: 'contact', type: 'contact', nav_placement: 'header', title: 'Əlaqə' },
    { slug: 'privacy-policy', type: 'custom', nav_placement: 'footer', title: 'Məxfilik siyasəti' },
    { slug: 'terms', type: 'custom', nav_placement: 'footer', title: 'İstifadə şərtləri' },
    { slug: 'unlisted', type: 'custom', nav_placement: 'none', title: 'Unlisted draft' },
];

const PAGES_EN = [
    { slug: 'home', type: 'home', nav_placement: 'header', title: 'Home' },
    { slug: 'about', type: 'about', nav_placement: 'header', title: 'About' },
    { slug: 'collectors', type: 'collectors', nav_placement: 'header', title: 'For collectors' },
    { slug: 'contact', type: 'contact', nav_placement: 'header', title: 'Contact' },
    { slug: 'privacy-policy', type: 'custom', nav_placement: 'footer', title: 'Privacy Policy' },
    { slug: 'terms', type: 'custom', nav_placement: 'footer', title: 'Terms & Conditions' },
    { slug: 'unlisted', type: 'custom', nav_placement: 'none', title: 'Unlisted draft' },
];

describe('SiteShell', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url) => {
            if (url.includes('/site-settings')) {
                return Promise.resolve(jsonResponse({ data: { contact_email: 'hello@artniyyetli.az', phone: null, address: null, opening_hours: null, footer_text: 'ArtNiyyətli qalereyası' } }));
            }
            if (url.includes('/social-links')) {
                return Promise.resolve(jsonResponse({ data: [{ platform: 'instagram', url: 'https://instagram.com/artniyyetli', sort_order: 0 }] }));
            }
            if (url.includes('/pages')) {
                return Promise.resolve(jsonResponse({ data: url.includes('locale=en') ? PAGES_EN : PAGES_AZ }));
            }
            return Promise.resolve(jsonResponse({ data: {} }));
        });
    });

    it('renders header pages, catalogue links, footer pages, and social links, guarding null fields', async () => {
        render(
            <LocaleProvider>
                <SiteShell>
                    <p>Page content</p>
                </SiteShell>
            </LocaleProvider>
        );

        expect(await screen.findByRole('link', { name: 'Ana səhifə' })).toHaveAttribute('href', '/');
        expect(screen.getByRole('link', { name: 'Haqqımızda' })).toHaveAttribute('href', '/about');
        expect(screen.getByRole('link', { name: 'Kolleksionerlər üçün' })).toHaveAttribute('href', '/collectors');
        expect(screen.getByRole('link', { name: 'Əlaqə' })).toHaveAttribute('href', '/contact');
        expect(screen.getByRole('link', { name: 'Əsərlər' })).toHaveAttribute('href', '/artworks');
        expect(screen.getByRole('link', { name: 'Rəssamlar' })).toHaveAttribute('href', '/artists');
        expect(screen.getByText('Page content')).toBeInTheDocument();

        expect(await screen.findByText('hello@artniyyetli.az')).toBeInTheDocument();
        expect(screen.getByText('ArtNiyyətli qalereyası')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'instagram' })).toHaveAttribute('href', 'https://instagram.com/artniyyetli');
        expect(screen.queryByText('null')).not.toBeInTheDocument();

        expect(screen.getByRole('link', { name: 'Məxfilik siyasəti' })).toHaveAttribute('href', '/privacy-policy');
        expect(screen.getByRole('link', { name: 'İstifadə şərtləri' })).toHaveAttribute('href', '/terms');
        expect(screen.queryByText('Unlisted draft')).not.toBeInTheDocument();
    });

    it('switches header and footer page labels to English on locale change', async () => {
        render(
            <LocaleProvider>
                <SiteShell>
                    <p>Page content</p>
                </SiteShell>
            </LocaleProvider>
        );

        await screen.findByRole('link', { name: 'Məxfilik siyasəti' });

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await waitFor(() => expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/'));
        expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
        expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');
        expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy-policy');
        expect(screen.getByRole('link', { name: 'Terms & Conditions' })).toHaveAttribute('href', '/terms');
        expect(screen.queryByText('Məxfilik siyasəti')).not.toBeInTheDocument();
    });
});
