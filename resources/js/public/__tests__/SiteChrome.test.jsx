import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
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

    // (was: brand text when there is no logo image) — the brand is now the inline SVG logo, whatever the settings say.
    // (was: wine, mark below 375px) — the logo is brand red, and the mark alone is shown below 400px.
    it('shows the inline SVG logo in brand red in the header: the lockup, and the mark alone below 400px', async () => {
        mockShell();
        renderShell();

        const header = screen.getByRole('banner');
        await within(header).findByRole('link', { name: 'Əsərlər' });
        const brand = within(header).getByTestId('header-brand');
        expect(brand).toHaveAttribute('href', '/');
        expect(brand).toHaveClass('text-brand');
        expect(brand).not.toHaveClass('text-wine');
        const [lockup, mark] = within(brand).getAllByRole('img', { name: 'ArtNiyyətli' });
        expect(lockup.tagName.toLowerCase()).toBe('svg');
        expect(lockup).toHaveAttribute('data-logo', 'lockup');
        expect(lockup).toHaveClass('hidden', 'min-[400px]:block', 'h-7');
        expect(mark).toHaveAttribute('data-logo', 'mark');
        expect(mark).toHaveClass('min-[400px]:hidden', 'h-7');
        expect(header.querySelector('img')).toBeNull();
    });

    it('draws the logo in the brand token, never Signal, with no colour change on hover or focus', async () => {
        mockShell();
        renderShell();
        await within(screen.getByRole('banner')).findByRole('link', { name: 'Əsərlər' });

        for (const brand of [screen.getByTestId('header-brand'), screen.getByTestId('footer-brand')]) {
            expect(brand).toHaveClass('text-brand');
            expect(brand.className).not.toMatch(/signal|wine/);
            expect(brand.className).not.toMatch(/(hover|focus|focus-visible|active):text-/);
            brand.querySelectorAll('svg[data-logo]').forEach((svg) => expect(svg.getAttribute('class')).not.toMatch(/text-|hover:|focus:/));
        }
    });

    it('keeps inline style attributes out of the logo SVG (CSP style-src self)', async () => {
        mockShell();
        const { container } = renderShell();
        await within(screen.getByRole('banner')).findByRole('link', { name: 'Əsərlər' });

        const logos = container.querySelectorAll('svg[data-logo]');
        expect(logos.length).toBeGreaterThan(0);
        logos.forEach((svg) => {
            expect(svg.hasAttribute('style')).toBe(false);
            expect(svg.querySelectorAll('[style]')).toHaveLength(0);
            expect(svg.querySelectorAll('[stroke], [fill]:not([fill="currentColor"])')).toHaveLength(0);
        });
    });

    it('draws the logo with currentColor, so the parent colour sets it; no red brand text anywhere', async () => {
        mockShell();
        const { container } = renderShell();
        await within(screen.getByRole('banner')).findByRole('link', { name: 'Əsərlər' });

        container.querySelectorAll('svg[data-logo]').forEach((svg) => expect(svg).toHaveAttribute('fill', 'currentColor'));
        // (was: wine-ink, h-6) — brand red on the wine footer, the header's lockup at a larger size.
        expect(within(screen.getByRole('contentinfo')).getByTestId('footer-brand')).toHaveClass('text-brand');
        expect(within(screen.getByRole('contentinfo')).getByRole('img', { name: 'ArtNiyyətli' })).toHaveClass('h-10');
        expect(within(screen.getByRole('contentinfo')).getByRole('img', { name: 'ArtNiyyətli' })).toHaveAttribute('data-logo', 'lockup');
        expect(screen.queryByText('ArtNiyyətli')).not.toBeInTheDocument();
        [...container.querySelectorAll('.text-signal')].forEach((el) => expect(el.closest('[data-testid$="-brand"]')).toBeNull());
    });

    it('keeps the header intact when the navigation is empty', async () => {
        mockShell({ navigation: { header: [], footer: [] } });
        renderShell();

        const header = screen.getByRole('banner');
        expect((await within(header).findAllByRole('img', { name: 'ArtNiyyətli' })).length).toBeGreaterThan(0);
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

    it('lays the footer out in four columns without titles: brand, navigation, legal pages, contact and social', async () => {
        mockShell({
            settings: { ...EMPTY_SETTINGS, contact_email: 'salam@artniyyetli.az', address: 'Bakı, Xaqani küçəsi 14', footer_text: '© ArtNiyyətli' },
            navigation: { header: [{ type: 'route', route_key: 'artworks', href: '/artworks' }], footer: [{ type: 'page', title: 'Məxfilik siyasəti', href: '/privacy-policy' }] },
        });
        renderShell();

        const footer = screen.getByRole('contentinfo');
        await within(footer).findByText('salam@artniyyetli.az');
        const columns = within(footer).getByTestId('footer-columns');
        expect(columns).toHaveClass('grid', 'md:grid-cols-4');
        expect(columns.className).not.toMatch(/(^|\s)grid-cols-/); // one column below 768px
        expect(columns.children).toHaveLength(4);
        const [brand, nav, legal, contact] = columns.children;
        expect(within(brand).getByText('© ArtNiyyətli')).toBeInTheDocument();
        expect(within(nav).getByRole('link', { name: 'Əsərlər' })).toHaveAttribute('href', '/artworks');
        expect(within(legal).getByRole('link', { name: 'Məxfilik siyasəti' })).toHaveAttribute('href', '/privacy-policy');
        expect(within(contact).getByText('Bakı, Xaqani küçəsi 14')).toBeInTheDocument();
        expect(within(footer).queryAllByRole('heading')).toHaveLength(0);
        expect(footer.innerHTML).not.toMatch(/signal/);
    });

    it('marks the active navigation item with signal-ink, including on its detail pages', async () => {
        window.history.pushState(null, '', '/artworks/AN-2024-031');
        mockShell();
        renderShell();

        // The header menu (the footer repeats it in wine-ink, never marked active).
        const header = within(screen.getByRole('banner'));
        const active = await header.findByRole('link', { name: 'Əsərlər' });
        expect(active).toHaveAttribute('aria-current', 'page');
        // (was: border-signal) — the underline belongs to the row layout; the phone panel uses 44px rows instead.
        expect(active).toHaveClass('text-signal-ink', 'md:border-signal');
        expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Əsərlər' })).not.toHaveClass('text-signal-ink');

        for (const name of ['Ana səhifə', 'Rəssamlar']) {
            const link = header.getByRole('link', { name });
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

    describe('the phone menu panel', () => {
        const { innerWidth } = window;
        beforeEach(() => {
            window.innerWidth = 375;
        });
        afterEach(() => {
            window.innerWidth = innerWidth;
            document.documentElement.style.overflow = '';
        });

        it('closes on Escape and gives the focus back to the "menyu" button', async () => {
            mockShell();
            renderShell();
            const toggle = await screen.findByRole('button', { name: 'menyu' });

            await userEvent.click(toggle);
            expect(toggle).toHaveAttribute('aria-expanded', 'true');
            within(document.getElementById('site-menu')).getAllByRole('link')[0].focus();

            await userEvent.keyboard('{Escape}');
            expect(toggle).toHaveAttribute('aria-expanded', 'false');
            expect(document.getElementById('site-menu')).toHaveClass('hidden');
            expect(document.activeElement).toBe(toggle);
        });

        it('keeps the page behind from scrolling while it is open, and lets it scroll again after', async () => {
            mockShell();
            renderShell();
            const toggle = await screen.findByRole('button', { name: 'menyu' });

            await userEvent.click(toggle);
            expect(document.documentElement.style.overflow).toBe('hidden');
            await userEvent.click(toggle);
            expect(document.documentElement.style.overflow).toBe('');
        });

        it('shows the language choice in the panel, and 44px link rows', async () => {
            mockShell();
            renderShell();
            const toggle = await screen.findByRole('button', { name: 'menyu' });
            const menu = document.getElementById('site-menu');
            expect(within(menu).queryByRole('group', { name: 'Language' })).not.toBeInTheDocument();

            await userEvent.click(toggle);
            expect(within(menu).getByRole('group', { name: 'Language' })).toBeInTheDocument();
            within(menu).getAllByRole('link').forEach((link) => expect(link).toHaveClass('text-nav', 'max-md:min-h-11'));
            expect(toggle).toHaveClass('min-h-11');
        });
    });

    it('gives the small header controls 44px touch targets without growing the bar', async () => {
        mockShell();
        renderShell();
        const header = screen.getByRole('banner');
        await within(header).findByRole('button', { name: 'menyu' });

        within(header).getAllByRole('button', { name: /^(AZ|EN)$/ }).forEach((button) => expect(button).toHaveClass('min-h-11', 'min-w-11'));
        expect(within(header).getByTestId('header-brand')).toHaveClass('min-h-11', '-my-2');
    });
});
