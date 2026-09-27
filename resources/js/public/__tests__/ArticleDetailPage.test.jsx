import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import ArticleDetailPage from '../pages/ArticleDetailPage.jsx';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

const article = (slug, title, extra = {}) => ({ slug, title, type: 'interview', short_text: 'Teaser.', content: 'Body text', published_at: '2026-01-05T10:00:00+00:00', media: [], video: null, ...extra });
const DETAIL = article('a', 'An Interview', { media: [{ type: 'image', url: 'https://example.test/cover.webp' }] });
const LIST = [DETAIL, article('b', 'Second'), article('c', 'Third'), article('d', 'Fourth')];

let detail;
let list;
function mockApi() {
    global.fetch = vi.fn((url) => {
        if (url.startsWith('/api/v1/articles?')) return Promise.resolve(jsonResponse(200, { data: list }));
        return Promise.resolve(typeof detail === 'function' ? detail() : jsonResponse(200, { data: detail }));
    });
}
const renderPage = (extra = null) => render(<LocaleProvider>{extra}<ArticleDetailPage params={{ slug: 'a' }} /></LocaleProvider>);

describe('ArticleDetailPage', () => {
    beforeEach(() => {
        localStorage.removeItem('public-locale');
        detail = DETAIL;
        list = LIST;
        mockApi();
    });

    afterEach(() => {
        document.head.querySelectorAll('meta[property^="og:"], meta[name="description"]').forEach((m) => m.remove());
    });

    it('renders the content as plain text, not interpreted as HTML', async () => {
        detail = article('a', 'An Interview', { content: '<b>not bold, literal text</b><script>alert(1)</script>' });
        mockApi();
        renderPage();

        expect(await screen.findByText('<b>not bold, literal text</b><script>alert(1)</script>')).toHaveClass('font-editorial', 'text-reading', 'whitespace-pre-line');
        expect(document.querySelector('article b, article script')).not.toBeInTheDocument();
    });

    it('shows the date and type above a Spectral heading, and the text in a prose column', async () => {
        renderPage();

        const heading = await screen.findByRole('heading', { level: 1, name: 'An Interview' });
        expect(heading).toHaveClass('font-editorial', 'text-heading');
        const header = heading.closest('header');
        expect(within(header).getByText('5 yanvar 2026 · Müsahibə')).toHaveClass('text-caption', 'text-ink-muted');
        expect(header.firstElementChild).not.toBe(heading); // the date line comes first
        expect(heading.closest('article')).toHaveClass('max-w-prose');
    });

    it('shows the cover across the column, without a shadow', async () => {
        renderPage();

        const cover = await screen.findByRole('img', { name: 'An Interview' });
        expect(cover).toHaveAttribute('src', 'https://example.test/cover.webp');
        expect(cover.parentElement).toHaveClass('w-full', 'border', 'border-line');
        expect(cover.parentElement.className).not.toMatch(/shadow/);
    });

    it('ends with up to three other articles, never the current one', async () => {
        renderPage();

        const section = (await screen.findByRole('heading', { name: 'Digər məqalələr' })).closest('section');
        const links = within(section).getAllByRole('link');
        expect(links.map((a) => a.getAttribute('href'))).toEqual(['/articles/b', '/articles/c', '/articles/d']);
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('per_page=4'), expect.anything());
    });

    it('leaves out the cover, the video and the "more" block when there are none', async () => {
        detail = article('a', 'An Interview');
        list = [detail];
        mockApi();
        renderPage();

        await screen.findByText('Body text');
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(document.querySelector('iframe')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Digər məqalələr' })).not.toBeInTheDocument();
    });

    it('renders a YouTube embed from the video block, separate from media', async () => {
        detail = article('a', 'An Interview', { type: 'video_project', video: { id: 'dQw4w9WgXcQ', embed_url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' } });
        mockApi();
        renderPage();

        const iframe = await screen.findByTitle('An Interview');
        expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    it('shows "Məqalə tapılmadı" with a link back to the journal for an unpublished or unknown slug', async () => {
        detail = () => jsonResponse(404, { message: '' });
        mockApi();
        renderPage();

        expect(await screen.findByRole('heading', { name: 'Məqalə tapılmadı' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Jurnala qayıt' })).toHaveAttribute('href', '/articles');
    });

    it('shows a static skeleton while loading, and an error with a retry', async () => {
        let calls = 0;
        detail = () => (++calls === 1 ? jsonResponse(500, {}) : jsonResponse(200, { data: DETAIL }));
        mockApi();
        renderPage();

        expect(screen.getByTestId('article-skeleton')).toHaveAttribute('aria-busy', 'true');
        await userEvent.click(await screen.findByRole('button', { name: 'Yenidən cəhd et' }));
        expect(await screen.findByText('Body text')).toBeInTheDocument();
    });

    it('uses no Signal, rounded or neutral classes', async () => {
        const { container } = renderPage();
        await screen.findByText('Body text');

        expect(container.innerHTML).not.toMatch(/signal|rounded|neutral-/);
    });

    it('sets document.title from the article title and the cover as og:image', async () => {
        renderPage();

        // The title may still be the previous test's (same article); the og:image tag is removed after each test.
        await waitFor(() => expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute('content', 'https://example.test/cover.webp'));
        expect(document.title).toBe('An Interview — ArtNiyyətli');
    });

    it('does not crash when the locale changes after the page has already loaded', async () => {
        renderPage(<LocaleSwitcher />);
        await screen.findByText('Body text');

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await waitFor(() => expect(screen.getAllByText('Body text').length).toBeGreaterThan(0));
    });
});
