import { publicApiFetch } from '../lib/api.js';

export function listFaqs(locale) {
    return publicApiFetch('/faqs', { locale });
}
