import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import ArtistCard from '../components/ArtistCard.jsx';
import ExhibitionCard from '../components/ExhibitionCard.jsx';
import ArticleCard from '../components/ArticleCard.jsx';

describe('ArtistCard', () => {
    const AYGUN = { id: 5, slug: 'aygun-mammadova', first_name: 'Aygün', last_name: 'Məmmədova', direction: 'Müasir rəssamlıq', portrait_url: 'https://example.test/portrait.webp' };
    const WORK = { inventory_code: 'AN-1', title: 'A', artist: { id: 5, name: 'Aygün Məmmədova' }, image_url: 'https://example.test/work.webp', width_cm: 80, height_cm: 120 };

    // The card reads the locale (its works-count label), so it renders inside LocaleProvider.
    it('renders one of the artist\'s works in its own ratio, then the name, the direction and a link to the profile', () => {
        const { container } = render(<LocaleProvider><ArtistCard artist={AYGUN} artwork={WORK} /></LocaleProvider>);

        expect(screen.getByText('Aygün Məmmədova')).toHaveClass('text-[20px]', 'font-semibold', 'text-wine');
        expect(screen.getByText('Müasir rəssamlıq')).toHaveClass('text-meta', 'text-ink-muted');
        expect(screen.getByRole('link')).toHaveAttribute('href', '/artists/aygun-mammadova');
        // The work, not the portrait: decorative (the name follows), lazy, in the 80 × 120 ratio, no frame, hung.
        const img = container.querySelector('img');
        expect(img).toHaveAttribute('src', 'https://example.test/work.webp');
        expect(img).toHaveAttribute('alt', '');
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('width', '800');
        expect(img).toHaveAttribute('height', '1200');
        expect(img).toHaveClass('max-h-full', 'max-w-full', 'shadow-hang');
        expect(screen.getByTestId('artist-card-work')).toHaveClass('flex', 'items-center', 'justify-center', 'bg-surface-sunk', 'h-[200px]', 'md:h-[340px]', 'md:p-[36px]');
        expect(container.innerHTML).not.toMatch(/rounded|border/);
    });

    it('shows the monogram, not a broken image or an empty field, without a work', () => {
        const { container } = render(<LocaleProvider><ArtistCard artist={{ slug: 'x', first_name: 'Xəyal', last_name: 'Yusifov', direction: 'Z', portrait_url: null }} /></LocaleProvider>);

        expect(container.querySelector('img')).toBeNull();
        expect(screen.getByTestId('artist-monogram')).toHaveTextContent('XY');
        expect(screen.getByTestId('artist-monogram')).toHaveAttribute('aria-hidden', 'true');
    });

    it('reads `name` (exhibition artists) and is plain text, not a link, without a slug', () => {
        render(<LocaleProvider><ArtistCard artist={{ id: 6, slug: null, name: 'No Slug' }} /></LocaleProvider>);

        expect(screen.getByText('No Slug')).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});

describe('ExhibitionCard', () => {
    it('renders the cover, "dates · venue", the title in 600 wine, and a link to the detail page', () => {
        render(
            <LocaleProvider>
                <ExhibitionCard
                    exhibition={{ slug: 'winter-show-2026', title: 'Winter Show 2026', status: 'current', start_date: '2026-01-10', end_date: '2026-02-10', venue: 'Main Gallery', media: [{ type: 'photo', url: 'https://example.test/ex.webp' }] }}
                />
            </LocaleProvider>
        );

        expect(screen.getByText('Winter Show 2026')).toHaveClass('font-semibold', 'text-wine');
        expect(screen.getByText('10 yanvar – 10 fevral 2026 · Main Gallery')).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', '/exhibitions/winter-show-2026');
        expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.test/ex.webp');
        expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
    });

    it('renders a placeholder when there is no media', () => {
        const { container } = render(<LocaleProvider><ExhibitionCard exhibition={{ slug: 'x', title: 'X', status: 'past', start_date: '2025-01-01', end_date: '2025-02-01', venue: 'V', media: [] }} /></LocaleProvider>);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(container.querySelector('.bg-surface-sunk')).toBeNull(); // no empty cover box
    });
});

describe('ArticleCard', () => {
    // The card reads the locale (date and type labels), so it renders inside LocaleProvider.
    it('renders the title, short text, and a link to the detail page', () => {
        render(
            <LocaleProvider>
                <ArticleCard
                    article={{ slug: 'artist-interview-2026', title: 'An Interview With...', short_text: 'A short teaser.', published_at: '2026-01-05T10:00:00+00:00', media: [{ type: 'photo', url: 'https://example.test/article.webp' }] }}
                />
            </LocaleProvider>
        );

        expect(screen.getByText('An Interview With...')).toBeInTheDocument();
        expect(screen.getByText('A short teaser.')).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', '/articles/artist-interview-2026');
        expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.test/article.webp');
        expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
    });

    it('renders a placeholder when there is no media', () => {
        render(<LocaleProvider><ArticleCard article={{ slug: 'x', title: 'X', short_text: 'Y', published_at: '2025-01-01T00:00:00+00:00', media: [] }} /></LocaleProvider>);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
});
