import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PagesScreen from '../screens/PagesScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const pageDetail = {
    id: 1,
    type: 'home',
    is_active: true,
    translations: [
        { locale: 'az', slug: 'home', title: 'Ana səhifə başlığı', content: 'AZ məzmun' },
        { locale: 'en', slug: 'home-en', title: 'Home title', content: 'EN content' },
    ],
    sections: [],
};

describe('PagesScreen', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url) => {
            if (url === '/admin/pages') {
                return Promise.resolve(jsonResponse(200, { data: [{ id: 1, type: 'home', is_active: true, translation: { title: 'Ana səhifə başlığı' } }] }));
            }
            if (url === '/admin/pages/1') {
                return Promise.resolve(jsonResponse(200, { data: pageDetail }));
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });
    });

    async function openEditor() {
        render(
            <ToastProvider>
                <PagesScreen />
            </ToastProvider>
        );

        await userEvent.click(await screen.findByRole('button', { name: 'Redaktə et' }));
        await screen.findByDisplayValue('Ana səhifə başlığı');
    }

    it('renders the AZ title by default and switches to EN on tab click', async () => {
        await openEditor();

        expect(screen.getByDisplayValue('Ana səhifə başlığı')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('tab', { name: 'EN' }));

        expect(screen.getByDisplayValue('Home title')).toBeInTheDocument();
    });

    it('preserves the edited value and shows the field error after a failed save, then shows success on retry', async () => {
        await openEditor();

        const titleInput = screen.getByDisplayValue('Ana səhifə başlığı');
        await userEvent.clear(titleInput);
        await userEvent.type(titleInput, 'Yeni başlıq');

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve(
                jsonResponse(422, { message: 'The given data was invalid.', errors: { 'translations.0.title': ['Title is required.'] } })
            )
        );

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getByText('Title is required.')).toBeInTheDocument();
        });
        expect(screen.getByDisplayValue('Yeni başlıq')).toBeInTheDocument();

        global.fetch.mockImplementation(() => Promise.resolve(jsonResponse(200, { data: pageDetail })));

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getByText('Yadda saxlanıldı')).toBeInTheDocument();
        });
    });
});
