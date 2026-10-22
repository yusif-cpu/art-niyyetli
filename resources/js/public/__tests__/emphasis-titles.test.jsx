import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import ExhibitionCard from '../components/ExhibitionCard.jsx';
import ArticleCard from '../components/ArticleCard.jsx';
import ExhibitionDetailPage from '../pages/ExhibitionDetailPage.jsx';
import ArticleDetailPage from '../pages/ArticleDetailPage.jsx';
import ArticlesPage from '../pages/ArticlesPage.jsx';
import HomePage from '../pages/HomePage.jsx';

// Exhibition and article titles may carry one `*word*` (the admin's italic emphasis). Visible titles show it as an
// <em>; every plain-text place — the document title, meta and OG tags, alt text, the hero's show line — shows the
// text without the marks. No asterisk anywhere.

function jsonResponse(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

const SHOW = {
    slug: 'ilk-satis', title: 'İlk satış *sərgisi*', type: 'exhibition', status: 'current', start_date: '2026-10-15', end_date: '2026-11-30',
    venue: 'Bakı', short_text: 'Dörd rəssamın altı əsəri.', full_text: 'Mətn.', artists: [], artworks: [],
    media: [{ type: 'photo', url: 'https://example.test/cover.webp' }], video: null,
};
const ARTICLE = {
    slug: 'isiq', title: 'Emalatxanada: *işıq* haqqında söhbət', type: 'interview', short_text: 'Qısa.', content: 'Bir abzas.',
    published_at: '2026-10-22T09:00:00+04:00', media: [{ url: 'https://example.test/a.webp' }], video: null,
};

const head = () => [
    document.title,
    ...[...document.head.querySelectorAll('meta')].map((m) => m.getAttribute('content') ?? ''),
].join('\n');

describe('emphasis in exhibition and article titles', () => {
    const originalRO = global.ResizeObserver;

    beforeEach(() => {
        localStorage.removeItem('public-locale');
        global.ResizeObserver = class {
            constructor(cb) { this.cb = cb; }
            observe() { this.cb([{ contentRect: { width: 1296 } }]); }
            disconnect() {}
        };
    });

    afterEach(() => {
        global.ResizeObserver = originalRO;
        document.head.querySelectorAll('meta').forEach((m) => m.remove());
    });

    it('the exhibition and article cards show the word as an <em>, and the alt text without marks', () => {
        const { container } = render(
            <LocaleProvider>
                <ExhibitionCard exhibition={SHOW} />
                <ArticleCard article={ARTICLE} />
            </LocaleProvider>
        );

        expect(screen.getByText('sərgisi').tagName).toBe('EM');
        expect(screen.getByText('işıq').tagName).toBe('EM');
        expect(screen.getByRole('img', { name: 'İlk satış sərgisi' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Emalatxanada: işıq haqqında söhbət' })).toBeInTheDocument();
        expect(container.textContent).not.toContain('*');
        expect(container.innerHTML).not.toContain('*');
    });

    it('the exhibition page: the band\'s h1 with the <em>; the document title, meta and OG tags plain', async () => {
        global.fetch = vi.fn((url) => Promise.resolve(jsonResponse({ data: url.includes('filter=archive') || url.startsWith('/api/v1/artists') ? [] : SHOW })));
        const { container } = render(<LocaleProvider><ExhibitionDetailPage params={{ slug: 'ilk-satis' }} /></LocaleProvider>);

        const h1 = await screen.findByRole('heading', { level: 1, name: 'İlk satış sərgisi' });
        expect(within(h1).getByText('sərgisi').tagName).toBe('EM');
        await waitFor(() => expect(document.title).toBe('İlk satış sərgisi | ArtNiyyətli'));
        expect(document.head.querySelector('meta[property="og:title"]')).toHaveAttribute('content', 'İlk satış sərgisi | ArtNiyyətli');
        expect(head()).not.toContain('*');
        expect(container.innerHTML).not.toContain('*');
    });

    it('the article page and the journal: the <em> in the h1 and the lead card, plain in the head', async () => {
        global.fetch = vi.fn((url) => Promise.resolve(jsonResponse(url.startsWith('/api/v1/articles?') ? { data: [ARTICLE], meta: { current_page: 1, last_page: 1, total: 1 } } : { data: ARTICLE })));
        const { container, unmount } = render(<LocaleProvider><ArticleDetailPage params={{ slug: 'isiq' }} /></LocaleProvider>);

        const h1 = await screen.findByRole('heading', { level: 1, name: 'Emalatxanada: işıq haqqında söhbət' });
        expect(within(h1).getByText('işıq').tagName).toBe('EM');
        await waitFor(() => expect(document.title).toBe('Emalatxanada: işıq haqqında söhbət | ArtNiyyətli'));
        expect(head()).not.toContain('*');
        expect(container.innerHTML).not.toContain('*');
        unmount();

        const journal = render(<LocaleProvider><ArticlesPage /></LocaleProvider>);
        const lead = await screen.findByTestId('lead-article');
        expect(within(lead).getByText('işıq').tagName).toBe('EM');
        expect(journal.container.innerHTML).not.toContain('*');
    });

    it('the home page: the show\'s h2 with the <em>, the hero line and the alt text plain', async () => {
        const homepage = {
            page: { sections: [{ key: 'hero', heading: 'Sənəti *həqiqi* ölçüsündə görün.', body: 'Alt sətir.', sort_order: 0, image_url: null }] },
            stats: { artworks: 12, artists: 4 }, featured: [], artists: [], wall: [],
            exhibitions: { current: [SHOW], upcoming: [] },
        };
        global.fetch = vi.fn((url) => Promise.resolve(jsonResponse(url.startsWith('/api/v1/articles') ? { data: [ARTICLE], meta: { total: 1 } } : { data: homepage })));
        const { container } = render(<LocaleProvider><HomePage /></LocaleProvider>);

        const block = await screen.findByTestId('home-current-show');
        expect(within(within(block).getByRole('heading', { level: 2 })).getByText('sərgisi').tagName).toBe('EM');
        expect(screen.getByTestId('home-hero-line')).toHaveTextContent('Cari sərgi · İlk satış sərgisi · 15 oktyabr – 30 noyabr');
        expect(within(block).getByRole('img')).toHaveAttribute('alt', 'İlk satış sərgisi');
        await waitFor(() => expect(document.title).toBe('Sənəti həqiqi ölçüsündə görün. | ArtNiyyətli'));
        expect(container.innerHTML).not.toContain('*');
        expect(head()).not.toContain('*');
    });
});
