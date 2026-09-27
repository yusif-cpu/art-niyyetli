import { publicApiFetch } from '../lib/api.js';

export function listArtists(locale, { page } = {}) {
    return publicApiFetch('/artists', { locale, page });
}

export function getArtist(locale, slug) {
    return publicApiFetch(`/artists/${encodeURIComponent(slug)}`, { locale });
}
