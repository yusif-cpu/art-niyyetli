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

        expect(await screen.findByText('Bio text.')).toHaveClass('font-editorial', 'text-reading');
        expect(screen.getByText('Approach text.')).toHaveClass('font-editorial', 'text-reading');
        expect(screen.getByText('Some Show')).toBeInTheDocument();
        expect(screen.getByText('Some Venue')).toBeInTheDocument();
        expect(screen.getByText('Some Award')).toBeInTheDocument();
        expect(screen.getByText('A Piece')).toBeInTheDocument();
    });

    it('orders the page: compact header, works wall, texts, history, enquiry', async () => {
        renderPage();
        await screen.findByText('A Piece');

        const order = ['artist-portrait', 'home-wall'].map((id) => screen.getByTestId(id));
        const texts = [screen.getByText('Bio text.'), screen.getByText('Some Show'), screen.getByRole('link', { name: 'Rəssam haqqında soruş' })];
        const nodes = [...order, ...texts];
        nodes.slice(1).forEach((node, i) => expect(nodes[i].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy());
    });

    it('shows the approach text once only (no excerpt of it in the header)', async () => {
        renderPage();

        expect(await screen.findAllByText('Approach text.')).toHaveLength(1);
    });

    it('shows the header block: a 4:5 portrait up to 160px, the name, direction and birth year and place', async () => {
        renderPage();

        expect(await screen.findByRole('heading', { level: 1, name: 'Aygün Məmmədova' })).toHaveClass('text-heading');
        const portrait = screen.getByTestId('artist-portrait');
        expect(portrait).toHaveClass('aspect-[4/5]', 'max-w-40', 'border', 'border-line');
        expect(within(portrait).getByRole('img', { name: 'Aygün Məmmədova' })).toHaveAttribute('src', 'https://example.test/portrait.webp');
        expect(screen.getByText('Müasir rəssamlıq')).toBeInTheDocument();
        expect(screen.getByText('1985, Bakı')).toBeInTheDocument();
        expect(document.body.innerHTML).not.toMatch(/rounded/);
    });

    it('hangs the works on a wall at one k, with the 170 cm figure at 170 × k', async () => {
        renderPage();
        await screen.findByText('A Piece');

        const [big, small] = screen.getAllByTestId('wall-field');
        expect(big.style.width).toBe(`${Math.round(180 * K)}px`);
        expect(small.style.width).toBe(`${Math.round(40 * K)}px`);
        expect(screen.getByTestId('human-figure')).toHaveAttribute('height', String(Math.round(170 * K)));
        expect(screen.getByRole('region', { name: /Rəssamın əsərləri divarda/ })).toHaveAttribute('tabindex', '0');
        expect(screen.getByTestId('wall-surface')).toHaveClass('bg-surface-field-3');
        expect(within(screen.getByTestId('wall-footer')).getByTestId('scale-rule')).toBeInTheDocument();
    });

    it('still builds the wall for an artist with one work', async () => {
        artist = { ...detail, artworks: [work('AN-9', 'Only One', 100, 80)] };
        mockApi();
        renderPage();

        expect(await screen.findByText('Only One')).toBeInTheDocument();
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
        expect(screen.queryByRole('heading', { name: 'Tərcümeyi-hal' })).not.toBeInTheDocument();
    });

    it('shows "Rəssam tapılmadı" with a link back to the artists for a 404', async () => {
        artist = () => jsonResponse(404, { message: '' });
        mockApi();
        renderPage();

        expect(await screen.findByRole('heading', { name: 'Rəssam tapılmadı' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Rəssamlara qayıt' })).toHaveAttribute('href', '/artists');
    });

    it('sets the title "<name> — ArtNiyyətli", a 155-character description and the portrait as og:image', async () => {
        const long = `${'Rəssam Bakıda doğulub və uzun illərdir rəngkarlıqla məşğuldur. '.repeat(4)}Son.`;
        artist = { ...detail, biography: long };
        mockApi();
        renderPage();

        await waitFor(() => expect(document.title).toBe('Aygün Məmmədova — ArtNiyyətli'));
        const description = document.head.querySelector('meta[name="description"]').getAttribute('content');
        expect(description.length).toBeLessThanOrEqual(155);
        expect(description.endsWith('…')).toBe(true);
        expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute('content', 'https://example.test/portrait.webp');
    });

    it('lets the backend SEO override win', async () => {
        artist = { ...detail, seo: { title: 'Override', description: 'Override description', image_url: 'https://example.test/og.jpg' } };
        mockApi();
        renderPage();

        await waitFor(() => expect(document.title).toBe('Override — ArtNiyyətli'));
        expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute('content', 'https://example.test/og.jpg');
    });

    it('uses no Signal on the page itself; the enquiry link is wine', async () => {
        const { container } = renderPage();
        await screen.findByText('A Piece');

        expect(container.innerHTML).not.toMatch(/signal/);
        expect(screen.getByRole('link', { name: 'Rəssam haqqında soruş' })).toHaveClass('bg-wine', 'text-wine-ink');
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
