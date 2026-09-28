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

    it('renders each article as one link: date and type, title in Spectral, short text, cover', async () => {
        renderPage();

        const link = await screen.findByRole('link', { name: /An Interview/ });
        expect(link).toHaveAttribute('href', '/articles/a');
        expect(within(link).getByText('5 yanvar 2026 · Müsahibə')).toHaveClass('text-caption', 'text-ink-muted');
        expect(within(link).getByText('An Interview')).toHaveClass('font-editorial');
        expect(within(link).getByText('Teaser.')).toBeInTheDocument();
        expect(within(link).getByRole('img', { name: 'An Interview' })).toHaveAttribute('src', 'https://example.test/cover.webp');
        expect(screen.getByRole('heading', { level: 1, name: 'Jurnal' })).toHaveClass('text-display');
    });

    it('leaves out a missing short text and a missing cover, without an empty box', async () => {
        renderPage();

        const link = await screen.findByRole('link', { name: /Some News/ });
        expect(within(link).getByText('5 yanvar 2026 · Xəbər')).toBeInTheDocument();
        expect(within(link).queryByRole('img')).not.toBeInTheDocument();
        expect(link.querySelector('.aspect-\\[4\\/3\\]')).toBeNull();
        expect(link.className).not.toMatch(/grid-cols/);
    });

    it('shows no label for an unknown article type, not a dictionary path', async () => {
        respond = () => jsonResponse({ data: [article('c', 'Odd', { type: 'podcast' })] });
        renderPage();

        const link = await screen.findByRole('link', { name: /Odd/ });
        expect(within(link).getByText('5 yanvar 2026')).toBeInTheDocument();
        expect(link.textContent).not.toMatch(/articles\./);
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

    it('uses no Signal, rounded or neutral classes', async () => {
        const { container } = renderPage();
        await screen.findByText('An Interview');

        expect(container.innerHTML).not.toMatch(/signal|rounded|neutral-|shadow/);
    });

    it('sets a static articles document title', async () => {
        renderPage();

        await waitFor(() => expect(document.title).toBe('Jurnal | ArtNiyyətli'));
    });
});
