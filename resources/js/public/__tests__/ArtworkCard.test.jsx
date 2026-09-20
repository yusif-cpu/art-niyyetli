import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import ArtworkCard from '../components/ArtworkCard.jsx';

const baseArtwork = {
    inventory_code: 'AN-2026-014',
    title: 'Sunset Over Baku',
    artist: { id: 5, name: 'Aygün Məmmədova' },
    image_url: 'https://example.test/catalogue.webp',
    genre: { slug: 'painting', name: 'Painting' },
    medium: { slug: 'oil', name: 'Oil on canvas' },
    price: 3200,
    currency: 'AZN',
    availability: 'available',
    width_cm: 80,
    height_cm: 60,
};

function withLocale(ui) {
    return <LocaleProvider>{ui}</LocaleProvider>;
}

describe('ArtworkCard', () => {
    it('renders the title, artist, price, and a link to the detail page', () => {
        render(withLocale(<ArtworkCard artwork={baseArtwork} />));

        expect(screen.getByText('Sunset Over Baku')).toBeInTheDocument();
        expect(screen.getByText('Aygün Məmmədova')).toBeInTheDocument();
        expect(screen.getByText('3200 AZN')).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', '/artworks/AN-2026-014');
        expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.test/catalogue.webp');
        expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
        expect(screen.getByRole('img')).toHaveAttribute('decoding', 'async');
    });

    it('renders "price on request" when price is null', () => {
        render(withLocale(<ArtworkCard artwork={{ ...baseArtwork, price: null, currency: null }} />));
        expect(screen.getByText('Qiymət tələb üzrə')).toBeInTheDocument();
    });

    it('renders a sold label when availability is sold', () => {
        render(withLocale(<ArtworkCard artwork={{ ...baseArtwork, availability: 'sold' }} />));
        expect(screen.getByText('Satılıb')).toBeInTheDocument();
    });

    it('does not render an availability label when available', () => {
        render(withLocale(<ArtworkCard artwork={baseArtwork} />));
        expect(screen.queryByText('Mövcuddur')).not.toBeInTheDocument();
    });

    it('includes the artist name in the image alt text', () => {
        render(withLocale(<ArtworkCard artwork={{ ...baseArtwork, title: 'Sunset Over Baku', artist: { id: 1, name: 'Aygün Məmmədova' } }} />));

        expect(screen.getByAltText('Sunset Over Baku by Aygün Məmmədova')).toBeInTheDocument();
    });

    it('falls back to the title alone when there is no artist', () => {
        render(withLocale(<ArtworkCard artwork={{ ...baseArtwork, title: 'Untitled', artist: null }} />));

        expect(screen.getByAltText('Untitled')).toBeInTheDocument();
    });
});
