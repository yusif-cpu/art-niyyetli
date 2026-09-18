import { publicApiFetch } from '../lib/api.js';

export function getNavigation(locale) {
    return publicApiFetch('/navigation', { locale });
}
