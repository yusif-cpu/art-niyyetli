import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import HomePage from '../pages/HomePage.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

const homepageData = {
    page: { title: 'Ana səhifə', sections: [{ key: 'hero', heading: 'ArtNiyyətli', body: 'Müasir Azərbaycan sənətini kəşf edin.', sort_order: 0, image_url: null }] },
    stats: { artists: 5, artworks: 12, exhibitions: 2 },
    wall: [{ inventory_code: 'AN-1', title: 'Wall Piece', artist: { id: 1, name: 'A' }, image_url: null, genre: { slug: 'painting', name: 'Painting' }, medium: { slug: 'oil', name: 'Oil' }, price: 100, currency: 'AZN', availability: 'available', width_cm: 10, height_cm: 10 }],
    featured: [{ inventory_code: 'AN-2', title: 'Featured Piece', artist: { id: 2, name: 'B' }, image_url: null, genre: { slug: 'painting', name: 'Painting' }, medium: { slug: 'oil', name: 'Oil' }, price: null, currency: null, availability: 'available', width_cm: 20, height_cm: 20 }],
    artists: [{ id: 1, slug: 'a', first_name: 'A', last_name: 'B', direction: 'Modern', portrait_url: null }],
    exhibition: { slug: 'winter-show', title: 'Winter Show', status: 'current', start_date: '2026-01-10', end_date: '2026-02-10', venue: 'Main Gallery', short_text: '...', full_text: '...', artists: [], artworks: [], media: [] },
    faqs: [{ id: 1, question: 'Necə sifariş verə bilərəm?', answer: 'Sorğu göndərin.', sort_order: 0 }],
    social_links: [],
};

describe('HomePage', () => {
    it('shows loading, then renders hero, wall, featured, artists, exhibition banner, and FAQs', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: homepageData }));

        render(<LocaleProvider><HomePage /></LocaleProvider>);

        expect(screen.getByText('Yüklənir...')).toBeInTheDocument();

        expect(await screen.findByText('ArtNiyyətli')).toBeInTheDocument();
        expect(screen.getByText('Wall Piece')).toBeInTheDocument();
        expect(screen.getByText('Featured Piece')).toBeInTheDocument();
        expect(screen.getByText('A B')).toBeInTheDocument();
        expect(screen.getByText('Winter Show')).toBeInTheDocument();
        expect(screen.getByText('Necə sifariş verə bilərəm?')).toBeInTheDocument();
    });

    it('renders without crashing when page and exhibition are null', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: { ...homepageData, page: null, exhibition: null } }));

        render(<LocaleProvider><HomePage /></LocaleProvider>);

        expect(await screen.findByText('Wall Piece')).toBeInTheDocument();
        expect(screen.queryByText('Winter Show')).not.toBeInTheDocument();
    });

    it('renders ErrorState on a failed fetch', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, headers: { get: () => 'application/json' }, json: async () => ({ message: 'Server error.' }) });

        render(<LocaleProvider><HomePage /></LocaleProvider>);

        expect(await screen.findByText('Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.')).toBeInTheDocument();
    });
});
