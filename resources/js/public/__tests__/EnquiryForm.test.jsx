import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import EnquiryForm from '../components/EnquiryForm.jsx';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

const SUCCESS = 'Mesajınız uğurla göndərildi.';

async function fillAll() {
    await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
    await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
    await userEvent.type(screen.getByLabelText('Telefon (istəyə görə)'), '070 353 05 12');
    await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
}

function expectFilled() {
    expect(screen.getByLabelText('Ad')).toHaveValue('Aysel');
    expect(screen.getByLabelText('E-poçt')).toHaveValue('aysel@example.com');
    expect(screen.getByLabelText('Telefon (istəyə görə)')).toHaveValue('070 353 05 12');
    expect(screen.getByLabelText('Mesaj')).toHaveValue('Salam');
}

describe('EnquiryForm', () => {
    // (was: an inline style { position: absolute }) — the position is the `honeypot` class in public.css now.
    it('renders a visually-hidden but present honeypot field, moved off-screen by a class, not a style attribute', () => {
        render(<LocaleProvider><EnquiryForm subject="buy" artworkCode="AN-1" /></LocaleProvider>);
        const honeypot = document.querySelector('input[name="website"]');
        expect(honeypot).toBeInTheDocument();
        expect(honeypot).not.toHaveAttribute('type', 'hidden');
        const wrapper = screen.getByTestId('honeypot');
        expect(wrapper).toHaveClass('honeypot');
        expect(wrapper).not.toHaveAttribute('style');
        expect(wrapper.className).not.toMatch(/hidden|sr-only/);
        expect(document.querySelectorAll('form [style]')).toHaveLength(0);
    });

    it('keeps the honeypot rule off-screen, never display:none', () => {
        const css = readFileSync(resolve(__dirname, '../../../css/public.css'), 'utf8');
        const rule = /\.honeypot \{([^}]*)\}/.exec(css)[1];
        expect(rule).toMatch(/position: absolute;/);
        expect(rule).toMatch(/left: -9999px;/);
        expect(rule).not.toMatch(/display|visibility/);
    });

    it('hides the honeypot from screen readers: aria-hidden, no accessible name, out of the Tab order', () => {
        render(<LocaleProvider><EnquiryForm subject="buy" artworkCode="AN-1" /></LocaleProvider>);

        const honeypot = document.querySelector('input[name="website"]');
        expect(screen.getByTestId('honeypot')).toHaveAttribute('aria-hidden', 'true');
        expect(honeypot.labels).toHaveLength(0);
        expect(honeypot).not.toHaveAttribute('aria-label');
        expect(honeypot).not.toHaveAttribute('aria-labelledby');
        expect(honeypot).toHaveAttribute('tabindex', '-1');
        expect(honeypot).toHaveAttribute('autocomplete', 'off');
        // Not in the accessibility tree: the visible textboxes are the real fields only.
        expect(screen.getAllByRole('textbox')).not.toContain(honeypot);
        expect(screen.queryByText('Website')).not.toBeInTheDocument();
    });

    // (was: the message, the fields still filled and the button disabled for good) — the form now empties itself.
    it('on success: shows the message in a polite live region, empties every field, keeps the artwork code', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));
        const onSuccess = vi.fn();

        render(<LocaleProvider><EnquiryForm subject="buy" artworkCode="AN-1" onSuccess={onSuccess} /></LocaleProvider>);
        await fillAll();
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        const region = screen.getByTestId('enquiry-success');
        await waitFor(() => expect(region).toHaveTextContent(SUCCESS));
        expect(region).toHaveAttribute('aria-live', 'polite');
        expect(region).toHaveAttribute('role', 'status');
        for (const label of ['Ad', 'E-poçt', 'Telefon (istəyə görə)', 'Mesaj']) expect(screen.getByLabelText(label)).toHaveValue('');
        expect(document.querySelector('input[name="website"]')).toHaveValue('');
        expect(screen.getByLabelText('Əsərin kodu')).toHaveValue('AN-1'); // a prop: stays
        expect(onSuccess).toHaveBeenCalledTimes(1);
        // The button stays closed until the visitor touches the form again.
        expect(screen.getByRole('button', { name: 'Göndər' })).toBeDisabled();
    });

    it('moves the focus to the success message after sending, so a keyboard user hears what happened', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));

        render(<LocaleProvider><EnquiryForm subject="general_contact" /></LocaleProvider>);
        await fillAll();
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        const region = screen.getByTestId('enquiry-success');
        await waitFor(() => expect(region).toHaveFocus());
        expect(region).toHaveAttribute('tabindex', '-1');
    });

    it('shows success in ink with a 1px line: no Signal, no green, no shadow, no radius', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));

        render(<LocaleProvider><EnquiryForm subject="general_contact" /></LocaleProvider>);
        await fillAll();
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        const region = screen.getByTestId('enquiry-success');
        await waitFor(() => expect(region).toHaveTextContent(SUCCESS));
        expect(region).toHaveClass('text-ink', 'border', 'border-line');
        expect(region.className).not.toMatch(/signal|green|shadow|rounded|uppercase|gradient/);
        expect(region).not.toHaveAttribute('style');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('keeps the success region in the DOM, empty, before anything is sent, apart from the error region', async () => {
        global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        render(<LocaleProvider><EnquiryForm subject="general_contact" /></LocaleProvider>);

        const region = screen.getByTestId('enquiry-success');
        expect(region).toBeEmptyDOMElement();
        expect(region).toHaveAttribute('aria-live', 'polite');

        await fillAll();
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));
        const alert = await screen.findByRole('alert');
        expect(alert).not.toBe(region);
        expect(region).toBeEmptyDOMElement();
    });

    it('shows the message only once the API has answered, and blocks a second send while it is in flight', async () => {
        let answer;
        global.fetch = vi.fn(() => new Promise((done) => { answer = () => done(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' })); }));

        const { container } = render(<LocaleProvider><EnquiryForm subject="general_contact" /></LocaleProvider>);
        await fillAll();
        const button = screen.getByRole('button', { name: 'Göndər' });
        await userEvent.click(button);

        expect(button).toBeDisabled();
        expect(container.querySelector('form')).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByTestId('enquiry-success')).toBeEmptyDOMElement();
        // A second click, and a submit the button cannot block (Enter in a field → requestSubmit).
        await userEvent.click(button);
        fireEvent.submit(container.querySelector('form'));
        expect(global.fetch).toHaveBeenCalledTimes(1);
        // The values stay until the answer comes.
        expect(screen.getByLabelText('Ad')).toHaveValue('Aysel');

        await act(async () => answer());
        await waitFor(() => expect(screen.getByTestId('enquiry-success')).toHaveTextContent(SUCCESS));
        expect(container.querySelector('form')).not.toHaveAttribute('aria-busy');
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('clears the success message and opens the button again as soon as the visitor types in any field', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));

        render(<LocaleProvider><EnquiryForm subject="general_contact" /></LocaleProvider>);
        await fillAll();
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));
        await waitFor(() => expect(screen.getByTestId('enquiry-success')).toHaveTextContent(SUCCESS));

        await userEvent.type(screen.getByLabelText('Telefon (istəyə görə)'), '0');

        expect(screen.getByTestId('enquiry-success')).toBeEmptyDOMElement();
        expect(screen.getByRole('button', { name: 'Göndər' })).not.toBeDisabled();
    });

    it('clears the earlier validation errors on a successful send', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));

        render(<LocaleProvider><EnquiryForm subject="general_contact" /></LocaleProvider>);
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));
        expect(await screen.findAllByText('Bu sahə mütləqdir.')).toHaveLength(3);

        await fillAll();
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        await waitFor(() => expect(screen.getByTestId('enquiry-success')).toHaveTextContent(SUCCESS));
        expect(screen.queryByText('Bu sahə mütləqdir.')).not.toBeInTheDocument();
        expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('keeps everything the visitor wrote when the send fails (server error)', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(500, { message: 'Server Error' }));
        const onSuccess = vi.fn();

        render(<LocaleProvider><EnquiryForm subject="general_contact" onSuccess={onSuccess} /></LocaleProvider>);
        await fillAll();
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Server Error');
        expectFilled();
        expect(screen.getByTestId('enquiry-success')).toBeEmptyDOMElement();
        expect(onSuccess).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Göndər' })).not.toBeDisabled();
    });

    it('keeps everything the visitor wrote on a server validation error (422)', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(422, { message: 'The given data was invalid.', errors: { email: ['The email must be a valid email address.'] } }));

        render(<LocaleProvider><EnquiryForm subject="general_contact" /></LocaleProvider>);
        await fillAll();
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        expect(await screen.findByText('The email must be a valid email address.')).toBeInTheDocument();
        expectFilled();
        expect(screen.getByTestId('enquiry-success')).toBeEmptyDOMElement();
    });

    it('keeps what was written when the client check stops the send (a required field empty)', async () => {
        global.fetch = vi.fn();

        render(<LocaleProvider><EnquiryForm subject="general_contact" /></LocaleProvider>);
        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('Telefon (istəyə görə)'), '070 353 05 12');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        expect(await screen.findAllByText('Bu sahə mütləqdir.')).toHaveLength(2);
        expect(screen.getByLabelText('Ad')).toHaveValue('Aysel');
        expect(screen.getByLabelText('Telefon (istəyə görə)')).toHaveValue('070 353 05 12');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    // (was: the button stayed disabled after a 429) — the server enforces the rate limit; the form does not lock.
    it('shows a friendly rate-limit message on 429 and leaves the button open, so the visitor can try again', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce(jsonResponse(429, { message: 'Too Many Attempts.' }))
            .mockResolvedValueOnce(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));

        render(<LocaleProvider><EnquiryForm subject="buy" artworkCode="AN-1" /></LocaleProvider>);

        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Həddindən çox sorğu göndərildi. Zəhmət olmasa bir az sonra yenidən cəhd edin.');
        const button = screen.getByRole('button', { name: 'Göndər' });
        expect(button).not.toBeDisabled();
        expect(screen.getByLabelText('Ad')).toHaveValue('Aysel');

        // A second try goes through to the server.
        await userEvent.click(button);
        await waitFor(() => expect(screen.getByTestId('enquiry-success')).toHaveTextContent(SUCCESS));
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    describe('focus after a failed send', () => {
        it.each([
            ['a 500', () => vi.fn().mockResolvedValue(jsonResponse(500, { message: 'Server Error' })), 'Server Error'],
            ['a network error', () => vi.fn().mockRejectedValue(new TypeError('Failed to fetch')), 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.'],
            ['a 429', () => vi.fn().mockResolvedValue(jsonResponse(429, { message: 'Too Many Attempts.' })), 'Həddindən çox sorğu göndərildi. Zəhmət olmasa bir az sonra yenidən cəhd edin.'],
            ['a 422 that names no known field', () => vi.fn().mockResolvedValue(jsonResponse(422, { message: 'The given data was invalid.', errors: { subject: ['Invalid subject.'] } })), 'The given data was invalid.'],
        ])('moves the focus to the error message on %s', async (_, makeFetch, text) => {
            global.fetch = makeFetch();
            render(<LocaleProvider><EnquiryForm subject="general_contact" /></LocaleProvider>);
            await fillAll();
            await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

            const alert = await screen.findByRole('alert');
            expect(alert).toHaveTextContent(text);
            await waitFor(() => expect(alert).toHaveFocus());
            expect(alert).toHaveAttribute('tabindex', '-1');
            expect(screen.getByRole('button', { name: 'Göndər' })).not.toBeDisabled();
            expectFilled();
        });

        it('still moves the focus to the first invalid field on a 422 that names one', async () => {
            global.fetch = vi.fn().mockResolvedValue(jsonResponse(422, { message: 'The given data was invalid.', errors: { email: ['The email must be a valid email address.'], message: ['Too short.'] } }));
            render(<LocaleProvider><EnquiryForm subject="general_contact" /></LocaleProvider>);
            await fillAll();
            await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

            await screen.findByText('The email must be a valid email address.');
            await waitFor(() => expect(screen.getByLabelText('E-poçt')).toHaveFocus());
            expect(screen.getByRole('alert')).not.toHaveFocus();
        });

        it('takes the focus again on a repeated failure with the same message', async () => {
            global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
            render(<LocaleProvider><EnquiryForm subject="general_contact" /></LocaleProvider>);
            await fillAll();
            await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));
            await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());

            await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));
            await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
            await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
        });
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

        expect(await screen.findByText(SUCCESS)).toBeInTheDocument();
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

        await screen.findByText(SUCCESS);

        const [, options] = global.fetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.subject).toBe('general_contact');
        expect(body).not.toHaveProperty('artwork_code');
    });
});
