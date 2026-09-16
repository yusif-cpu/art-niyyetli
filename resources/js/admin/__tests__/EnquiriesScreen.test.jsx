import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EnquiriesScreen from '../screens/EnquiriesScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const listItems = [
    {
        id: 1,
        name: 'Aysel Məmmədova',
        email: 'aysel@example.com',
        phone: '+994501234567',
        message: 'Bu əsər haqqında məlumat almaq istəyirəm.',
        status: 'new',
        internal_note: null,
        artwork: { id: 1, inventory_code: 'AN-000001', title: 'Yaz mənzərəsi' },
        created_at: '2026-09-16T10:00:00Z',
    },
    {
        id: 2,
        name: 'Elvin Quliyev',
        email: 'elvin@example.com',
        phone: null,
        message: 'Qiyməti barədə məlumat verə bilərsiniz?',
        status: 'closed',
        internal_note: null,
        artwork: { id: 2, inventory_code: 'AN-000002', title: 'Payız' },
        created_at: '2026-09-15T10:00:00Z',
    },
];

describe('EnquiriesScreen', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/admin/enquiries/1')) {
                return Promise.resolve(jsonResponse(200, { data: listItems[0] }));
            }
            if (url.startsWith('/admin/enquiries?status=new')) {
                return Promise.resolve(jsonResponse(200, { data: [listItems[0]] }));
            }
            if (url.startsWith('/admin/enquiries?') && url.includes('search=')) {
                return Promise.resolve(jsonResponse(200, { data: [listItems[0]] }));
            }
            if (url.startsWith('/admin/enquiries')) {
                return Promise.resolve(jsonResponse(200, { data: listItems }));
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });
    });

    it('renders the enquiry list', async () => {
        render(
            <ToastProvider>
                <EnquiriesScreen />
            </ToastProvider>
        );

        await screen.findByText('Aysel Məmmədova — aysel@example.com');
        expect(screen.getByText('Elvin Quliyev — elvin@example.com')).toBeInTheDocument();
    });

    it('renders the empty state when no enquiries match', async () => {
        global.fetch = vi.fn(() => Promise.resolve(jsonResponse(200, { data: [] })));

        render(
            <ToastProvider>
                <EnquiriesScreen />
            </ToastProvider>
        );

        await screen.findByText('Sorğu tapılmadı');
    });

    it('requests the status filter when changed', async () => {
        render(
            <ToastProvider>
                <EnquiriesScreen />
            </ToastProvider>
        );

        await screen.findByText('Aysel Məmmədova — aysel@example.com');

        await userEvent.selectOptions(screen.getByDisplayValue('Bütün statuslar'), 'new');

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('status=new'), expect.anything());
        });
    });

    it('requests the search filter when typed', async () => {
        render(
            <ToastProvider>
                <EnquiriesScreen />
            </ToastProvider>
        );

        await screen.findByText('Aysel Məmmədova — aysel@example.com');

        await userEvent.type(screen.getByPlaceholderText('Ad, e-poçt və ya inventar kodu'), 'Aysel');

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('search=Aysel'), expect.anything());
        });
    });

    it('opens the detail screen and shows the message', async () => {
        render(
            <ToastProvider>
                <EnquiriesScreen />
            </ToastProvider>
        );

        await screen.findByText('Aysel Məmmədova — aysel@example.com');
        await userEvent.click(screen.getAllByRole('button', { name: 'Bax' })[0]);

        await screen.findByText('Bu əsər haqqında məlumat almaq istəyirəm.');
        expect(screen.getByText('Yaz mənzərəsi (AN-000001)')).toBeInTheDocument();
    });

    it('updates the status and shows a success toast', async () => {
        render(
            <ToastProvider>
                <EnquiriesScreen />
            </ToastProvider>
        );

        await screen.findByText('Aysel Məmmədova — aysel@example.com');
        await userEvent.click(screen.getAllByRole('button', { name: 'Bax' })[0]);
        await screen.findByText('Bu əsər haqqında məlumat almaq istəyirəm.');

        global.fetch.mockImplementationOnce((url, options) => {
            expect(options.method).toBe('PUT');
            return Promise.resolve(jsonResponse(200, { data: { ...listItems[0], status: 'replied' } }));
        });

        await userEvent.selectOptions(screen.getByDisplayValue('Yeni'), 'replied');

        await waitFor(() => {
            expect(screen.getByText('Status yeniləndi')).toBeInTheDocument();
        });
    });

    it('saves the internal note and shows a success toast', async () => {
        render(
            <ToastProvider>
                <EnquiriesScreen />
            </ToastProvider>
        );

        await screen.findByText('Aysel Məmmədova — aysel@example.com');
        await userEvent.click(screen.getAllByRole('button', { name: 'Bax' })[0]);
        await screen.findByText('Bu əsər haqqında məlumat almaq istəyirəm.');

        const noteField = screen.getByLabelText('Daxili qeyd');
        await userEvent.type(noteField, 'Zəng edildi.');

        global.fetch.mockImplementationOnce((url, options) => {
            expect(options.method).toBe('PUT');
            expect(JSON.parse(options.body)).toEqual({ internal_note: 'Zəng edildi.' });
            return Promise.resolve(jsonResponse(200, { data: { ...listItems[0], internal_note: 'Zəng edildi.' } }));
        });

        await userEvent.click(screen.getByRole('button', { name: 'Qeydi saxla' }));

        await waitFor(() => {
            expect(screen.getByText('Qeyd yadda saxlanıldı')).toBeInTheDocument();
        });
    });
});
