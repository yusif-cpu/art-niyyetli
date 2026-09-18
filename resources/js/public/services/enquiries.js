import { publicApiFetch, publicApiPost } from '../lib/api.js';

export function submitEnquiry(payload) {
    return publicApiPost('/enquiries', payload);
}

export function getEnquirySubjects(locale) {
    return publicApiFetch('/enquiry-subjects', { locale });
}
