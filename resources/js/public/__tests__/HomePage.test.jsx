import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import HomePage, { heroStats } from '../pages/HomePage.jsx';

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

        it('uses the hero even when it is not the first section, for the h1, title and subheading', async () => {
            renderWith([section('steps', 'How it works'), section('hero', 'Real Hero', 1)]);

            expect(await screen.findByRole('heading', { level: 1, name: 'Real Hero' })).toBeInTheDocument();
            expect(screen.getByTestId('home-hero')).toHaveTextContent('Real Hero body');
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

    it('opens with a wine hero in two columns: the text left, the photograph right at the full height, 808px at least', async () => {
        renderHome();

        const hero = await screen.findByTestId('home-hero');
        expect(hero).toHaveClass('bg-wine', 'md:grid', 'md:grid-cols-[1.15fr_1fr]', 'md:min-h-[808px]');
        expect(hero).toHaveAttribute('data-surface', 'wine');
        const image = within(hero).getByTestId('home-hero-image');
        expect(image).toHaveAttribute('src', 'https://example.test/hero.webp');
        expect(image).toHaveClass('object-cover', 'absolute', 'inset-0', 'h-full', 'w-full', 'object-[center_35%]');
        // Phones: the photograph first, 64vw tall; from md it moves to the right column.
        expect(image.parentElement).toHaveClass('h-[64vw]', 'md:order-2', 'md:h-auto');
        expect(hero.firstElementChild).toBe(image.parentElement);
    });

    it('sets the hero heading as the bold h1 with its *word* in Spectral italic, then the subheading and two buttons', async () => {
        homepage = { ...homepageData, page: { sections: [{ ...homepageData.page.sections[0], heading: 'Sənəti *həqiqi* ölçüsündə görün.' }] } };
        mockApi();
        renderHome();

        const h1 = await screen.findByRole('heading', { level: 1, name: 'Sənəti həqiqi ölçüsündə görün.' });
        expect(h1).toHaveClass('text-hero', 'text-surface');
        expect(within(h1).getByText('həqiqi').tagName).toBe('EM');
        expect(within(h1).getByText('həqiqi')).toHaveClass('emphasis');
        await waitFor(() => expect(document.title).toBe('Sənəti həqiqi ölçüsündə görün. | ArtNiyyətli'));

        const hero = screen.getByTestId('home-hero');
        expect(within(hero).getByText('Müasir Azərbaycan sənəti, həqiqi ölçüsündə.')).toHaveClass('font-editorial', 'md:text-[21px]');
        const collection = within(hero).getByRole('link', { name: 'Kolleksiyaya bax' });
        expect(collection).toHaveAttribute('href', '/artworks');
        expect(collection).toHaveClass('bg-surface', 'text-wine');
        const show = within(hero).getByRole('link', { name: 'Sərgiyə keç' });
        expect(show).toHaveAttribute('href', '/exhibitions/ilk-satis');
        expect(show).toHaveClass('border-surface/55', 'text-surface');
    });

    it('puts the current exhibition over the h1: a red dot, "Cari sərgi", its title and dates without the year', async () => {
        renderHome();

        const line = await screen.findByTestId('home-hero-line');
        expect(line).toHaveTextContent('Cari sərgi · İlk satış sərgisi · 15 oktyabr – 30 noyabr');
        expect(line).toHaveClass('text-wine-muted');
        expect(line.querySelector('.bg-brand.rounded-full')).not.toBeNull();
        expect(following(line, screen.getByRole('heading', { level: 1 }))).toBe(true);
    });

    it('without a current exhibition: no line and no "Sərgiyə keç"', async () => {
        homepage = { ...homepageData, exhibitions: { current: [], upcoming: [] }, exhibition: null };
        mockApi();
        renderHome();

        const hero = await screen.findByTestId('home-hero');
        expect(within(hero).getByRole('heading', { level: 1, name: 'ArtNiyyətli' })).toBeInTheDocument();
        expect(screen.queryByTestId('home-hero-line')).not.toBeInTheDocument();
        expect(within(hero).queryByRole('link', { name: 'Sərgiyə keç' })).not.toBeInTheDocument();
    });

    it('without a hero image, the hero is the text column alone', async () => {
        homepage = { ...homepageData, page: { sections: [{ ...homepageData.page.sections[0], image_url: null }] } };
        mockApi();
        renderHome();

        const hero = await screen.findByTestId('home-hero');
        expect(hero.querySelector('img')).toBeNull();
        expect(hero.className).not.toMatch(/grid-cols/);
    });

    it('shows the stats over a 1px line: the counts, then 1:1 true size', async () => {
        renderHome();

        const stats = await screen.findByTestId('home-stats');
        expect(stats).toHaveClass('border-t', 'border-surface/20');
        expect([...stats.querySelectorAll('dd')].map((dd) => dd.textContent)).toEqual(['12', '5', '1:1']);
        expect([...stats.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual(['əsər kolleksiyada', 'rəssam', 'həqiqi ölçü']);
        expect(stats.querySelector('dd')).toHaveClass('md:text-[42px]', 'font-semibold');
    });

    it('heroStats leaves out zero or missing counts, and gives null with neither', () => {
        expect(heroStats({ stats: { artworks: 8, artists: 0 } }, 'az').map((s) => s.value)).toEqual([8, '1:1']);
        expect(heroStats({ stats: { artworks: 0, artists: 0 } }, 'az')).toBeNull();
        expect(heroStats({}, 'az')).toBeNull();
        expect(heroStats({ stats: { artworks: 3, artists: 2 } }, 'en').map((s) => s.label)).toEqual(['works in the collection', 'artists', 'true size']);
    });

    // ── the current exhibition ────────────────────────────────────────────────────────────────────────────────────

    it('shows the current exhibition on a wine band: the cover left (1.4 : 1, 80px apart), then numbered text and a button', async () => {
        renderHome();

        const block = await screen.findByTestId('home-current-show');
        expect(block).toHaveClass('bg-wine');
        expect(block).toHaveAttribute('data-surface', 'wine');
        const grid = block.firstElementChild;
        expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-[1.4fr_1fr]', 'md:gap-[80px]');
        const cover = within(block).getByTestId('home-current-show-cover');
        expect(cover).toHaveAttribute('src', 'https://example.test/cover.webp');
        expect(grid.firstElementChild).toBe(cover);

        const h2 = within(block).getByRole('heading', { level: 2, name: 'İlk satış sərgisi' });
        expect(h2).toHaveClass('text-surface', 'text-[clamp(40px,4.6vw,66px)]');
        expect(within(block).getByTestId('section-label')).toHaveTextContent('02 · Cari sərgi');
        expect(within(block).getByText('15 oktyabr – 30 noyabr 2026 · Bakı')).toHaveClass('text-wine-muted');
        expect(within(block).getByText('Dörd rəssam, on iki əsər.')).toHaveClass('font-editorial');
        const button = within(block).getByRole('link', { name: 'Sərgiyə bax' });
        expect(button).toHaveAttribute('href', '/exhibitions/ilk-satis');
        expect(button).toHaveClass('bg-surface', 'text-wine');
    });

    it('counts the show\'s artists and works in its line when it has works', async () => {
        homepage = { ...homepageData, exhibitions: { current: [{ ...SHOW, artworks: [card('AN-9', 'X', 50, 50), card('AN-8', 'Y', 50, 50)] }], upcoming: [] } };
        mockApi();
        renderHome();

        const block = await screen.findByTestId('home-current-show');
        expect(within(block).getByText('15 oktyabr – 30 noyabr 2026 · Bakı · 2 rəssam, 2 əsər')).toBeInTheDocument();
    });

    it('shows the current exhibition as text alone without a cover, and not at all without a current one', async () => {
        homepage = { ...homepageData, exhibitions: { current: [{ ...SHOW, media: [] }], upcoming: [] } };
        mockApi();
        const { unmount } = renderHome();
        const block = await screen.findByTestId('home-current-show');
        expect(block.firstElementChild.className).not.toMatch(/grid/);
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

    it('numbers the featured section 01 with a bold "Seçilmiş *əsərlər*" in wine, "Bütün əsərlər" on its right, a line under it', async () => {
        renderHome();

        const heading = await screen.findByRole('heading', { level: 2, name: 'Seçilmiş əsərlər' });
        expect(heading).toHaveClass('text-section', 'text-wine');
        expect(within(heading).getByText('əsərlər').tagName).toBe('EM');
        const head = heading.closest('[data-testid="section-heading"]');
        expect(within(head).getByTestId('section-label')).toHaveTextContent(/^01$/);
        expect(within(head).getByTestId('section-label')).toHaveClass('text-wine', 'font-semibold', 'text-[13px]');
        expect(head).toHaveClass('border-b', 'border-line', 'justify-between');
        const all = within(head).getByRole('link', { name: 'Bütün əsərlər' });
        expect(all).toHaveAttribute('href', '/artworks');
        expect(within(all).getByText('Bütün əsərlər')).toHaveClass('link-line');
    });

    it('shows the featured works in two rows at one k, bottom-aligned, 48px apart, each with the hang shadow', async () => {
        const four = [card('AN-3', 'Featured Piece', 180, 140), card('AN-4', 'Small Piece', 40, 30), card('AN-5', 'Mid', 100, 100), card('AN-6', 'Tall', 60, 120)];
        homepage = { ...homepageData, featured: four };
        mockApi();
        renderHome();

        const section = (await screen.findByRole('heading', { level: 2, name: 'Seçilmiş əsərlər' })).closest('section');
        const lines = within(section).getAllByTestId('featured-line');
        expect(lines).toHaveLength(2);
        lines.forEach((line) => expect(line).toHaveClass('flex', 'items-end', 'gap-x-[48px]'));
        expect(within(lines[0]).getAllByTestId('featured-field')).toHaveLength(2);
        const fields = within(section).getAllByTestId('featured-field');
        fields.forEach((field) => expect(field).toHaveClass('shadow-hang'));
        // One k for both rows: the height cap (384 / 140) is smaller than either row's width fit.
        const k = 384 / 140;
        expect(fields.map((f) => f.style.height)).toEqual([140, 30, 100, 120].map((h) => `${Math.round(h * k)}px`));
        expect(within(section).queryByTestId('human-figure')).not.toBeInTheDocument();
        expect(within(section).queryByTestId('scale-rule')).not.toBeInTheDocument();
    });

    it('captions each work: title in Spectral italic 18px ink, "artist · size" 13px, the price in 600 wine', async () => {
        renderHome();

        const section = (await screen.findByRole('heading', { level: 2, name: 'Seçilmiş əsərlər' })).closest('section');
        const link = within(section).getByRole('link', { name: /^Small Piece/ });
        expect(link).toHaveAttribute('href', '/artworks/AN-4');
        expect(within(link).getByText('Small Piece')).toHaveClass('font-editorial', 'italic', 'text-[18px]', 'text-ink');
        expect(within(link).getByText('Kamran Səfərli · 40 × 30 sm')).toHaveClass('text-meta', 'text-ink-muted');
        expect(within(link).getByTestId('artwork-price-line')).toHaveTextContent('Qiymət sorğu ilə');
        expect(within(link).getByTestId('artwork-price-line')).toHaveClass('font-semibold', 'text-wine');
        expect(within(within(section).getByRole('link', { name: /^Featured Piece/ })).getByTestId('artwork-price-line')).toHaveTextContent('9 800 AZN');
    });

    it('shows a sold or reserved work\'s status in ink-muted', async () => {
        homepage = { ...homepageData, featured: [card('AN-3', 'Featured Piece', 180, 140, { availability: 'sold' })] };
        mockApi();
        renderHome();

        const line = await screen.findByTestId('artwork-price-line');
        expect(line).toHaveTextContent('Satılıb');
        expect(line).toHaveClass('text-ink-muted');
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
            screen.getAllByTestId('featured-line').forEach((line) => [...line.children].forEach((li) => expect(li.style.width).toBe('')));
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

    it('shows the artists in 2 / 4 columns: a 340px surface-sunk box with one of their works, the name in 600 wine', async () => {
        homepage = { ...homepageData, featured: [card('AN-3', 'Featured Piece', 180, 140, { image_url: 'https://example.test/an3.webp' })], artists: [{ ...homepageData.artists[0], artworks_count: 3 }] };
        mockApi();
        renderHome();

        const list = await screen.findByTestId('home-artists');
        expect(list).toHaveClass('grid-cols-2', 'md:grid-cols-4');
        const cardLink = within(list).getByRole('link', { name: /A B/ });
        expect(cardLink).toHaveAttribute('href', '/artists/a');
        const work = within(cardLink).getByTestId('artist-card-work');
        expect(work).toHaveClass('bg-surface-sunk', 'md:h-[340px]', 'md:p-[36px]', 'items-center', 'justify-center');
        expect(work.querySelector('img')).toHaveAttribute('src', 'https://example.test/an3.webp');
        expect(work.querySelector('img')).toHaveClass('shadow-hang');
        expect(within(cardLink).getByText('A B')).toHaveClass('text-[20px]', 'font-semibold', 'text-wine');
        expect(within(cardLink).getByText(/Modern/)).toHaveTextContent('Modern · 3 əsər');
        expect(within(list.closest('section')).getByRole('link', { name: 'Bütün rəssamlar' })).toHaveAttribute('href', '/artists');
        expect(within(list.closest('section')).getByTestId('section-label')).toHaveTextContent('03');
    });

    it('shows the artist\'s monogram when the page has no work of theirs with an image', async () => {
        renderHome();

        const cardLink = within(await screen.findByTestId('home-artists')).getByRole('link', { name: /A B/ });
        expect(within(cardLink).getByTestId('artist-monogram')).toHaveTextContent('AB');
        expect(cardLink.querySelector('img')).toBeNull();
    });

    // ── how to buy ────────────────────────────────────────────────────────────────────────────────────────────────

    it('explains how to buy on a wine band: three wine-deep cards with 01–03, the fixed text', async () => {
        renderHome();

        const steps = await screen.findByTestId('home-steps');
        expect(steps).toHaveClass('bg-wine');
        const heading = within(steps).getByRole('heading', { level: 2, name: 'Əsəri necə almaq olar' });
        expect(within(heading).getByText('almaq').tagName).toBe('EM');
        expect(heading).toHaveClass('text-surface');
        const cards = within(steps).getAllByRole('listitem');
        expect(cards).toHaveLength(3);
        cards.forEach((li) => expect(li).toHaveClass('bg-wine-deep'));
        expect(cards.map((li) => li.querySelector('h3').textContent)).toEqual(['Seçin', 'Soruşun', 'Əldə edin']);
        expect(cards.map((li) => li.firstElementChild.textContent)).toEqual(['01', '02', '03']);
        expect(within(cards[1]).getByText(/bir iş günü ərzində/)).toHaveClass('text-[15px]', 'text-wine-muted');
    });

    // ── the journal ───────────────────────────────────────────────────────────────────────────────────────────────

    it('shows the latest three articles under "Jurnal": the cover when there is one, the date, the title 24px 600 wine', async () => {
        articles = [{ ...ARTICLES[0], media: [{ url: 'https://example.test/cover-1.webp' }] }];
        mockApi();
        renderHome();

        const heading = await screen.findByRole('heading', { level: 2, name: 'Jurnal' });
        const section = heading.closest('section');
        expect(within(section).getByRole('link', { name: 'Bütün məqalələr' })).toHaveAttribute('href', '/articles');
        const list = within(section).getByTestId('home-articles-list');
        expect(list).toHaveClass('md:grid-cols-3');
        const article = within(list).getByRole('link', { name: /Kamran Səfərli ilə müsahibə/ });
        expect(article).toHaveAttribute('href', '/articles/musahibe');
        expect(article.querySelector('img')).toHaveAttribute('src', 'https://example.test/cover-1.webp');
        expect(article.querySelector('img').parentElement).toHaveClass('md:h-[260px]');
        expect(within(article).getByText('Kamran Səfərli ilə müsahibə')).toHaveClass('text-[24px]', 'font-semibold', 'text-wine');
        expect(article).toHaveTextContent('10 sentyabr 2026');
        expect(global.fetch.mock.calls.some(([url]) => url.startsWith('/api/v1/articles') && url.includes('per_page=3'))).toBe(true);
    });

    it('shows an article without a cover with no image box', async () => {
        renderHome();

        const list = await screen.findByTestId('home-articles-list');
        expect(list.querySelector('img')).toBeNull();
    });

    it('leaves out the empty blocks: artists, journal', async () => {
        homepage = { ...homepageData, artists: [] };
        articles = [];
        mockApi();
        renderHome();
        await screen.findByText('Featured Piece');

        for (const name of ['Rəssamlar', 'Jurnal']) expect(screen.queryByRole('heading', { level: 2, name })).not.toBeInTheDocument();
    });

    // ── the closing call ──────────────────────────────────────────────────────────────────────────────────────────

    it('closes with "Bir əsər *gözünüzü* tutdu?" under a 1px line and "Sorğu göndər"', async () => {
        renderHome();

        const cta = await screen.findByTestId('home-cta');
        expect(cta).toHaveClass('border-t', 'border-line', 'text-center');
        const heading = within(cta).getByRole('heading', { level: 2, name: 'Bir əsər gözünüzü tutdu?' });
        expect(heading).toHaveClass('text-wine', 'text-[clamp(44px,6.67vw,96px)]', 'font-bold');
        const button = within(cta).getByRole('link', { name: 'Sorğu göndər' });
        expect(button).toHaveAttribute('href', '/contact');
        expect(button).toHaveClass('bg-wine', 'text-surface');
    });

    // ── the page as a whole ───────────────────────────────────────────────────────────────────────────────────────

    it('orders the page: hero, featured, current exhibition, artists, how to buy, journal, closing call — numbered 01 to 05', async () => {
        renderHome();
        await screen.findByRole('heading', { level: 2, name: 'Jurnal' });

        const order = [
            screen.getByTestId('home-hero'),
            screen.getByRole('heading', { level: 2, name: 'Seçilmiş əsərlər' }),
            screen.getByTestId('home-current-show'),
            screen.getByRole('heading', { level: 2, name: 'Rəssamlar' }),
            screen.getByTestId('home-steps'),
            screen.getByRole('heading', { level: 2, name: 'Jurnal' }),
            screen.getByTestId('home-cta'),
        ];
        order.slice(1).forEach((node, i) => expect(following(order[i], node)).toBe(true));
        expect(screen.getAllByTestId('section-label').map((label) => label.textContent.slice(0, 2))).toEqual(['01', '02', '03', '04', '05']);
        // 140px between sections at 1440, 80px on phones.
        expect(screen.getByTestId('home-steps')).toHaveClass('py-[clamp(80px,9.72vw,140px)]');
    });

    it('has no wall, FAQ or seal', async () => {
        renderHome();
        await screen.findByRole('heading', { level: 2, name: 'Jurnal' });

        expect(screen.queryByTestId('home-wall')).not.toBeInTheDocument();
        expect(screen.queryByTestId('home-seal')).not.toBeInTheDocument();
        expect(screen.queryByText('Necə sifariş verə bilərəm?')).not.toBeInTheDocument();
    });

    it('uses no Signal on the page itself', async () => {
        const { container } = renderHome();
        await screen.findByText('Featured Piece');

        expect(container.innerHTML).not.toMatch(/signal/);
    });
});
