import { publicApiPost } from '../lib/api.js';

export function submitEnquiry(payload) {
    return publicApiPost('/enquiries', payload);
}
