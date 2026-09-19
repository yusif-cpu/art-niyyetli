import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import SiteShell from '../layout/SiteShell.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

const NAV_AZ = {
    header: [
        { type: 'page', title: 'Ana səhifə', href: '/' },
        { type: 'page', title: 'Haqqımızda', href: '/about' },
        { type: 'page', title: 'Kolleksionerlər üçün', href: '/collectors' },
        { type: 'page', title: 'Əlaqə', href: '/contact' },
        { type: 'route', route_key: 'artworks', href: '/artworks' },
        { type: 'route', route_key: 'artists', href: '/artists' },
    ],
    footer: [
        { type: 'page', title: 'Məxfilik siyasəti', href: '/privacy-policy' },
        { type: 'page', title: 'İstifadə şərtləri', href: '/terms' },
    ],
};

const NAV_EN = {
    header: [
        { type: 'page', title: 'Home', href: '/' },
        { type: 'page', title: 'About', href: '/about' },
        { type: 'page', title: 'For collectors', href: '/collectors' },
        { type: 'page', title: 'Contact', href: '/contact' },
        { type: 'route', route_key: 'artworks', href: '/artworks' },
        { type: 'route', route_key: 'artists', href: '/artists' },
    ],
    footer: [
        { type: 'page', title: 'Privacy Policy', href: '/privacy-policy' },
        { type: 'page', title: 'Terms & Conditions', href: '/terms' },
    ],
};

describe('SiteShell', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url) => {
            if (url.includes('/site-settings')) {
                return Promise.resolve(jsonResponse({
                    data: {
                        contact_email: 'hello@artniyyetli.az', phone: null, address: null, opening_hours: null, footer_text: 'ArtNiyyətli qalereyası',
                        brand_text: 'ArtNiyyətli', logo_display_mode: 'logo_only', logo_media_id: 3, logo_url: 'https://example.test/logo.webp',
                    },
                }));
            }
            if (url.includes('/social-links')) {
                return Promise.resolve(jsonResponse({ data: [{ platform: 'instagram', url: 'https://instagram.com/artniyyetli', sort_order: 0 }] }));
            }
            if (url.includes('/navigation')) {
                return Promise.resolve(jsonResponse({ data: url.includes('locale=en') ? NAV_EN : NAV_AZ }));
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
        // Social links render in both the header and the footer.
        const instagramLinks = screen.getAllByRole('link', { name: 'instagram' });
        expect(instagramLinks).toHaveLength(2);
        instagramLinks.forEach((link) => expect(link).toHaveAttribute('href', 'https://instagram.com/artniyyetli'));
        expect(screen.queryByText('null')).not.toBeInTheDocument();

        expect(screen.getByRole('link', { name: 'Məxfilik siyasəti' })).toHaveAttribute('href', '/privacy-policy');
        expect(screen.getByRole('link', { name: 'İstifadə şərtləri' })).toHaveAttribute('href', '/terms');
    });

    it('renders the branding logo from site settings in both the header and the footer', async () => {
        render(
            <LocaleProvider>
                <SiteShell>
                    <p>Page content</p>
                </SiteShell>
            </LocaleProvider>
        );

        const logos = await screen.findAllByRole('img', { name: 'ArtNiyyətli' });
        expect(logos).toHaveLength(2);
        logos.forEach((logo) => expect(logo).toHaveAttribute('src', 'https://example.test/logo.webp'));
    });

    it('renders each social link in the header and the footer according to its saved display mode', async () => {
        const defaultFetch = global.fetch;
        global.fetch = vi.fn((url) => {
            if (url.includes('/social-links')) {
                return Promise.resolve(
                    jsonResponse({
                        data: [
                            { platform: 'Instagram', url: 'https://instagram.com/a', display_mode: 'logo_only', logo_url: 'https://example.test/ig.webp', sort_order: 0 },
                            { platform: 'Facebook', url: 'https://facebook.com/b', display_mode: 'logo_text', logo_url: 'https://example.test/fb.webp', sort_order: 1 },
                            { platform: 'WhatsApp', url: 'https://wa.me/994500000000', display_mode: 'text_only', logo_url: 'https://example.test/wa.webp', sort_order: 2 },
                        ],
                    })
                );
            }
            return defaultFetch(url);
        });

        render(
            <LocaleProvider>
                <SiteShell>
                    <p>Page content</p>
                </SiteShell>
            </LocaleProvider>
        );

        // logo_only: image named by the platform, no visible text (x2: header + footer)
        expect(await screen.findAllByRole('img', { name: 'Instagram' })).toHaveLength(2);
        expect(screen.queryByText('Instagram')).not.toBeInTheDocument();
        // logo_text: the link is named by its text; the icon is decorative
        expect(screen.getAllByRole('link', { name: 'Facebook' })).toHaveLength(2);
        expect(screen.queryByRole('img', { name: 'Facebook' })).not.toBeInTheDocument();
        // text_only: text link, its logo is never rendered
        expect(screen.getAllByRole('link', { name: 'WhatsApp' })).toHaveLength(2);
        expect(document.querySelector('img[src="https://example.test/wa.webp"]')).toBeNull();
    });

    it('switches header and footer labels to English on locale change', async () => {
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
