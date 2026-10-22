import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import ExhibitionDetailPage from '../pages/ExhibitionDetailPage.jsx';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

const work = (code, title, w, h) => ({ inventory_code: code, title, artist: { id: 5, name: 'Aygün Məmmədova' }, image_url: null, genre: { slug: 'p', name: 'P' }, medium: { slug: 'o', name: 'O' }, price: 100, currency: 'AZN', availability: 'available', width_cm: w, height_cm: h });
const detail = {
    slug: 'winter-show-2026', title: 'Winter Show 2026', type: 'exhibition', status: 'current',
    start_date: '2026-01-10', end_date: '2026-02-10', venue: 'Main Gallery', short_text: 'Short.', full_text: 'Full concept text.',
    artists: [{ id: 5, slug: 'aygun-mammadova', name: 'Aygün Məmmədova' }, { id: 6, slug: null, name: 'No Slug' }],
    artworks: [work('AN-1', 'A Piece', 180, 140), work('AN-2', 'Small Piece', 40, 30)],
    media: [{ type: 'photo', url: 'https://example.test/ex.webp' }, { type: 'photo', url: null }],
    video: null,
};

let exhibition;
function mockApi() {
    global.fetch = vi.fn(() => Promise.resolve(typeof exhibition === 'function' ? exhibition() : jsonResponse(200, { data: exhibition })));
}
const renderPage = (extra = null) => render(<LocaleProvider>{extra}<ExhibitionDetailPage params={{ slug: 'winter-show-2026' }} /></LocaleProvider>);

describe('ExhibitionDetailPage', () => {
    const originalRO = global.ResizeObserver;
    const K = (445 - 64) / 270; // jsdom: innerHeight 768 → 445px wall area, 270 cm wall

    beforeEach(() => {
        localStorage.removeItem('public-locale');
        exhibition = detail;
        mockApi();
        global.ResizeObserver = class {
            constructor(cb) { this.cb = cb; }
            observe() { this.cb([{ contentRect: { width: 1296 } }]); }
            disconnect() {}
        };
    });

    afterEach(() => {
        global.ResizeObserver = originalRO;
        document.head.querySelectorAll('meta[property^="og:"], meta[name="description"]').forEach((m) => m.remove());
    });

    it('opens with the wine band: "Cari sərgi" with the red dot, the title, the short text and the figures', async () => {
        renderPage();

        const h1 = await screen.findByRole('heading', { level: 1, name: 'Winter Show 2026' });
        expect(h1).toHaveClass('text-banner', 'text-surface');
        const band = screen.getByTestId('page-header');
        expect(band).toHaveClass('bg-wine');
        const label = within(band).getByTestId('page-header-label');
        expect(label).toHaveTextContent('Cari sərgi');
        expect(label.querySelector('.bg-brand')).not.toBeNull();
        expect(within(band).getByText('Short.')).toHaveClass('font-editorial');
        const figures = within(band).getByTestId('page-header-meta');
        expect([...figures.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual(['Tarix', 'Yer', 'Rəssam', 'Əsər']);
        expect([...figures.querySelectorAll('dd')].map((dd) => dd.textContent)).toEqual(['10 yan – 10 fev 2026', 'Main Gallery', '2', '2']);
    });

    it('labels a past show "Keçmiş sərgi" without the dot', async () => {
        exhibition = { ...detail, status: 'past' };
        mockApi();
        renderPage();

        const label = await screen.findByTestId('page-header-label');
        expect(label).toHaveTextContent('Keçmiş sərgi');
        expect(label.querySelector('.bg-brand')).toBeNull();
    });

    it('puts the cover inside the band, 640px tall, with "Ekspozisiya görünüşü" under it', async () => {
        renderPage();

        const cover = await screen.findByTestId('exhibition-cover');
        expect(cover).toHaveAttribute('src', 'https://example.test/ex.webp');
        expect(cover).toHaveClass('object-cover', 'md:h-[640px]');
        expect(screen.getByTestId('page-header')).toContainElement(cover);
        expect(screen.getByText('Ekspozisiya görünüşü')).toBeInTheDocument();
    });

    it('sets 01 "Sərgi haqqında" with the full text beside it, and the enquiry link', async () => {
        renderPage();

        const intro = await screen.findByTestId('exhibition-intro');
        expect(within(intro).getByRole('heading', { level: 2, name: 'Sərgi haqqında' })).toBeInTheDocument();
        expect(within(intro).getByTestId('section-label')).toHaveTextContent('01');
        expect(within(intro).getByText('Full concept text.')).toBeInTheDocument();
        const enquire = within(intro).getByRole('link', { name: 'Sərgi haqqında soruş' });
        expect(enquire).toHaveAttribute('href', '/contact');
        expect(within(enquire).getByText('Sərgi haqqında soruş')).toHaveClass('link-line');
    });

    it('shows the works at true size with the ScaleRule, under 02 "Sərgidəki əsərlər"', async () => {
        renderPage();

        const section = (await screen.findByRole('heading', { level: 2, name: 'Sərgidəki əsərlər' })).closest('section');
        expect(within(section).getByTestId('scale-rule')).toBeInTheDocument();
        const fields = within(section).getAllByTestId('artwork-field');
        expect(parseFloat(fields[0].style.width) / parseFloat(fields[1].style.width)).toBeCloseTo(180 / 40, 1);
        expect(within(section).getByRole('link', { name: /^A Piece, Aygün Məmmədova/ })).toHaveAttribute('href', '/artworks/AN-1');
        expect(within(section).getByRole('link', { name: 'Kataloqda bax' })).toHaveAttribute('href', '/artworks');
    });

    it('lists the participating artists on a wine band in wine-deep cards; an artist without a slug is plain text', async () => {
        renderPage();

        const section = (await screen.findByRole('heading', { name: 'İştirakçı rəssamlar' })).closest('section');
        expect(section).toHaveClass('bg-wine');
        const list = within(section).getByTestId('exhibition-artists');
        expect(list).toHaveClass('lg:grid-cols-4');
        const aygun = within(section).getByRole('link', { name: /Aygün Məmmədova/ });
        expect(aygun).toHaveAttribute('href', '/artists/aygun-mammadova');
        expect(aygun).toHaveClass('bg-wine-deep');
        expect(within(aygun).getByText('Aygün Məmmədova')).toHaveClass('text-[21px]', 'font-semibold');
        expect(within(aygun).getByTestId('artist-monogram')).toHaveTextContent('AM');
        expect(within(section).getByText('No Slug').closest('a')).toBeNull();
    });

    it('fills a participating artist\'s direction, birth year and place from the artists list', async () => {
        const roster = [{ id: 5, slug: 'aygun-mammadova', first_name: 'Aygün', last_name: 'Məmmədova', direction: 'Modern', birth_year: 1985, birth_place: 'Bakı' }];
        global.fetch = vi.fn((url) => Promise.resolve(url.startsWith('/api/v1/artists') ? jsonResponse(200, { data: roster }) : jsonResponse(200, { data: url.includes('filter=archive') ? [] : detail })));
        renderPage();

        const section = (await screen.findByRole('heading', { name: 'İştirakçı rəssamlar' })).closest('section');
        expect(await within(section).findByText('Modern · 1985, Bakı')).toBeInTheDocument();
    });

    it('shows a participating artist\'s portrait at 64px when there is one', async () => {
        exhibition = { ...detail, artists: [{ id: 5, slug: 'aygun-mammadova', name: 'Aygün Məmmədova', portrait_url: 'https://example.test/aygun.webp' }] };
        mockApi();
        renderPage();

        const section = (await screen.findByRole('heading', { name: 'İştirakçı rəssamlar' })).closest('section');
        expect(section.querySelector('img')).toHaveAttribute('src', 'https://example.test/aygun.webp');
        expect(section.querySelector('img')).toHaveClass('h-16', 'w-16');
    });

    it('shows the photos after the cover in a plain grid, and no video when there is none', async () => {
        exhibition = { ...detail, media: [...detail.media, { type: 'photo', url: 'https://example.test/second.webp' }] };
        mockApi();
        const { container } = renderPage();

        const section = (await screen.findByRole('heading', { name: 'Fotolar və video' })).closest('section');
        const images = within(section).getAllByRole('img');
        expect(images).toHaveLength(1);
        expect(images[0]).toHaveAttribute('src', 'https://example.test/second.webp');
        expect(images[0].closest('li').className).not.toMatch(/shadow/);
        expect(container.querySelector('iframe')).toBeNull();
    });

    it('shows up to two past exhibitions as cards, never this one', async () => {
        const past = (slug, title) => ({ ...detail, slug, title, status: 'past', media: [] });
        global.fetch = vi.fn((url) => Promise.resolve(jsonResponse(200, { data: url.includes('filter=archive') ? [past('winter-show-2026', 'Same'), past('a', 'Past A'), past('b', 'Past B')] : detail })));
        renderPage();

        const section = (await screen.findByRole('heading', { name: 'Keçmiş sərgilər' })).closest('section');
        expect(within(section).getAllByTestId('exhibition-card').map((card) => card.getAttribute('href'))).toEqual(['/exhibitions/a', '/exhibitions/b']);
        expect(within(section).getByText('Past A')).toHaveClass('font-semibold', 'text-wine');
        expect(within(section).getByRole('link', { name: 'Bütün sərgilər' })).toHaveAttribute('href', '/exhibitions');
    });

    it('renders the YouTube embed when there is a video', async () => {
        exhibition = { ...detail, video: { id: 'dQw4w9WgXcQ', embed_url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' } };
        mockApi();
        renderPage();

        expect(await screen.findByTitle(detail.title)).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    it('leaves out empty sections: no works, no artists, no media, no text', async () => {
        exhibition = { ...detail, artworks: [], artists: [], media: [], full_text: null, short_text: null, venue: null };
        mockApi();
        renderPage();

        await screen.findByRole('heading', { level: 1 });
        expect(screen.queryByTestId('artwork-field')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    });

    it('uses no Signal and no neutral classes; the only rounded shape is the current show\'s dot', async () => {
        const { container } = renderPage();
        await screen.findByRole('heading', { level: 1 });

        expect(container.innerHTML).not.toMatch(/signal|neutral-/);
        expect(container.innerHTML.match(/rounded[-\w]*/g)).toEqual(['rounded-full']);
    });

    it('shows "Sərgi tapılmadı" with a link back to the exhibitions for a 404', async () => {
        exhibition = () => jsonResponse(404, { message: '' });
        mockApi();
        renderPage();

        expect(await screen.findByRole('heading', { name: 'Sərgi tapılmadı' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Sərgilərə qayıt' })).toHaveAttribute('href', '/exhibitions');
    });

    it('shows a static skeleton while loading, and an error with a retry', async () => {
        let calls = 0;
        exhibition = () => (++calls === 1 ? jsonResponse(500, {}) : jsonResponse(200, { data: detail }));
        mockApi();
        renderPage();

        expect(screen.getByTestId('exhibition-skeleton')).toHaveAttribute('aria-busy', 'true');
        await userEvent.click(await screen.findByRole('button', { name: 'Yenidən cəhd et' }));
        expect(await screen.findByText('Full concept text.')).toBeInTheDocument();
    });

    it('sets the title from the exhibition and the first photo as og:image', async () => {
        renderPage();

        await waitFor(() => expect(document.title).toBe(`${detail.title} | ArtNiyyətli`));
        expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute('content', 'https://example.test/ex.webp');
    });

    it('does not crash when the locale changes after the page has already loaded', async () => {
        renderPage(<LocaleSwitcher />);
        await screen.findByText('Full concept text.');

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await waitFor(() => expect(screen.getAllByText('Full concept text.').length).toBeGreaterThan(0));
    });
});
