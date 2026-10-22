import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import ArticlesPage from '../pages/ArticlesPage.jsx';

function jsonResponse(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

const article = (slug, title, extra = {}) => ({ slug, title, type: 'interview', short_text: 'Teaser.', content: '...', published_at: '2026-01-05T10:00:00+00:00', media: [], video: null, ...extra });
const INTERVIEW = article('a', 'An Interview', { media: [{ type: 'image', url: 'https://example.test/cover.webp' }] });
const NEWS = article('b', 'Some News', { type: 'news', short_text: null });

let respond;
function mockApi() {
    global.fetch = vi.fn((url) => Promise.resolve(respond(url)));
}
const renderPage = () => render(<LocaleProvider><ArticlesPage /></LocaleProvider>);

describe('ArticlesPage', () => {
    beforeEach(() => {
        localStorage.removeItem('public-locale');
        respond = () => jsonResponse({ data: [INTERVIEW, NEWS], meta: { current_page: 1, last_page: 1, total: 2 } });
        mockApi();
    });

    it('shows the newest article as the large card: the 560px cover, "TYPE · date", the 50px title, the text and "Oxu"', async () => {
        renderPage();

        const lead = await screen.findByTestId('lead-article');
        expect(lead).toHaveClass('md:grid-cols-[1.25fr_1fr]');
        expect(lead.querySelector('img')).toHaveAttribute('src', 'https://example.test/cover.webp');
        expect(lead.querySelector('img').parentElement).toHaveClass('md:h-[560px]', 'shadow-present');
        expect(within(lead).getByText('MÜSAHİBƏ · 5 yanvar 2026')).toHaveClass('text-label', 'font-semibold', 'text-wine');
        const title = within(lead).getByRole('heading', { level: 2, name: 'An Interview' });
        expect(title).toHaveClass('text-[clamp(34px,3.5vw,50px)]', 'font-bold', 'text-wine');
        expect(within(title).getByRole('link')).toHaveAttribute('href', '/articles/a');
        expect(within(lead).getByText('Teaser.')).toHaveClass('font-editorial');
        expect(within(lead).getByRole('link', { name: 'Oxu' })).toHaveAttribute('href', '/articles/a');
        expect(screen.getByRole('heading', { level: 1, name: 'Sənət, ölçü və kolleksiya' })).toHaveClass('text-banner');
    });

    it('puts the other articles in a four-column grid of card links', async () => {
        renderPage();

        const grid = await screen.findByTestId('article-grid');
        expect(grid).toHaveClass('lg:grid-cols-4');
        const link = within(grid).getByRole('link', { name: /Some News/ });
        expect(link).toHaveAttribute('href', '/articles/b');
        expect(within(link).getByText('Some News')).toHaveClass('text-[22px]', 'font-semibold', 'text-wine');
    });

    it('offers type chips ("Hamısı" and each type the articles carry) that filter the loaded list', async () => {
        renderPage();

        const chips = await screen.findByTestId('article-types');
        expect(within(chips).getAllByRole('button').map((b) => b.textContent)).toEqual(['Hamısı', 'Müsahibə', 'Xəbər']);
        expect(within(chips).getByRole('button', { name: 'Hamısı' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('2 məqalə')).toBeInTheDocument();

        await userEvent.click(within(chips).getByRole('button', { name: 'Xəbər' }));
        expect(within(chips).getByRole('button', { name: 'Xəbər' })).toHaveAttribute('aria-pressed', 'true');
        expect(within(chips).getByRole('button', { name: 'Xəbər' })).toHaveClass('bg-wine', 'text-surface');
        expect(within(screen.getByTestId('lead-article')).getByText('Some News')).toBeInTheDocument();
        expect(screen.queryByText('An Interview')).not.toBeInTheDocument();
    });

    it('leaves out a missing short text and a missing cover, without an empty box', async () => {
        renderPage();

        const link = within(await screen.findByTestId('article-grid')).getByRole('link', { name: /Some News/ });
        expect(within(link).getByText('XƏBƏR · 5 yanvar 2026')).toBeInTheDocument();
        expect(within(link).queryByRole('img')).not.toBeInTheDocument();
        expect(link.querySelector('.aspect-\\[4\\/3\\]')).toBeNull();
        expect(link.className).not.toMatch(/grid-cols/);
    });

    it('shows no label for an unknown article type, not a dictionary path', async () => {
        respond = () => jsonResponse({ data: [article('c', 'Odd', { type: 'podcast' })] });
        renderPage();

        const lead = await screen.findByTestId('lead-article');
        expect(within(lead).getByText('5 yanvar 2026')).toBeInTheDocument();
        expect(lead.textContent).not.toMatch(/articles\./);
        expect(screen.queryByTestId('article-types')).not.toBeInTheDocument();
    });

    it('pages with the shared pager', async () => {
        respond = (url) => jsonResponse({ data: [url.includes('page=2') ? NEWS : INTERVIEW], meta: { current_page: url.includes('page=2') ? 2 : 1, last_page: 2, total: 2 } });
        renderPage();
        await screen.findByText('An Interview');

        await userEvent.click(screen.getByRole('button', { name: 'Növbəti' }));
        expect(await screen.findByText('Some News')).toBeInTheDocument();
    });

    it('shows a static skeleton while loading, and a short muted text when there are no articles', async () => {
        respond = () => jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } });
        renderPage();

        expect(screen.getByTestId('articles-skeleton')).toHaveAttribute('aria-busy', 'true');
        expect(await screen.findByText('Hələ məqalə yoxdur.')).toHaveClass('text-ink-muted');
    });

    it('shows an error with a retry', async () => {
        let calls = 0;
        respond = () => (++calls === 1 ? jsonResponse({}, 500) : jsonResponse({ data: [INTERVIEW] }));
        renderPage();

        await userEvent.click(await screen.findByRole('button', { name: 'Yenidən cəhd et' }));
        expect(await screen.findByText('An Interview')).toBeInTheDocument();
    });

    it('uses no Signal, rounded or neutral classes; the only shadow is the lead card\'s presentation shadow', async () => {
        const { container } = renderPage();
        await screen.findByText('An Interview');

        expect(container.innerHTML).not.toMatch(/signal|rounded|neutral-/);
        expect(container.innerHTML.match(/shadow-[a-z]+/g)).toEqual(['shadow-present']);
    });

    it('sets a static articles document title', async () => {
        renderPage();

        await waitFor(() => expect(document.title).toBe('Jurnal | ArtNiyyətli'));
    });
});
