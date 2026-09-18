import { describe, it, expect, vi } from 'vitest';
import { submitEnquiry, getEnquirySubjects } from '../services/enquiries.js';
import { PublicApiError } from '../lib/api.js';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

describe('submitEnquiry', () => {
    it('posts the payload to /enquiries and returns the success message', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));

        const payload = { name: 'Aysel Məmmədova', email: 'aysel@example.com', phone: '', message: 'Salam', artwork_code: 'AN-2026-014', website: '' };
        const result = await submitEnquiry(payload);

        expect(global.fetch).toHaveBeenCalledWith('/api/v1/enquiries', expect.objectContaining({ method: 'POST' }));
        expect(result).toEqual({ message: 'Sorğunuz qeydə alındı.' });
    });

    it('rejects with field errors on a 422', async () => {
        global.fetch = vi.fn().mockResolvedValue(
            jsonResponse(422, { message: 'The given data was invalid.', errors: { artwork_code: ['Unknown artwork.'] } })
        );

        await expect(submitEnquiry({ name: '', email: '', message: '', artwork_code: 'nope' })).rejects.toMatchObject({
            status: 422,
            errors: { artwork_code: ['Unknown artwork.'] },
        });
    });

    it('rejects with isRateLimited on a 429', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(429, { message: 'Too Many Attempts.' }));

        try {
            await submitEnquiry({ name: 'A', email: 'a@example.com', message: 'x', artwork_code: 'AN-1' });
            throw new Error('expected submitEnquiry to throw');
        } catch (err) {
            expect(err).toBeInstanceOf(PublicApiError);
            expect(err.isRateLimited).toBe(true);
        }
    });
});

describe('getEnquirySubjects', () => {
    it('fetches the public subject list', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: [{ key: 'buy', label: 'Əsər almaq' }] }));

        const result = await getEnquirySubjects();

        expect(global.fetch).toHaveBeenCalledWith('/api/v1/enquiry-subjects', expect.objectContaining({ headers: expect.anything() }));
        expect(result).toEqual({ data: [{ key: 'buy', label: 'Əsər almaq' }] });
    });
});
