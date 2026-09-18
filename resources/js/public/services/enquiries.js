import { publicApiFetch, publicApiPost } from '../lib/api.js';

export function submitEnquiry(payload) {
    return publicApiPost('/enquiries', payload);
}

export function getEnquirySubjects() {
    return publicApiFetch('/enquiry-subjects');
}
