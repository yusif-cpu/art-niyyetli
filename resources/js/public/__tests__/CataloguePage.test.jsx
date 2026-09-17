import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import CataloguePage from '../pages/CataloguePage.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

const artwork = {
    inventory_code: 'AN-1', title: 'Piece One', artist: { id: 1, name: 'Artist One' }, image_url: null,
    genre: { slug: 'painting', name: 'Painting' }, medium: { slug: 'oil', name: 'Oil' },
    price: 100, currency: 'AZN', availability: 'available', width_cm: 10, height_cm: 10,
};

describe('CataloguePage', () => {
    it('renders artwork cards and pagination from the artworks endpoint', async () => {
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/api/v1/artists')) return Promise.resolve(jsonResponse({ data: [{ id: 1, slug: 'artist-one', first_name: 'Artist', last_name: 'One', direction: 'Modern', portrait_url: null }] }));
            return Promise.resolve(jsonResponse({ data: [artwork], meta: { current_page: 1, last_page: 2, total: 30 } }));
        });

        render(<LocaleProvider><CataloguePage /></LocaleProvider>);

        expect(await screen.findByText('Piece One')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Növbəti' })).toBeInTheDocument();
    });

    it('re-fetches with the selected status filter', async () => {
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/api/v1/artists')) return Promise.resolve(jsonResponse({ data: [] }));
            return Promise.resolve(jsonResponse({ data: [artwork], meta: { current_page: 1, last_page: 1, total: 1 } }));
        });

        render(<LocaleProvider><CataloguePage /></LocaleProvider>);
        await screen.findByText('Piece One');

        await userEvent.selectOptions(screen.getByLabelText('Status'), 'sold');

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('status=sold'), expect.anything());
        });
    });

    it('renders EmptyState when no artworks match', async () => {
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/api/v1/artists')) return Promise.resolve(jsonResponse({ data: [] }));
            return Promise.resolve(jsonResponse({ data: [] }));
        });

        render(<LocaleProvider><CataloguePage /></LocaleProvider>);
        expect(await screen.findByText('Heç nə tapılmadı.')).toBeInTheDocument();
    });

    it('actually re-fetches artworks when the retry button is clicked after an error', async () => {
        let artworksCallCount = 0;
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/api/v1/artists')) return Promise.resolve(jsonResponse({ data: [] }));
            artworksCallCount += 1;
            if (artworksCallCount === 1) return Promise.resolve({ ok: false, status: 500, headers: { get: () => 'application/json' }, json: async () => ({ message: 'Server error.' }) });
            return Promise.resolve(jsonResponse({ data: [artwork], meta: { current_page: 1, last_page: 1, total: 1 } }));
        });

        render(<LocaleProvider><CataloguePage /></LocaleProvider>);
        await userEvent.click(await screen.findByRole('button', { name: 'Yenidən cəhd et' }));

        expect(await screen.findByText('Piece One')).toBeInTheDocument();
        expect(artworksCallCount).toBe(2);
    });
});
