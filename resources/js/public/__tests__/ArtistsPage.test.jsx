import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import ArtistsPage from '../pages/ArtistsPage.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

const AYGUN = { id: 5, slug: 'aygun-mammadova', first_name: 'Aygün', last_name: 'Məmmədova', direction: 'Modern', portrait_url: null };
const KAMRAN = { id: 2, slug: 'kamran-seferli', first_name: 'Kamran', last_name: 'Səfərli', direction: 'Abstrakt kompozisiya', portrait_url: 'https://example.test/kamran.webp' };
const KAMRAN_WORK = { inventory_code: 'AN-1', title: 'Uzun divar', artist: { id: 2, slug: 'kamran-seferli', name: 'Kamran Səfərli' }, image_url: 'https://example.test/an1.webp', width_cm: 180, height_cm: 140 };

// The page asks for the artists and, separately, for one catalogue page of works to show on the cards.
function mockApi({ artists, works = [KAMRAN_WORK], meta } = {}) {
    global.fetch = vi.fn((url) => {
        if (url.startsWith('/api/v1/artworks')) return Promise.resolve(jsonResponse({ data: works, meta: { current_page: 1, last_page: 1, total: works.length } }));
        return Promise.resolve(jsonResponse(typeof artists === 'function' ? artists(url) : { data: artists, ...(meta ? { meta } : {}) }));
    });
}

const renderPage = () => render(<LocaleProvider><ArtistsPage /></LocaleProvider>);

describe('ArtistsPage', () => {
    it('renders a card per artist from the API, in its order, with name, direction and profile link', async () => {
        mockApi({ artists: [KAMRAN, AYGUN] });
        renderPage();

        const kamran = await screen.findByRole('link', { name: /Kamran Səfərli/ });
        expect(kamran).toHaveAttribute('href', '/artists/kamran-seferli');
        expect(within(kamran).getByText('Abstrakt kompozisiya')).toHaveClass('text-meta', 'text-ink-muted');
        expect(within(kamran).getByText('Kamran Səfərli')).toHaveClass('text-[20px]', 'font-semibold', 'text-wine');
        expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/artists/kamran-seferli', '/artists/aygun-mammadova']);
        expect(screen.getByRole('heading', { level: 1, name: 'Rəssamlar' })).toHaveClass('text-display');
    });

    it('shows one of the artist\'s works from one catalogue page (the artists list carries none), not the portrait', async () => {
        mockApi({ artists: [KAMRAN, AYGUN] });
        renderPage();

        const kamran = await screen.findByRole('link', { name: /Kamran Səfərli/ });
        await waitFor(() => expect(kamran.querySelector('img')).toHaveAttribute('src', 'https://example.test/an1.webp'));
        expect(global.fetch.mock.calls.some(([url]) => url.startsWith('/api/v1/artworks') && url.includes('per_page=60'))).toBe(true);
        // Aygün has no work in the answer: her monogram.
        const aygun = screen.getByRole('link', { name: /Aygün Məmmədova/ });
        expect(aygun.querySelector('img')).toBeNull();
        expect(within(aygun).getByTestId('artist-monogram')).toHaveTextContent('AM');
    });

    it('keeps the cards (with monograms) when the works request fails', async () => {
        global.fetch = vi.fn((url) => Promise.resolve(url.startsWith('/api/v1/artworks')
            ? { ok: false, status: 500, headers: { get: () => 'application/json' }, json: async () => ({}) }
            : jsonResponse({ data: [KAMRAN] })));
        renderPage();

        const kamran = await screen.findByRole('link', { name: /Kamran Səfərli/ });
        expect(within(kamran).getByTestId('artist-monogram')).toHaveTextContent('KS');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('lays the list out in the home page\'s grid: 2 columns on phones, 4 from md', async () => {
        mockApi({ artists: [AYGUN] });
        renderPage();

        const list = (await screen.findByText('Aygün Məmmədova')).closest('ul');
        expect(list).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-4');
    });

    it('draws no circle, frame or rounded corner anywhere', async () => {
        mockApi({ artists: [KAMRAN, AYGUN] });
        const { container } = renderPage();
        await screen.findByText('Kamran Səfərli');

        expect(container.querySelectorAll('[class*="rounded"]')).toHaveLength(0);
        expect(screen.queryByTestId('artist-portrait')).not.toBeInTheDocument();
    });

    it('draws the loading skeleton as the cards\' work areas, so the page does not jump', () => {
        global.fetch = vi.fn(() => new Promise(() => {}));
        renderPage();

        const skeleton = screen.getByTestId('artists-skeleton');
        expect(skeleton.children).toHaveLength(4);
        skeleton.querySelectorAll(':scope > div > div:first-child').forEach((area) => expect(area).toHaveClass('h-[200px]', 'md:h-[300px]'));
        expect(skeleton.innerHTML).not.toMatch(/rounded/);
    });

    it('shows "direction · 12 əsər" from artworks_count; no count for 0 or a missing count', async () => {
        mockApi({ artists: [{ ...KAMRAN, artworks_count: 12 }, { ...AYGUN, artworks_count: 0 }, { ...AYGUN, id: 9, slug: 'no-count', first_name: 'No' }] });
        renderPage();

        const kamran = await screen.findByRole('link', { name: /Kamran Səfərli/ });
        expect(within(kamran).getByTestId('artist-works-count')).toHaveTextContent('12 əsər');
        expect(within(kamran).getByText(/Abstrakt kompozisiya/)).toHaveTextContent('Abstrakt kompozisiya · 12 əsər');
        expect(within(screen.getByRole('link', { name: /Aygün Məmmədova/ })).queryByTestId('artist-works-count')).not.toBeInTheDocument();
        expect(within(screen.getByRole('link', { name: /No Məmmədova/ })).queryByTestId('artist-works-count')).not.toBeInTheDocument();
    });

    it('shows a short muted text when there are no artists', async () => {
        mockApi({ artists: [] });
        renderPage();

        expect(await screen.findByText('Heç nə tapılmadı.')).toHaveClass('text-ink-muted');
    });

    it('renders no pagination for the unpaginated list, and pages when the API sends pagination meta', async () => {
        mockApi({ artists: [AYGUN] });
        const first = renderPage();
        await screen.findByText('Aygün Məmmədova');
        expect(screen.queryByRole('button', { name: 'Növbəti' })).not.toBeInTheDocument();
        first.unmount();

        mockApi({ artists: (url) => ({ data: [url.includes('&page=2') || url.includes('?page=2') ? KAMRAN : AYGUN], meta: { current_page: url.includes('page=2') ? 2 : 1, last_page: 2, total: 2 } }) });
        renderPage();
        await screen.findByText('Aygün Məmmədova');
        await userEvent.click(screen.getByRole('button', { name: 'Növbəti' }));
        expect(await screen.findByText('Kamran Səfərli')).toBeInTheDocument();
        expect(global.fetch.mock.calls.some(([url]) => url.startsWith('/api/v1/artists') && url.includes('page=2'))).toBe(true);
    });

    it('shows an error with a retry', async () => {
        let calls = 0;
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/api/v1/artworks')) return Promise.resolve(jsonResponse({ data: [] }));
            return Promise.resolve(++calls === 1 ? { ok: false, status: 500, headers: { get: () => 'application/json' }, json: async () => ({}) } : jsonResponse({ data: [AYGUN] }));
        });
        renderPage();

        await userEvent.click(await screen.findByRole('button', { name: 'Yenidən cəhd et' }));
        expect(await screen.findByText('Aygün Məmmədova')).toBeInTheDocument();
    });

    it('sets a static artists document title', async () => {
        mockApi({ artists: [AYGUN] });
        renderPage();

        await waitFor(() => expect(document.title).toBe('Rəssamlar | ArtNiyyətli'));
    });
});
