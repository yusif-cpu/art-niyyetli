import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import ArticlesPage from '../pages/ArticlesPage.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

describe('ArticlesPage', () => {
    it('renders a card per article with pagination', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({
            data: [{ slug: 'a', title: 'An Interview', type: 'interview', short_text: 'Teaser.', content: '...', published_at: '2026-01-05T10:00:00+00:00', media: [] }],
            meta: { current_page: 1, last_page: 2, total: 20 },
        }));

        render(<LocaleProvider><ArticlesPage /></LocaleProvider>);

        expect(await screen.findByText('An Interview')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Növbəti' })).toBeInTheDocument();
    });
});
