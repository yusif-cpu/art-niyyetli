import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import HomePage from '../pages/HomePage.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

const card = (code, title, w, h, extra = {}) => ({
    inventory_code: code, title, artist: { id: 1, name: 'Kamran Səfərli' }, image_url: null, genre: { slug: 'painting', name: 'Painting' },
    medium: { slug: 'oil', name: 'Oil' }, price: 9800, currency: 'AZN', availability: 'available', width_cm: w, height_cm: h, ...extra,
});

const homepageData = {
    page: { title: 'Ana səhifə', sections: [{ key: 'hero', heading: 'ArtNiyyətli', body: 'Müasir Azərbaycan sənətini kəşf edin.', sort_order: 0, image_url: null }] },
    stats: { artists: 5, artworks: 12, exhibitions: 2 },
    wall: [card('AN-1', 'Wall Piece', 180, 140), card('AN-2', 'Small Piece', 40, 30)],
    featured: [card('AN-3', 'Featured Piece', 20, 20, { price: null, currency: null })],
    artists: [{ id: 1, slug: 'a', first_name: 'A', last_name: 'B', direction: 'Modern', portrait_url: null }],
    exhibition: { slug: 'winter-show', title: 'Winter Show', status: 'current', start_date: '2026-01-10', end_date: '2026-02-10', venue: 'Main Gallery', short_text: '...', full_text: '...', artists: [], artworks: [], media: [] },
    faqs: [{ id: 1, question: 'Necə sifariş verə bilərəm?', answer: 'Sorğu göndərin.', sort_order: 0 }],
    social_links: [],
};
const ARTICLES = [{ slug: 'musahibe', title: 'Kamran Səfərli ilə müsahibə', type: 'interview', short_text: 'Xətt və boşluq haqqında.', content: '…', published_at: '2026-09-10T09:30:00+04:00', media: [] }];

let homepage;
let articles;
function mockApi() {
    global.fetch = vi.fn((url) => {
        if (url.startsWith('/api/v1/articles')) return Promise.resolve(jsonResponse({ data: articles, meta: { current_page: 1, last_page: 1, total: articles.length } }));
        return Promise.resolve(typeof homepage === 'function' ? homepage() : jsonResponse({ data: homepage }));
    });
}
const homepageCalls = () => global.fetch.mock.calls.filter(([url]) => url.startsWith('/api/v1/homepage'));

function renderHome(extra = null) {
    return render(<LocaleProvider>{extra}<HomePage /></LocaleProvider>);
}

describe('HomePage', () => {
    const originalRO = global.ResizeObserver;

    beforeEach(() => {
        localStorage.removeItem('public-locale'); // the locale test switches to EN; every test starts in AZ
        homepage = homepageData;
        articles = ARTICLES;
        mockApi();
        // jsdom has no layout: the wall container is 1296px wide; window.innerWidth (1024) keeps it horizontal,
        // window.innerHeight (768) gives a 445px wall area → k = (445 − 64) / 270.
        global.ResizeObserver = class {
            constructor(cb) { this.cb = cb; }
            observe() { this.cb([{ contentRect: { width: 1296 } }]); }
            disconnect() {}
        };
    });

    afterEach(() => {
        global.ResizeObserver = originalRO;
    });

    const K = (445 - 64) / 270;
    const wallFields = () => screen.getAllByTestId('wall-field');

    // ── existing behaviour, adapted to the rebuilt page ──────────────────────────────────────────────────────────

    it('shows a static skeleton, then the hero, the wall, artists, exhibition and FAQs', async () => {
        renderHome();

        // (was: the "Yüklənir..." text) — a static skeleton with aria-busy, no shimmer
        expect(screen.getByTestId('home-skeleton')).toHaveAttribute('aria-busy', 'true');

        expect(await screen.findByRole('heading', { level: 1, name: 'ArtNiyyətli' })).toBeInTheDocument();
        expect(screen.getByText('Wall Piece')).toBeInTheDocument();
        expect(screen.getByText('A B')).toBeInTheDocument();
        expect(screen.getByText('Winter Show')).toBeInTheDocument();
        expect(screen.getByText('Necə sifariş verə bilərəm?')).toBeInTheDocument();
        expect(screen.getByText('Featured Piece')).toBeInTheDocument();
    });

    it('renders both current and upcoming exhibitions from the single homepage response', async () => {
        const ex = (slug, title, status) => ({ ...homepageData.exhibition, slug, title, status });
        homepage = {
            ...homepageData,
            exhibition: ex('now', 'Now Show', 'current'),
            // (was: one current show) — the first current show now gets the wine block, so a second one keeps the list's
            // "Cari sərgilər" group.
            exhibitions: { current: [ex('now', 'Now Show', 'current'), ex('also', 'Also Show', 'current')], upcoming: [ex('soon', 'Soon Show', 'upcoming'), ex('later', 'Later Show', 'upcoming')] },
        };
        mockApi();
        renderHome();

        expect(await screen.findByText('Now Show')).toBeInTheDocument();
        expect(screen.getByText('Also Show')).toBeInTheDocument();
        expect(screen.getByText('Soon Show')).toBeInTheDocument();
        expect(screen.getByText('Later Show')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Cari sərgilər' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Gələcək sərgilər' })).toBeInTheDocument();
        // (was: fetch called once) — one homepage request; the journal block adds its own /articles request
        expect(homepageCalls()).toHaveLength(1);
    });

    it('omits the heading of an empty exhibitions group', async () => {
        homepage = { ...homepageData, exhibitions: { current: [], upcoming: [{ ...homepageData.exhibition, slug: 'soon', title: 'Soon Show', status: 'upcoming' }] } };
        mockApi();
        renderHome();

        expect(await screen.findByText('Soon Show')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Cari sərgilər' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Gələcək sərgilər' })).toBeInTheDocument();
    });

    it('falls back to the single exhibition for a response without the exhibitions lists', async () => {
        renderHome();

        expect(await screen.findByText('Winter Show')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Cari sərgilər' })).not.toBeInTheDocument();
    });

    it('renders no exhibition section when both lists are empty', async () => {
        homepage = { ...homepageData, exhibition: null, exhibitions: { current: [], upcoming: [] } };
        mockApi();
        renderHome();

        await screen.findByText('Wall Piece');
        expect(screen.queryByText('Winter Show')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Sərgilər' })).not.toBeInTheDocument();
    });

    it('renders without crashing when page and exhibition are null', async () => {
        homepage = { ...homepageData, page: null, exhibition: null };
        mockApi();
        renderHome();

        expect(await screen.findByText('Wall Piece')).toBeInTheDocument();
        expect(screen.queryByText('Winter Show')).not.toBeInTheDocument();
    });

    it('shows an error with a retry button that re-fetches', async () => {
        let calls = 0;
        homepage = () => (++calls === 1 ? { ok: false, status: 500, headers: { get: () => 'application/json' }, json: async () => ({ message: 'Server error.' }) } : jsonResponse({ data: homepageData }));
        mockApi();
        renderHome();

        const alert = await screen.findByRole('alert');
        expect(within(alert).getByText('Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.')).toHaveClass('text-signal-ink');
        await userEvent.click(within(alert).getByRole('button', { name: 'Yenidən cəhd et' }));
        expect(await screen.findByText('Wall Piece')).toBeInTheDocument();
    });

    it('collapses the title to just the site name when the hero heading IS the site name, instead of doubling it', async () => {
        homepage = {
            page: { sections: [{ key: 'hero', heading: 'ArtNiyyətli', body: 'Discover Azerbaijani art.', sort_order: 0, image_url: null }] },
            stats: { artists: 0, artworks: 0, exhibitions: 0 }, wall: [], featured: [], artists: [], exhibition: null, faqs: [], social_links: [],
        };
        mockApi();
        renderHome();

        await waitFor(() => expect(document.title).toBe('ArtNiyyətli'));
    });

    it('treats the logo spelling "Art Niyyätli" as the site name too: the h1 shows it, the title stays "ArtNiyyətli"', async () => {
        homepage = {
            page: { sections: [{ key: 'hero', heading: 'Art Niyyätli', body: 'Discover Azerbaijani art.', sort_order: 0, image_url: null }] },
            stats: { artists: 0, artworks: 0, exhibitions: 0 }, wall: [], featured: [], artists: [], exhibition: null, faqs: [], social_links: [],
        };
        mockApi();
        renderHome();

        expect(await screen.findByRole('heading', { level: 1, name: 'Art Niyyätli' })).toBeInTheDocument();
        await waitFor(() => expect(document.title).toBe('ArtNiyyətli'));
        expect(document.title).not.toMatch(/\|/);
    });

    it('does not crash when the locale changes after the page has already loaded', async () => {
        renderHome(<LocaleSwitcher />);
        await screen.findByText('Wall Piece');

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await waitFor(() => expect(screen.getAllByText('ArtNiyyətli').length).toBeGreaterThan(0));
    });

    describe('page sections are resolved by key', () => {
        const empty = { stats: { artists: 0, artworks: 0, exhibitions: 0 }, wall: [], featured: [], artists: [], exhibition: null, faqs: [], social_links: [] };
        const section = (key, heading, sort_order = 0) => ({ key, heading, body: `${heading} body`, sort_order, image_url: null });

        function renderWith(sections) {
            homepage = { ...empty, page: { title: 'Ana səhifə', sections } };
            articles = [];
            mockApi();
            renderHome();
        }

        it('uses the hero even when it is not the first section, for the h1, title and description', async () => {
            renderWith([section('steps', 'How it works'), section('hero', 'Real Hero', 1)]);

            expect(await screen.findByRole('heading', { level: 1, name: 'Real Hero' })).toBeInTheDocument();
            expect(screen.getByRole('heading', { level: 2, name: 'How it works' })).toBeInTheDocument();
            await waitFor(() => expect(document.title).toBe('Real Hero | ArtNiyyətli'));
        });

        it('renders steps and cta by key and ignores unknown keys', async () => {
            renderWith([section('mystery', 'Unknown Block'), section('hero', 'Hero'), section('cta', 'Get in touch', 2), section('steps', 'Steps', 1), section('test', 'Another Unknown', 3)]);

            expect(await screen.findByRole('heading', { level: 2, name: 'Get in touch' })).toBeInTheDocument();
            expect(screen.getByRole('heading', { level: 2, name: 'Steps' })).toBeInTheDocument();
            expect(screen.queryByText('Unknown Block')).not.toBeInTheDocument();
            expect(screen.queryByText('Another Unknown')).not.toBeInTheDocument();
        });

        it('falls back to the default title and renders no hero when the hero is missing', async () => {
            renderWith([section('mystery', 'Unknown Block'), section('cta', 'Get in touch', 1)]);

            expect(await screen.findByText('Get in touch')).toBeInTheDocument();
            expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
            expect(screen.queryByText('Unknown Block')).not.toBeInTheDocument();
            await waitFor(() => expect(document.title).toBe('ArtNiyyətli'));
        });

        it('renders without crashing when sections are empty or absent', async () => {
            renderWith([]);
            await waitFor(() => expect(document.title).toBe('ArtNiyyətli'));

            homepage = { ...empty, page: { title: 'Ana səhifə' } };
            mockApi();
            renderHome();
            await waitFor(() => expect(document.title).toBe('ArtNiyyətli'));
        });
    });

    // ── the wall ─────────────────────────────────────────────────────────────────────────────────────────────────

    it('builds the wall from the API works, all at one k', async () => {
        renderHome();
        await screen.findByText('Wall Piece');

        const [big, small] = wallFields();
        expect(big.style.width).toBe(`${Math.round(180 * K)}px`);
        expect(big.style.height).toBe(`${Math.round(140 * K)}px`);
        expect(small.style.width).toBe(`${Math.round(40 * K)}px`);
        expect(parseFloat(big.style.width) / parseFloat(small.style.width)).toBeCloseTo(4.5, 1);
        expect(big).toHaveClass('shadow-hang');
        expect(within(screen.getByTestId('wall-footer')).getByTestId('scale-rule-line').style.width).toBe(`${Math.round(100 * K)}px`);
    });

    it('shows the 800px catalogue image on the wall, not the 300px thumbnail (which would blur at this size)', async () => {
        homepage = {
            ...homepageData,
            wall: [card('AN-1', 'Wall Piece', 180, 140, { image_url: 'https://example.test/catalogue.webp', thumbnail_url: 'https://example.test/thumb.webp' })],
        };
        mockApi();
        renderHome();
        await screen.findByText('Wall Piece');

        expect(screen.getByTestId('wall-field').querySelector('img')).toHaveAttribute('src', 'https://example.test/catalogue.webp');
    });

    it('spaces neighbours by max(43 × k, 48px, caption overflow + 24px)', async () => {
        homepage = { ...homepageData, wall: [card('AN-1', 'Wall Piece', 180, 140), card('AN-4', 'Middle', 150, 110), card('AN-2', 'Small Piece', 40, 30)] };
        mockApi();
        renderHome();
        await screen.findByText('Wall Piece');

        const [a, b, c] = wallFields();
        const right = (el) => parseFloat(el.style.left) + parseFloat(el.style.width);
        const overflow = (w) => Math.max(0, 180 - w * K) / 2;
        const expected = (w1, w2) => Math.max(43 * K, 48, overflow(w1) + overflow(w2) + 24);
        expect(Math.abs(parseFloat(b.style.left) - right(a) - expected(180, 150))).toBeLessThanOrEqual(1);
        expect(Math.abs(parseFloat(c.style.left) - right(b) - expected(150, 40))).toBeLessThanOrEqual(1);
    });

    it('stands the 170 cm figure at the left of the wall, 170 × k tall', async () => {
        renderHome();
        await screen.findByText('Wall Piece');

        const figure = screen.getByTestId('human-figure');
        expect(figure).toHaveAttribute('height', String(Math.round(170 * K)));
        expect(parseFloat(figure.style.left)).toBeLessThan(parseFloat(wallFields()[0].style.left));
        expect(screen.getByText('170 sm')).toBeInTheDocument();
    });

    it('updates the position counter as the wall scrolls', async () => {
        renderHome();
        await screen.findByText('Wall Piece');

        const counter = screen.getByTestId('wall-position');
        expect(counter).toHaveTextContent('1 / 2');
        const scroller = screen.getByTestId('home-wall');
        const [big] = wallFields();
        scroller.scrollLeft = parseFloat(big.style.left) + parseFloat(big.style.width) + 5;
        fireEvent.scroll(scroller);

        expect(counter).toHaveTextContent('2 / 2');
    });

    it('leaves the wall section out entirely when there are no wall works', async () => {
        homepage = { ...homepageData, wall: [] };
        mockApi();
        renderHome();
        await screen.findByRole('heading', { level: 1 });

        expect(screen.queryByTestId('home-wall')).not.toBeInTheDocument();
        expect(screen.queryByTestId('human-figure')).not.toBeInTheDocument();
    });

    it('still builds the wall, the figure and the scale for a single work', async () => {
        homepage = { ...homepageData, wall: [card('AN-9', 'Only One', 100, 80)] };
        mockApi();
        renderHome();
        await screen.findByText('Only One');

        expect(wallFields()).toHaveLength(1);
        expect(screen.getByTestId('human-figure')).toBeInTheDocument();
        expect(within(screen.getByTestId('wall-footer')).getByTestId('scale-rule')).toBeInTheDocument();
        expect(screen.queryByTestId('wall-position')).not.toBeInTheDocument(); // "1 / 1" says nothing
    });

    it('shows no price on the wall', async () => {
        renderHome();
        await screen.findByText('Wall Piece');

        const wall = screen.getByTestId('home-wall');
        expect(within(wall).queryByText(/AZN|Qiymət/)).not.toBeInTheDocument();
        expect(within(wall).getAllByText('Kamran Səfərli')).toHaveLength(2);
    });

    it('makes the wall keyboard-focusable and named', async () => {
        renderHome();
        await screen.findByText('Wall Piece');

        const wall = screen.getByRole('region', { name: 'Divar: əsərlər həqiqi ölçüdə, sürüşdürmək üçün ox düymələri' });
        expect(wall).toHaveAttribute('tabindex', '0');
        wall.focus();
        expect(document.activeElement).toBe(wall);
        expect(within(wall).getByRole('link', { name: /^Wall Piece, Kamran Səfərli/ })).toHaveAttribute('href', '/artworks/AN-1');
    });

    it('gives the wall a surface with a top edge and a floor line', async () => {
        renderHome();
        await screen.findByText('Wall Piece');

        const surface = screen.getByTestId('wall-surface');
        expect(surface).toHaveClass('bg-surface-field-3', 'border-t', 'border-b', 'border-line');
        expect(surface.style.height).toBe(`${Math.round(270 * K)}px`); // the 270 cm wall, floor at its bottom edge
    });

    it('shows the current exhibition as a full-width wine block after the featured works, and not again in the list', async () => {
        const ex = (slug, title, status) => ({ ...homepageData.exhibition, slug, title, status, venue: 'Main Gallery', short_text: 'Dörd rəssam.' });
        homepage = { ...homepageData, exhibitions: { current: [ex('now', 'Now Show', 'current')], upcoming: [ex('soon', 'Soon Show', 'upcoming')] } };
        mockApi();
        const { container } = renderHome();

        const block = await screen.findByTestId('home-current-show');
        expect(block).toHaveClass('bg-wine', 'text-wine-ink', '-mx-page', 'py-step-8');
        expect(block.className).not.toMatch(/-my-/); // keeps the step-9 rhythm around it (flush, neighbours touched its edges)
        expect(within(block).getByRole('heading', { level: 2, name: 'Now Show' })).toHaveClass('text-heading');
        expect(within(block).getByText('10 yanvar 2026 – 10 fevral 2026 · Main Gallery')).toHaveClass('text-wine-ink-muted');
        expect(within(block).getByRole('link', { name: 'Sərgi haqqında' })).toHaveAttribute('href', '/exhibitions/now');
        expect(block.innerHTML).not.toMatch(/signal/);
        // Not repeated in the list below; the list keeps the other shows.
        const list = screen.getByRole('heading', { level: 2, name: 'Sərgilər' }).closest('section');
        expect(within(list).queryByText('Now Show')).not.toBeInTheDocument();
        expect(within(list).getByText('Soon Show')).toBeInTheDocument();
        expect(within(list).queryByRole('heading', { name: 'Cari sərgilər' })).not.toBeInTheDocument();
        // Order: featured, then the wine block, then the artists.
        const featured = screen.getByRole('heading', { level: 2, name: 'Seçilmiş əsərlər' });
        const artists = screen.getByRole('heading', { level: 2, name: 'Rəssamlar' });
        expect(Boolean(featured.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
        expect(Boolean(block.compareDocumentPosition(artists) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
        expect(container.querySelectorAll('[data-testid="home-current-show"]')).toHaveLength(1);
    });

    it('shows no wine block without a current exhibition', async () => {
        homepage = { ...homepageData, exhibition: null, exhibitions: { current: [], upcoming: [{ ...homepageData.exhibition, slug: 'soon', title: 'Soon Show', status: 'upcoming' }] } };
        mockApi();
        renderHome();

        expect(await screen.findByText('Soon Show')).toBeInTheDocument();
        expect(screen.queryByTestId('home-current-show')).not.toBeInTheDocument();
    });

    describe('the hero stats line', () => {
        it('shows works, artists and the exhibition month, middle-dot separated, in text-meta / ink-muted', async () => {
            const ex = (slug, status, start) => ({ ...homepageData.exhibition, slug, status, start_date: start });
            homepage = { ...homepageData, stats: { artists: 4, artworks: 8, exhibitions: 2 }, exhibitions: { current: [], upcoming: [ex('soon', 'upcoming', '2027-04-10')] } };
            mockApi();
            renderHome();

            const line = await screen.findByTestId('home-stats');
            expect(line).toHaveTextContent('8 əsər kataloqda · 4 rəssam təmsil olunur · aprel 2027 sərgi');
            expect(line).toHaveClass('text-meta', 'text-ink-muted');
            // Each part keeps together, so a narrow screen breaks the line only at the dots.
            [...line.querySelectorAll('span')].forEach((part) => expect(part).toHaveClass('whitespace-nowrap'));
            expect(line.querySelectorAll('span')).toHaveLength(3);
            expect(within(screen.getByTestId('home-hero')).getByTestId('home-stats')).toBe(line);
        });

        it('drops the exhibition part when there is no current or upcoming exhibition', async () => {
            homepage = { ...homepageData, stats: { artists: 4, artworks: 8, exhibitions: 0 }, exhibition: null, exhibitions: { current: [], upcoming: [] } };
            mockApi();
            renderHome();

            expect(await screen.findByTestId('home-stats')).toHaveTextContent(/^8 əsər kataloqda · 4 rəssam təmsil olunur$/);
        });

        it('shows no line at all without stats', async () => {
            for (const stats of [null, { artists: 0, artworks: 0, exhibitions: 0 }]) {
                homepage = { ...homepageData, stats };
                mockApi();
                const { unmount } = renderHome();
                await screen.findByRole('heading', { level: 1 });
                expect(screen.queryByTestId('home-stats')).not.toBeInTheDocument();
                unmount();
            }
        });
    });

    describe('the hero image', () => {
        const withHero = (image_url) => ({ ...homepageData, page: { ...homepageData.page, sections: [{ ...homepageData.page.sections[0], image_url }] } });

        it('with image_url: a second column from 1024px, a 4:3 cover image with a 1px line, no shadow, sized from the viewport', async () => {
            homepage = withHero('https://example.test/hero.webp');
            mockApi();
            renderHome();

            const hero = await screen.findByTestId('home-hero');
            expect(hero).toHaveClass('lg:grid', 'lg:grid-cols-[minmax(0,1fr)_auto]');
            const frame = within(hero).getByTestId('home-hero-image');
            expect(frame).toHaveClass('aspect-[4/3]', 'border', 'border-line', 'hidden', 'lg:block', 'h-[clamp(140px,17vh,200px)]');
            expect(frame.className).not.toMatch(/shadow/);
            expect(within(frame).getByRole('img')).toHaveAttribute('src', 'https://example.test/hero.webp');
            expect(within(frame).getByRole('img')).toHaveClass('object-cover');
        });

        it('without image_url: the single-column text hero stays', async () => {
            homepage = withHero(null);
            mockApi();
            renderHome();

            const hero = await screen.findByTestId('home-hero');
            expect(hero.className).not.toMatch(/grid/);
            expect(within(hero).queryByTestId('home-hero-image')).not.toBeInTheDocument();
        });
    });

    it('opens with a text-only hero: text-hero heading, Spectral lead, no image', async () => {
        renderHome();

        const hero = await screen.findByTestId('home-hero');
        expect(within(hero).getByRole('heading', { level: 1, name: 'ArtNiyyətli' })).toHaveClass('text-hero');
        expect(within(hero).getByText('Müasir Azərbaycan sənətini kəşf edin.')).toHaveClass('font-editorial', 'text-lead', 'text-ink-muted');
        expect(hero.querySelector('img')).toBeNull();
        expect(hero.closest('.pt-step-8')).not.toBeNull();
    });

    it('puts each section label (interface text, sentence case) right above its heading', async () => {
        const ex = (slug, title, status) => ({ ...homepageData.exhibition, slug, title, status });
        homepage = { ...homepageData, exhibitions: { current: [ex('now', 'Now Show', 'current')], upcoming: [ex('soon', 'Soon Show', 'upcoming')] } };
        mockApi();
        renderHome();
        await screen.findByText('Wall Piece');

        const pairs = { Kolleksiya: 'Seçilmiş əsərlər', Təmsilçilik: 'Rəssamlar', Təqvim: 'Sərgilər', Jurnal: 'Son məqalələr', Əlaqə: 'Əlaqə saxla' };
        for (const [label, heading] of Object.entries(pairs)) {
            const h2 = screen.getByRole('heading', { level: 2, name: heading });
            const labelEl = h2.previousElementSibling;
            expect(labelEl).toHaveTextContent(label);
            expect(labelEl).toHaveClass('text-label', 'text-ink-muted', 'mb-step-2');
            expect(labelEl.className).not.toMatch(/uppercase/);
            expect(h2).toHaveClass('text-heading');
        }
        // The wall's label is its heading, right above the wall.
        const wallLabel = screen.getByRole('heading', { level: 2, name: 'Divar' });
        expect(wallLabel).toHaveClass('text-label', 'text-ink-muted');
        expect(Boolean(wallLabel.compareDocumentPosition(screen.getByTestId('home-wall')) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    });

    it('gives the vertical (phone) wall a surface and edge too, and a short floor line under the figure', async () => {
        const innerWidth = window.innerWidth;
        window.innerWidth = 375;
        global.ResizeObserver = class {
            constructor(cb) { this.cb = cb; }
            observe() { this.cb([{ contentRect: { width: 343 } }]); }
            disconnect() {}
        };
        try {
            renderHome();
            await screen.findByText('Wall Piece');

            const wall = screen.getByTestId('home-wall');
            expect(wall).toHaveClass('bg-surface-field-3', 'border', 'border-line');
            expect(screen.queryByTestId('wall-surface')).not.toBeInTheDocument();
            const figure = screen.getByTestId('human-figure');
            const floor = screen.getByTestId('figure-floor');
            expect(floor).toHaveClass('h-px');
            expect(parseFloat(floor.style.top)).toBe(parseFloat(figure.style.top) + Number(figure.getAttribute('height')));
            // The works are laid out inside the surface's padding: none reaches past 343 − 2 × 17.
            wallFields().forEach((f) => expect(parseFloat(f.style.left) + parseFloat(f.style.width)).toBeLessThanOrEqual(343 - 34));
        } finally {
            window.innerWidth = innerWidth;
        }
    });

    it('keeps the tallest work of the vertical stack under 60% of a low screen (a phone on its side)', async () => {
        const { innerWidth, innerHeight } = window;
        window.innerWidth = 667;
        window.innerHeight = 375;
        global.ResizeObserver = class {
            constructor(cb) { this.cb = cb; }
            observe() { this.cb([{ contentRect: { width: 627 } }]); }
            disconnect() {}
        };
        try {
            renderHome();
            await screen.findByText('Wall Piece');

            const tallest = Math.max(...wallFields().map((f) => parseFloat(f.style.height)));
            expect(tallest).toBeLessThanOrEqual(Math.round(375 * 0.6) + 1);
            // One k still: the figure is 170 × k where k = tallest / 140 cm.
            expect(Number(screen.getByTestId('human-figure').getAttribute('height'))).toBe(Math.round(170 * (tallest / 140)));
        } finally {
            window.innerWidth = innerWidth;
            window.innerHeight = innerHeight;
        }
    });

    it('puts the scale rule and the figure label under the floor on the left, the counter on the right', async () => {
        renderHome();
        await screen.findByText('Wall Piece');

        const footer = screen.getByTestId('wall-footer');
        const wall = screen.getByTestId('home-wall');
        expect(Boolean(wall.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
        const [left, right] = footer.children;
        expect(within(left).getByText('170 sm')).toBeInTheDocument();
        expect(within(left).getByTestId('scale-rule')).toBeInTheDocument();
        expect(right).toBe(screen.getByTestId('wall-position'));
    });

    it('shows "Seçilmiş əsərlər" after the wall when featured works exist, on its own scaled grid', async () => {
        renderHome();
        const heading = await screen.findByRole('heading', { level: 2, name: 'Seçilmiş əsərlər' });
        const section = heading.closest('section');

        expect(within(section).getByText('Featured Piece')).toBeInTheDocument();
        expect(within(section).getByTestId('scale-rule')).toBeInTheDocument();
        expect(Boolean(screen.getByTestId('home-wall').compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
        expect(Boolean(section.compareDocumentPosition(screen.getByRole('heading', { level: 2, name: 'Rəssamlar' })) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    });

    it('leaves the featured section out when there are no featured works', async () => {
        homepage = { ...homepageData, featured: [] };
        mockApi();
        renderHome();
        await screen.findByText('Wall Piece');

        expect(screen.queryByRole('heading', { name: 'Seçilmiş əsərlər' })).not.toBeInTheDocument();
    });

    // (was: a 4:5 portrait) — the artist cards' portrait is a circle now (the client's exception to "no radius").
    it('shows the artists with the artists list card (round portrait, name, direction) in 2 / 3 / 4 columns', async () => {
        renderHome();

        const list = await screen.findByTestId('home-artists');
        // (was: 1 column on phones) — two below 640px keep the home page shorter; the artists page stays at one.
        expect(list).toHaveClass('grid-cols-2', 'md:grid-cols-3', 'xl:grid-cols-4');
        const card = within(list).getByRole('link', { name: /A B/ });
        expect(card).toHaveAttribute('href', '/artists/a');
        expect(within(card).getByTestId('artist-portrait')).toHaveClass('aspect-square', 'rounded-full', 'border-line');
        expect(within(card).getByText('Modern')).toHaveClass('text-meta', 'text-ink-muted');
    });

    it('shows the number of works on the home artist cards too (artworks_count is sent on /homepage)', async () => {
        homepage = { ...homepageData, artists: [{ ...homepageData.artists[0], artworks_count: 3 }] };
        mockApi();
        renderHome();

        const card = within(await screen.findByTestId('home-artists')).getByRole('link', { name: /A B/ });
        expect(within(card).getByTestId('artist-works-count')).toHaveTextContent('3 əsər');
    });

    it('leaves out empty blocks: artists, exhibitions, journal, FAQ', async () => {
        homepage = { ...homepageData, artists: [], exhibition: null, exhibitions: { current: [], upcoming: [] }, faqs: [] };
        articles = [];
        mockApi();
        renderHome();
        await screen.findByText('Wall Piece');

        for (const name of ['Rəssamlar', 'Sərgilər', 'Son məqalələr', 'Suallar']) {
            expect(screen.queryByRole('heading', { level: 2, name })).not.toBeInTheDocument();
        }
    });

    it('shows the latest journal articles and the contact block', async () => {
        renderHome();

        expect(await screen.findByRole('link', { name: /Kamran Səfərli ilə müsahibə/ })).toHaveAttribute('href', '/articles/musahibe');
        expect(global.fetch.mock.calls.some(([url]) => url.startsWith('/api/v1/articles') && url.includes('per_page=3'))).toBe(true);
        expect(screen.getByRole('link', { name: 'Əlaqə saxla' })).toHaveAttribute('href', '/contact');
    });

    it('uses no Signal on the page itself', async () => {
        const { container } = renderHome();
        await screen.findByText('Wall Piece');

        expect(container.innerHTML).not.toMatch(/signal/);
    });
});
