import { publicApiFetch } from '../lib/api.js';

// Parameter names and rules: docs/frontend-current-api-guide.md, E7 (PublicArtworkIndexRequest).
export function listArtworks(locale, { page, per_page, artist, genre, medium, status, sort, price_min, price_max, size_min, size_max } = {}) {
    return publicApiFetch('/artworks', { locale, page, per_page, artist, genre, medium, status, sort, price_min, price_max, size_min, size_max });
}

export function getArtwork(locale, inventoryCode) {
    return publicApiFetch(`/artworks/${encodeURIComponent(inventoryCode)}`, { locale });
}
