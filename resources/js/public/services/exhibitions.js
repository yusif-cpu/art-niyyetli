import { publicApiFetch } from '../lib/api.js';

export function listExhibitions(locale, { page, filter, per_page } = {}) {
    return publicApiFetch('/exhibitions', { locale, filter, page, per_page });
}

export function getExhibition(locale, slug) {
    return publicApiFetch(`/exhibitions/${encodeURIComponent(slug)}`, { locale });
}
