import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import PageLoadingIndicator from '../layout/PageLoadingIndicator.jsx';
import { publicApiFetch } from '../lib/api.js';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

describe('the page loading indicator', () => {
    beforeEach(() => {
        localStorage.removeItem('public-locale');
    });

    it('shows nothing; only a status text for screen readers while a request is in flight', async () => {
        let finish;
        global.fetch = vi.fn(() => new Promise((done) => { finish = () => done(jsonResponse({ data: [] })); }));
        const { container } = render(<LocaleProvider><PageLoadingIndicator /></LocaleProvider>);

        expect(screen.getByRole('status')).toHaveTextContent('');

        let request;
        act(() => {
            request = publicApiFetch('/artists', { locale: 'az' });
        });
        expect(screen.getByRole('status')).toHaveTextContent('Yüklənir');
        expect(screen.getByRole('status')).toHaveClass('sr-only');
        // The status region is all there is: no drawing, no bar.
        expect(container.children).toHaveLength(1);
        expect(container.querySelector('svg')).toBeNull();

        await act(async () => {
            finish();
            await request;
        });
        expect(screen.getByRole('status')).toHaveTextContent('');
    });

    it('also clears when the request fails', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('offline')));
        render(<LocaleProvider><PageLoadingIndicator /></LocaleProvider>);

        await act(async () => {
            await publicApiFetch('/artists').catch(() => null);
        });
        expect(screen.getByRole('status')).toHaveTextContent('');
    });
});
