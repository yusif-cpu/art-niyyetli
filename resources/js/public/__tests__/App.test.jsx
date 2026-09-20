import { render, screen, waitFor } from '@testing-library/react';
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

    it('issues exactly three shell requests plus one page request on a hard load of a static page', async () => {
        window.history.pushState(null, '', '/collectors');
        const shell = global.fetch;
        global.fetch = vi.fn((url) => {
            if (url.includes('/pages/collectors')) {
                return Promise.resolve(jsonResponse({ data: { title: 'Kolleksionerlər üçün', content: 'Məzmun', sections: [] } }));
            }
            return shell(url);
        });

        render(<App />);
        await screen.findByRole('heading', { name: 'Kolleksionerlər üçün' });
        await screen.findByRole('link', { name: 'Əsərlər' });

        expect(global.fetch.mock.calls.map(([url]) => url).sort()).toEqual([
            '/api/v1/navigation?locale=az',
            '/api/v1/pages/collectors?locale=az',
            '/api/v1/site-settings?locale=az',
            '/api/v1/social-links?locale=az',
        ]);
    });

    it('issues exactly three shell requests plus the homepage request on a hard load of the home page', async () => {
        render(<App />);
        await screen.findByRole('link', { name: 'Əsərlər' });
        await waitFor(() => expect(global.fetch.mock.calls.map(([url]) => url).some((url) => url.includes('/homepage'))).toBe(true));

        const urls = global.fetch.mock.calls.map(([url]) => url);
        expect(urls.filter((url) => url.includes('/navigation'))).toHaveLength(1);
        expect(urls.filter((url) => url.includes('/site-settings'))).toHaveLength(1);
        expect(urls.filter((url) => url.includes('/social-links'))).toHaveLength(1);
        expect(urls.filter((url) => url.includes('/homepage'))).toHaveLength(1);
    });

    it('renders NotFoundPage for an unmatched route', () => {
        window.history.pushState(null, '', '/a/b/c');
        render(<App />);
        expect(screen.getByText('Səhifə tapılmadı')).toBeInTheDocument();
    });
});
