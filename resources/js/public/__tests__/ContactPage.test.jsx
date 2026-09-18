import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import ContactPage from '../pages/ContactPage.jsx';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

const SUBJECTS = [
    { key: 'buy', label: 'Əsər almaq' },
    { key: 'general_contact', label: 'Ümumi əlaqə' },
    { key: 'artist_submission', label: 'Rəssam müraciəti' },
    { key: 'media', label: 'Media sorğusu' },
    { key: 'exhibition_invitation', label: 'Sərgi / dəvət' },
    { key: 'collaboration', label: 'Əməkdaşlıq' },
];

describe('ContactPage', () => {
    it('renders all six subjects and submits the selected one without an artwork_code', async () => {
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/api/v1/enquiry-subjects')) {
                return Promise.resolve(jsonResponse(200, { data: SUBJECTS }));
            }
            return Promise.resolve(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));
        });

        render(<LocaleProvider><ContactPage /></LocaleProvider>);

        await screen.findByText('Əlaqə');
        SUBJECTS.forEach((item) => {
            expect(screen.getByRole('option', { name: item.label })).toBeInTheDocument();
        });

        await userEvent.selectOptions(screen.getByLabelText('Mövzu'), 'media');
        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        await screen.findByText('Sorğunuz qeydə alındı.');

        const submitCall = global.fetch.mock.calls.find(([url]) => url === '/api/v1/enquiries');
        const body = JSON.parse(submitCall[1].body);
        expect(body.subject).toBe('media');
        expect(body).not.toHaveProperty('artwork_code');
    });
});
