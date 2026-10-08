import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import { SiteDataProvider } from '../layout/SiteDataContext.jsx';
import SiteShell from '../layout/SiteShell.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

const NAV_AZ = {
    header: [
        { type: 'page', title: 'Ana səhifə', href: '/' },
        { type: 'page', title: 'Haqqımızda', href: '/about' },
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
                <SiteDataProvider>
                    <SiteShell>
                        <p>Page content</p>
                    </SiteShell>
                </SiteDataProvider>
            </LocaleProvider>
        );

        // The footer repeats the header menu in its navigation column: header links are checked inside the header.
        const header = within(screen.getByRole('banner'));
        expect(await header.findByRole('link', { name: 'Ana səhifə' })).toHaveAttribute('href', '/');
        expect(header.getByRole('link', { name: 'Haqqımızda' })).toHaveAttribute('href', '/about');
        expect(header.getByRole('link', { name: 'Əlaqə' })).toHaveAttribute('href', '/contact');
        expect(header.getByRole('link', { name: 'Əsərlər' })).toHaveAttribute('href', '/artworks');
        expect(header.getByRole('link', { name: 'Rəssamlar' })).toHaveAttribute('href', '/artists');
        expect(within(screen.getByTestId('footer-nav')).getByRole('link', { name: 'Əsərlər' })).toHaveAttribute('href', '/artworks');
        expect(screen.getByText('Page content')).toBeInTheDocument();

        expect(await screen.findByText('hello@artniyyetli.az')).toBeInTheDocument();
        expect(screen.getByText('ArtNiyyətli qalereyası')).toBeInTheDocument();
        // Social links render in the footer only.
        const instagramLinks = screen.getAllByRole('link', { name: 'instagram' });
        expect(instagramLinks).toHaveLength(1);
        expect(screen.getByRole('contentinfo')).toContainElement(instagramLinks[0]);
        expect(instagramLinks[0]).toHaveAttribute('href', 'https://instagram.com/artniyyetli');
        expect(screen.queryByText('null')).not.toBeInTheDocument();

        expect(screen.getByRole('link', { name: 'Məxfilik siyasəti' })).toHaveAttribute('href', '/privacy-policy');
        expect(screen.getByRole('link', { name: 'İstifadə şərtləri' })).toHaveAttribute('href', '/terms');
    });

    // (was: the raster logo_url in both places) — the logo is the brand's inline SVG; a raster logo cannot turn
    // wine-ink on the wine footer, so logo_url is deliberately not used.
    it('renders the inline SVG logo in both the header and the footer, not the raster logo_url', async () => {
        render(
            <LocaleProvider>
                <SiteDataProvider>
                    <SiteShell>
                        <p>Page content</p>
                    </SiteShell>
                </SiteDataProvider>
            </LocaleProvider>
        );

        await screen.findByText('ArtNiyyətli qalereyası'); // settings have arrived
        expect(within(screen.getByRole('banner')).getAllByRole('img', { name: 'Art Niyyätli' }).length).toBeGreaterThan(0);
        expect(within(screen.getByRole('contentinfo')).getByRole('img', { name: 'Art Niyyätli' }).tagName.toLowerCase()).toBe('svg');
        expect(document.querySelector('img[src="https://example.test/logo.webp"]')).toBeNull();
    });

    it('renders social links only in the footer, by their saved display mode', async () => {
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
                <SiteDataProvider>
                    <SiteShell>
                        <p>Page content</p>
                    </SiteShell>
                </SiteDataProvider>
            </LocaleProvider>
        );

        const header = screen.getByRole('banner');
        const footer = screen.getByRole('contentinfo');

        // Footer: by the saved display mode.
        // logo_only: image named by the platform, no visible text
        expect(await within(footer).findByRole('img', { name: 'Instagram' })).toHaveAttribute('src', 'https://example.test/ig.webp');
        expect(within(footer).queryByText('Instagram')).not.toBeInTheDocument();
        // logo_text: the link is named by its text; the icon is decorative
        expect(within(footer).getByRole('link', { name: 'Facebook' })).toBeInTheDocument();
        expect(within(footer).queryByRole('img', { name: 'Facebook' })).not.toBeInTheDocument();
        // text_only: text link, its logo is never rendered
        expect(within(footer).getByRole('link', { name: 'WhatsApp' })).toBeInTheDocument();
        expect(document.querySelector('img[src="https://example.test/wa.webp"]')).toBeNull();

        // Header: no social links at all (they would repeat the footer and cost the navigation ~140px).
        for (const name of ['Instagram', 'Facebook', 'WhatsApp']) {
            expect(within(header).queryByRole('link', { name })).not.toBeInTheDocument();
        }
    });

    it('switches header and footer labels to English on locale change', async () => {
        render(
            <LocaleProvider>
                <SiteDataProvider>
                    <SiteShell>
                        <p>Page content</p>
                    </SiteShell>
                </SiteDataProvider>
            </LocaleProvider>
        );

        await screen.findByRole('link', { name: 'Məxfilik siyasəti' });

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        const header = within(screen.getByRole('banner'));
        await waitFor(() => expect(header.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/'));
        expect(header.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
        expect(header.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');
        expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy-policy');
        expect(screen.getByRole('link', { name: 'Terms & Conditions' })).toHaveAttribute('href', '/terms');
        expect(screen.queryByText('Məxfilik siyasəti')).not.toBeInTheDocument();
    });
});
