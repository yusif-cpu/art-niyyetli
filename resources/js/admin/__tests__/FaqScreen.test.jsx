import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FaqScreen from '../screens/FaqScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const oneFaq = { id: 1, page_id: 1, sort_order: 0, is_active: true, translation: { locale: 'az', question: 'Necə sifariş verim?', answer: 'Sorğu göndərin.' } };
const onePage = { id: 1, translation: { title: 'Kolleksionerlər üçün' } };

function setupFetch({ faqs = [oneFaq] } = {}) {
    global.fetch = vi.fn((url, options) => {
        if (url === '/admin/faqs' && options?.method === 'GET') {
            return Promise.resolve(jsonResponse(200, { data: faqs }));
        }
        if (url === '/admin/pages') {
            return Promise.resolve(jsonResponse(200, { data: [onePage] }));
        }
        if (url === '/admin/faqs' && options?.method === 'POST') {
            return Promise.resolve(jsonResponse(200, { data: oneFaq }));
        }
        if (url.startsWith('/admin/faqs/') && options?.method === 'DELETE') {
            return Promise.resolve(jsonResponse(200, { message: 'FAQ deleted.' }));
        }
        return Promise.resolve(jsonResponse(200, { data: {} }));
    });
}

describe('FaqScreen', () => {
    it('renders the FAQ list from the backend', async () => {
        setupFetch();

        render(
            <ToastProvider>
                <FaqScreen />
            </ToastProvider>
        );

        expect(await screen.findByText('Necə sifariş verim?')).toBeInTheDocument();
    });

    it('deletes a FAQ after confirming the dialog', async () => {
        setupFetch();

        render(
            <ToastProvider>
                <FaqScreen />
            </ToastProvider>
        );

        await screen.findByText('Necə sifariş verim?');
        await userEvent.click(screen.getByRole('button', { name: 'Sil' }));

        expect(screen.getByText('Sualı silmək istədiyinizə əminsiniz?')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Təsdiqlə' }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/admin/faqs/1', expect.objectContaining({ method: 'DELETE' }));
        });
    });
});
