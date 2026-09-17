import { publicApiFetch } from '../lib/api.js';

export function listArticles(locale, { page } = {}) {
    return publicApiFetch('/articles', { locale, page });
}

export function getArticle(locale, slug) {
    return publicApiFetch(`/articles/${slug}`, { locale });
}
