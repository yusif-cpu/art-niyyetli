import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import ExhibitionDetailPage from '../pages/ExhibitionDetailPage.jsx';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

const detail = {
    slug: 'winter-show-2026', title: 'Winter Show 2026', type: 'exhibition', status: 'current',
    start_date: '2026-01-10', end_date: '2026-02-10', venue: 'Main Gallery', short_text: 'Short.', full_text: 'Full concept text.',
    artists: [{ id: 5, slug: 'aygun-mammadova', name: 'Aygün Məmmədova' }],
    artworks: [{ inventory_code: 'AN-1', title: 'A Piece', artist: { id: 5, name: 'Aygün Məmmədova' }, image_url: null, genre: { slug: 'p', name: 'P' }, medium: { slug: 'o', name: 'O' }, price: 100, currency: 'AZN', availability: 'available', width_cm: 1, height_cm: 1 }],
    media: [{ type: 'photo', url: 'https://example.test/ex.webp' }],
};

describe('ExhibitionDetailPage', () => {
    it('renders concept text, participating artists linking to their profiles, and artworks', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: detail }));

        render(<LocaleProvider><ExhibitionDetailPage params={{ slug: 'winter-show-2026' }} /></LocaleProvider>);

        expect(await screen.findByText('Full concept text.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Aygün Məmmədova' })).toHaveAttribute('href', '/artists/aygun-mammadova');
        expect(screen.getByText('A Piece')).toBeInTheDocument();
    });
});
