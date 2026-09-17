import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import MediaScreen from '../screens/MediaScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const mediaItem = {
    id: 1,
    original_filename: 'sekil.jpg',
    alt_text: 'Sekil',
    variants: [{ variant: 'thumbnail-webp', url: 'https://example.com/sekil.webp' }],
};

function setupFetch({ items = [mediaItem] } = {}) {
    global.fetch = vi.fn((url, options) => {
        const method = options?.method || 'GET';

        if (url.startsWith('/admin/media?') && method === 'GET') {
            return Promise.resolve(jsonResponse(200, { data: items, meta: { current_page: 1, last_page: 1, total: items.length } }));
        }
        if (url === '/admin/media' && method === 'POST') {
            return Promise.resolve(jsonResponse(200, { data: mediaItem }));
        }

        return Promise.resolve(jsonResponse(200, { data: {} }));
    });
}

describe('MediaScreen', () => {
    it('renders the media list from the backend', async () => {
        setupFetch();

        render(
            <ToastProvider>
                <MediaScreen />
            </ToastProvider>
        );

        expect(await screen.findByText('sekil.jpg')).toBeInTheDocument();
    });

    it('shows the empty state when there are no items', async () => {
        setupFetch({ items: [] });

        render(
            <ToastProvider>
                <MediaScreen />
            </ToastProvider>
        );

        expect(await screen.findByText('Hələ heç bir şəkil yüklənməyib')).toBeInTheDocument();
    });

    it('shows a validation error message for a rejected upload', async () => {
        setupFetch();

        const { container } = render(
            <ToastProvider>
                <MediaScreen />
            </ToastProvider>
        );

        await screen.findByText('sekil.jpg');

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve(jsonResponse(422, { message: 'The file must not be greater than 5120 kilobytes.' }))
        );

        const fileInput = container.querySelector('input[type="file"]');
        const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
        await userEvent.upload(fileInput, file);

        await waitFor(() => {
            expect(screen.getByText('Bu şəkil həddindən artıq böyükdür.')).toBeInTheDocument();
        });
    });

    it('shows a success toast after a successful upload', async () => {
        setupFetch();

        const { container } = render(
            <ToastProvider>
                <MediaScreen />
            </ToastProvider>
        );

        await screen.findByText('sekil.jpg');

        const fileInput = container.querySelector('input[type="file"]');
        const file = new File(['x'], 'good.png', { type: 'image/png' });
        await userEvent.upload(fileInput, file);

        await waitFor(() => {
            expect(screen.getByText('Şəkil yükləndi')).toBeInTheDocument();
        });
    });
});
