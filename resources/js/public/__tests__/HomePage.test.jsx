import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import HomePage, { statementMeta } from '../pages/HomePage.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

const card = (code, title, w, h, extra = {}) => ({
    inventory_code: code, title, artist: { id: 1, slug: 'a', name: 'Kamran Səfərli' }, image_url: null, genre: { slug: 'painting', name: 'Painting' },
    medium: { slug: 'oil', name: 'Oil' }, price: 9800, currency: 'AZN', availability: 'available', width_cm: w, height_cm: h, ...extra,
});

const SHOW = {
    slug: 'ilk-satis', title: 'İlk satış sərgisi', status: 'current', start_date: '2026-10-15', end_date: '2026-11-30', venue: 'Bakı',
    short_text: 'Dörd rəssam, on iki əsər.', full_text: '…',
    artists: [{ id: 1, slug: 'a', name: 'Kamran Səfərli' }, { id: 2, slug: 'b', name: 'Nərmin Qasımova' }],
    artworks: [], media: [{ type: 'photo', url: 'https://example.test/cover.webp' }],
};

const homepageData = {
    page: { title: 'Ana səhifə', sections: [{ key: 'hero', heading: 'ArtNiyyətli', body: 'Müasir Azərbaycan sənəti, həqiqi ölçüsündə.', sort_order: 0, image_url: 'https://example.test/hero.webp' }] },
    stats: { artists: 5, artworks: 12, exhibitions: 2 },
    wall: [card('AN-1', 'Wall Piece', 180, 140)],
    featured: [card('AN-3', 'Featured Piece', 180, 140), card('AN-4', 'Small Piece', 40, 30, { price: null, currency: null })],
    artists: [{ id: 1, slug: 'a', first_name: 'A', last_name: 'B', direction: 'Modern', portrait_url: null }],
    exhibitions: { current: [SHOW], upcoming: [{ ...SHOW, slug: 'soon', title: 'Soon Show', status: 'upcoming', media: [] }] },
    exhibition: SHOW,
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
const following = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

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
        // jsdom has no layout: the content is 1296px wide; window.innerWidth (1024) keeps the featured works in one
        // row, window.innerHeight (768) caps the tallest at min(420, 768 × 0.5) = 384px.
        global.ResizeObserver = class {
            constructor(cb) { this.cb = cb; }
            observe() { this.cb([{ contentRect: { width: 1296 } }]); }
            disconnect() {}
        };
    });

    afterEach(() => {
        global.ResizeObserver = originalRO;
    });

    // ── loading, errors, titles ───────────────────────────────────────────────────────────────────────────────────

    it('shows a static skeleton, then the page', async () => {
        renderHome();

        expect(screen.getByTestId('home-skeleton')).toHaveAttribute('aria-busy', 'true');
        expect(await screen.findByRole('heading', { level: 1, name: 'ArtNiyyətli' })).toBeInTheDocument();
        expect(screen.getByText('Featured Piece')).toBeInTheDocument();
        expect(screen.getByText('A B')).toBeInTheDocument();
        expect(homepageCalls()).toHaveLength(1);
    });

    it('shows an error with a retry button that re-fetches', async () => {
        let calls = 0;
        homepage = () => (++calls === 1 ? { ok: false, status: 500, headers: { get: () => 'application/json' }, json: async () => ({ message: 'Server error.' }) } : jsonResponse({ data: homepageData }));
        mockApi();
        renderHome();

        const alert = await screen.findByRole('alert');
        expect(within(alert).getByText('Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.')).toHaveClass('text-signal-ink');
        await userEvent.click(within(alert).getByRole('button', { name: 'Yenidən cəhd et' }));
        expect(await screen.findByText('Featured Piece')).toBeInTheDocument();
    });

    it('collapses the title to just the site name when the hero heading IS the site name, instead of doubling it', async () => {
        renderHome();

        await waitFor(() => expect(document.title).toBe('ArtNiyyətli'));
    });

    it('treats the logo spelling "Art Niyyätli" as the site name too: the h1 shows it, the title stays "ArtNiyyətli"', async () => {
        homepage = { ...homepageData, page: { sections: [{ key: 'hero', heading: 'Art Niyyätli', body: 'Discover.', sort_order: 0, image_url: null }] } };
        mockApi();
        renderHome();

        expect(await screen.findByRole('heading', { level: 1, name: 'Art Niyyätli' })).toBeInTheDocument();
        await waitFor(() => expect(document.title).toBe('ArtNiyyətli'));
        expect(document.title).not.toMatch(/\|/);
    });

    it('does not crash when the locale changes after the page has already loaded', async () => {
        renderHome(<LocaleSwitcher />);
        await screen.findByText('Featured Piece');

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        expect(await screen.findByRole('heading', { level: 1, name: 'ArtNiyyətli' })).toBeInTheDocument();
    });

    describe('page sections are resolved by key', () => {
        const section = (key, heading, sort_order = 0) => ({ key, heading, body: `${heading} body`, sort_order, image_url: null });
        function renderWith(sections) {
            homepage = { ...homepageData, exhibitions: { current: [], upcoming: [] }, exhibition: null, page: { title: 'Ana səhifə', sections } };
            mockApi();
            renderHome();
        }

        it('uses the hero even when it is not the first section, for the h1, title and statement', async () => {
            renderWith([section('steps', 'How it works'), section('hero', 'Real Hero', 1)]);

            expect(await screen.findByRole('heading', { level: 1, name: 'Real Hero' })).toBeInTheDocument();
            expect(screen.getByTestId('home-statement')).toHaveTextContent('Real Hero body');
            await waitFor(() => expect(document.title).toBe('Real Hero | ArtNiyyətli'));
        });

        it('shows no "how it works" or contact copy, whatever sections the admin keeps', async () => {
            renderWith([section('hero', 'Hero'), section('steps', 'Steps', 1), section('cta', 'Get in touch', 2), section('mystery', 'Unknown Block', 3)]);
            await screen.findByRole('heading', { level: 1, name: 'Hero' });

            for (const text of ['Steps', 'Get in touch', 'Unknown Block']) expect(screen.queryByText(text)).not.toBeInTheDocument();
        });

        it('falls back to the default title and renders no hero when the hero is missing', async () => {
            renderWith([section('cta', 'Get in touch', 1)]);

            await screen.findByText('Featured Piece');
            expect(screen.queryByTestId('home-hero')).not.toBeInTheDocument();
            expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
            await waitFor(() => expect(document.title).toBe('ArtNiyyətli'));
        });
    });

    // ── the hero ──────────────────────────────────────────────────────────────────────────────────────────────────

    it('opens with the hero photograph across the full width: no overlay, no text on it, min(78vh, 760px) tall, 60vh on phones', async () => {
        renderHome();

        const hero = await screen.findByTestId('home-hero');
        const image = within(hero).getByTestId('home-hero-image');
        expect(image).toHaveAttribute('src', 'https://example.test/hero.webp');
        expect(image).toHaveClass('w-full', 'object-cover', 'h-[60vh]', 'md:h-[min(78vh,760px)]');
        expect(image.className).not.toMatch(/opacity|absolute|-z-/);
        // The wrapper holds the image only, out of the page gutter.
        expect(image.parentElement).toHaveClass('-mx-page');
        expect(image.parentElement.children).toHaveLength(1);
        expect(hero.innerHTML).not.toMatch(/gradient|bg-black|bg-ink\/|overlay/);
    });

    it('puts the current exhibition on one line under the photograph, with "Sərgiyə bax" on the right', async () => {
        renderHome();

        const line = await screen.findByTestId('home-hero-line');
        expect(following(screen.getByTestId('home-hero-image'), line)).toBe(true);
        expect(line).toHaveClass('md:flex-row', 'md:justify-between', 'flex-col');
        expect(within(line).getByText('İlk satış sərgisi')).toHaveClass('font-editorial', 'italic', 'text-[22px]');
        expect(within(line).getByText('Kamran Səfərli, Nərmin Qasımova · 15 oktyabr 2026 – 30 noyabr 2026 · Bakı')).toHaveClass('text-label', 'text-ink-muted');
        const link = within(line).getByRole('link', { name: 'Sərgiyə bax' });
        expect(link).toHaveAttribute('href', '/exhibitions/ilk-satis');
        expect(within(link).getByText('Sərgiyə bax')).toHaveClass('link-line');
        // The hero heading stays the page's h1, for screen readers only.
        expect(screen.getByRole('heading', { level: 1, name: 'ArtNiyyətli' })).toHaveClass('sr-only');
    });

    it('without a current exhibition, the line holds the hero heading (the visible h1) and subheading', async () => {
        homepage = { ...homepageData, exhibitions: { current: [], upcoming: [] }, exhibition: null };
        mockApi();
        renderHome();

        const line = await screen.findByTestId('home-hero-line');
        const h1 = within(line).getByRole('heading', { level: 1, name: 'ArtNiyyətli' });
        expect(h1).not.toHaveClass('sr-only');
        expect(within(line).getByText('Müasir Azərbaycan sənəti, həqiqi ölçüsündə.')).toHaveClass('text-label', 'text-ink-muted');
        expect(within(line).queryByRole('link')).not.toBeInTheDocument();
    });

    it('without a hero image, the hero is the line alone, under the header padding', async () => {
        homepage = { ...homepageData, page: { sections: [{ ...homepageData.page.sections[0], image_url: null }] } };
        mockApi();
        renderHome();

        const hero = await screen.findByTestId('home-hero');
        expect(hero.querySelector('img')).toBeNull();
        expect(hero).toHaveClass('pt-step-8');
    });

    // ── the statement ─────────────────────────────────────────────────────────────────────────────────────────────

    it('sets the hero subheading as the statement: Spectral 300, 30–46px, 1.22, at most 900px wide', async () => {
        renderHome();

        const statement = await screen.findByTestId('home-statement');
        const text = within(statement).getByText('Müasir Azərbaycan sənəti, həqiqi ölçüsündə.');
        expect(text).toHaveClass('font-editorial', 'font-light', 'text-[clamp(30px,3.2vw,46px)]', 'leading-[1.22]', 'max-w-[900px]');
        expect(following(screen.getByTestId('home-hero'), statement)).toBe(true);
    });

    it('puts the work and artist counts under the statement in 12px ink-muted', async () => {
        renderHome();

        const meta = await screen.findByTestId('home-stats');
        expect(meta).toHaveTextContent(/^12 əsər · 5 rəssam$/);
        expect(meta).toHaveClass('text-label', 'text-ink-muted');
        expect(within(screen.getByTestId('home-statement')).getByTestId('home-stats')).toBe(meta);
    });

    it('statementMeta leaves out zero or missing counts, and gives null with neither', () => {
        expect(statementMeta({ stats: { artworks: 8, artists: 0 } }, 'az')).toEqual(['8 əsər']);
        expect(statementMeta({ stats: { artworks: 0, artists: 0 } }, 'az')).toBeNull();
        expect(statementMeta({}, 'az')).toBeNull();
        expect(statementMeta({ stats: { artworks: 3, artists: 2 } }, 'en')).toEqual(['3 works', '2 artists']);
    });

    // ── the current exhibition ────────────────────────────────────────────────────────────────────────────────────

    it('shows the current exhibition in two columns: the cover left, the text right, bottom-aligned; no wine band', async () => {
        const { container } = renderHome();

        const block = await screen.findByTestId('home-current-show');
        expect(block).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-[1.55fr_1fr]', 'md:gap-[72px]', 'md:items-end');
        const cover = within(block).getByTestId('home-current-show-cover');
        expect(cover).toHaveAttribute('src', 'https://example.test/cover.webp');
        // The cover comes first, so on phones it stands above the text.
        expect(block.firstElementChild).toBe(cover);

        const h2 = within(block).getByRole('heading', { level: 2, name: 'İlk satış sərgisi' });
        expect(h2).toHaveClass('text-section');
        expect(h2.previousElementSibling).toHaveTextContent('Cari sərgi');
        expect(within(block).getByText('15 oktyabr 2026 – 30 noyabr 2026 · Bakı')).toHaveClass('text-label', 'text-ink-muted');
        expect(within(block).getByText('Dörd rəssam, on iki əsər.')).toHaveClass('font-editorial', 'font-light', 'text-reading');
        expect(within(block).getByRole('link', { name: 'Sərgi haqqında' })).toHaveAttribute('href', '/exhibitions/ilk-satis');
        expect(container.innerHTML).not.toMatch(/wine/);
    });

    it('shows the current exhibition as text alone without a cover, and not at all without a current one', async () => {
        homepage = { ...homepageData, exhibitions: { current: [{ ...SHOW, media: [] }], upcoming: [] } };
        mockApi();
        const { unmount } = renderHome();
        const block = await screen.findByTestId('home-current-show');
        expect(block.className).not.toMatch(/grid/);
        expect(block.querySelector('img')).toBeNull();
        unmount();

        homepage = { ...homepageData, exhibitions: { current: [], upcoming: homepageData.exhibitions.upcoming }, exhibition: null };
        mockApi();
        renderHome();
        await screen.findByText('Featured Piece');
        expect(screen.queryByTestId('home-current-show')).not.toBeInTheDocument();
        // Upcoming shows are not listed on the home page.
        expect(screen.queryByText('Soon Show')).not.toBeInTheDocument();
    });

    // ── the featured works ────────────────────────────────────────────────────────────────────────────────────────

    it('shows the featured works in one row at one k, bottom-aligned, 40px apart, with no figure and no scale rule', async () => {
        renderHome();

        const heading = await screen.findByRole('heading', { level: 2, name: 'Seçilmiş əsərlər' });
        const section = heading.closest('section');
        const row = within(section).getByTestId('featured-row');
        expect(row).toHaveClass('flex', 'items-end', 'gap-x-[40px]');
        const [big, small] = within(section).getAllByTestId('featured-field');
        // k = min((1296 − 40) / (180 + 40), 384 / 140): the height cap wins.
        const k = 384 / 140;
        expect(big.style.height).toBe(`${Math.round(140 * k)}px`);
        expect(small.style.height).toBe(`${Math.round(30 * k)}px`);
        const widths = [...row.children].map((li) => parseFloat(li.style.width));
        expect(widths[0] / widths[1]).toBeCloseTo(180 / 40, 1);
        expect(widths[0] + widths[1] + 40).toBeLessThanOrEqual(1296);
        expect(within(section).queryByTestId('human-figure')).not.toBeInTheDocument();
        expect(within(section).queryByTestId('scale-rule')).not.toBeInTheDocument();
        expect(screen.queryByTestId('home-wall')).not.toBeInTheDocument();
    });

    it('captions each work: title in Spectral italic 15px, the artist, and size · price in 12px ink-muted', async () => {
        renderHome();

        const section = (await screen.findByRole('heading', { level: 2, name: 'Seçilmiş əsərlər' })).closest('section');
        const link = within(section).getByRole('link', { name: /^Small Piece/ });
        expect(link).toHaveAttribute('href', '/artworks/AN-4');
        expect(link).toHaveClass('text-ink'); // the title takes the link's ink
        expect(within(link).getByText('Small Piece')).toHaveClass('font-editorial', 'italic', 'text-[15px]');
        expect(within(link).getByText('Kamran Səfərli')).toHaveClass('text-label', 'text-ink-muted');
        expect(within(link).getByTestId('featured-details')).toHaveTextContent('40 × 30 sm · qiymət sorğu ilə');
        expect(within(within(section).getByRole('link', { name: /^Featured Piece/ })).getByTestId('featured-details')).toHaveTextContent('180 × 140 sm · 9 800 AZN');
    });

    it('puts "Bütün əsərlər" on the right of the featured heading', async () => {
        renderHome();

        const section = (await screen.findByRole('heading', { level: 2, name: 'Seçilmiş əsərlər' })).closest('section');
        const all = within(section).getByRole('link', { name: 'Bütün əsərlər' });
        expect(all).toHaveAttribute('href', '/artworks');
        expect(all.parentElement).toHaveClass('flex', 'justify-between', 'items-baseline');
    });

    it('lists the featured works one per line on phones, the widest at the full width', async () => {
        const innerWidth = window.innerWidth;
        window.innerWidth = 375;
        global.ResizeObserver = class {
            constructor(cb) { this.cb = cb; }
            observe() { this.cb([{ contentRect: { width: 343 } }]); }
            disconnect() {}
        };
        try {
            renderHome();
            const row = await screen.findByTestId('featured-row');
            expect(row).toHaveClass('flex-col');
            const widths = screen.getAllByTestId('featured-field').map((field) => parseFloat(field.style.width));
            expect(widths[0]).toBe(343);
            expect(widths[0] / widths[1]).toBeCloseTo(180 / 40, 1);
            // One work per line: the caption is not squeezed to a small work's width.
            [...row.children].forEach((li) => expect(li.style.width).toBe(''));
        } finally {
            window.innerWidth = innerWidth;
        }
    });

    it('leaves the featured section out when there are no featured works', async () => {
        homepage = { ...homepageData, featured: [] };
        mockApi();
        renderHome();
        await screen.findByText('A B');

        expect(screen.queryByRole('heading', { name: 'Seçilmiş əsərlər' })).not.toBeInTheDocument();
    });

    // ── the artists ───────────────────────────────────────────────────────────────────────────────────────────────

    it('shows the artists in 2 / 4 columns, each card one of the artist\'s works from the page, with "Bütün rəssamlar"', async () => {
        homepage = { ...homepageData, featured: [card('AN-3', 'Featured Piece', 180, 140, { image_url: 'https://example.test/an3.webp' })], artists: [{ ...homepageData.artists[0], artworks_count: 3 }] };
        mockApi();
        renderHome();

        const list = await screen.findByTestId('home-artists');
        expect(list).toHaveClass('grid-cols-2', 'md:grid-cols-4');
        const cardLink = within(list).getByRole('link', { name: /A B/ });
        expect(cardLink).toHaveAttribute('href', '/artists/a');
        const work = within(cardLink).getByTestId('artist-card-work');
        expect(work).toHaveClass('items-end', 'md:h-[300px]');
        expect(work.querySelector('img')).toHaveAttribute('src', 'https://example.test/an3.webp');
        expect(within(cardLink).queryByTestId('artist-portrait')).not.toBeInTheDocument();
        expect(within(cardLink).getByText('A B')).toHaveClass('text-ui');
        expect(within(cardLink).getByText(/Modern/)).toHaveTextContent('Modern · 3 əsər');
        expect(within(list.closest('section')).getByRole('link', { name: 'Bütün rəssamlar' })).toHaveAttribute('href', '/artists');
    });

    it('shows the artist\'s monogram when the page has no work of theirs with an image', async () => {
        renderHome();

        const cardLink = within(await screen.findByTestId('home-artists')).getByRole('link', { name: /A B/ });
        expect(within(cardLink).getByTestId('artist-monogram')).toHaveTextContent('AB');
        expect(cardLink.querySelector('img')).toBeNull();
    });

    // ── the journal ───────────────────────────────────────────────────────────────────────────────────────────────

    it('shows the latest three articles as "Qeydlər": a 1px line above, date, Spectral 300 title, short text', async () => {
        renderHome();

        const heading = await screen.findByRole('heading', { level: 2, name: 'Qeydlər' });
        expect(heading.previousElementSibling).toHaveTextContent('Jurnal');
        const section = heading.closest('section');
        expect(within(section).getByRole('link', { name: 'Bütün məqalələr' })).toHaveAttribute('href', '/articles');
        const list = within(section).getByTestId('home-articles-list');
        expect(list).toHaveClass('border-t', 'border-line', 'md:grid-cols-3');
        const article = within(list).getByRole('link', { name: /Kamran Səfərli ilə müsahibə/ });
        expect(article).toHaveAttribute('href', '/articles/musahibe');
        expect(within(article).getByText('Kamran Səfərli ilə müsahibə')).toHaveClass('font-editorial', 'font-light', 'text-[24px]');
        expect(within(article).getByText('Xətt və boşluq haqqında.')).toHaveClass('text-meta', 'text-ink-muted');
        expect(global.fetch.mock.calls.some(([url]) => url.startsWith('/api/v1/articles') && url.includes('per_page=3'))).toBe(true);
    });

    it('leaves out the empty blocks: artists, journal', async () => {
        homepage = { ...homepageData, artists: [] };
        articles = [];
        mockApi();
        renderHome();
        await screen.findByText('Featured Piece');

        for (const name of ['Rəssamlar', 'Qeydlər']) expect(screen.queryByRole('heading', { level: 2, name })).not.toBeInTheDocument();
    });

    // ── the page as a whole ───────────────────────────────────────────────────────────────────────────────────────

    it('orders the page: hero, statement, current exhibition, featured, artists, journal — 180px apart at 1440, 96px on phones', async () => {
        const { container } = renderHome();
        await screen.findByRole('heading', { level: 2, name: 'Qeydlər' });

        const page = container.querySelector('[data-testid="home-hero"]').parentElement;
        expect(page).toHaveClass('flex', 'flex-col', 'gap-[clamp(96px,12.5vw,180px)]');
        const order = [
            screen.getByTestId('home-hero'),
            screen.getByTestId('home-statement'),
            screen.getByTestId('home-current-show'),
            screen.getByRole('heading', { level: 2, name: 'Seçilmiş əsərlər' }),
            screen.getByRole('heading', { level: 2, name: 'Rəssamlar' }),
            screen.getByRole('heading', { level: 2, name: 'Qeydlər' }),
        ];
        order.slice(1).forEach((node, i) => expect(following(order[i], node)).toBe(true));
    });

    it('has no wall, "how it works", FAQ, contact block, seal or wine band any more', async () => {
        const { container } = renderHome();
        await screen.findByRole('heading', { level: 2, name: 'Qeydlər' });

        expect(screen.queryByTestId('home-wall')).not.toBeInTheDocument();
        expect(screen.queryByTestId('home-seal')).not.toBeInTheDocument();
        expect(screen.queryByText('Necə sifariş verə bilərəm?')).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Əlaqə saxla' })).not.toBeInTheDocument();
        expect(container.innerHTML).not.toMatch(/bg-wine|data-surface/);
    });

    it('uses no Signal and no boxed button on the page itself', async () => {
        const { container } = renderHome();
        await screen.findByText('Featured Piece');

        expect(container.innerHTML).not.toMatch(/signal/);
        container.querySelectorAll('a').forEach((link) => expect(link.className).not.toMatch(/(^|\s)border(\s|-)|bg-/));
    });
});
