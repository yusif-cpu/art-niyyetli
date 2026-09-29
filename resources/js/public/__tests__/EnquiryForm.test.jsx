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
        render(<LocaleProvider><EnquiryForm subject="buy" artworkCode="AN-1" /></LocaleProvider>);
        const honeypot = document.querySelector('input[name="website"]');
        expect(honeypot).toBeInTheDocument();
        expect(honeypot).not.toHaveAttribute('type', 'hidden');
        expect(honeypot.closest('div')).toHaveStyle({ position: 'absolute' });
    });

    it('submits the form and shows the success message, disabling the submit button', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));

        render(<LocaleProvider><EnquiryForm subject="buy" artworkCode="AN-1" /></LocaleProvider>);

        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        expect(await screen.findByText('Sorğunuz qeydə alındı.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Göndər' })).toBeDisabled();
    });

    it('shows a friendly rate-limit message on 429 and keeps the button disabled', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(429, { message: 'Too Many Attempts.' }));

        render(<LocaleProvider><EnquiryForm subject="buy" artworkCode="AN-1" /></LocaleProvider>);

        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        expect(await screen.findByText('Həddindən çox sorğu göndərildi. Zəhmət olmasa bir az sonra yenidən cəhd edin.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Göndər' })).toBeDisabled();
    });

    it('shows field-level errors on a 422 and leaves the button enabled', async () => {
        // A server-only rejection unreachable by client validation: every required field is filled, but the artwork
        // named by the (non-editable) artworkCode prop is no longer available.
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(422, { message: 'The given data was invalid.', errors: { artwork_code: ['This artwork is no longer available.'] } }));

        render(<LocaleProvider><EnquiryForm subject="buy" artworkCode="AN-1" /></LocaleProvider>);

        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        expect(await screen.findByText('This artwork is no longer available.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Göndər' })).not.toBeDisabled();
        expect(screen.getByLabelText('Əsərin kodu')).toHaveFocus();
    });

    it('blocks submission and shows required-field messages when name, email or message are empty, without calling the API', async () => {
        global.fetch = vi.fn();

        render(<LocaleProvider><EnquiryForm subject="buy" artworkCode="AN-1" /></LocaleProvider>);

        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        expect(await screen.findAllByText('Bu sahə mütləqdir.')).toHaveLength(3);
        expect(screen.getByLabelText('Ad')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('E-poçt')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Mesaj')).toHaveAttribute('aria-invalid', 'true');
        expect(global.fetch).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Ad')).toHaveFocus();
    });

    it('does not require the optional phone field', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));

        render(<LocaleProvider><EnquiryForm subject="buy" artworkCode="AN-1" /></LocaleProvider>);

        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        expect(await screen.findByText('Sorğunuz qeydə alındı.')).toBeInTheDocument();
    });

    it('recovers to an enabled, retryable state on a non-API failure (e.g. network error)', async () => {
        global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

        render(<LocaleProvider><EnquiryForm subject="buy" artworkCode="AN-1" /></LocaleProvider>);

        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        expect(await screen.findByText('Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Göndər' })).not.toBeDisabled();
    });

    it('includes subject and omits artwork_code when no artworkCode is provided', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));

        render(<LocaleProvider><EnquiryForm subject="general_contact" /></LocaleProvider>);

        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        await screen.findByText('Sorğunuz qeydə alındı.');

        const [, options] = global.fetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.subject).toBe('general_contact');
        expect(body).not.toHaveProperty('artwork_code');
    });
});
