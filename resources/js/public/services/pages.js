import { publicApiFetch } from '../lib/api.js';

export function getPage(locale, slug) {
    return publicApiFetch(`/pages/${encodeURIComponent(slug)}`, { locale });
}
