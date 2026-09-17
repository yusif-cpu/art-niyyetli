import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import ArtworksScreen from '../screens/ArtworksScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const artworkListItem = {
    id: 5,
    translation: { title: 'Payız mənzərəsi' },
    inventory_code: 'AN-000005',
    artist: { id: 1, name: 'Anar Əliyev' },
    availability: 'available',
    is_active: true,
    main_image: null,
};

const artworkDetail = {
    id: 5,
    artist: { id: 1 },
    medium: { id: 2 },
    genre: { id: 3 },
    year_created: 2020,
    width_cm: 40,
    height_cm: 60,
    price: 500,
    show_price: true,
    availability: 'available',
    year_sold: null,
    inventory_code: 'AN-000005',
    certificate: false,
    frame_condition: '',
    delivery_note: '',
    featured: false,
    show_on_wall: false,
    sort_order: 0,
    is_active: true,
    images: [],
    translations: [
        { locale: 'az', slug: 'payiz-menzeresi', title: 'Payız mənzərəsi', short_description: '', provenance: '' },
        { locale: 'en', slug: 'autumn-landscape', title: 'Autumn Landscape', short_description: '', provenance: '' },
    ],
};

function setupFetch({ artworks = [artworkListItem] } = {}) {
    global.fetch = vi.fn((url, options) => {
        const method = options?.method || 'GET';

        if (url.startsWith('/admin/artworks?') && method === 'GET') {
            return Promise.resolve(jsonResponse(200, { data: artworks, meta: { current_page: 1, last_page: 1, total: artworks.length } }));
        }
        if (url === '/admin/artworks/5' && method === 'GET') {
            return Promise.resolve(jsonResponse(200, { data: artworkDetail }));
        }
        if (url === '/admin/artworks/5' && method === 'PUT') {
            return Promise.resolve(jsonResponse(200, { data: artworkDetail }));
        }
        if (url.startsWith('/admin/artists?')) {
            return Promise.resolve(jsonResponse(200, { data: [{ id: 1, translation: { first_name: 'Anar', last_name: 'Əliyev' } }] }));
        }
        if (url === '/admin/genres') {
            return Promise.resolve(jsonResponse(200, { data: [{ id: 3, name: 'Mənzərə' }] }));
        }
        if (url === '/admin/mediums') {
            return Promise.resolve(jsonResponse(200, { data: [{ id: 2, name: 'Kətan üzərində yağlı boya' }] }));
        }

        return Promise.resolve(jsonResponse(200, { data: {} }));
    });
}

async function openEditor() {
    render(
        <ToastProvider>
            <ArtworksScreen />
        </ToastProvider>
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Redaktə et' }));
    await screen.findByDisplayValue('Payız mənzərəsi');
}

describe('ArtworksScreen', () => {
    it('renders the artwork list from the backend', async () => {
        setupFetch();

        render(
            <ToastProvider>
                <ArtworksScreen />
            </ToastProvider>
        );

        expect(await screen.findByText('Payız mənzərəsi')).toBeInTheDocument();
    });

    it('shows the empty state when there are no artworks', async () => {
        setupFetch({ artworks: [] });

        render(
            <ToastProvider>
                <ArtworksScreen />
            </ToastProvider>
        );

        expect(await screen.findByText('Hələ heç bir əsər əlavə edilməyib')).toBeInTheDocument();
    });

    it('renders the AZ title by default and switches to EN on tab click', async () => {
        setupFetch();
        await openEditor();

        expect(screen.getByDisplayValue('Payız mənzərəsi')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('tab', { name: 'EN' }));

        expect(screen.getByDisplayValue('Autumn Landscape')).toBeInTheDocument();
    });

    it('shows the field error after a failed save, then shows success on retry', async () => {
        setupFetch();
        await openEditor();

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve(jsonResponse(422, { message: 'The given data was invalid.', errors: { price: ['Price must be a positive number.'] } }))
        );

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getAllByText('Price must be a positive number.').length).toBeGreaterThan(0);
        });

        global.fetch.mockImplementation(() => Promise.resolve(jsonResponse(200, { data: artworkDetail })));

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getByText('Dəyişikliklər yadda saxlanıldı')).toBeInTheDocument();
        });
    });
});
