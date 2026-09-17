import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import ExhibitionsScreen from '../screens/ExhibitionsScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const exhibitionListItem = {
    id: 9,
    translation: { title: 'Payız Sərgisi' },
    type: 'exhibition',
    status: 'current',
    start_date: '2026-09-01',
    end_date: '2026-09-30',
};

const exhibitionDetail = {
    id: 9,
    type: 'exhibition',
    status: 'current',
    start_date: '2026-09-01',
    end_date: '2026-09-30',
    is_active: true,
    artists: [],
    artworks: [],
    media: [],
    translations: [
        { locale: 'az', slug: 'payiz-sergisi', title: 'Payız Sərgisi', venue: '', short_text: '', full_text: '' },
        { locale: 'en', slug: 'autumn-exhibition', title: 'Autumn Exhibition', venue: '', short_text: '', full_text: '' },
    ],
};

function setupFetch({ exhibitions = [exhibitionListItem] } = {}) {
    global.fetch = vi.fn((url, options) => {
        const method = options?.method || 'GET';

        if (url.startsWith('/admin/exhibitions?') && method === 'GET') {
            return Promise.resolve(jsonResponse(200, { data: exhibitions, meta: { current_page: 1, last_page: 1, total: exhibitions.length } }));
        }
        if (url === '/admin/exhibitions/9' && method === 'GET') {
            return Promise.resolve(jsonResponse(200, { data: exhibitionDetail }));
        }
        if (url === '/admin/exhibitions/9' && method === 'PUT') {
            return Promise.resolve(jsonResponse(200, { data: exhibitionDetail }));
        }
        if (url.startsWith('/admin/artists?')) {
            return Promise.resolve(jsonResponse(200, { data: [] }));
        }
        if (url.startsWith('/admin/artworks?')) {
            return Promise.resolve(jsonResponse(200, { data: [] }));
        }

        return Promise.resolve(jsonResponse(200, { data: {} }));
    });
}

async function openEditor() {
    render(
        <ToastProvider>
            <ExhibitionsScreen />
        </ToastProvider>
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Redaktə et' }));
    await screen.findByDisplayValue('Payız Sərgisi');
}

describe('ExhibitionsScreen', () => {
    it('renders the exhibition list from the backend', async () => {
        setupFetch();

        render(
            <ToastProvider>
                <ExhibitionsScreen />
            </ToastProvider>
        );

        expect(await screen.findByText('Payız Sərgisi')).toBeInTheDocument();
    });

    it('shows the empty state when there are no exhibitions', async () => {
        setupFetch({ exhibitions: [] });

        render(
            <ToastProvider>
                <ExhibitionsScreen />
            </ToastProvider>
        );

        expect(await screen.findByText('Hələ heç bir sərgi əlavə edilməyib')).toBeInTheDocument();
    });

    it('shows the field error after a failed save, then shows success on retry', async () => {
        setupFetch();
        await openEditor();

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve(jsonResponse(422, { message: 'The given data was invalid.', errors: { start_date: ['Start date must be before the end date.'] } }))
        );

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getByText('Start date must be before the end date.')).toBeInTheDocument();
        });

        global.fetch.mockImplementation(() => Promise.resolve(jsonResponse(200, { data: exhibitionDetail })));

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getByText('Dəyişikliklər yadda saxlanıldı')).toBeInTheDocument();
        });
    });
});
