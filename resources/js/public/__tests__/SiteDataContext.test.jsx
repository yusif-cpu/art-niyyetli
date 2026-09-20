import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import { SiteDataProvider, useSiteData } from '../layout/SiteDataContext.jsx';
import SiteShell from '../layout/SiteShell.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

function errorResponse(status) {
    return { ok: false, status, headers: { get: () => 'application/json' }, json: async () => ({ message: 'Server error.' }) };
}

const NAV = {
    az: { header: [{ type: 'page', title: 'Ana səhifə', href: '/' }], footer: [{ type: 'page', title: 'Məxfilik siyasəti', href: '/privacy-policy' }] },
    en: { header: [{ type: 'page', title: 'Home', href: '/' }], footer: [{ type: 'page', title: 'Privacy Policy', href: '/privacy-policy' }] },
};

const SETTINGS = {
    contact_email: 'hello@artniyyetli.az', phone: null, address: null, opening_hours: null, footer_text: 'ArtNiyyətli qalereyası',
    brand_text: 'ArtNiyyətli', logo_display_mode: 'text_only', logo_media_id: null, logo_url: null,
};

const SOCIAL = [{ platform: 'instagram', url: 'https://instagram.com/artniyyetli', sort_order: 0 }];

/** The shell endpoints only, as the paths the browser was asked for (query string included). */
function shellRequests() {
    return global.fetch.mock.calls
        .map(([url]) => url)
        .filter((url) => /\/(navigation|site-settings|social-links)\b/.test(url));
}

function renderShell() {
    return render(
        <LocaleProvider>
            <SiteDataProvider>
                <SiteShell>
                    <p>Page content</p>
                </SiteShell>
            </SiteDataProvider>
        </LocaleProvider>
    );
}

describe('SiteDataProvider', () => {
    beforeEach(() => {
        localStorage.clear();
        global.fetch = vi.fn((url) => {
            const locale = url.includes('locale=en') ? 'en' : 'az';
            if (url.includes('/site-settings')) return Promise.resolve(jsonResponse({ data: SETTINGS }));
            if (url.includes('/social-links')) return Promise.resolve(jsonResponse({ data: SOCIAL }));
            if (url.includes('/navigation')) return Promise.resolve(jsonResponse({ data: NAV[locale] }));
            return Promise.resolve(jsonResponse({ data: {} }));
        });
    });

    it('issues exactly one request per shell endpoint even though Header and Footer both render it', async () => {
        renderShell();

        await screen.findByText('hello@artniyyetli.az');
        await screen.findByRole('link', { name: 'Məxfilik siyasəti' });

        expect(shellRequests().sort()).toEqual([
            '/api/v1/navigation?locale=az',
            '/api/v1/site-settings?locale=az',
            '/api/v1/social-links?locale=az',
        ]);
    });

    it('issues exactly three more requests when the locale changes, not six', async () => {
        renderShell();
        await screen.findByRole('link', { name: 'Məxfilik siyasəti' });

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));
        await screen.findByRole('link', { name: 'Privacy Policy' });

        const requests = shellRequests();
        expect(requests).toHaveLength(6);
        expect(requests.filter((url) => url.includes('locale=en')).sort()).toEqual([
            '/api/v1/navigation?locale=en',
            '/api/v1/site-settings?locale=en',
            '/api/v1/social-links?locale=en',
        ]);
    });

    it('does not refetch when the shell re-renders without a locale change', async () => {
        const { rerender } = renderShell();
        await screen.findByRole('link', { name: 'Məxfilik siyasəti' });

        rerender(
            <LocaleProvider>
                <SiteDataProvider>
                    <SiteShell>
                        <p>Different page content</p>
                    </SiteShell>
                </SiteDataProvider>
            </LocaleProvider>
        );

        expect(screen.getByText('Different page content')).toBeInTheDocument();
        expect(shellRequests()).toHaveLength(3);
    });

    it('gives every consumer the same data, so the header and the footer show the same social links', async () => {
        renderShell();

        const links = await screen.findAllByRole('link', { name: 'instagram' });

        expect(links).toHaveLength(2);
        links.forEach((link) => expect(link).toHaveAttribute('href', 'https://instagram.com/artniyyetli'));
    });

    it('exposes { data, loading, error } for each shell resource, loading first', async () => {
        const seen = [];
        function Probe() {
            const { navigation, settings, socialLinks } = useSiteData();
            seen.push({ navigation: navigation.loading, settings: settings.loading, socialLinks: socialLinks.loading });

            return (
                <p>
                    {settings.data?.brand_text ?? 'no-settings'}|{navigation.data?.header?.length ?? 'no-nav'}|{socialLinks.data?.length ?? 'no-social'}|{String(settings.error)}
                </p>
            );
        }

        render(
            <LocaleProvider>
                <SiteDataProvider>
                    <Probe />
                </SiteDataProvider>
            </LocaleProvider>
        );

        expect(screen.getByText('no-settings|no-nav|no-social|null')).toBeInTheDocument();
        expect(seen[0]).toEqual({ navigation: true, settings: true, socialLinks: true });

        expect(await screen.findByText('ArtNiyyətli|1|1|null')).toBeInTheDocument();
        expect(seen.at(-1)).toEqual({ navigation: false, settings: false, socialLinks: false });
    });

    it('shows the fallbacks while the shell data is still loading, as before', () => {
        global.fetch = vi.fn(() => new Promise(() => {}));

        renderShell();

        expect(screen.getByText('Page content')).toBeInTheDocument();
        // Brand text falls back to the default, and there is no navigation, contact info or social links yet.
        expect(screen.getAllByText('ArtNiyyətli')).toHaveLength(2);
        expect(screen.queryByRole('link', { name: 'instagram' })).not.toBeInTheDocument();
        expect(screen.queryByText('hello@artniyyetli.az')).not.toBeInTheDocument();
    });

    it('keeps the other consumers working when one shell endpoint fails', async () => {
        global.fetch = vi.fn((url) => {
            if (url.includes('/navigation')) return Promise.resolve(errorResponse(500));
            if (url.includes('/site-settings')) return Promise.resolve(jsonResponse({ data: SETTINGS }));
            if (url.includes('/social-links')) return Promise.resolve(jsonResponse({ data: SOCIAL }));
            return Promise.resolve(jsonResponse({ data: {} }));
        });

        renderShell();

        // Settings and social links still render in the header and the footer ...
        expect(await screen.findByText('hello@artniyyetli.az')).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: 'instagram' })).toHaveLength(2);
        // ... the page still renders, and only the navigation is missing.
        expect(screen.getByText('Page content')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Ana səhifə' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Məxfilik siyasəti' })).not.toBeInTheDocument();
    });

    it('keeps navigation and social links when site settings fail, falling back to the default brand', async () => {
        global.fetch = vi.fn((url) => {
            if (url.includes('/site-settings')) return Promise.resolve(errorResponse(500));
            if (url.includes('/social-links')) return Promise.resolve(jsonResponse({ data: SOCIAL }));
            if (url.includes('/navigation')) return Promise.resolve(jsonResponse({ data: NAV.az }));
            return Promise.resolve(jsonResponse({ data: {} }));
        });

        renderShell();

        expect(await screen.findByRole('link', { name: 'Ana səhifə' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Məxfilik siyasəti' })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: 'instagram' })).toHaveLength(2);
        expect(screen.getAllByText('ArtNiyyətli')).toHaveLength(2);
        expect(screen.queryByText('hello@artniyyetli.az')).not.toBeInTheDocument();
    });

    it('records a failure in the resource that failed, not in the others', async () => {
        global.fetch = vi.fn((url) => {
            if (url.includes('/social-links')) return Promise.resolve(errorResponse(429));
            if (url.includes('/site-settings')) return Promise.resolve(jsonResponse({ data: SETTINGS }));
            return Promise.resolve(jsonResponse({ data: NAV.az }));
        });
        let latest;
        function Probe() {
            latest = useSiteData();

            return null;
        }

        render(
            <LocaleProvider>
                <SiteDataProvider>
                    <Probe />
                </SiteDataProvider>
            </LocaleProvider>
        );

        await waitFor(() => expect(latest.socialLinks.loading).toBe(false));
        await waitFor(() => expect(latest.settings.loading).toBe(false));

        expect(latest.socialLinks.error.status).toBe(429);
        expect(latest.socialLinks.data).toBeNull();
        expect(latest.settings.error).toBeNull();
        expect(latest.settings.data.brand_text).toBe('ArtNiyyətli');
    });

    it('throws a clear error when a consumer is rendered outside the provider', () => {
        function Orphan() {
            useSiteData();

            return null;
        }
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => render(<Orphan />)).toThrow('useSiteData must be used within a SiteDataProvider');

        consoleError.mockRestore();
    });
});
