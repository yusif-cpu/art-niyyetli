import { publicApiFetch } from '../lib/api.js';

export function listArticles(locale, { page, per_page } = {}) {
    return publicApiFetch('/articles', { locale, page, per_page });
}

export function getArticle(locale, slug) {
    return publicApiFetch(`/articles/${slug}`, { locale });
}
