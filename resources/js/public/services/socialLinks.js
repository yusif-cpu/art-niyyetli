import { publicApiFetch } from '../lib/api.js';

export function listSocialLinks(locale) {
    return publicApiFetch('/social-links', { locale });
}
