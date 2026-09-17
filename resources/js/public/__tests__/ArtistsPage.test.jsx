import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import ArtistsPage from '../pages/ArtistsPage.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

describe('ArtistsPage', () => {
    it('renders a card per artist with no pagination controls', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 5, slug: 'aygun-mammadova', first_name: 'Aygün', last_name: 'Məmmədova', direction: 'Modern', portrait_url: null }] }));

        render(<LocaleProvider><ArtistsPage /></LocaleProvider>);

        expect(await screen.findByText('Aygün Məmmədova')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Növbəti' })).not.toBeInTheDocument();
    });

    it('renders EmptyState when there are no artists', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
        render(<LocaleProvider><ArtistsPage /></LocaleProvider>);
        expect(await screen.findByText('Heç nə tapılmadı.')).toBeInTheDocument();
    });
});
