import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
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

    it('renders both current and upcoming exhibitions from the single homepage response', async () => {
        const ex = (slug, title, status) => ({ ...homepageData.exhibition, slug, title, status });
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({
            data: {
                ...homepageData,
                exhibition: ex('now', 'Now Show', 'current'),
                exhibitions: { current: [ex('now', 'Now Show', 'current')], upcoming: [ex('soon', 'Soon Show', 'upcoming'), ex('later', 'Later Show', 'upcoming')] },
            },
        }));

        render(<LocaleProvider><HomePage /></LocaleProvider>);

        expect(await screen.findByText('Now Show')).toBeInTheDocument();
        expect(screen.getByText('Soon Show')).toBeInTheDocument();
        expect(screen.getByText('Later Show')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Cari sərgilər' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Gələcək sərgilər' })).toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledTimes(1); // no second request for the upcoming list
    });

    it('omits the heading of an empty exhibitions group', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({
            data: { ...homepageData, exhibitions: { current: [], upcoming: [{ ...homepageData.exhibition, slug: 'soon', title: 'Soon Show', status: 'upcoming' }] } },
        }));

        render(<LocaleProvider><HomePage /></LocaleProvider>);

        expect(await screen.findByText('Soon Show')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Cari sərgilər' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Gələcək sərgilər' })).toBeInTheDocument();
    });

    it('falls back to the single exhibition for a response without the exhibitions lists', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: homepageData }));

        render(<LocaleProvider><HomePage /></LocaleProvider>);

        expect(await screen.findByText('Winter Show')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Cari sərgilər' })).not.toBeInTheDocument();
    });

    it('renders no exhibition section when both lists are empty', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: { ...homepageData, exhibition: null, exhibitions: { current: [], upcoming: [] } } }));

        render(<LocaleProvider><HomePage /></LocaleProvider>);

        await screen.findByText('Wall Piece');
        expect(screen.queryByText('Winter Show')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Gələcək sərgilər' })).not.toBeInTheDocument();
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

    it('sets document.title from the hero section heading', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({
            data: {
                page: { sections: [{ key: 'hero', heading: 'ArtNiyyətli', body: 'Discover Azerbaijani art.', sort_order: 0, image_url: null }] },
                stats: { artists: 0, artworks: 0, exhibitions: 0 }, wall: [], featured: [], artists: [], exhibition: null, faqs: [], social_links: [],
            },
        }));

        render(<LocaleProvider><HomePage /></LocaleProvider>);

        await waitFor(() => expect(document.title).toBe('ArtNiyyətli — ArtNiyyətli'));
    });

    it('does not crash when the locale changes after the page has already loaded', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: homepageData }));

        render(<LocaleProvider><LocaleSwitcher /><HomePage /></LocaleProvider>);

        await screen.findByText('Wall Piece');

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await waitFor(() => expect(screen.getAllByText('ArtNiyyətli').length).toBeGreaterThan(0));
    });

    describe('page sections are resolved by key', () => {
        const empty = { stats: { artists: 0, artworks: 0, exhibitions: 0 }, wall: [], featured: [], artists: [], exhibition: null, faqs: [], social_links: [] };
        const section = (key, heading, sort_order = 0) => ({ key, heading, body: `${heading} body`, sort_order, image_url: null });

        function renderWith(sections) {
            global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: { ...empty, page: { title: 'Ana səhifə', sections } } }));
            render(<LocaleProvider><HomePage /></LocaleProvider>);
        }

        it('uses the hero even when it is not the first section, for the h1, title and description', async () => {
            renderWith([section('steps', 'How it works'), section('hero', 'Real Hero', 1)]);

            expect(await screen.findByRole('heading', { level: 1, name: 'Real Hero' })).toBeInTheDocument();
            expect(screen.getByRole('heading', { level: 2, name: 'How it works' })).toBeInTheDocument();
            await waitFor(() => expect(document.title).toBe('Real Hero — ArtNiyyətli'));
        });

        it('renders steps and cta by key and ignores unknown keys', async () => {
            renderWith([section('mystery', 'Unknown Block'), section('hero', 'Hero'), section('cta', 'Get in touch', 2), section('steps', 'Steps', 1), section('test', 'Another Unknown', 3)]);

            expect(await screen.findByRole('heading', { level: 2, name: 'Get in touch' })).toBeInTheDocument();
            expect(screen.getByRole('heading', { level: 2, name: 'Steps' })).toBeInTheDocument();
            expect(screen.queryByText('Unknown Block')).not.toBeInTheDocument();
            expect(screen.queryByText('Another Unknown')).not.toBeInTheDocument();
        });

        it('falls back to the default title and renders no hero when the hero is missing', async () => {
            renderWith([section('mystery', 'Unknown Block'), section('cta', 'Get in touch', 1)]);

            expect(await screen.findByText('Get in touch')).toBeInTheDocument();
            expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
            expect(screen.queryByText('Unknown Block')).not.toBeInTheDocument();
            await waitFor(() => expect(document.title).toBe('ArtNiyyətli'));
        });

        it('renders without crashing when sections are empty or absent', async () => {
            renderWith([]);
            await waitFor(() => expect(document.title).toBe('ArtNiyyətli'));

            global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: { ...empty, page: { title: 'Ana səhifə' } } }));
            render(<LocaleProvider><HomePage /></LocaleProvider>);
            await waitFor(() => expect(document.title).toBe('ArtNiyyətli'));
        });
    });
});
