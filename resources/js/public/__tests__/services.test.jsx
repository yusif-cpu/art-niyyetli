import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHomepage } from '../services/homepage.js';
import { listPages, getPage } from '../services/pages.js';
import { getSiteSettings } from '../services/siteSettings.js';
import { listSocialLinks } from '../services/socialLinks.js';
import { listFaqs } from '../services/faqs.js';
import { listArtists, getArtist } from '../services/artists.js';
import { listArtworks, getArtwork } from '../services/artworks.js';
import { listExhibitions, getExhibition } from '../services/exhibitions.js';
import { listArticles, getArticle } from '../services/articles.js';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

describe('resource services', () => {
    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: 'ok' }));
    });

    it('getHomepage calls GET /homepage with locale', async () => {
        await getHomepage('en');
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/homepage?locale=en', expect.anything());
    });

    it('listPages calls GET /pages with locale', async () => {
        await listPages('az');
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/pages?locale=az', expect.anything());
    });

    it('getPage calls GET /pages/{slug} with locale', async () => {
        await getPage('az', 'about');
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/pages/about?locale=az', expect.anything());
    });

    it('getSiteSettings calls GET /site-settings with locale', async () => {
        await getSiteSettings('az');
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/site-settings?locale=az', expect.anything());
    });

    it('listSocialLinks calls GET /social-links with locale', async () => {
        await listSocialLinks('az');
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/social-links?locale=az', expect.anything());
    });

    it('listFaqs calls GET /faqs with locale', async () => {
        await listFaqs('az');
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/faqs?locale=az', expect.anything());
    });

    it('listArtists calls GET /artists with locale', async () => {
        await listArtists('az');
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/artists?locale=az', expect.anything());
    });

    it('getArtist calls GET /artists/{slug} with locale', async () => {
        await getArtist('az', 'aygun-mammadova');
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/artists/aygun-mammadova?locale=az', expect.anything());
    });

    it('listArtworks passes filters and page through as query params', async () => {
        await listArtworks('en', { page: 2, artist: 5, status: 'available', sort: 'price_asc', price_min: 1000, price_max: 5000 });
        expect(global.fetch).toHaveBeenCalledWith(
            '/api/v1/artworks?locale=en&page=2&artist=5&status=available&sort=price_asc&price_min=1000&price_max=5000',
            expect.anything()
        );
    });

    it('listArtworks omits unset filters entirely', async () => {
        await listArtworks('az');
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/artworks?locale=az', expect.anything());
    });

    it('getArtwork calls GET /artworks/{inventoryCode} with locale', async () => {
        await getArtwork('az', 'AN-2026-014');
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/artworks/AN-2026-014?locale=az', expect.anything());
    });

    it('listExhibitions passes filter and page through', async () => {
        await listExhibitions('az', { filter: 'upcoming', page: 1 });
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/exhibitions?locale=az&filter=upcoming&page=1', expect.anything());
    });

    it('getExhibition calls GET /exhibitions/{slug} with locale', async () => {
        await getExhibition('az', 'winter-show-2026');
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/exhibitions/winter-show-2026?locale=az', expect.anything());
    });

    it('listArticles passes page through', async () => {
        await listArticles('az', { page: 2 });
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/articles?locale=az&page=2', expect.anything());
    });

    it('getArticle calls GET /articles/{slug} with locale', async () => {
        await getArticle('az', 'artist-interview-2026');
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/articles/artist-interview-2026?locale=az', expect.anything());
    });
});
