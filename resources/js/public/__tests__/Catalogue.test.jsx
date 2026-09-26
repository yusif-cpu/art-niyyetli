import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import CataloguePage from '../pages/CataloguePage.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}
function errorResponse(status) {
    return { ok: false, status, headers: { get: () => 'application/json' }, json: async () => ({ message: 'Server error.' }) };
}

const artwork = (code, title, w = 100, h = 80) => ({
    inventory_code: code, title, artist: { id: 1, name: 'Kamran Səfərli' }, image_url: null,
    genre: { slug: 'abstraksiya', name: 'Abstraksiya' }, medium: { slug: 'katan-uzerinde-akril', name: 'Kətan üzərində akril' },
    price: 9800, currency: 'AZN', availability: 'available', width_cm: w, height_cm: h,
});
const GENRES = [{ slug: 'abstraksiya', name: 'Abstraksiya', sort_order: 0 }, { slug: 'fiqurativ', name: 'Fiqurativ', sort_order: 1 }];
const MEDIUMS = [{ slug: 'katan-uzerinde-akril', name: 'Kətan üzərində akril', sort_order: 0 }];
const ARTISTS = [{ id: 1, slug: 'kamran-seferli', first_name: 'Kamran', last_name: 'Səfərli' }];

let artworksResponse;
function mockApi() {
    global.fetch = vi.fn((url) => {
        if (url.startsWith('/api/v1/genres')) return Promise.resolve(jsonResponse({ data: GENRES }));
        if (url.startsWith('/api/v1/mediums')) return Promise.resolve(jsonResponse({ data: MEDIUMS }));
        if (url.startsWith('/api/v1/artists')) return Promise.resolve(jsonResponse({ data: ARTISTS }));
        if (url.startsWith('/api/v1/artworks')) return Promise.resolve(artworksResponse(url));
        return Promise.resolve(jsonResponse({ data: {} }));
    });
}
const artworkUrls = () => global.fetch.mock.calls.map(([url]) => url).filter((url) => url.startsWith('/api/v1/artworks'));

function renderPage() {
    return render(<LocaleProvider><CataloguePage /></LocaleProvider>);
}

describe('Catalogue', () => {
    const originalRO = global.ResizeObserver;

    beforeEach(() => {
        window.history.replaceState(null, '', '/artworks');
        // jsdom has no layout: give the grid a 1296px container, as a desktop would.
        global.ResizeObserver = class {
            constructor(cb) { this.cb = cb; }
            observe() { this.cb([{ contentRect: { width: 1296 } }]); }
            disconnect() {}
        };
        artworksResponse = () => jsonResponse({ data: [artwork('AN-1', 'Uzun divar', 180, 140), artwork('AN-2', 'Kağız, iki qat', 40, 30)], meta: { current_page: 1, last_page: 3, total: 50, per_page: 24 } });
        mockApi();
    });

    afterEach(() => {
        global.ResizeObserver = originalRO;
        vi.restoreAllMocks();
        window.history.replaceState(null, '', '/');
    });

    it('renders true-size cards, the total and pagination from the artworks endpoint', async () => {
        renderPage();

        expect(await screen.findByText('Uzun divar', {}, { timeout: 3000 })).toBeInTheDocument();
        expect(screen.getByText('50 əsər')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Növbəti' })).toBeInTheDocument();
        // one k for the list: the 180 cm work takes 44% of the 1296px container, the 40 cm card is raised to 155px
        const fields = screen.getAllByTestId('artwork-field');
        expect(fields[0]).toHaveStyle({ width: '570px' });
        expect(fields[1]).toHaveStyle({ width: '127px' });
    });

    it('writes a filter choice to the URL under the API parameter name, with replaceState, and re-fetches', async () => {
        const replace = vi.spyOn(window.history, 'replaceState');
        const push = vi.spyOn(window.history, 'pushState');
        renderPage();
        await screen.findByText('Uzun divar');

        await userEvent.click(screen.getByRole('button', { name: 'Fiqurativ' }));

        expect(window.location.search).toBe('?genre=fiqurativ');
        expect(replace).toHaveBeenCalledWith(null, '', '/artworks?genre=fiqurativ');
        expect(push).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Fiqurativ' })).toHaveAttribute('aria-pressed', 'true');
        await waitFor(() => expect(artworkUrls().some((url) => url.includes('genre=fiqurativ'))).toBe(true));
    });

    it('pushes a history entry for a page change, and keeps the filters', async () => {
        window.history.replaceState(null, '', '/artworks?status=available');
        const push = vi.spyOn(window.history, 'pushState');
        renderPage();
        await screen.findByText('Uzun divar');

        await userEvent.click(screen.getByRole('button', { name: 'Növbəti' }));

        expect(push).toHaveBeenCalledWith(null, '', '/artworks?status=available&page=2');
        await waitFor(() => expect(artworkUrls().some((url) => url.includes('page=2') && url.includes('status=available'))).toBe(true));
    });

    it('restores every filter from the URL it is opened with', async () => {
        window.history.replaceState(null, '', '/artworks?genre=abstraksiya&artist=1&size_min=100&status=available&sort=newest&page=2');
        renderPage();
        await screen.findByText('Uzun divar');

        const url = artworkUrls()[0];
        for (const part of ['genre=abstraksiya', 'artist=1', 'size_min=100', 'status=available', 'sort=newest', 'page=2']) expect(url).toContain(part);
        expect(screen.getByRole('button', { name: 'Abstraksiya' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Kamran Səfərli' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Mövcud əsərlər' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByLabelText('ən azı', { selector: 'input[name="size_min"]' })).toHaveValue(100);
        expect(screen.getByLabelText('Sıralama')).toHaveValue('newest');
    });

    it('follows the Back button (popstate) back to the previous filters', async () => {
        renderPage();
        await screen.findByText('Uzun divar');

        act(() => {
            window.history.pushState(null, '', '/artworks?genre=fiqurativ');
            window.dispatchEvent(new PopStateEvent('popstate'));
        });

        expect(screen.getByRole('button', { name: 'Fiqurativ' })).toHaveAttribute('aria-pressed', 'true');
        await waitFor(() => expect(artworkUrls().some((url) => url.includes('genre=fiqurativ'))).toBe(true));
    });

    it('drops invalid values from a hand-edited URL instead of sending them', async () => {
        window.history.replaceState(null, '', '/artworks?status=lost&size_min=-5&artist=abc&sort=cheapest&page=0');
        renderPage();
        await screen.findByText('Uzun divar');

        expect(artworkUrls()[0]).toBe('/api/v1/artworks?locale=az');
    });

    it('applies the size range on blur, as size_min / size_max', async () => {
        renderPage();
        await screen.findByText('Uzun divar');

        const min = screen.getByLabelText('ən azı', { selector: 'input[name="size_min"]' });
        await userEvent.type(min, '100');
        expect(window.location.search).toBe(''); // nothing sent while typing
        fireEvent.blur(min);

        expect(window.location.search).toBe('?size_min=100');
        await waitFor(() => expect(artworkUrls().some((url) => url.includes('size_min=100'))).toBe(true));
    });

    it('shows the active filter count in signal-ink and a clear link that resets the filters', async () => {
        window.history.replaceState(null, '', '/artworks?genre=abstraksiya&status=available&sort=newest');
        renderPage();
        await screen.findByText('Uzun divar');

        const badge = screen.getByTestId('active-filter-count');
        expect(badge).toHaveTextContent('2');
        expect(badge).toHaveClass('text-signal-ink');

        await userEvent.click(screen.getByRole('button', { name: 'Filtrləri təmizlə' }));
        expect(window.location.search).toBe('?sort=newest'); // sort is not a filter: it stays
        expect(screen.queryByTestId('active-filter-count')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Filtrləri təmizlə' })).not.toBeInTheDocument();
    });

    it('shows the empty state with a way to clear the filters', async () => {
        window.history.replaceState(null, '', '/artworks?genre=fiqurativ');
        artworksResponse = () => jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } });
        mockApi();
        renderPage();

        expect(await screen.findByText('Bu şərtlərə uyğun əsər yoxdur.')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Filtrləri təmizlə' }).length).toBeGreaterThan(0);
    });

    it('shows an error with a retry button that re-fetches', async () => {
        let calls = 0;
        artworksResponse = () => (++calls === 1 ? errorResponse(500) : jsonResponse({ data: [artwork('AN-1', 'Uzun divar')], meta: { current_page: 1, last_page: 1, total: 1 } }));
        mockApi();
        renderPage();

        const alert = await screen.findByRole('alert');
        expect(within(alert).getByText('Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.')).toHaveClass('text-signal-ink');
        await userEvent.click(within(alert).getByRole('button', { name: 'Yenidən cəhd et' }));

        expect(await screen.findByText('Uzun divar')).toBeInTheDocument();
        expect(calls).toBe(2);
    });

    it('marks the list aria-busy while loading, with a static skeleton', async () => {
        artworksResponse = () => new Promise(() => {});
        mockApi();
        renderPage();

        const list = screen.getByRole('region', { name: 'Əsərlər' });
        expect(list).toHaveAttribute('aria-busy', 'true');
        expect(list.querySelector('[aria-hidden="true"]').children).toHaveLength(6);
        expect(list.innerHTML).not.toMatch(/animate-/);
    });

    it('renders no grid while the container width is still 0', async () => {
        global.ResizeObserver = class {
            observe() {}
            disconnect() {}
        };
        renderPage();
        await waitFor(() => expect(artworkUrls()).toHaveLength(1));
        await waitFor(() => expect(screen.getByRole('region', { name: 'Əsərlər' })).toHaveAttribute('aria-busy', 'false'));

        expect(screen.queryByTestId('artwork-field')).not.toBeInTheDocument();
    });

    it('sets a static catalogue document title', async () => {
        renderPage();
        await waitFor(() => expect(document.title).toBe('Əsərlər — ArtNiyyətli'));
    });
});
