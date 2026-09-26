import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import ArtworkCard, { fieldToneFor } from '../components/ArtworkCard.jsx';

const baseArtwork = {
    inventory_code: 'AN-2026-014',
    title: 'Sunset Over Baku',
    artist: { id: 5, name: 'Aygün Məmmədova' },
    image_url: 'https://example.test/catalogue.webp',
    genre: { slug: 'painting', name: 'Painting' },
    medium: { slug: 'oil', name: 'Kətan üzərində yağlı boya' },
    price: 3200,
    currency: 'AZN',
    availability: 'available',
    width_cm: 80,
    height_cm: 60,
};

const NBSP = ' ';

function renderCard(props) {
    return render(
        <LocaleProvider>
            <ArtworkCard artwork={baseArtwork} {...props} />
        </LocaleProvider>
    );
}

const field = () => screen.getByTestId('artwork-field');
// exact textContent (the default matcher normalises the non-breaking spaces away)
const exactText = (text) => (_, el) => el?.tagName === 'P' && el.textContent === text;

describe('ArtworkCard', () => {
    it('sizes the field from centimetres × k, not from the image', () => {
        renderCard({ k: 2.5 });

        expect(field()).toHaveStyle({ width: '200px', height: '150px' });
        expect(screen.getByRole('link')).toHaveStyle({ width: '200px' });
    });

    it('raises a 40 × 30 card to 155px and keeps the field at its own size, centred', () => {
        renderCard({ artwork: { ...baseArtwork, width_cm: 40, height_cm: 30 }, k: 3.168 });

        expect(screen.getByRole('link')).toHaveStyle({ width: '155px' });
        expect(field()).toHaveStyle({ width: '127px', height: '95px' });
        expect(field().parentElement).toHaveClass('justify-center');
    });

    it('bottom-aligns the field in the row zone it is given', () => {
        renderCard({ k: 2, zoneHeight: 300 });

        expect(field().parentElement).toHaveStyle({ height: '300px' });
        expect(field().parentElement).toHaveClass('items-end');
    });

    it('keeps the cm proportions without k (screens not on the wall module yet)', () => {
        renderCard({});

        expect(field()).toHaveStyle({ aspectRatio: '80 / 60' });
    });

    it('picks the fallback field colour from the code, the same on every render', () => {
        const artwork = { ...baseArtwork, image_url: null };
        const first = renderCard({ artwork, k: 1 });
        const tone = [...field().classList].find((c) => c.startsWith('bg-surface-field'));
        first.unmount();

        renderCard({ artwork, k: 1 });
        expect(field()).toHaveClass(tone);
        expect(tone).toBe(fieldToneFor('AN-2026-014'));
        expect(field().querySelector('img')).toBeNull();
    });

    it('renders the image to fill the field, lazily, as decoration (the link carries the name)', () => {
        renderCard({ k: 1 });
        const img = field().querySelector('img');

        expect(img).toHaveAttribute('src', 'https://example.test/catalogue.webp');
        expect(img).toHaveAttribute('alt', '');
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveClass('object-cover');
    });

    it('shows code, title, artist, dimensions with × and the medium, and a formatted price', () => {
        renderCard({ k: 1 });

        expect(screen.getByText('AN-2026-014')).toBeInTheDocument();
        expect(screen.getByText('Sunset Over Baku')).toHaveClass('font-editorial', 'italic');
        expect(screen.getByText('Aygün Məmmədova')).toBeInTheDocument();
        expect(screen.getByText(exactText(`80${NBSP}×${NBSP}60${NBSP}sm, kətan üzərində yağlı boya`))).toBeInTheDocument();
        expect(screen.getByText(exactText(`3${NBSP}200${NBSP}AZN`))).toBeInTheDocument();
    });

    it('hides the price of a sold work and shows "Satılıb" in muted ink, not red', () => {
        renderCard({ artwork: { ...baseArtwork, availability: 'sold' } });

        expect(screen.queryByText(/3.200/)).not.toBeInTheDocument();
        const sold = screen.getByText('Satılıb');
        expect(sold).toHaveClass('text-ink-muted');
        expect(sold.className).not.toMatch(/signal/);
    });

    it('shows "Rezerv edilib" for a reserved work', () => {
        renderCard({ artwork: { ...baseArtwork, availability: 'reserved' } });
        expect(screen.getByText('Rezerv edilib')).toHaveClass('text-ink-muted');
    });

    it('shows "Qiymət sorğu ilə" when the price is hidden', () => {
        renderCard({ artwork: { ...baseArtwork, price: null, currency: null } });
        expect(screen.getByText('Qiymət sorğu ilə')).toBeInTheDocument();
    });

    it('is one link with an aria-label of title, artist and size', () => {
        renderCard({ k: 1 });

        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(1);
        expect(links[0]).toHaveAttribute('href', '/artworks/AN-2026-014');
        expect(links[0]).toHaveAccessibleName(`Sunset Over Baku, Aygün Məmmədova, 80${NBSP}×${NBSP}60${NBSP}sm`);
    });

    it('leaves the artist out of the label when there is none, and encodes the code in the link', () => {
        renderCard({ artwork: { ...baseArtwork, artist: null, inventory_code: 'AN 1/2' } });

        expect(screen.getByRole('link')).toHaveAccessibleName(`Sunset Over Baku, 80${NBSP}×${NBSP}60${NBSP}sm`);
        expect(screen.getByRole('link')).toHaveAttribute('href', '/artworks/AN%201%2F2');
    });

    it('writes "cm" and the English labels in English', () => {
        localStorage.setItem('public-locale', 'en');
        renderCard({ artwork: { ...baseArtwork, availability: 'sold' } });

        expect(screen.getByText(exactText(`80${NBSP}×${NBSP}60${NBSP}cm, kətan üzərində yağlı boya`))).toBeInTheDocument();
        expect(screen.getByText('Sold')).toBeInTheDocument();
        localStorage.removeItem('public-locale');
    });
});
