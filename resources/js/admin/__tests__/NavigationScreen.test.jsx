import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import NavigationScreen from '../screens/NavigationScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const BASE_PAYLOAD = {
    data: {
        header: [
            { id: 1, placement: 'header', nav_type: 'route', route_key: 'artworks', is_visible: true, sort_order: 0 },
            { id: 2, placement: 'header', nav_type: 'route', route_key: 'artists', is_visible: true, sort_order: 1 },
            { id: 3, placement: 'header', nav_type: 'page', page: { id: 10, title: 'Haqqımızda', slug: 'about', is_active: true }, is_visible: true, sort_order: 2 },
        ],
        footer: [],
    },
    meta: {
        available_pages: [
            { id: 10, title: 'Haqqımızda', slug: 'about' },
            { id: 11, title: 'Kolleksionerlər üçün', slug: 'collectors' },
        ],
        available_routes: ['artworks', 'artists', 'exhibitions', 'articles'],
    },
};

describe('NavigationScreen', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url) => {
            if (url === '/admin/navigation') {
                return Promise.resolve(jsonResponse(200, BASE_PAYLOAD));
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });
    });

    it('renders header and footer items grouped, with an empty-state message for the footer', async () => {
        render(
            <ToastProvider>
                <NavigationScreen />
            </ToastProvider>
        );

        await screen.findByText('Əsərlər', { selector: 'p' });
        expect(screen.getByText('Rəssamlar', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByText('Haqqımızda', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByText('Element yoxdur.')).toBeInTheDocument();
    });

    it('only offers pages and routes not already used in that placement', async () => {
        render(
            <ToastProvider>
                <NavigationScreen />
            </ToastProvider>
        );

        await screen.findByText('Əsərlər', { selector: 'p' });

        const headerSelect = screen.getByLabelText('Başlıq (əsas naviqasiya) üçün element seç');
        const optionLabels = within(headerSelect).getAllByRole('option').map((o) => o.textContent);

        expect(optionLabels).toContain('Kolleksionerlər üçün');
        expect(optionLabels).not.toContain('Haqqımızda');
        expect(optionLabels).toContain('Sərgilər');
        expect(optionLabels).not.toContain('Əsərlər');
    });

    it('toggles visibility and reloads the list', async () => {
        render(
            <ToastProvider>
                <NavigationScreen />
            </ToastProvider>
        );

        await screen.findByText('Əsərlər', { selector: 'p' });

        const [firstSwitch] = screen.getAllByRole('switch');
        await userEvent.click(firstSwitch);

        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([url, options]) => url === '/admin/navigation/1' && options?.method === 'PUT');
            expect(putCall).toBeTruthy();
            expect(JSON.parse(putCall[1].body)).toEqual({ is_visible: false });
        });
    });

    it('moves an item up using the reorder endpoint', async () => {
        render(
            <ToastProvider>
                <NavigationScreen />
            </ToastProvider>
        );

        await screen.findByText('Rəssamlar', { selector: 'p' });

        await userEvent.click(screen.getAllByRole('button', { name: 'Yuxarı' })[1]);

        await waitFor(() => {
            const reorderCall = global.fetch.mock.calls.find(([url]) => url === '/admin/navigation/reorder');
            expect(reorderCall).toBeTruthy();
            expect(JSON.parse(reorderCall[1].body)).toEqual({
                items: [
                    { id: 2, sort_order: 0 },
                    { id: 1, sort_order: 1 },
                ],
            });
        });
    });

    it('adds a selected page to the footer', async () => {
        global.fetch = vi.fn((url, options) => {
            if (url === '/admin/navigation' && (!options || options.method === 'GET')) {
                return Promise.resolve(jsonResponse(200, BASE_PAYLOAD));
            }
            if (url === '/admin/navigation' && options?.method === 'POST') {
                return Promise.resolve(jsonResponse(200, { data: {} }));
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });

        render(
            <ToastProvider>
                <NavigationScreen />
            </ToastProvider>
        );

        await screen.findByText('Əsərlər', { selector: 'p' });

        const footerSelect = screen.getByLabelText('Footer üçün element seç');
        await userEvent.selectOptions(footerSelect, 'page:10');
        await userEvent.click(screen.getAllByRole('button', { name: 'Əlavə et' })[1]);

        await waitFor(() => {
            const postCall = global.fetch.mock.calls.find(([url, options]) => url === '/admin/navigation' && options?.method === 'POST');
            expect(postCall).toBeTruthy();
            expect(JSON.parse(postCall[1].body)).toEqual({ placement: 'footer', nav_type: 'page', page_id: 10 });
        });
    });

    it('removes an item only after confirming, without deleting the underlying page', async () => {
        render(
            <ToastProvider>
                <NavigationScreen />
            </ToastProvider>
        );

        await screen.findByText('Haqqımızda', { selector: 'p' });

        const row = screen.getByText('Haqqımızda', { selector: 'p' }).closest('li');
        await userEvent.click(within(row).getByRole('button', { name: 'Sil' }));

        expect(screen.getByText('Bu elementi naviqasiyadan silmək istədiyinizə əminsiniz?')).toBeInTheDocument();

        global.fetch.mockImplementationOnce((url, options) => {
            expect(url).toBe('/admin/navigation/3');
            expect(options.method).toBe('DELETE');
            return Promise.resolve(jsonResponse(200, { message: 'Navigation item removed.' }));
        });

        await userEvent.click(screen.getByRole('button', { name: 'Təsdiqlə' }));

        await waitFor(() => {
            expect(screen.getByText('Naviqasiya elementi silindi')).toBeInTheDocument();
        });
    });

    it('shows a badge when a page item is behind an inactive page', async () => {
        global.fetch = vi.fn((url) => {
            if (url === '/admin/navigation') {
                return Promise.resolve(
                    jsonResponse(200, {
                        data: {
                            header: [
                                { id: 3, placement: 'header', nav_type: 'page', page: { id: 10, title: 'Haqqımızda', slug: 'about', is_active: false }, is_visible: true, sort_order: 0 },
                            ],
                            footer: [],
                        },
                        meta: { available_pages: [], available_routes: [] },
                    })
                );
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });

        render(
            <ToastProvider>
                <NavigationScreen />
            </ToastProvider>
        );

        await screen.findByText('Haqqımızda', { selector: 'p' });
        expect(screen.getByText('Səhifə deaktivdir')).toBeInTheDocument();
    });

    it('shows an error banner when the initial load fails', async () => {
        global.fetch = vi.fn(() => Promise.resolve(jsonResponse(500, { message: 'Server error' })));

        render(
            <ToastProvider>
                <NavigationScreen />
            </ToastProvider>
        );

        await screen.findByText('Naviqasiyanı yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.');
    });
});
