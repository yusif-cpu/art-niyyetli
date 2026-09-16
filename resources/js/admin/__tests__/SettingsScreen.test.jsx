import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import SettingsScreen from '../screens/SettingsScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const settings = {
    contact_email: 'info@artniyyetli.az',
    phone: '+994 50 000 00 00',
    address: 'Bakı',
    opening_hours: '10:00-18:00',
    footer_text: 'ArtNiyyətli © 2026',
};

describe('SettingsScreen', () => {
    it('pre-fills the form with the current settings', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: settings }));

        render(
            <ToastProvider>
                <SettingsScreen />
            </ToastProvider>
        );

        expect(await screen.findByDisplayValue('info@artniyyetli.az')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Bakı')).toBeInTheDocument();
    });

    it('shows a field error on invalid input and preserves other field values, then shows success on retry', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: settings }));

        render(
            <ToastProvider>
                <SettingsScreen />
            </ToastProvider>
        );

        const emailInput = await screen.findByDisplayValue('info@artniyyetli.az');
        await userEvent.clear(emailInput);
        await userEvent.type(emailInput, 'not-an-email');

        global.fetch.mockResolvedValueOnce(
            jsonResponse(422, { message: 'The given data was invalid.', errors: { contact_email: ['Düzgün e-poçt daxil edin.'] } })
        );

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getAllByText('Düzgün e-poçt daxil edin.').length).toBeGreaterThan(0);
        });
        expect(screen.getByDisplayValue('Bakı')).toBeInTheDocument();

        global.fetch.mockResolvedValue(jsonResponse(200, { data: settings }));
        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getByText('Ayarlar yadda saxlanıldı')).toBeInTheDocument();
        });
    });
});
