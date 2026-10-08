import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import ArtistsPage from '../pages/ArtistsPage.jsx';
import { portraitToneFor } from '../components/ArtistPortrait.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

const AYGUN = { id: 5, slug: 'aygun-mammadova', first_name: 'Aygün', last_name: 'Məmmədova', direction: 'Modern', portrait_url: null };
const KAMRAN = { id: 2, slug: 'kamran-seferli', first_name: 'Kamran', last_name: 'Səfərli', direction: 'Abstrakt kompozisiya', portrait_url: 'https://example.test/kamran.webp' };

const renderPage = () => render(<LocaleProvider><ArtistsPage /></LocaleProvider>);

describe('ArtistsPage', () => {
    it('renders a card per artist from the API, in its order, with name, direction and profile link', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [KAMRAN, AYGUN] }));
        renderPage();

        const kamran = await screen.findByRole('link', { name: /Kamran Səfərli/ });
        expect(kamran).toHaveAttribute('href', '/artists/kamran-seferli');
        expect(within(kamran).getByText('Abstrakt kompozisiya')).toHaveClass('text-meta', 'text-ink-muted');
        expect(within(kamran).getByText('Kamran Səfərli')).toHaveClass('text-byline-lg');
        expect(within(kamran).getByRole('img', { name: 'Kamran Səfərli' })).toHaveAttribute('src', 'https://example.test/kamran.webp');
        expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/artists/kamran-seferli', '/artists/aygun-mammadova']);
        expect(screen.getByRole('heading', { level: 1, name: 'Rəssamlar' })).toHaveClass('text-display');
    });

    it('gives an artist without a portrait a tone from the slug, the same on every render', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [AYGUN] }));
        const first = renderPage();
        const tone = [...(await screen.findByTestId('artist-portrait')).classList].find((c) => c.startsWith('bg-surface-field'));
        first.unmount();

        renderPage();
        expect(await screen.findByTestId('artist-portrait')).toHaveClass(tone);
        expect(tone).toBe(portraitToneFor('aygun-mammadova'));
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('never gives a portrait the palest field tone (it reads as a blank sheet)', () => {
        const slugs = Array.from({ length: 40 }, (_, i) => `artist-${i}`);
        const tones = new Set(slugs.map(portraitToneFor));

        expect(tones).toEqual(new Set(['bg-surface-field', 'bg-surface-field-2']));
    });

    it('lays the list out in 1 / 3 / 4 columns (375 / 768–1024 / 1280+)', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [AYGUN] }));
        renderPage();

        const list = (await screen.findByText('Aygün Məmmədova')).closest('ul');
        expect(list).toHaveClass('grid-cols-1', 'md:grid-cols-3', 'xl:grid-cols-4');
        expect(list.className).not.toMatch(/md:grid-cols-2|lg:grid-cols/);
    });

    // (was: upright 4:5 rectangles, no rounded class anywhere) — the client chose round portraits for the artist
    // cards: the one exception to "no radius", and only the portrait is rounded.
    it('draws the card portraits as circles (a square crop), with the 1px line; nothing else on the page is rounded', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [KAMRAN, AYGUN] }));
        const { container } = renderPage();
        await screen.findByText('Kamran Səfərli');

        const portraits = screen.getAllByTestId('artist-portrait');
        portraits.forEach((p) => {
            expect(p).toHaveClass('aspect-square', 'rounded-full', 'overflow-hidden', 'border', 'border-line');
            expect(p).toHaveAttribute('data-shape', 'circle');
            expect(p).not.toHaveClass('aspect-[4/5]');
            expect(p.className).not.toMatch(/shadow/);
        });
        expect(container.querySelectorAll('[class*="rounded"]')).toHaveLength(portraits.length);
    });

    it('draws the loading skeleton with the same round portraits, so the page does not jump', () => {
        global.fetch = vi.fn(() => new Promise(() => {}));
        renderPage();

        const skeleton = screen.getByTestId('artists-skeleton');
        const fields = skeleton.querySelectorAll('.rounded-full');
        expect(fields).toHaveLength(4);
        fields.forEach((field) => expect(field).toHaveClass('aspect-square', 'border-line'));
        expect(skeleton.innerHTML).not.toMatch(/aspect-\[4\/5\]/);
    });

    it('shows the number of works ("12 əsər", text-caption, ink-muted) from artworks_count; none for 0 or a missing count', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [{ ...KAMRAN, artworks_count: 12 }, { ...AYGUN, artworks_count: 0 }, { ...AYGUN, id: 9, slug: 'no-count', first_name: 'No' }] }));
        renderPage();

        const kamran = await screen.findByRole('link', { name: /Kamran Səfərli/ });
        expect(within(kamran).getByTestId('artist-works-count')).toHaveTextContent('12 əsər');
        expect(within(kamran).getByTestId('artist-works-count')).toHaveClass('text-caption', 'text-ink-muted');
        expect(within(screen.getByRole('link', { name: /Aygün Məmmədova/ })).queryByTestId('artist-works-count')).not.toBeInTheDocument();
        expect(within(screen.getByRole('link', { name: /No Məmmədova/ })).queryByTestId('artist-works-count')).not.toBeInTheDocument();
    });

    it('shows a short muted text when there are no artists', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
        renderPage();

        expect(await screen.findByText('Heç nə tapılmadı.')).toHaveClass('text-ink-muted');
    });

    it('renders no pagination for the unpaginated list, and pages when the API sends pagination meta', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [AYGUN] }));
        const first = renderPage();
        await screen.findByText('Aygün Məmmədova');
        expect(screen.queryByRole('button', { name: 'Növbəti' })).not.toBeInTheDocument();
        first.unmount();

        global.fetch = vi.fn((url) => Promise.resolve(jsonResponse({ data: [url.includes('page=2') ? KAMRAN : AYGUN], meta: { current_page: url.includes('page=2') ? 2 : 1, last_page: 2, total: 2 } })));
        renderPage();
        await screen.findByText('Aygün Məmmədova');
        await userEvent.click(screen.getByRole('button', { name: 'Növbəti' }));
        expect(await screen.findByText('Kamran Səfərli')).toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything());
    });

    it('shows an error with a retry', async () => {
        let calls = 0;
        global.fetch = vi.fn(() => Promise.resolve(++calls === 1 ? { ok: false, status: 500, headers: { get: () => 'application/json' }, json: async () => ({}) } : jsonResponse({ data: [AYGUN] })));
        renderPage();

        await userEvent.click(await screen.findByRole('button', { name: 'Yenidən cəhd et' }));
        expect(await screen.findByText('Aygün Məmmədova')).toBeInTheDocument();
    });

    it('sets a static artists document title', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [AYGUN] }));
        renderPage();

        await waitFor(() => expect(document.title).toBe('Rəssamlar | ArtNiyyətli'));
    });
});
