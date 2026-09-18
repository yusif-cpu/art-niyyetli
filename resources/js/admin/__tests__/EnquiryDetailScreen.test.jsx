import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EnquiryDetailScreen from '../screens/EnquiryDetailScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

function buildEnquiry(overrides = {}) {
    return {
        id: 1,
        name: 'Aysel Məmmədova',
        email: 'aysel@example.com',
        phone: '+994501234567',
        message: 'Bu əsər haqqında məlumat almaq istəyirəm.',
        status: 'new',
        internal_note: null,
        inventory_code: 'AN-000001',
        subject: null,
        submitted_at: '2026-09-16T10:00:00Z',
        artwork: { id: 1, inventory_code: 'AN-000001', title: 'Yaz mənzərəsi' },
        replies: [],
        created_at: '2026-09-16T10:00:00Z',
        ...overrides,
    };
}

function renderScreen(enquiryId = 1) {
    return render(
        <ToastProvider>
            <EnquiryDetailScreen enquiryId={enquiryId} onBack={() => {}} />
        </ToastProvider>
    );
}

describe('EnquiryDetailScreen', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/admin/enquiries/1')) {
                return Promise.resolve(jsonResponse(200, { data: buildEnquiry() }));
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });
    });

    it('sends a reply and shows a success toast, then clears the form', async () => {
        renderScreen();

        await screen.findByText('Bu əsər haqqında məlumat almaq istəyirəm.');

        await userEvent.click(screen.getByRole('button', { name: 'Müştəriyə cavab yaz' }));

        const messageField = screen.getByLabelText('Mesaj');
        await userEvent.type(messageField, 'Təşəkkür edirik, tezliklə əlaqə saxlayacağıq.');

        global.fetch.mockImplementationOnce((url, options) => {
            expect(url).toBe('/admin/enquiries/1/reply');
            expect(options.method).toBe('POST');
            expect(JSON.parse(options.body)).toEqual({
                subject: 'Re: AN-000001',
                message: 'Təşəkkür edirik, tezliklə əlaqə saxlayacağıq.',
            });
            return Promise.resolve(
                jsonResponse(200, {
                    data: {
                        id: 5,
                        recipient: 'aysel@example.com',
                        subject: 'Re: AN-000001',
                        message: 'Təşəkkür edirik, tezliklə əlaqə saxlayacağıq.',
                        status: 'sent',
                        sent_at: '2026-09-17T09:00:00Z',
                        created_at: '2026-09-17T09:00:00Z',
                    },
                })
            );
        });

        // Re-fetch after a successful reply.
        global.fetch.mockImplementationOnce(() =>
            Promise.resolve(
                jsonResponse(200, {
                    data: buildEnquiry({
                        status: 'replied',
                        replies: [
                            {
                                id: 5,
                                recipient: 'aysel@example.com',
                                subject: 'Re: AN-000001',
                                message: 'Təşəkkür edirik, tezliklə əlaqə saxlayacağıq.',
                                status: 'sent',
                                sent_at: '2026-09-17T09:00:00Z',
                                created_at: '2026-09-17T09:00:00Z',
                            },
                        ],
                    }),
                })
            )
        );

        await userEvent.click(screen.getByRole('button', { name: 'Cavab göndər' }));

        await waitFor(() => {
            expect(screen.getByText('Cavab göndərildi')).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Müştəriyə cavab yaz' })).toBeInTheDocument();
        });
        expect(screen.queryByLabelText('Mesaj')).not.toBeInTheDocument();
    });

    it('shows the recipient and the original message inside the reply form', async () => {
        renderScreen();

        await screen.findByText('Bu əsər haqqında məlumat almaq istəyirəm.');

        await userEvent.click(screen.getByRole('button', { name: 'Müştəriyə cavab yaz' }));

        expect(screen.getByText('Orijinal mesaj:')).toBeInTheDocument();
        expect(screen.getAllByText('Bu əsər haqqında məlumat almaq istəyirəm.')).toHaveLength(2);
        expect(screen.getByText((_, node) => node.textContent === 'Alıcı: Aysel Məmmədova <aysel@example.com>')).toBeInTheDocument();
    });

    it('disables the send button while a reply is in flight to prevent duplicate submission', async () => {
        renderScreen();

        await screen.findByText('Bu əsər haqqında məlumat almaq istəyirəm.');
        await userEvent.click(screen.getByRole('button', { name: 'Müştəriyə cavab yaz' }));
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam.');

        let resolveReply;
        global.fetch.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveReply = resolve;
                })
        );

        const sendButton = screen.getByRole('button', { name: 'Cavab göndər' });
        await userEvent.click(sendButton);

        await waitFor(() => expect(sendButton).toBeDisabled());

        resolveReply(
            jsonResponse(200, {
                data: { id: 5, recipient: 'aysel@example.com', subject: 'Re: AN-000001', message: 'Salam.', status: 'sent', sent_at: null, created_at: null },
            })
        );
    });

    it('shows the real backend error message in the form banner when sending fails', async () => {
        renderScreen();

        await screen.findByText('Bu əsər haqqında məlumat almaq istəyirəm.');

        await userEvent.click(screen.getByRole('button', { name: 'Müştəriyə cavab yaz' }));

        const messageField = screen.getByLabelText('Mesaj');
        await userEvent.type(messageField, 'Salam, məlumat üçün təşəkkürlər.');

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve(jsonResponse(502, { message: 'Cavab göndərilə bilmədi. Zəhmət olmasa yenidən cəhd edin.' }))
        );

        await userEvent.click(screen.getByRole('button', { name: 'Cavab göndər' }));

        await screen.findByText('Cavab göndərilə bilmədi. Zəhmət olmasa yenidən cəhd edin.');
        // The form should remain open with the entered message intact.
        expect(screen.getByLabelText('Mesaj')).toHaveValue('Salam, məlumat üçün təşəkkürlər.');
    });

    it('renders the reply history from the initial fetch', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve(
                jsonResponse(200, {
                    data: buildEnquiry({
                        status: 'replied',
                        replies: [
                            {
                                id: 9,
                                recipient: 'aysel@example.com',
                                subject: 'Re: AN-000001',
                                message: 'Sizin sorğunuza cavab veririk.',
                                status: 'sent',
                                sent_at: '2026-09-16T12:00:00Z',
                                created_at: '2026-09-16T12:00:00Z',
                            },
                        ],
                    }),
                })
            )
        );

        renderScreen();

        await screen.findByText('Sizin sorğunuza cavab veririk.');
        expect(screen.getByText('Re: AN-000001')).toBeInTheDocument();
        expect(screen.getByText(new Date('2026-09-16T12:00:00Z').toLocaleString('az'))).toBeInTheDocument();
    });

    it('hides the artwork row when the enquiry has no artwork', async () => {
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/admin/enquiries/1')) {
                return Promise.resolve(
                    jsonResponse(200, { data: buildEnquiry({ artwork: null, inventory_code: null, subject: 'Ümumi əlaqə' }) })
                );
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });

        renderScreen();

        await screen.findByText('Bu əsər haqqında məlumat almaq istəyirəm.');
        expect(screen.queryByText('Əsər:')).not.toBeInTheDocument();
        expect(screen.getByText('Ümumi əlaqə')).toBeInTheDocument();
    });
});
