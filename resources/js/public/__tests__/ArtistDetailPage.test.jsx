import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import ArtistDetailPage from '../pages/ArtistDetailPage.jsx';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

const work = (code, title, w, h) => ({ inventory_code: code, title, image_url: null, genre: { slug: 'p', name: 'P' }, medium: { slug: 'o', name: 'O' }, price: 100, currency: 'AZN', availability: 'available', width_cm: w, height_cm: h });
const detail = {
    id: 5, slug: 'aygun-mammadova', first_name: 'Aygün', last_name: 'Məmmədova', birth_year: 1985, birth_place: 'Bakı',
    direction: 'Müasir rəssamlıq', biography: 'Bio text.', artistic_approach: 'Approach text.', portrait_url: 'https://example.test/portrait.webp',
    exhibitions: [{ year: 2020, title: 'Some Show', venue: 'Some Venue' }],
    awards: [{ year: 2019, title: 'Some Award' }],
    artworks: [work('AN-1', 'A Piece', 180, 140), work('AN-2', 'Small Piece', 40, 30)],
};

let artist;
function mockApi() {
    global.fetch = vi.fn(() => Promise.resolve(typeof artist === 'function' ? artist() : jsonResponse(200, { data: artist })));
}
const renderPage = (extra = null) => render(<LocaleProvider>{extra}<ArtistDetailPage params={{ slug: 'aygun-mammadova' }} /></LocaleProvider>);

describe('ArtistDetailPage', () => {
    const originalRO = global.ResizeObserver;
    const K = (445 - 64) / 270; // jsdom: innerHeight 768 → 445px wall area, 270 cm wall

    beforeEach(() => {
        localStorage.removeItem('public-locale');
        artist = detail;
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

    it('renders bio, approach, exhibition and award history, and the works (unchanged content)', async () => {
        renderPage();

        expect(await screen.findByText('Bio text.')).toHaveClass('font-editorial', 'md:text-[19px]');
        expect(screen.getByTestId('artist-quote')).toHaveTextContent('“Approach text.”');
        expect(screen.getByText('Some Show')).toBeInTheDocument();
        expect(screen.getByText('Some Venue')).toBeInTheDocument();
        expect(screen.getByText('Some Award')).toBeInTheDocument();
        expect(within(screen.getByTestId('artist-work-list')).getByText('A Piece')).toBeInTheDocument();
    });

    it('orders the page: the header band, 01 the works wall, 02 the texts, 03 the history, the closing band', async () => {
        renderPage();
        await screen.findByTestId('artist-wall');

        const nodes = [
            screen.getByTestId('artist-header'),
            screen.getByTestId('home-wall'),
            screen.getByText('Bio text.'),
            screen.getByText('Some Show'),
            screen.getByTestId('wine-callout'),
        ];
        nodes.slice(1).forEach((node, i) => expect(nodes[i].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy());
        expect(screen.getAllByTestId('section-label').map((el) => el.textContent)).toEqual(['01', '03']);
        expect(screen.getByRole('heading', { name: '02 · Yaradıcılıq yanaşması' })).toBeInTheDocument();
    });

    it('sets the approach\'s first sentence as a Spectral italic wine quote beside the biography', async () => {
        artist = { ...detail, artistic_approach: 'First sentence. Second sentence.' };
        mockApi();
        renderPage();
        await screen.findByText('Bio text.');

        const texts = screen.getByTestId('artist-texts');
        expect(texts.firstElementChild).toHaveClass('grid', 'lg:grid-cols-[1fr_1.15fr]');
        const quote = screen.getByTestId('artist-quote');
        expect(quote).toHaveTextContent('“First sentence.”');
        expect(quote).toHaveClass('font-editorial', 'italic', 'text-wine');
        // The rest of the approach is read after the biography, so no sentence shows twice.
        expect(screen.getByText('Second sentence.')).toBeInTheDocument();
        expect(screen.queryAllByText(/First sentence\./)).toHaveLength(1);
    });

    it('shows the approach text once only (no excerpt of it in the header)', async () => {
        renderPage();

        expect(await screen.findAllByText(/Approach text\./)).toHaveLength(1);
    });

    it('shows the header band: the portrait 200 × 240, "Rəssam", the name with the surname emphasised, direction · year, place, two buttons', async () => {
        renderPage();

        const h1 = await screen.findByRole('heading', { level: 1, name: 'Aygün Məmmədova' });
        expect(h1).toHaveClass('text-banner', 'text-surface');
        expect(within(h1).getByText('Məmmədova').tagName).toBe('EM');
        const band = screen.getByTestId('artist-header');
        expect(band).toHaveClass('bg-wine');
        const portrait = screen.getByTestId('artist-portrait');
        expect(portrait).toHaveClass('aspect-[5/6]', 'md:w-[200px]');
        expect(portrait.className).not.toMatch(/border/); // no frame
        expect(within(portrait).getByRole('img', { name: 'Aygün Məmmədova' })).toHaveAttribute('src', 'https://example.test/portrait.webp');
        expect(within(band).getByText('Rəssam')).toBeInTheDocument();
        expect(within(band).getByText('Müasir rəssamlıq · 1985, Bakı')).toBeInTheDocument();
        expect(within(band).getByRole('link', { name: 'Əsərlərə bax' })).toHaveClass('bg-surface', 'text-wine');
        expect(within(band).getByRole('link', { name: 'Rəssam haqqında sorğu' })).toHaveAttribute('href', '/contact');
    });

    it('shows the artist\'s initials on wine-deep in the portrait\'s place without a portrait, not an empty field', async () => {
        artist = { ...detail, portrait_url: null };
        mockApi();
        renderPage();

        await screen.findByRole('heading', { level: 1, name: 'Aygün Məmmədova' });
        const portrait = screen.getByTestId('artist-portrait');
        expect(portrait.firstElementChild).toHaveClass('bg-wine-deep');
        expect(within(portrait).queryByRole('img')).not.toBeInTheDocument();
        expect(within(portrait).getByTestId('artist-monogram')).toHaveTextContent('AM');
        expect(within(portrait).getByTestId('artist-monogram')).toHaveClass('italic', 'text-wine-accent', 'md:text-[84px]');
    });

    it('hangs the works on a wall at one k, with the 170 cm figure at 170 × k, on surface-sunk', async () => {
        renderPage();
        await screen.findByTestId('artist-wall');

        expect(screen.getByTestId('artist-wall')).toHaveClass('bg-surface-sunk');
        const [big, small] = screen.getAllByTestId('wall-field');
        expect(big.style.width).toBe(`${Math.round(180 * K)}px`);
        expect(small.style.width).toBe(`${Math.round(40 * K)}px`);
        expect(screen.getByTestId('human-figure')).toHaveAttribute('height', String(Math.round(170 * K)));
        expect(screen.getByRole('region', { name: /Rəssamın əsərləri divarda/ })).toHaveAttribute('tabindex', '0');
        expect(within(screen.getByTestId('wall-footer')).getByTestId('scale-rule')).toBeInTheDocument();
        expect(screen.getByTestId('wall-note')).toHaveTextContent('2 əsər · siluet 170 sm');
    });

    it('still builds the wall for an artist with one work', async () => {
        artist = { ...detail, artworks: [work('AN-9', 'Only One', 100, 80)] };
        mockApi();
        renderPage();

        expect(within(await screen.findByTestId('artist-work-list')).getByText('Only One')).toBeInTheDocument();
        expect(screen.getAllByTestId('wall-field')).toHaveLength(1);
        expect(screen.getByTestId('human-figure')).toBeInTheDocument();
    });

    it('leaves the works section out for an artist without works, and the text section without a biography', async () => {
        artist = { ...detail, artworks: [], biography: null, artistic_approach: null };
        mockApi();
        renderPage();

        await screen.findByRole('heading', { level: 1 });
        expect(screen.queryByRole('heading', { name: 'Əsərləri' })).not.toBeInTheDocument();
        expect(screen.queryByTestId('home-wall')).not.toBeInTheDocument();
        expect(screen.queryByTestId('artist-texts')).not.toBeInTheDocument();
    });

    it('shows "Rəssam tapılmadı" with a link back to the artists for a 404', async () => {
        artist = () => jsonResponse(404, { message: '' });
        mockApi();
        renderPage();

        expect(await screen.findByRole('heading', { name: 'Rəssam tapılmadı' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Rəssamlara qayıt' })).toHaveAttribute('href', '/artists');
    });

    it('sets the title "<name> | ArtNiyyətli", a 155-character description and the portrait as og:image', async () => {
        const long = `${'Rəssam Bakıda doğulub və uzun illərdir rəngkarlıqla məşğuldur. '.repeat(4)}Son.`;
        artist = { ...detail, biography: long };
        mockApi();
        renderPage();

        await waitFor(() => expect(document.title).toBe('Aygün Məmmədova | ArtNiyyətli'));
        const description = document.head.querySelector('meta[name="description"]').getAttribute('content');
        expect(description.length).toBeLessThanOrEqual(155);
        expect(description.endsWith('…')).toBe(true);
        expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute('content', 'https://example.test/portrait.webp');
    });

    it('lets the backend SEO override win', async () => {
        artist = { ...detail, seo: { title: 'Override', description: 'Override description', image_url: 'https://example.test/og.jpg' } };
        mockApi();
        renderPage();

        await waitFor(() => expect(document.title).toBe('Override | ArtNiyyətli'));
        expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute('content', 'https://example.test/og.jpg');
    });

    it('uses no Signal on the page itself, and ends with the wine band and its cream button', async () => {
        const { container } = renderPage();
        await screen.findByTestId('artist-wall');

        expect(container.innerHTML).not.toMatch(/signal/);
        const band = screen.getByTestId('wine-callout');
        expect(within(band).getByRole('heading', { level: 2, name: 'Rəssamın işləri ilə maraqlanırsınız?' })).toBeInTheDocument();
        expect(within(band).getByRole('link', { name: 'Sorğu göndər' })).toHaveClass('bg-surface', 'text-wine');
    });

    it('lists exhibitions and awards newest first: year in wine 600, the title in Spectral italic, the place', async () => {
        renderPage();

        const list = await screen.findByTestId('artist-history-list');
        const rows = [...list.children];
        expect(rows.map((row) => row.firstElementChild.textContent)).toEqual(['2020', '2019']);
        expect(rows[0].firstElementChild).toHaveClass('font-semibold', 'text-wine');
        expect(within(rows[0]).getByText('Some Show')).toHaveClass('font-editorial', 'italic');
        expect(within(rows[1]).getByText('Mükafat')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2, name: 'Sərgilər və mükafatlar' })).toBeInTheDocument();
    });

    it('shows a static skeleton while loading, and an error with a retry', async () => {
        let calls = 0;
        artist = () => (++calls === 1 ? jsonResponse(500, {}) : jsonResponse(200, { data: detail }));
        mockApi();
        renderPage();

        expect(screen.getByTestId('artist-skeleton')).toHaveAttribute('aria-busy', 'true');
        await userEvent.click(await screen.findByRole('button', { name: 'Yenidən cəhd et' }));
        expect(await screen.findByText('Bio text.')).toBeInTheDocument();
    });

    it('does not crash when the locale changes after the page has already loaded', async () => {
        renderPage(<LocaleSwitcher />);
        await screen.findByText('Bio text.');

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await waitFor(() => expect(screen.getAllByText('Bio text.').length).toBeGreaterThan(0));
    });
});
