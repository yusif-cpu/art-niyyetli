import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import ExhibitionsPage from '../pages/ExhibitionsPage.jsx';

function jsonResponse(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

const show = (slug, title, status, extra = {}) => ({ slug, title, status, type: 'exhibition', start_date: '2026-01-10', end_date: '2026-02-10', venue: 'Main Gallery', media: [], artists: [], artworks: [], ...extra });
const page = (data, current = 1, last = 1) => ({ data, meta: { current_page: current, last_page: last, total: data.length } });

// One response per `filter`; the archive answers per page.
let groups;
function mockApi() {
    global.fetch = vi.fn((url) => {
        const filter = new URL(url, 'http://x').searchParams.get('filter');
        const pageNo = Number(new URL(url, 'http://x').searchParams.get('page') ?? 1);
        const body = typeof groups[filter] === 'function' ? groups[filter](pageNo) : groups[filter];
        return Promise.resolve(body instanceof Error ? jsonResponse({}, 500) : jsonResponse(body));
    });
}
const renderPage = () => render(<LocaleProvider><ExhibitionsPage /></LocaleProvider>);

describe('ExhibitionsPage', () => {
    beforeEach(() => {
        localStorage.removeItem('public-locale');
        groups = {
            current: page([show('winter-show-2026', 'Winter Show 2026', 'current')]),
            upcoming: page([show('spring', 'Spring Show', 'upcoming', { start_date: '2027-04-01', end_date: '2027-04-30' })]),
            archive: page([show('old', 'Old Show', 'past', { venue: null })]),
        };
        mockApi();
    });

    it('shows three groups — current, upcoming, archive — in that order, each with a heading', async () => {
        renderPage();

        const headings = await screen.findAllByRole('heading', { level: 2 });
        expect(headings.map((h) => h.textContent)).toEqual(['Cari sərgilər', 'Gələcək sərgilər', 'Arxiv']);
        expect(screen.getByRole('heading', { level: 1, name: 'Cari və keçmiş sərgilər' })).toHaveClass('text-banner');
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('filter=current'), expect.anything());
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('filter=upcoming'), expect.anything());
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('filter=archive'), expect.anything());
    });

    it('renders each exhibition as one card link: "dates · venue", the title in 600 wine, the cover when there is one', async () => {
        groups.current = page([show('winter-show-2026', 'Winter Show 2026', 'current', { short_text: 'Short.', media: [{ type: 'photo', url: 'https://example.test/c.webp' }] })]);
        renderPage();

        const card = await screen.findByRole('link', { name: /Winter Show 2026/ });
        expect(card).toHaveAttribute('href', '/exhibitions/winter-show-2026');
        expect(within(card).getByText('10 yanvar – 10 fevral 2026 · Main Gallery')).toHaveClass('text-meta', 'text-ink-muted');
        expect(within(card).getByText('Winter Show 2026')).toHaveClass('font-semibold', 'text-wine');
        expect(within(card).getByText('Short.')).toHaveClass('font-editorial');
        expect(card.querySelector('img')).toHaveAttribute('src', 'https://example.test/c.webp');
        expect(card.querySelector('img').parentElement).toHaveClass('md:h-[340px]');
    });

    it('uses no Signal, "current" included', async () => {
        const { container } = renderPage();
        await screen.findByText('Winter Show 2026');

        expect(container.innerHTML).not.toMatch(/signal/);
        expect(container.innerHTML).not.toMatch(/rounded|neutral-/);
    });

    it('leaves an empty group out', async () => {
        groups.upcoming = page([]);
        renderPage();
        await screen.findByText('Winter Show 2026');

        expect(screen.queryByRole('heading', { name: 'Gələcək sərgilər' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Arxiv' })).toBeInTheDocument();
    });

    it('leaves out a missing venue and a missing cover without an empty box', async () => {
        renderPage();

        const card = await screen.findByRole('link', { name: /Old Show/ });
        expect(within(card).getByText('10 yanvar – 10 fevral 2026')).toBeInTheDocument();
        expect(card.querySelector('img')).toBeNull();
        expect([...card.children].filter((c) => c.textContent.trim() === '')).toHaveLength(0);
    });

    it('pages the archive', async () => {
        groups.archive = (n) => page([show(`old-${n}`, `Old Show ${n}`, 'past')], n, 2);
        renderPage();
        await screen.findByText('Old Show 1');

        await userEvent.click(screen.getByRole('button', { name: 'Növbəti' }));
        expect(await screen.findByText('Old Show 2')).toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/filter=archive.*page=2|page=2.*filter=archive/), expect.anything());
        expect(screen.getByText('Winter Show 2026')).toBeInTheDocument();
    });

    it('shows a static skeleton while loading, and a short muted text when there is nothing', async () => {
        groups = { current: page([]), upcoming: page([]), archive: page([]) };
        renderPage();

        expect(screen.getByTestId('exhibitions-skeleton')).toHaveAttribute('aria-busy', 'true');
        expect(await screen.findByText('Hələ sərgi yoxdur.')).toHaveClass('text-ink-muted');
    });

    it('shows an error with a retry', async () => {
        let calls = 0;
        groups.current = () => (++calls === 1 ? new Error('x') : page([show('winter-show-2026', 'Winter Show 2026', 'current')]));
        renderPage();

        await userEvent.click(await screen.findByRole('button', { name: 'Yenidən cəhd et' }));
        expect(await screen.findByText('Winter Show 2026')).toBeInTheDocument();
    });

    it('sets a static exhibitions document title', async () => {
        renderPage();

        await waitFor(() => expect(document.title).toBe('Sərgilər | ArtNiyyətli'));
    });
});
