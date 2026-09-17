import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
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
});
