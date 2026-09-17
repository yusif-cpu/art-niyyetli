import { publicApiFetch } from '../lib/api.js';

export function getSiteSettings(locale) {
    return publicApiFetch('/site-settings', { locale });
}
