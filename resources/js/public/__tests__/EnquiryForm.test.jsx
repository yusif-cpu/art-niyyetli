import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import EnquiryForm from '../components/EnquiryForm.jsx';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

describe('EnquiryForm', () => {
    it('renders a visually-hidden but present honeypot field', () => {
        render(<LocaleProvider><EnquiryForm artworkCode="AN-1" /></LocaleProvider>);
        const honeypot = document.querySelector('input[name="website"]');
        expect(honeypot).toBeInTheDocument();
        expect(honeypot).not.toHaveAttribute('type', 'hidden');
        expect(honeypot.closest('div')).toHaveStyle({ position: 'absolute' });
    });

    it('submits the form and shows the success message, disabling the submit button', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));

        render(<LocaleProvider><EnquiryForm artworkCode="AN-1" /></LocaleProvider>);

        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        expect(await screen.findByText('Sorğunuz qeydə alındı.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Göndər' })).toBeDisabled();
    });

    it('shows a friendly rate-limit message on 429 and keeps the button disabled', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(429, { message: 'Too Many Attempts.' }));

        render(<LocaleProvider><EnquiryForm artworkCode="AN-1" /></LocaleProvider>);

        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        expect(await screen.findByText('Həddindən çox sorğu göndərildi. Zəhmət olmasa bir az sonra yenidən cəhd edin.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Göndər' })).toBeDisabled();
    });

    it('shows field-level errors on a 422 and leaves the button enabled', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(422, { message: 'The given data was invalid.', errors: { email: ['The email field is required.'] } }));

        render(<LocaleProvider><EnquiryForm artworkCode="AN-1" /></LocaleProvider>);

        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        expect(await screen.findByText('The email field is required.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Göndər' })).not.toBeDisabled();
    });

    it('recovers to an enabled, retryable state on a non-API failure (e.g. network error)', async () => {
        global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

        render(<LocaleProvider><EnquiryForm artworkCode="AN-1" /></LocaleProvider>);

        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        expect(await screen.findByText('Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Göndər' })).not.toBeDisabled();
    });
});
