import { describe, it, expect, vi } from 'vitest';
import { publicApiFetch, publicApiPost, PublicApiError } from '../lib/api.js';

function jsonResponse(status, body) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => body,
    };
}

describe('publicApiFetch', () => {
    it('builds the query string from params, skipping empty values, and returns the parsed body', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: [{ id: 1 }] }));

        const result = await publicApiFetch('/artworks', { locale: 'en', artist: 5, genre: '', price_min: undefined });

        expect(global.fetch).toHaveBeenCalledWith('/api/v1/artworks?locale=en&artist=5', { headers: { Accept: 'application/json' } });
        expect(result).toEqual({ data: [{ id: 1 }] });
    });

    it('omits the query string entirely when there are no params', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: {} }));

        await publicApiFetch('/homepage');

        expect(global.fetch).toHaveBeenCalledWith('/api/v1/homepage', { headers: { Accept: 'application/json' } });
    });

    it('throws PublicApiError with the response status, message and errors on a non-2xx response', async () => {
        global.fetch = vi.fn().mockResolvedValue(
            jsonResponse(422, { message: 'The given data was invalid.', errors: { status: ['Invalid status.'] } })
        );

        await expect(publicApiFetch('/artworks', { status: 'bogus' })).rejects.toMatchObject({
            status: 422,
            message: 'The given data was invalid.',
            errors: { status: ['Invalid status.'] },
        });
    });

    it('marks a 429 response as rate limited', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(429, { message: 'Too Many Attempts.' }));

        try {
            await publicApiFetch('/artworks');
            throw new Error('expected publicApiFetch to throw');
        } catch (err) {
            expect(err).toBeInstanceOf(PublicApiError);
            expect(err.isRateLimited).toBe(true);
        }
    });
});

describe('publicApiPost', () => {
    it('sends a JSON POST and returns the parsed body on success', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));

        const result = await publicApiPost('/enquiries', { name: 'Aysel', email: 'a@example.com', message: 'Salam', artwork_code: 'AN-1' });

        expect(global.fetch).toHaveBeenCalledWith('/api/v1/enquiries', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Aysel', email: 'a@example.com', message: 'Salam', artwork_code: 'AN-1' }),
        });
        expect(result).toEqual({ message: 'Sorğunuz qeydə alındı.' });
    });

    it('throws PublicApiError with field errors on a 422', async () => {
        global.fetch = vi.fn().mockResolvedValue(
            jsonResponse(422, { message: 'The given data was invalid.', errors: { email: ['The email field is required.'] } })
        );

        await expect(publicApiPost('/enquiries', {})).rejects.toMatchObject({
            status: 422,
            errors: { email: ['The email field is required.'] },
        });
    });
});
