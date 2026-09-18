import { render, screen, waitFor, within } from '@testing-library/react';
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
        subject: 'Almaq',
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

const listMeta = { current_page: 1, last_page: 1, total: listItems.length };

describe('EnquiriesScreen', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/admin/enquiries/1')) {
                return Promise.resolve(jsonResponse(200, { data: listItems[0] }));
            }
            if (url.startsWith('/admin/enquiries?') && url.includes('status=new')) {
                return Promise.resolve(jsonResponse(200, { data: [listItems[0]], meta: { current_page: 1, last_page: 1, total: 1 } }));
            }
            if (url.startsWith('/admin/enquiries?') && url.includes('search=')) {
                return Promise.resolve(jsonResponse(200, { data: [listItems[0]], meta: { current_page: 1, last_page: 1, total: 1 } }));
            }
            if (url.startsWith('/admin/enquiries')) {
                return Promise.resolve(jsonResponse(200, { data: listItems, meta: listMeta }));
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

    it('shows the enquiry subject in the list row', async () => {
        render(
            <ToastProvider>
                <EnquiriesScreen />
            </ToastProvider>
        );

        const row = (await screen.findByText('Aysel Məmmədova — aysel@example.com')).closest('li');
        expect(within(row).getByText((text) => text.includes('Almaq'))).toBeInTheDocument();
    });

    it('reloads the list when enquiryRefreshSignal changes', async () => {
        const { rerender } = render(
            <ToastProvider>
                <EnquiriesScreen enquiryRefreshSignal={0} />
            </ToastProvider>
        );

        await screen.findByText('Aysel Məmmədova — aysel@example.com');
        const callsBefore = global.fetch.mock.calls.length;

        rerender(
            <ToastProvider>
                <EnquiriesScreen enquiryRefreshSignal={1} />
            </ToastProvider>
        );

        await waitFor(() => expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore));
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

    it('requests the subject filter when changed', async () => {
        render(
            <ToastProvider>
                <EnquiriesScreen />
            </ToastProvider>
        );

        await screen.findByText('Aysel Məmmədova — aysel@example.com');

        await userEvent.selectOptions(screen.getByDisplayValue('Bütün mövzular'), 'media');

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('subject=media'), expect.anything());
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

    it('shows the loading state before the list renders', async () => {
        let resolveFetch;
        global.fetch = vi.fn(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve;
                })
        );

        render(
            <ToastProvider>
                <EnquiriesScreen />
            </ToastProvider>
        );

        expect(screen.getByText('Yüklənir...')).toBeInTheDocument();

        resolveFetch(jsonResponse(200, { data: listItems, meta: listMeta }));

        await screen.findByText('Aysel Məmmədova — aysel@example.com');
        expect(screen.queryByText('Yüklənir...')).not.toBeInTheDocument();
    });

    it('shows the unread marker on new enquiries but not on others', async () => {
        render(
            <ToastProvider>
                <EnquiriesScreen />
            </ToastProvider>
        );

        await screen.findByText('Aysel Məmmədova — aysel@example.com');

        const newRow = screen.getByText('Aysel Məmmədova — aysel@example.com').closest('li');
        const closedRow = screen.getByText('Elvin Quliyev — elvin@example.com').closest('li');

        expect(newRow.className).toContain('border-l-4');
        expect(newRow.className).toContain('border-l-red-600');
        expect(newRow.querySelector('span')).toHaveTextContent('Yeni');

        expect(closedRow.className).not.toContain('border-l-red-600');
        expect(closedRow.querySelector('span')).toBeNull();
    });

    it('renders pagination when there is more than one page and fetches the next page', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve(jsonResponse(200, { data: listItems, meta: { current_page: 1, last_page: 2, total: 4 } }))
        );

        render(
            <ToastProvider>
                <EnquiriesScreen />
            </ToastProvider>
        );

        await screen.findByText('Aysel Məmmədova — aysel@example.com');
        expect(screen.getByText('1 / 2 səhifə (4 nəticə)')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Növbəti' }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything());
        });
    });

    it('shows an error banner when the request fails', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('network error')));

        render(
            <ToastProvider>
                <EnquiriesScreen />
            </ToastProvider>
        );

        await screen.findByText('Sorğuları yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.');
        expect(screen.queryByText('Yüklənir...')).not.toBeInTheDocument();
    });
});
