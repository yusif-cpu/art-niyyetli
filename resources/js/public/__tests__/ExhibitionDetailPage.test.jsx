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

    it('shows the title, dates, venue and status in the header, then the text in reading type', async () => {
        renderPage();

        expect(await screen.findByRole('heading', { level: 1, name: 'Winter Show 2026' })).toHaveClass('text-heading');
        expect(screen.getByText('10 yanvar 2026 – 10 fevral 2026')).toBeInTheDocument();
        expect(screen.getByText('Main Gallery')).toBeInTheDocument();
        expect(screen.getByText('Cari')).toHaveClass('border-line-strong', 'text-ink');
        expect(screen.getByText('Full concept text.')).toHaveClass('font-editorial', 'text-reading', 'max-w-prose');
    });

    it('reads title, dates, venue, status and text as one block, step-4 apart (not step-9)', async () => {
        renderPage();

        const intro = await screen.findByTestId('exhibition-intro');
        expect(intro).toHaveClass('gap-step-4');
        expect(within(intro).getByRole('heading', { level: 1 })).toBeInTheDocument();
        expect(within(intro).getByText('Full concept text.')).toBeInTheDocument();
        expect(within(intro).getByText('Cari')).toBeInTheDocument();
    });

    it('hangs the works on a wall at one k, with the 170 cm figure at 170 × k', async () => {
        renderPage();
        await screen.findByText('A Piece');

        const [big, small] = screen.getAllByTestId('wall-field');
        expect(big.style.width).toBe(`${Math.round(180 * K)}px`);
        expect(small.style.width).toBe(`${Math.round(40 * K)}px`);
        expect(screen.getByTestId('human-figure')).toHaveAttribute('height', String(Math.round(170 * K)));
        expect(screen.getByRole('region', { name: /Sərgidəki əsərlər divarda/ })).toHaveAttribute('tabindex', '0');
        expect(screen.getByRole('link', { name: /^A Piece, Aygün Məmmədova/ })).toHaveAttribute('href', '/artworks/AN-1');
    });

    it('lists the participating artists with links; an artist without a slug is plain text', async () => {
        renderPage();

        const section = (await screen.findByRole('heading', { name: 'İştirakçı rəssamlar' })).closest('section');
        expect(within(section).getByRole('link', { name: 'Aygün Məmmədova' })).toHaveAttribute('href', '/artists/aygun-mammadova');
        expect(within(section).getByText('No Slug').closest('a')).toBeNull();
        expect(within(section).getAllByTestId('artist-portrait')).toHaveLength(2);
    });

    it('shows the photos with a URL in a plain grid, no shadow, and no video when there is none', async () => {
        const { container } = renderPage();

        const section = (await screen.findByRole('heading', { name: 'Fotolar və video' })).closest('section');
        const images = within(section).getAllByRole('img');
        expect(images).toHaveLength(1);
        expect(images[0]).toHaveAttribute('src', 'https://example.test/ex.webp');
        expect(images[0].closest('li').className).not.toMatch(/shadow/);
        expect(container.querySelector('iframe')).toBeNull();
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
        expect(screen.queryByTestId('home-wall')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    });

    it('uses no Signal and no rounded or neutral classes; the enquiry link is wine', async () => {
        const { container } = renderPage();
        await screen.findByText('A Piece');

        expect(container.innerHTML).not.toMatch(/signal|rounded|neutral-/);
        expect(screen.getByRole('link', { name: 'Sərgi haqqında soruş' })).toHaveClass('bg-wine', 'text-wine-ink');
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

        await waitFor(() => expect(document.title).toBe(`${detail.title} — ArtNiyyətli`));
        expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute('content', 'https://example.test/ex.webp');
    });

    it('does not crash when the locale changes after the page has already loaded', async () => {
        renderPage(<LocaleSwitcher />);
        await screen.findByText('Full concept text.');

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await waitFor(() => expect(screen.getAllByText('Full concept text.').length).toBeGreaterThan(0));
    });
});
