import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import { SiteDataProvider } from '../layout/SiteDataContext.jsx';
import SiteShell from '../layout/SiteShell.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

const EMPTY_SETTINGS = {
    contact_email: null, phone: null, address: null, opening_hours: null, footer_text: null,
    whatsapp_number: null, brand_text: 'ArtNiyyətli', logo_media_id: null, logo_display_mode: 'logo_text', logo_url: null,
};

const NAV = {
    header: [
        { type: 'page', title: 'Ana səhifə', href: '/' },
        { type: 'route', route_key: 'artworks', href: '/artworks' },
        { type: 'route', route_key: 'artists', href: '/artists' },
    ],
    footer: [{ type: 'page', title: 'Məxfilik siyasəti', href: '/privacy-policy' }],
};

function mockShell({ settings = EMPTY_SETTINGS, navigation = NAV, social = [] } = {}) {
    global.fetch = vi.fn((url) => {
        if (url.includes('/site-settings')) return Promise.resolve(jsonResponse({ data: settings }));
        if (url.includes('/social-links')) return Promise.resolve(jsonResponse({ data: social }));
        if (url.includes('/navigation')) return Promise.resolve(jsonResponse({ data: navigation }));
        return Promise.resolve(jsonResponse({ data: {} }));
    });
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

describe('Site chrome (header + footer)', () => {
    afterEach(() => {
        window.history.pushState(null, '', '/');
    });

    it('shows the brand text in the header when there is no logo image', async () => {
        mockShell();
        renderShell();

        const header = screen.getByRole('banner');
        await within(header).findByRole('link', { name: 'Əsərlər' });
        expect(within(header).getByText('ArtNiyyətli')).toBeInTheDocument();
        expect(within(header).queryByRole('img')).not.toBeInTheDocument();
    });

    it('keeps the header intact when the navigation is empty', async () => {
        mockShell({ navigation: { header: [], footer: [] } });
        renderShell();

        const header = screen.getByRole('banner');
        expect(await within(header).findByText('ArtNiyyətli')).toBeInTheDocument();
        expect(within(header).queryByRole('navigation')).not.toBeInTheDocument();
        expect(within(header).getByRole('group', { name: 'Language' })).toBeInTheDocument();
        // Nothing to open, so no menu toggle either.
        expect(within(header).queryByRole('button', { name: 'menyu' })).not.toBeInTheDocument();
        expect(screen.getByText('Page content')).toBeInTheDocument();
    });

    it('renders no empty lines in the footer when the contact fields are empty', async () => {
        mockShell();
        renderShell();

        const footer = screen.getByRole('contentinfo');
        await within(footer).findByRole('link', { name: 'Məxfilik siyasəti' });
        expect(footer.querySelectorAll('p')).toHaveLength(0);
        expect(footer.querySelector('a[href^="mailto:"], a[href^="tel:"]')).toBeNull();
        expect(footer.textContent).not.toMatch(/null|undefined/);
    });

    it('renders filled contact fields in the footer as lines and links', async () => {
        mockShell({
            settings: { ...EMPTY_SETTINGS, contact_email: 'salam@artniyyetli.az', phone: '+994 50 000 00 00', address: 'Bakı, Xaqani küçəsi 14', opening_hours: '12:00–19:00', footer_text: '© ArtNiyyətli' },
        });
        renderShell();

        const footer = screen.getByRole('contentinfo');
        expect(await within(footer).findByRole('link', { name: 'salam@artniyyetli.az' })).toHaveAttribute('href', 'mailto:salam@artniyyetli.az');
        expect(within(footer).getByRole('link', { name: '+994 50 000 00 00' })).toHaveAttribute('href', 'tel:+994500000000');
        expect(within(footer).getByText('Bakı, Xaqani küçəsi 14')).toBeInTheDocument();
        expect(within(footer).getByText('12:00–19:00')).toBeInTheDocument();
        expect(within(footer).getByText('© ArtNiyyətli')).toBeInTheDocument();
    });

    it('puts the language switch in the header, not in the footer', async () => {
        mockShell();
        renderShell();

        const header = screen.getByRole('banner');
        const footer = screen.getByRole('contentinfo');
        await within(header).findByRole('link', { name: 'Əsərlər' });
        expect(within(header).getByRole('group', { name: 'Language' })).toBeInTheDocument();
        expect(within(header).getByRole('button', { name: 'AZ' })).toHaveAttribute('aria-current', 'true');
        expect(within(footer).queryByRole('group', { name: 'Language' })).not.toBeInTheDocument();
    });

    it('marks the active navigation item with signal-ink, including on its detail pages', async () => {
        window.history.pushState(null, '', '/artworks/AN-2024-031');
        mockShell();
        renderShell();

        const active = await screen.findByRole('link', { name: 'Əsərlər' });
        expect(active).toHaveAttribute('aria-current', 'page');
        expect(active).toHaveClass('text-signal-ink', 'border-signal');

        for (const name of ['Ana səhifə', 'Rəssamlar']) {
            const link = screen.getByRole('link', { name });
            expect(link).not.toHaveAttribute('aria-current');
            expect(link).not.toHaveClass('text-signal-ink');
        }
    });

    it('toggles the collapsed menu with a plain text button', async () => {
        mockShell();
        renderShell();

        const toggle = await screen.findByRole('button', { name: 'menyu' });
        const menu = document.getElementById('site-menu');
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(menu).toHaveClass('hidden');

        await userEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(menu).not.toHaveClass('hidden');

        await userEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(menu).toHaveClass('hidden');
    });
});
