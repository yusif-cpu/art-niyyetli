import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import ArtworkDetailPage from '../pages/ArtworkDetailPage.jsx';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

const detail = {
    inventory_code: 'AN-2026-014', title: 'Sunset Over Baku', artist: { id: 5, name: 'Aygün Məmmədova' },
    image_url: null, genre: { slug: 'painting', name: 'Painting' }, medium: { slug: 'oil', name: 'Oil' },
    price: 3200, currency: 'AZN', availability: 'available', width_cm: 80, height_cm: 60,
    year_created: 2023, short_description: 'A description.', provenance: 'Provenance text.', certificate: true,
    frame_condition: 'Good', delivery_note: 'Ships in 5 days',
    images: [{ type: 'main', sort_order: 0, is_main: true, url: 'https://example.test/full.webp' }],
    similar: [], whatsapp_link: null, video: null,
};

describe('ArtworkDetailPage', () => {
    it('renders the full detail shape using the images (full) gallery, not image_url', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: detail }));

        render(<LocaleProvider><ArtworkDetailPage params={{ code: 'AN-2026-014' }} /></LocaleProvider>);

        expect(await screen.findByText('Sunset Over Baku')).toBeInTheDocument();
        expect(screen.getByText('A description.')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Sunset Over Baku by Aygün Məmmədova' })).toHaveAttribute('src', 'https://example.test/full.webp');
    });

    it('does not render a WhatsApp link when whatsapp_link is null', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: detail }));
        render(<LocaleProvider><ArtworkDetailPage params={{ code: 'AN-2026-014' }} /></LocaleProvider>);
        await screen.findByText('Sunset Over Baku');
        expect(screen.queryByRole('link', { name: /whatsapp/i })).not.toBeInTheDocument();
    });

    it('renders a WhatsApp link when present', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: { ...detail, whatsapp_link: 'https://wa.me/994501234567?text=hi' } }));
        render(<LocaleProvider><ArtworkDetailPage params={{ code: 'AN-2026-014' }} /></LocaleProvider>);
        expect(await screen.findByRole('link', { name: /whatsapp/i })).toHaveAttribute('href', 'https://wa.me/994501234567?text=hi');
    });

    it('renders a not-found message for a 404', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(404, { message: 'Not found.' }));
        render(<LocaleProvider><ArtworkDetailPage params={{ code: 'nope' }} /></LocaleProvider>);
        expect(await screen.findByText('Səhifə tapılmadı')).toBeInTheDocument();
    });

    it('sets document.title from the artwork title', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: detail }));

        render(<LocaleProvider><ArtworkDetailPage params={{ code: detail.inventory_code }} /></LocaleProvider>);

        await waitFor(() => expect(document.title).toBe(`${detail.title} — ArtNiyyətli`));
    });

    it('includes the artist name in the detail image alt text', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: detail }));

        render(<LocaleProvider><ArtworkDetailPage params={{ code: detail.inventory_code }} /></LocaleProvider>);

        expect(await screen.findByAltText(`${detail.title} by ${detail.artist.name}`)).toBeInTheDocument();
    });

    it('does not crash when the locale changes after the page has already loaded', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: detail }));

        render(<LocaleProvider><LocaleSwitcher /><ArtworkDetailPage params={{ code: detail.inventory_code }} /></LocaleProvider>);

        await screen.findByText('Sunset Over Baku');

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await waitFor(() => expect(screen.getAllByText('Sunset Over Baku').length).toBeGreaterThan(0));
    });

    it('does not render a YouTube embed when video is null', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: detail }));
        render(<LocaleProvider><ArtworkDetailPage params={{ code: detail.inventory_code }} /></LocaleProvider>);
        await screen.findByText('Sunset Over Baku');
        expect(screen.queryByTitle(detail.title)).not.toBeInTheDocument();
    });

    it('renders a responsive YouTube embed when video is present', async () => {
        const withVideo = { ...detail, video: { id: 'dQw4w9WgXcQ', embed_url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' } };
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: withVideo }));

        render(<LocaleProvider><ArtworkDetailPage params={{ code: detail.inventory_code }} /></LocaleProvider>);

        const iframe = await screen.findByTitle(detail.title);
        expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });
});
