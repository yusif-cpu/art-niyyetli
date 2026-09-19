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

const brandedSettings = {
    ...settings,
    brand_text: 'ArtNiyyətli',
    logo_display_mode: 'logo_text',
    logo_media_id: null,
    logo_url: null,
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

    it('pre-fills brand text and display mode, and shows a logo preview when one is set', async () => {
        global.fetch = vi.fn().mockResolvedValue(
            jsonResponse(200, { data: { ...brandedSettings, logo_media_id: 7, logo_url: 'https://example.test/logo.webp' } })
        );

        render(
            <ToastProvider>
                <SettingsScreen />
            </ToastProvider>
        );

        expect(await screen.findByDisplayValue('ArtNiyyətli')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toHaveValue('logo_text');
        expect(screen.getByRole('img', { name: 'Seçilmiş şəkil' })).toHaveAttribute('src', 'https://example.test/logo.webp');
    });

    it('changing the display mode and saving includes the new value in the request body', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: brandedSettings }));

        render(
            <ToastProvider>
                <SettingsScreen />
            </ToastProvider>
        );

        await screen.findByDisplayValue('ArtNiyyətli');
        await userEvent.selectOptions(screen.getByRole('combobox'), 'logo_only');

        global.fetch.mockResolvedValueOnce(jsonResponse(200, { data: { ...brandedSettings, logo_display_mode: 'logo_only' } }));
        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            const [, options] = global.fetch.mock.calls.at(-1);
            expect(JSON.parse(options.body)).toMatchObject({ logo_display_mode: 'logo_only' });
        });
    });
});
