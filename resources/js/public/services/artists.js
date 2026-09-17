import { publicApiFetch } from '../lib/api.js';

export function listArtists(locale) {
    return publicApiFetch('/artists', { locale });
}

export function getArtist(locale, slug) {
    return publicApiFetch(`/artists/${slug}`, { locale });
}
