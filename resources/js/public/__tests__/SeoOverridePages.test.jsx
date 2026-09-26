import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import { seoMeta } from '../lib/seoMeta.js';
import ArtworkDetailPage from '../pages/ArtworkDetailPage.jsx';
import ArtistDetailPage from '../pages/ArtistDetailPage.jsx';
import ExhibitionDetailPage from '../pages/ExhibitionDetailPage.jsx';
import ArticleDetailPage from '../pages/ArticleDetailPage.jsx';
import StaticPage from '../pages/StaticPage.jsx';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

const artworkCard = { inventory_code: 'AN-1', title: 'A Piece', artist: { id: 5, name: 'A B' }, image_url: null, genre: { slug: 'p', name: 'P' }, medium: { slug: 'o', name: 'O' }, price: 100, currency: 'AZN', availability: 'available', width_cm: 1, height_cm: 1 };

// One entry per detail page: how to render it, its API payload, and the fallback title/description it produces.
const PAGES = {
    artwork: {
        Page: ArtworkDetailPage,
        params: { code: 'AN-1' },
        data: { ...artworkCard, title: 'Sunset', year_created: 2023, short_description: 'Artwork fallback.', provenance: 'P', certificate: false, frame_condition: null, delivery_note: null, images: [], similar: [], whatsapp_link: null, video: null },
        fallback: { title: 'Sunset — ArtNiyyətli', description: 'Artwork fallback.' },
    },
    artist: {
        Page: ArtistDetailPage,
        params: { slug: 'aygun' },
        data: { id: 5, slug: 'aygun', first_name: 'Aygün', last_name: 'Məmmədova', birth_year: 1985, birth_place: 'Bakı', direction: 'D', biography: 'Artist fallback.', artistic_approach: 'A', portrait_url: null, exhibitions: [], awards: [], artworks: [] },
        fallback: { title: 'Aygün Məmmədova — ArtNiyyətli', description: 'Artist fallback.' },
    },
    exhibition: {
        Page: ExhibitionDetailPage,
        params: { slug: 'show' },
        data: { slug: 'show', title: 'Show', type: 'exhibition', status: 'current', start_date: '2026-01-10', end_date: '2026-02-10', venue: 'V', short_text: 'Exhibition fallback.', full_text: 'F', artists: [], artworks: [], media: [], video: null },
        fallback: { title: 'Show — ArtNiyyətli', description: 'Exhibition fallback.' },
    },
    article: {
        Page: ArticleDetailPage,
        params: { slug: 'story' },
        data: { slug: 'story', title: 'Story', type: 'news', short_text: 'Article fallback.', content: 'C', published_at: '2026-01-05T10:00:00+00:00', media: [], video: null },
        fallback: { title: 'Story — ArtNiyyətli', description: 'Article fallback.' },
    },
    page: {
        Page: StaticPage,
        params: { slug: 'about' },
        data: { slug: 'about', type: 'about', title: 'About', content: 'Page fallback.', sections: [] },
        fallback: { title: 'About — ArtNiyyətli', description: 'Page fallback.' },
    },
};

function description() {
    return document.querySelector('meta[name="description"]')?.getAttribute('content');
}

describe.each(Object.entries(PAGES))('%s detail page SEO', (name, { Page, params, data, fallback }) => {
    beforeEach(() => {
        document.title = '';
        document.querySelectorAll('meta[name="description"]').forEach((el) => el.remove());
    });

    function renderWith(seo) {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: { ...data, seo } }));
        render(<LocaleProvider><Page params={params} /></LocaleProvider>);
    }

    it('uses the SEO override title and description, keeping the site-name suffix', async () => {
        renderWith({ title: 'Admin SEO title', description: 'Admin SEO description', image_url: 'https://example.test/og.webp' });

        await waitFor(() => expect(document.title).toBe('Admin SEO title — ArtNiyyətli'));
        expect(description()).toBe('Admin SEO description');
    });

    it('overrides only the parts that are set', async () => {
        renderWith({ title: null, description: 'Only a description', image_url: null });

        await waitFor(() => expect(description()).toBe('Only a description'));
        expect(document.title).toBe(fallback.title);
    });

    it.each([['null', null], ['missing', undefined]])('falls back to the page values when seo is %s', async (_label, seo) => {
        renderWith(seo);

        await waitFor(() => expect(document.title).toBe(fallback.title));
        expect(description()).toBe(fallback.description);
    });
});

describe('seoMeta', () => {
    it('treats empty override strings as absent', () => {
        expect(seoMeta({ seo: { title: '', description: '' } }, { title: 'T', description: 'D' })).toEqual({ title: 'T — ArtNiyyətli', description: 'D' });
    });
});
