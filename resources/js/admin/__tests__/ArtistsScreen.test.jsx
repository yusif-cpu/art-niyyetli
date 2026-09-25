import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import ArtistsScreen from '../screens/ArtistsScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const artistListItem = {
    id: 7,
    translation: { first_name: 'Anar', last_name: 'Əliyev' },
    is_active: true,
    portrait_url: null,
};

const artistDetail = {
    id: 7,
    birth_year: 1980,
    sort_order: 0,
    is_active: true,
    representation_image_id: null,
    portrait_url: null,
    exhibitions: [],
    awards: [],
    translations: [
        { locale: 'az', slug: 'anar-eliyev', first_name: 'Anar', last_name: 'Əliyev', birth_place: '', direction: '', biography: '', artistic_approach: '' },
        { locale: 'en', slug: 'anar-aliyev', first_name: 'Anar', last_name: 'Aliyev', birth_place: '', direction: '', biography: '', artistic_approach: '' },
    ],
};

function setupFetch({ artists = [artistListItem] } = {}) {
    global.fetch = vi.fn((url, options) => {
        const method = options?.method || 'GET';

        if (url.startsWith('/admin/artists?') && method === 'GET') {
            return Promise.resolve(jsonResponse(200, { data: artists, meta: { current_page: 1, last_page: 1, total: artists.length } }));
        }
        if (url === '/admin/artists/7' && method === 'GET') {
            return Promise.resolve(jsonResponse(200, { data: artistDetail }));
        }
        if (url === '/admin/artists/7' && method === 'PUT') {
            return Promise.resolve(jsonResponse(200, { data: artistDetail }));
        }

        return Promise.resolve(jsonResponse(200, { data: {} }));
    });
}

async function openEditor() {
    render(
        <ToastProvider>
            <ArtistsScreen />
        </ToastProvider>
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Redaktə et' }));
    await screen.findByDisplayValue('Əliyev');
}

describe('ArtistsScreen', () => {
    it('renders the artist list from the backend', async () => {
        setupFetch();

        render(
            <ToastProvider>
                <ArtistsScreen />
            </ToastProvider>
        );

        expect(await screen.findByText('Anar Əliyev')).toBeInTheDocument();
    });

    it('shows the empty state when there are no artists', async () => {
        setupFetch({ artists: [] });

        render(
            <ToastProvider>
                <ArtistsScreen />
            </ToastProvider>
        );

        expect(await screen.findByText('Hələ heç bir rəssam əlavə edilməyib')).toBeInTheDocument();
    });

    it('renders the AZ last name by default and switches to EN on tab click', async () => {
        setupFetch();
        await openEditor();

        expect(screen.getByDisplayValue('Əliyev')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('tab', { name: 'EN' }));

        expect(screen.getByDisplayValue('Aliyev')).toBeInTheDocument();
    });

    it('shows the field error after a failed save, then shows success on retry', async () => {
        setupFetch();
        await openEditor();

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve(jsonResponse(422, { message: 'The given data was invalid.', errors: { birth_year: ['Birth year must be realistic.'] } }))
        );

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getByText('Birth year must be realistic.')).toBeInTheDocument();
        });

        global.fetch.mockImplementation(() => Promise.resolve(jsonResponse(200, { data: artistDetail })));

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getByText('Dəyişikliklər yadda saxlanıldı')).toBeInTheDocument();
        });
    });

    it('explains the required AZ translation and switches to the AZ tab when the API rejects the save', async () => {
        setupFetch();
        await openEditor();
        await userEvent.click(screen.getByRole('tab', { name: 'EN' }));

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve(jsonResponse(422, { message: 'An Azerbaijani (az) translation with a slug is required.', errors: { translations: ['An Azerbaijani (az) translation with a slug is required.'] } }))
        );

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        expect(await screen.findByText(/AZ tərcüməsi mütləqdir/)).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'AZ' })).toHaveAttribute('aria-selected', 'true');
    });

    it('deletes an artist after confirmation', async () => {
        setupFetch();
        await openEditor();

        global.fetch.mockImplementationOnce((url, options) => {
            expect(url).toBe('/admin/artists/7');
            expect(options.method).toBe('DELETE');
            return Promise.resolve(jsonResponse(200, { message: 'Artist archived.' }));
        });

        await userEvent.click(screen.getByRole('button', { name: 'Sil' }));
        await userEvent.click(screen.getByRole('button', { name: 'Təsdiqlə' }));

        await waitFor(() => {
            expect(screen.getByText('Rəssam silindi')).toBeInTheDocument();
        });
    });

    it('shows a friendly error and keeps the editor open when the artist has related artworks', async () => {
        setupFetch();
        await openEditor();

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve(jsonResponse(409, { message: 'This artist has associated artworks and cannot be deleted; deactivate it instead.' }))
        );

        await userEvent.click(screen.getByRole('button', { name: 'Sil' }));
        await userEvent.click(screen.getByRole('button', { name: 'Təsdiqlə' }));

        await waitFor(() => {
            expect(screen.getByText('Bu rəssamın əsərləri olduğu üçün silinə bilməz. Onun yerinə deaktiv edin.')).toBeInTheDocument();
        });
        expect(screen.getByDisplayValue('Əliyev')).toBeInTheDocument();
    });
});
