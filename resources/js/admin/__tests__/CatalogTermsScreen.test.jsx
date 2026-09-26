import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import GenresScreen from '../screens/GenresScreen.jsx';
import MediumsScreen from '../screens/MediumsScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const oneGenre = {
    id: 1,
    slug: 'painting',
    name: 'Rəngkarlıq',
    sort_order: 2,
    is_active: true,
    translations: [
        { locale: 'az', name: 'Rəngkarlıq' },
        { locale: 'en', name: 'Painting' },
    ],
};

function setupFetch(overrides = {}) {
    global.fetch = vi.fn((url, options) => {
        const key = `${options?.method} ${url}`;
        if (overrides[key]) return Promise.resolve(overrides[key]);
        if (key === 'GET /admin/genres') return Promise.resolve(jsonResponse(200, { data: [oneGenre] }));
        if (key === 'GET /admin/mediums') return Promise.resolve(jsonResponse(200, { data: [] }));
        return Promise.resolve(jsonResponse(200, { data: oneGenre }));
    });
}

function renderScreen(Screen) {
    render(
        <ToastProvider>
            <Screen />
        </ToastProvider>
    );
}

describe('Genres and mediums admin screens', () => {
    it('lists genres from the backend', async () => {
        setupFetch();
        renderScreen(GenresScreen);

        expect(await screen.findByText('Rəngkarlıq')).toBeInTheDocument();
        expect(screen.getByText('painting · #2')).toBeInTheDocument();
    });

    it('shows the empty state for mediums', async () => {
        setupFetch();
        renderScreen(MediumsScreen);

        expect(await screen.findByText('Hələ heç bir texnika yoxdur')).toBeInTheDocument();
    });

    it('creates a genre with the AZ name and slug', async () => {
        setupFetch();
        renderScreen(GenresScreen);
        await screen.findByText('Rəngkarlıq');

        await userEvent.click(screen.getByRole('button', { name: 'Yeni janr' }));
        await userEvent.type(screen.getByLabelText('Slug'), 'sculpture');
        await userEvent.type(screen.getByLabelText('Ad'), 'Heykəltəraşlıq');
        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            const call = global.fetch.mock.calls.find(([url, options]) => url === '/admin/genres' && options.method === 'POST');
            expect(call).toBeTruthy();
            expect(JSON.parse(call[1].body)).toEqual({
                slug: 'sculpture',
                is_active: true,
                translations: [{ locale: 'az', name: 'Heykəltəraşlıq' }],
            });
        });
    });

    it('shows the server message and keeps the item when a used genre cannot be deleted', async () => {
        setupFetch({
            'DELETE /admin/genres/1': jsonResponse(409, { message: 'This genre is used by artworks and cannot be deleted; deactivate it instead.' }),
        });
        renderScreen(GenresScreen);
        await screen.findByText('Rəngkarlıq');

        await userEvent.click(screen.getByRole('button', { name: 'Sil' }));
        await userEvent.click(screen.getByRole('button', { name: 'Təsdiqlə' }));

        expect(await screen.findByText(/cannot be deleted; deactivate it instead/)).toBeInTheDocument();
        expect(screen.getByText('painting · #2')).toBeInTheDocument();
    });
});
