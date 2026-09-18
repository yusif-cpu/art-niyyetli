import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import ArtistDetailPage from '../pages/ArtistDetailPage.jsx';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

const detail = {
    id: 5, slug: 'aygun-mammadova', first_name: 'Aygün', last_name: 'Məmmədova', birth_year: 1985, birth_place: 'Bakı',
    direction: 'Müasir rəssamlıq', biography: 'Bio text.', artistic_approach: 'Approach text.', portrait_url: null,
    exhibitions: [{ year: 2020, title: 'Some Show', venue: 'Some Venue' }],
    awards: [{ year: 2019, title: 'Some Award' }],
    artworks: [{ inventory_code: 'AN-1', title: 'A Piece', artist: { id: 5, name: 'Aygün Məmmədova' }, image_url: null, genre: { slug: 'p', name: 'P' }, medium: { slug: 'o', name: 'O' }, price: 100, currency: 'AZN', availability: 'available', width_cm: 1, height_cm: 1 }],
};

describe('ArtistDetailPage', () => {
    it('renders bio, exhibition/award history, and public artworks', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: detail }));

        render(<LocaleProvider><ArtistDetailPage params={{ slug: 'aygun-mammadova' }} /></LocaleProvider>);

        expect(await screen.findByText('Bio text.')).toBeInTheDocument();
        expect(screen.getByText('Some Show')).toBeInTheDocument();
        expect(screen.getByText('Some Award')).toBeInTheDocument();
        expect(screen.getByText('A Piece')).toBeInTheDocument();
    });

    it('renders not-found for an unknown slug', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(404, { message: 'Not found.' }));
        render(<LocaleProvider><ArtistDetailPage params={{ slug: 'nope' }} /></LocaleProvider>);
        expect(await screen.findByText('Səhifə tapılmadı')).toBeInTheDocument();
    });

    it('sets document.title from the artist name', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: detail }));

        render(<LocaleProvider><ArtistDetailPage params={{ slug: detail.slug }} /></LocaleProvider>);

        await waitFor(() => expect(document.title).toBe(`${detail.first_name} ${detail.last_name} — ArtNiyyətli`));
    });

    it('does not crash when the locale changes after the page has already loaded', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: detail }));

        render(<LocaleProvider><LocaleSwitcher /><ArtistDetailPage params={{ slug: detail.slug }} /></LocaleProvider>);

        await screen.findByText('Bio text.');

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await waitFor(() => expect(screen.getAllByText('Bio text.').length).toBeGreaterThan(0));
    });
});
