import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

describe('App routing', () => {
    beforeEach(() => {
        window.history.pushState(null, '', '/');
        global.fetch = vi.fn((url) => {
            if (url.includes('/navigation')) {
                return Promise.resolve(
                    jsonResponse({ data: { header: [{ type: 'route', route_key: 'artworks', href: '/artworks' }], footer: [] } })
                );
            }
            if (url.includes('/homepage')) {
                return Promise.resolve(
                    jsonResponse({ data: { page: null, exhibition: null, wall: [], featured: [], artists: [], faqs: [] } })
                );
            }
            return Promise.resolve(jsonResponse({ data: {} }));
        });
    });

    it('renders the site shell nav and a placeholder page for the home route', async () => {
        render(<App />);
        expect(await screen.findByRole('link', { name: 'Əsərlər' })).toBeInTheDocument();
    });

    it('renders NotFoundPage for an unmatched route', () => {
        window.history.pushState(null, '', '/a/b/c');
        render(<App />);
        expect(screen.getByText('Səhifə tapılmadı')).toBeInTheDocument();
    });
});
