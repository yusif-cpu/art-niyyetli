import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { SiteDataProvider } from '../layout/SiteDataContext.jsx';
import App from '../App.jsx';
import ContactPage from '../pages/ContactPage.jsx';
import ArtistsPage from '../pages/ArtistsPage.jsx';
import HomePage from '../pages/HomePage.jsx';

// The client's data at launch: some fields empty, the journal possibly closed, three artists, a local phone number.
// Each scenario renders the real pages against a mocked API.

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

const FULL = {
    contact_email: 'salam@artniyyetli.az', phone: '070 353 05 12', address: 'Bakı, Xaqani küçəsi 14',
    opening_hours: 'Bazar ertəsi şənbə, 10:00 20:00', footer_text: null, whatsapp_number: null, brand_text: 'ArtNiyyətli',
    logo_media_id: null, logo_display_mode: 'logo_text', logo_url: null,
};
const SOCIAL = [{ platform: 'Instagram', url: 'https://instagram.com/artniyyetli', display_mode: 'text_only', logo_url: null }];
const NAV_OPEN = {
    header: [{ type: 'route', route_key: 'artworks', href: '/artworks' }, { type: 'route', route_key: 'articles', href: '/articles' }],
    footer: [{ type: 'page', title: 'Məxfilik siyasəti', href: '/privacy-policy' }],
};
const NAV_CLOSED = { header: [{ type: 'route', route_key: 'artworks', href: '/artworks' }], footer: NAV_OPEN.footer };
const ARTICLE = { slug: 'musahibe', title: 'Kamran Səfərli ilə müsahibə', type: 'interview', short_text: 'Qısa mətn.', content: 'Mətn', published_at: '2026-09-10T09:30:00+04:00', media: [] };
const artist = (i) => ({ id: i, slug: `artist-${i}`, first_name: 'Rəssam', last_name: String(i), direction: 'Rəngkarlıq', portrait_url: null, artworks_count: 2 });
const HOMEPAGE = { page: null, wall: [], featured: [], artists: [], faqs: [], exhibitions: { current: [], upcoming: [] } };

function mockApi({ settings = FULL, social = SOCIAL, navigation = NAV_OPEN, artists = [artist(1)] } = {}) {
    global.fetch = vi.fn((url) => {
        if (url.includes('/site-settings')) return Promise.resolve(jsonResponse({ data: settings }));
        if (url.includes('/social-links')) return Promise.resolve(jsonResponse({ data: social }));
        if (url.includes('/navigation')) return Promise.resolve(jsonResponse({ data: navigation }));
        if (url.includes('/homepage')) return Promise.resolve(jsonResponse({ data: { ...HOMEPAGE, artists } }));
        if (url.includes('/artists')) return Promise.resolve(jsonResponse({ data: artists, meta: { current_page: 1, last_page: 1, total: artists.length } }));
        if (url.includes('/articles/')) return Promise.resolve(jsonResponse({ data: ARTICLE }));
        if (url.includes('/articles')) return Promise.resolve(jsonResponse({ data: [ARTICLE], meta: { current_page: 1, last_page: 1, total: 1 } }));
        if (url.includes('/enquiry-subjects')) return Promise.resolve(jsonResponse({ data: [{ key: 'general_contact', label: 'Ümumi əlaqə' }] }));
        return Promise.resolve(jsonResponse({ data: null }));
    });
}

const renderInSite = (page) => render(<LocaleProvider><SiteDataProvider>{page}</SiteDataProvider></LocaleProvider>);
const footer = () => screen.getByRole('contentinfo');
// The footer is ready once its legal menu (always present here) has rendered.
const footerReady = () => within(footer()).findByRole('link', { name: 'Məxfilik siyasəti' });

describe('launch scenarios', () => {
    beforeEach(() => {
        localStorage.removeItem('public-locale');
        window.history.pushState(null, '', '/');
    });
    afterEach(() => {
        window.history.pushState(null, '', '/');
    });

    describe('empty address', () => {
        const settings = { ...FULL, address: null };

        it('leaves the address row and its label out of the contact page', async () => {
            mockApi({ settings });
            renderInSite(<ContactPage />);

            const details = await screen.findByTestId('contact-details');
            expect(within(details).queryByText(t('az', 'contact.address'))).not.toBeInTheDocument();
            expect(within(details).queryByRole('link', { name: t('az', 'contact.openMap') })).not.toBeInTheDocument();
            expect(within(details).getByText(t('az', 'contact.phone'))).toBeInTheDocument();
        });

        it('keeps the footer contact column without an empty address line', async () => {
            mockApi({ settings });
            window.history.pushState(null, '', '/contact');
            render(<App />);
            await footerReady();

            const contact = within(footer()).getByTestId('footer-contact');
            expect(within(contact).queryByText(FULL.address)).not.toBeInTheDocument();
            expect(within(contact).getByText(FULL.opening_hours)).toBeInTheDocument();
            contact.querySelectorAll('p').forEach((p) => expect(p.textContent.trim()).not.toBe(''));
        });

        it('writes no address (and no empty value) into the page head', async () => {
            mockApi({ settings });
            renderInSite(<ContactPage />);
            await screen.findByTestId('contact-details');

            expect(document.head.innerHTML).not.toMatch(/address|Xaqani|null|undefined/i);
        });
    });

    describe('empty e-mail', () => {
        it('shows no e-mail line and no mailto link on the contact page or in the footer', async () => {
            mockApi({ settings: { ...FULL, contact_email: null } });
            window.history.pushState(null, '', '/contact');
            const { container } = render(<App />);
            await footerReady();
            const details = await screen.findByTestId('contact-details');

            expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
            // (The enquiry form's own e-mail field keeps its label: that is the visitor's address, not the gallery's.)
            expect(within(details).queryByText(t('az', 'contact.email'))).not.toBeInTheDocument();
            expect(within(footer()).getByRole('link', { name: FULL.phone })).toBeInTheDocument();
        });
    });

    describe('empty social links', () => {
        it('renders no social block in the footer', async () => {
            mockApi({ social: [] });
            render(<App />);
            await footerReady();
            await within(footer()).findByText(FULL.address);

            expect(within(footer()).queryByRole('list', { name: /social/i })).not.toBeInTheDocument();
            expect(footer().querySelector('a[target="_blank"]')).toBeNull();
            expect(within(footer()).queryAllByRole('heading')).toHaveLength(0);
        });

        it('drops the whole contact column when every contact field and social link is empty', async () => {
            mockApi({ settings: { ...FULL, contact_email: null, phone: null, address: null, opening_hours: null }, social: [] });
            render(<App />);
            await footerReady();

            // An empty grid item would still take a row (and a row gap) on phones.
            expect(within(footer()).queryByTestId('footer-contact')).not.toBeInTheDocument();
            expect(within(footer()).getByTestId('footer-columns').children).toHaveLength(3);
        });

        it('keeps the contact column when only a social link is left', async () => {
            mockApi({ settings: { ...FULL, contact_email: null, phone: null, address: null, opening_hours: null } });
            render(<App />);

            const contact = await within(footer()).findByTestId('footer-contact');
            expect(within(contact).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', SOCIAL[0].url);
        });
    });

    describe('closed journal (no "articles" item in either menu)', () => {
        it('shows no journal block on the home page and no journal link in the footer', async () => {
            mockApi({ navigation: NAV_CLOSED });
            render(<App />);
            await footerReady();
            await screen.findByRole('heading', { name: t('az', 'home.contact') });
            await waitFor(() => expect(global.fetch.mock.calls.some(([url]) => url.includes('/articles'))).toBe(true));

            expect(screen.queryByRole('heading', { name: t('az', 'home.articles') })).not.toBeInTheDocument();
            expect(screen.queryByText(ARTICLE.title)).not.toBeInTheDocument();
            expect(within(footer()).queryByRole('link', { name: t('az', 'nav.articles') })).not.toBeInTheDocument();
        });

        it('still shows the home journal block and the footer link while the journal is open', async () => {
            mockApi({ navigation: NAV_OPEN });
            render(<App />);

            expect(await screen.findByText(ARTICLE.title)).toBeInTheDocument();
            expect(within(footer()).getByRole('link', { name: t('az', 'nav.articles') })).toHaveAttribute('href', '/articles');
        });

        it.each(['/articles', '/articles/musahibe'])('answers %s with the not-found page, not an empty journal', async (path) => {
            mockApi({ navigation: NAV_CLOSED });
            window.history.pushState(null, '', path);
            render(<App />);

            expect(await screen.findByRole('heading', { level: 1, name: t('az', 'notFound.title') })).toBeInTheDocument();
            expect(screen.queryByText(ARTICLE.title)).not.toBeInTheDocument();
            // The meta tag is set in an effect, which can run after the heading is on screen (under the full suite's
            // load it once had not yet): wait for it.
            await waitFor(() => expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toMatch(/noindex/));
        });

        it('opens /articles normally while the journal is open', async () => {
            mockApi({ navigation: NAV_OPEN });
            window.history.pushState(null, '', '/articles');
            render(<App />);

            expect(await screen.findByText(ARTICLE.title)).toBeInTheDocument();
            expect(screen.queryByText(t('az', 'notFound.title'))).not.toBeInTheDocument();
        });
    });

    describe('artist count', () => {
        beforeEach(() => {
            global.ResizeObserver = class { observe() {} disconnect() {} };
        });

        it.each([1, 2, 3, 4])('lists %i artist(s) as that many same-size cells, with no filler and no stretched card', async (n) => {
            mockApi({ artists: Array.from({ length: n }, (_, i) => artist(i + 1)) });
            const { unmount } = renderInSite(<ArtistsPage />);
            const page = await screen.findByText('Rəssam 1');
            const list = page.closest('ul');
            expect(list.children).toHaveLength(n);
            // The column count stays the page's own (cards keep their width; a short row stays left-aligned).
            expect(list).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-3', 'xl:grid-cols-4');
            [...list.children].forEach((li) => expect(li.className).not.toMatch(/span|stretch|w-full/));
            unmount();

            renderInSite(<HomePage />);
            const home = await screen.findByTestId('home-artists');
            expect(home.children).toHaveLength(n);
            expect(home).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-3', 'xl:grid-cols-4');
            [...home.children].forEach((li) => expect(li.className).not.toMatch(/span|stretch/));
        });
    });

    describe('phone "070 353 05 12"', () => {
        // (was: tel:0703530512) — the gallery takes calls from abroad: the link is international, the text stays local.
        it('dials +994 70 353 05 12 and shows the number as written, on the contact page and in the footer', async () => {
            mockApi();
            window.history.pushState(null, '', '/contact');
            render(<App />);
            await footerReady();
            const details = await screen.findByTestId('contact-details');

            for (const scope of [within(details), within(footer())]) {
                const link = scope.getByRole('link', { name: '070 353 05 12' });
                expect(link).toHaveAttribute('href', 'tel:+994703530512');
                expect(link.textContent).toBe('070 353 05 12');
            }
        });
    });

    describe('opening hours (one line)', () => {
        it('has its own labelled row on the contact page, the text unchanged', async () => {
            mockApi();
            renderInSite(<ContactPage />);

            const details = await screen.findByTestId('contact-details');
            const hours = within(details).getByText(FULL.opening_hours);
            expect(hours.closest('div')).toHaveTextContent(t('az', 'contact.hours'));
            expect(hours.textContent).toBe('Bazar ertəsi şənbə, 10:00 20:00');
        });
    });
});
