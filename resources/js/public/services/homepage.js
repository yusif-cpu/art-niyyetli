import { publicApiFetch } from '../lib/api.js';

export function getHomepage(locale) {
    return publicApiFetch('/homepage', { locale });
}
