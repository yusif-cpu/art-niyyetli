import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import SocialLinksScreen from '../screens/SocialLinksScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const oneLink = { id: 1, platform: 'instagram', url: 'https://instagram.com/artniyyetli', sort_order: 0, is_active: true };

describe('SocialLinksScreen', () => {
    function setupFetch() {
        global.fetch = vi.fn((url, options) => {
            if (url === '/admin/social-links' && options?.method === 'GET') {
                return Promise.resolve(jsonResponse(200, { data: [oneLink] }));
            }
            return Promise.resolve(jsonResponse(200, { data: oneLink }));
        });
    }

    it('renders the social link list', async () => {
        setupFetch();

        render(
            <ToastProvider>
                <SocialLinksScreen />
            </ToastProvider>
        );

        expect(await screen.findByText('instagram')).toBeInTheDocument();
    });

    it('shows the backend rejection message for a dangerous URL scheme', async () => {
        setupFetch();

        render(
            <ToastProvider>
                <SocialLinksScreen />
            </ToastProvider>
        );

        await screen.findByText('instagram');
        await userEvent.click(screen.getByRole('button', { name: 'Yeni əlaqə' }));

        await userEvent.type(screen.getByLabelText('Platforma'), 'test');
        await userEvent.type(screen.getByLabelText('URL'), 'javascript:alert(1)');

        global.fetch.mockResolvedValueOnce(
            jsonResponse(422, { message: 'The given data was invalid.', errors: { url: ['Only http/https links are allowed.'] } })
        );

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getByText('Only http/https links are allowed.')).toBeInTheDocument();
        });
    });
});

describe('SocialLinksScreen logo and display mode', () => {
    const brandedLink = {
        id: 2,
        platform: 'Instagram',
        url: 'https://instagram.com/artniyyetli',
        logo_media_id: 5,
        logo_url: 'https://example.test/instagram.webp',
        display_mode: 'logo_only',
        sort_order: 0,
        is_active: false,
    };

    function renderScreen() {
        return render(
            <ToastProvider>
                <SocialLinksScreen />
            </ToastProvider>
        );
    }

    it('shows each link with its logo, display mode and active state', async () => {
        global.fetch = vi.fn(() => Promise.resolve(jsonResponse(200, { data: [brandedLink] })));

        const { container } = renderScreen();

        expect(await screen.findByText('Instagram')).toBeInTheDocument();
        expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.test/instagram.webp');
        expect(screen.getByText('Yalnız loqo')).toBeInTheDocument();
        expect(screen.getByText('Deaktiv')).toBeInTheDocument();
    });

    it('pre-fills the saved logo and display mode when editing', async () => {
        global.fetch = vi.fn(() => Promise.resolve(jsonResponse(200, { data: [brandedLink] })));

        renderScreen();

        await screen.findByText('Instagram');
        await userEvent.click(screen.getByRole('button', { name: 'Redaktə et' }));

        expect(screen.getByLabelText('Görünüş rejimi')).toHaveValue('logo_only');
        expect(screen.getByRole('img', { name: 'Seçilmiş şəkil' })).toHaveAttribute('src', 'https://example.test/instagram.webp');
    });

    it('creates a link with a logo picked from the media library and a chosen display mode', async () => {
        global.fetch = vi.fn((url, options) => {
            if (url === '/admin/social-links' && options?.method === 'GET') return Promise.resolve(jsonResponse(200, { data: [] }));
            if (url.startsWith('/admin/media')) {
                return Promise.resolve(
                    jsonResponse(200, { data: [{ id: 5, variants: [{ variant: 'thumbnail-webp', url: 'https://example.test/instagram.webp' }] }] })
                );
            }

            return Promise.resolve(jsonResponse(200, { data: brandedLink }));
        });

        renderScreen();

        await screen.findByText('Hələ heç bir əlaqə yoxdur');
        await userEvent.click(screen.getByRole('button', { name: 'Yeni əlaqə' }));
        await userEvent.type(screen.getByLabelText('Platforma'), 'Instagram');
        await userEvent.type(screen.getByLabelText('URL'), 'https://instagram.com/artniyyetli');

        await userEvent.click(screen.getByRole('button', { name: 'Media-dan seç' }));
        await userEvent.click(await screen.findByRole('img', { name: 'Media' }));
        expect(screen.getByRole('img', { name: 'Seçilmiş şəkil' })).toHaveAttribute('src', 'https://example.test/instagram.webp');

        await userEvent.selectOptions(screen.getByLabelText('Görünüş rejimi'), 'logo_only');
        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            const post = global.fetch.mock.calls.find(([url, options]) => url === '/admin/social-links' && options?.method === 'POST');
            expect(JSON.parse(post[1].body)).toEqual({
                platform: 'Instagram',
                url: 'https://instagram.com/artniyyetli',
                logo_media_id: 5,
                display_mode: 'logo_only',
                is_active: true,
            });
        });
    });

    it('shows the backend logo error when logo only is chosen without a logo', async () => {
        global.fetch = vi.fn((url, options) => {
            if (url === '/admin/social-links' && options?.method === 'GET') return Promise.resolve(jsonResponse(200, { data: [] }));

            return Promise.resolve(
                jsonResponse(422, {
                    message: 'The given data was invalid.',
                    errors: { logo_media_id: ['A logo is required when the display mode is logo only.'] },
                })
            );
        });

        renderScreen();

        await screen.findByText('Hələ heç bir əlaqə yoxdur');
        await userEvent.click(screen.getByRole('button', { name: 'Yeni əlaqə' }));
        await userEvent.type(screen.getByLabelText('Platforma'), 'Instagram');
        await userEvent.type(screen.getByLabelText('URL'), 'https://instagram.com/artniyyetli');
        await userEvent.selectOptions(screen.getByLabelText('Görünüş rejimi'), 'logo_only');
        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        expect(await screen.findByText('A logo is required when the display mode is logo only.')).toBeInTheDocument();
    });
});
