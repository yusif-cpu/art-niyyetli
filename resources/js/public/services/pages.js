import { publicApiFetch } from '../lib/api.js';

export function listPages(locale) {
    return publicApiFetch('/pages', { locale });
}

export function getPage(locale, slug) {
    return publicApiFetch(`/pages/${slug}`, { locale });
}
