import { publicApiFetch } from '../lib/api.js';

export function listExhibitions(locale, { page, filter } = {}) {
    return publicApiFetch('/exhibitions', { locale, filter, page });
}

export function getExhibition(locale, slug) {
    return publicApiFetch(`/exhibitions/${slug}`, { locale });
}
