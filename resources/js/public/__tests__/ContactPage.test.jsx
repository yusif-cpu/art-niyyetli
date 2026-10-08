import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import { SiteDataProvider } from '../layout/SiteDataContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import ContactPage, { mapHref } from '../pages/ContactPage.jsx';

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

const SUBJECTS_EN = [
    { key: 'buy', label: 'Buy an artwork' },
    { key: 'general_contact', label: 'General contact' },
    { key: 'artist_submission', label: 'Artist submission' },
    { key: 'media', label: 'Media enquiry' },
    { key: 'exhibition_invitation', label: 'Exhibition / invitation' },
    { key: 'collaboration', label: 'Collaboration' },
];

const SETTINGS = { contact_email: 'info@example.com', phone: '+994 12 000 00 00', address: 'Nizami küç. 1, Bakı', opening_hours: 'Bazar ertəsi–Şənbə 11:00–19:00', footer_text: '', whatsapp_number: '994501234567', brand_text: 'ArtNiyyətli', logo_media_id: '', logo_display_mode: 'text_only', logo_url: null };

function renderWithSite(settings = SETTINGS) {
    global.fetch = vi.fn((url) => {
        if (url.startsWith('/api/v1/enquiry-subjects')) return Promise.resolve(jsonResponse(200, { data: SUBJECTS }));
        if (url.startsWith('/api/v1/site-settings')) return Promise.resolve(jsonResponse(200, { data: settings }));
        return Promise.resolve(jsonResponse(200, { data: [] }));
    });

    return render(<LocaleProvider><SiteDataProvider><ContactPage /></SiteDataProvider></LocaleProvider>);
}

describe('ContactPage', () => {
    beforeEach(() => {
        localStorage.removeItem('public-locale'); // the locale-switch test changes it; every other test starts in AZ
    });

    it('lists address, phone, e-mail and hours from the site settings, as plain links', async () => {
        renderWithSite();

        const details = await screen.findByTestId('contact-details');
        expect(within(details).getByText('Nizami küç. 1, Bakı')).toBeInTheDocument();
        expect(within(details).getByRole('link', { name: '+994 12 000 00 00' })).toHaveAttribute('href', 'tel:+994120000000');
        expect(within(details).getByRole('link', { name: 'info@example.com' })).toHaveAttribute('href', 'mailto:info@example.com');
        expect(within(details).getByText('Bazar ertəsi–Şənbə 11:00–19:00')).toBeInTheDocument();
        expect(within(details).getByText('İş saatları')).toHaveClass('text-label', 'text-ink-muted');
    });

    it('opens the address in a map in a new window, and embeds no map frame', async () => {
        const { container } = renderWithSite();

        const link = await screen.findByRole('link', { name: 'Xəritədə aç' });
        expect(link).toHaveAttribute('href', mapHref('Nizami küç. 1, Bakı'));
        expect(link.getAttribute('href')).toContain(encodeURIComponent('Nizami küç. 1, Bakı'));
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        expect(container.querySelector('iframe')).toBeNull();
    });

    it('leaves out a contact detail that is not set, without an empty row', async () => {
        renderWithSite({ ...SETTINGS, phone: '', opening_hours: null });

        const details = await screen.findByTestId('contact-details');
        expect(within(details).queryByText('Telefon')).not.toBeInTheDocument();
        expect(within(details).queryByText('İş saatları')).not.toBeInTheDocument();
        expect(details.children).toHaveLength(2);
    });

    it('repeats no social links (they are in the footer), and uses no Signal, rounded or neutral classes', async () => {
        const { container } = renderWithSite();
        await screen.findByTestId('contact-details');

        expect(container.innerHTML).not.toMatch(/signal|rounded|neutral-/);
        expect(screen.queryByRole('link', { name: /instagram|facebook/i })).not.toBeInTheDocument();
    });

    it('shows an error with a retry when the subjects cannot be loaded', async () => {
        let calls = 0;
        global.fetch = vi.fn(() => Promise.resolve(++calls === 1 ? jsonResponse(500, {}) : jsonResponse(200, { data: SUBJECTS })));
        render(<LocaleProvider><ContactPage /></LocaleProvider>);

        expect(screen.getByTestId('contact-skeleton')).toHaveAttribute('aria-busy', 'true');
        await userEvent.click(await screen.findByRole('button', { name: 'Yenidən cəhd et' }));
        expect(await screen.findByLabelText('Mövzu')).toBeInTheDocument();
    });

    // "buy" needs an artwork code (E17 → 422 without one), so the contact page does not offer it (API guide §22.1).
    it('offers every subject except "buy" and submits the selected one without an artwork_code', async () => {
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/api/v1/enquiry-subjects')) {
                return Promise.resolve(jsonResponse(200, { data: SUBJECTS }));
            }
            return Promise.resolve(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));
        });

        render(<LocaleProvider><ContactPage /></LocaleProvider>);

        await screen.findByLabelText('Mövzu');
        SUBJECTS.filter((item) => item.key !== 'buy').forEach((item) => {
            expect(screen.getByRole('option', { name: item.label })).toBeInTheDocument();
        });
        expect(screen.queryByRole('option', { name: 'Əsər almaq' })).not.toBeInTheDocument();

        await userEvent.selectOptions(screen.getByLabelText('Mövzu'), 'media');
        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        await screen.findByText('Mesajınız uğurla göndərildi.');

        const submitCall = global.fetch.mock.calls.find(([url]) => url === '/api/v1/enquiries');
        const body = JSON.parse(submitCall[1].body);
        expect(body.subject).toBe('media');
        expect(body).not.toHaveProperty('artwork_code');
    });

    it('after a successful send, resets the subject with the fields, and keeps the chosen language', async () => {
        global.fetch = vi.fn((url, options) => {
            if (url.startsWith('/api/v1/enquiry-subjects')) return Promise.resolve(jsonResponse(200, { data: url.includes('locale=en') ? SUBJECTS_EN : SUBJECTS }));
            if (options?.method === 'POST') return Promise.resolve(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));
            return Promise.resolve(jsonResponse(200, { data: [] }));
        });
        render(<LocaleProvider><LocaleSwitcher /><ContactPage /></LocaleProvider>);

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));
        await screen.findByRole('option', { name: 'Media enquiry' });
        await userEvent.selectOptions(screen.getByLabelText('Subject'), 'media');
        await userEvent.type(screen.getByLabelText('Name'), 'John');
        await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
        await userEvent.type(screen.getByLabelText('Message'), 'Hello');
        await userEvent.click(screen.getByRole('button', { name: 'Send' }));

        const success = screen.getByTestId('enquiry-success');
        await waitFor(() => expect(success).toHaveTextContent('Your message has been sent.'));
        expect(screen.getByLabelText('Subject')).toHaveValue('general_contact'); // back to the first subject
        for (const label of ['Name', 'Email', 'Phone (optional)', 'Message']) expect(screen.getByLabelText(label)).toHaveValue('');
        expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-current', 'true');
        expect(localStorage.getItem('public-locale')).toBe('en');
    });

    it('treats a new subject choice after a success as touching the form: the message goes, the button opens', async () => {
        global.fetch = vi.fn((url, options) => {
            if (url.startsWith('/api/v1/enquiry-subjects')) return Promise.resolve(jsonResponse(200, { data: SUBJECTS }));
            if (options?.method === 'POST') return Promise.resolve(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));
            return Promise.resolve(jsonResponse(200, { data: [] }));
        });
        render(<LocaleProvider><ContactPage /></LocaleProvider>);

        await screen.findByLabelText('Mövzu');
        await userEvent.selectOptions(screen.getByLabelText('Mövzu'), 'media');
        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        const success = screen.getByTestId('enquiry-success');
        await waitFor(() => expect(success).toHaveTextContent('Mesajınız uğurla göndərildi.'));
        // The page's own reset (back to the first subject) does not count as the visitor touching it.
        expect(screen.getByLabelText('Mövzu')).toHaveValue('general_contact');
        expect(screen.getByRole('button', { name: 'Göndər' })).toBeDisabled();

        await userEvent.selectOptions(screen.getByLabelText('Mövzu'), 'collaboration');
        expect(success).toBeEmptyDOMElement();
        expect(screen.getByRole('button', { name: 'Göndər' })).not.toBeDisabled();
    });

    it('never renders a blank option when a subject is missing its translated label', async () => {
        const subjectsWithGap = [
            { key: 'buy', label: 'Əsər almaq' },
            { key: 'general_contact', label: null },
            { key: 'artist_submission', label: 'Rəssam müraciəti' },
            { key: 'media', label: 'Media sorğusu' },
            { key: 'exhibition_invitation', label: 'Sərgi / dəvət' },
            { key: 'collaboration', label: 'Əməkdaşlıq' },
        ];
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: subjectsWithGap }));

        render(<LocaleProvider><ContactPage /></LocaleProvider>);

        const select = await screen.findByLabelText('Mövzu');
        const options = Array.from(select.querySelectorAll('option'));

        expect(options).toHaveLength(4); // six, minus the unlabelled one, minus "buy"
        expect(options.every((option) => option.textContent.trim() !== '')).toBe(true);
        expect(options[0]).toHaveTextContent('Rəssam müraciəti');
        expect(select).toHaveValue('artist_submission');
    });

    it('switches the entire contact form to English, including subjects, when the locale changes', async () => {
        global.fetch = vi.fn((url, options) => {
            if (url.startsWith('/api/v1/enquiry-subjects')) {
                const subjects = url.includes('locale=en') ? SUBJECTS_EN : SUBJECTS;
                return Promise.resolve(jsonResponse(200, { data: subjects }));
            }
            if (options?.method === 'POST') {
                return Promise.resolve(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });

        render(
            <LocaleProvider>
                <LocaleSwitcher />
                <ContactPage />
            </LocaleProvider>
        );

        await screen.findByText('Əlaqə');

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await screen.findByText('Contact');
        expect(screen.getByText('Subject')).toBeInTheDocument();
        await screen.findByRole('option', { name: 'General contact' });
        SUBJECTS_EN.filter((item) => item.key !== 'buy').forEach((item) => {
            expect(screen.getByRole('option', { name: item.label })).toBeInTheDocument();
        });
        expect(screen.getByLabelText('Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Phone (optional)')).toBeInTheDocument();
        expect(screen.getByLabelText('Message')).toBeInTheDocument();
        const submitButton = screen.getByRole('button', { name: 'Send' });

        await userEvent.type(screen.getByLabelText('Name'), 'John Doe');
        await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
        await userEvent.type(screen.getByLabelText('Message'), 'Hello');
        await userEvent.click(submitButton);

        await screen.findByText('Your message has been sent.');
    });

    it('sets the meta and og/twitter descriptions from the CMS contact page once it loads (the server resolves the same record for its SSR head)', async () => {
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/api/v1/enquiry-subjects')) return Promise.resolve(jsonResponse(200, { data: SUBJECTS }));
            if (url.startsWith('/api/v1/pages/contact')) return Promise.resolve(jsonResponse(200, { data: { slug: 'contact', title: 'Əlaqə', content: 'AZ contact page text.', seo: null, sections: [] } }));
            return Promise.resolve(jsonResponse(200, { data: [] }));
        });

        render(<LocaleProvider><ContactPage /></LocaleProvider>);
        await screen.findByLabelText('Mövzu');

        await waitFor(() => {
            expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', 'AZ contact page text.');
        });
        expect(document.querySelector('meta[property="og:description"]')).toHaveAttribute('content', 'AZ contact page text.');
        expect(document.querySelector('meta[name="twitter:description"]')).toHaveAttribute('content', 'AZ contact page text.');
        expect(document.title).toBe('Əlaqə | ArtNiyyətli');
    });

    it('updates the description to the English CMS content on a locale switch, instead of leaving the Azerbaijani one behind', async () => {
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/api/v1/enquiry-subjects')) {
                const subjects = url.includes('locale=en') ? SUBJECTS_EN : SUBJECTS;

                return Promise.resolve(jsonResponse(200, { data: subjects }));
            }
            if (url.startsWith('/api/v1/pages/contact')) {
                const content = url.includes('locale=en') ? 'EN contact page text.' : 'AZ contact page text.';

                return Promise.resolve(jsonResponse(200, { data: { slug: 'contact', title: url.includes('locale=en') ? 'Contact' : 'Əlaqə', content, seo: null, sections: [] } }));
            }

            return Promise.resolve(jsonResponse(200, { data: [] }));
        });

        render(<LocaleProvider><LocaleSwitcher /><ContactPage /></LocaleProvider>);
        await waitFor(() => {
            expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', 'AZ contact page text.');
        });

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await waitFor(() => {
            expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', 'EN contact page text.');
        });
        expect(document.querySelector('meta[property="og:description"]')).toHaveAttribute('content', 'EN contact page text.');
        expect(document.querySelector('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');
    });
});
