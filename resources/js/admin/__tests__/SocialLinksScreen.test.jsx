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
