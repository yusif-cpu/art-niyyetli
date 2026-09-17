import { publicApiFetch } from '../lib/api.js';

export function listArtworks(locale, { page, artist, status, sort, price_min, price_max } = {}) {
    return publicApiFetch('/artworks', { locale, page, artist, status, sort, price_min, price_max });
}

export function getArtwork(locale, inventoryCode) {
    return publicApiFetch(`/artworks/${inventoryCode}`, { locale });
}
