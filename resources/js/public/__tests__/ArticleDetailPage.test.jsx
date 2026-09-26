import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import ArticleDetailPage from '../pages/ArticleDetailPage.jsx';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

describe('ArticleDetailPage', () => {
    it('renders the content as plain text, not interpreted as HTML', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, {
            data: { slug: 'a', title: 'An Interview', type: 'interview', short_text: 'Teaser.', content: '<b>not bold, literal text</b>', published_at: '2026-01-05T10:00:00+00:00', media: [] },
        }));

        render(<LocaleProvider><ArticleDetailPage params={{ slug: 'a' }} /></LocaleProvider>);

        expect(await screen.findByText('<b>not bold, literal text</b>')).toBeInTheDocument();
        expect(document.querySelector('b')).not.toBeInTheDocument();
    });

    it('renders not-found for an unpublished/unknown slug', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(404, { message: 'Not found.' }));
        render(<LocaleProvider><ArticleDetailPage params={{ slug: 'nope' }} /></LocaleProvider>);
        expect(await screen.findByText('Səhifə tapılmadı')).toBeInTheDocument();
    });

    it('sets document.title from the article title', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, {
            data: { slug: 'a', title: 'An Interview', type: 'interview', short_text: 'Teaser.', content: '...', published_at: '2026-01-05T10:00:00+00:00', media: [] },
        }));

        render(<LocaleProvider><ArticleDetailPage params={{ slug: 'a' }} /></LocaleProvider>);

        await waitFor(() => expect(document.title).toBe('An Interview — ArtNiyyətli'));
    });

    it('does not crash when the locale changes after the page has already loaded', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, {
            data: { slug: 'a', title: 'An Interview', type: 'interview', short_text: 'Teaser.', content: '...', published_at: '2026-01-05T10:00:00+00:00', media: [] },
        }));

        render(<LocaleProvider><LocaleSwitcher /><ArticleDetailPage params={{ slug: 'a' }} /></LocaleProvider>);

        await screen.findByText('An Interview');

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await waitFor(() => expect(screen.getAllByText('An Interview').length).toBeGreaterThan(0));
    });

    it('does not render a YouTube embed when video is null', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, {
            data: { slug: 'a', title: 'An Interview', type: 'interview', short_text: 'Teaser.', content: 'Body text', published_at: '2026-01-05T10:00:00+00:00', media: [], video: null },
        }));

        render(<LocaleProvider><ArticleDetailPage params={{ slug: 'a' }} /></LocaleProvider>);

        await screen.findByText('Body text');
        expect(screen.queryByTitle('An Interview')).not.toBeInTheDocument();
        expect(document.querySelector('iframe')).not.toBeInTheDocument();
    });

    it('renders a YouTube embed from the video block, separate from media', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, {
            data: {
                slug: 'a', title: 'An Interview', type: 'video_project', short_text: 'Teaser.', content: 'Body text', published_at: '2026-01-05T10:00:00+00:00', media: [],
                video: { id: 'dQw4w9WgXcQ', embed_url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' },
            },
        }));

        render(<LocaleProvider><ArticleDetailPage params={{ slug: 'a' }} /></LocaleProvider>);

        const iframe = await screen.findByTitle('An Interview');
        expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });
});
