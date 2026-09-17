import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ArtistCard from '../components/ArtistCard.jsx';
import ExhibitionCard from '../components/ExhibitionCard.jsx';
import ArticleCard from '../components/ArticleCard.jsx';

describe('ArtistCard', () => {
    it('renders the name, direction, and a link to the profile', () => {
        render(
            <ArtistCard
                artist={{ slug: 'aygun-mammadova', first_name: 'Aygün', last_name: 'Məmmədova', direction: 'Müasir rəssamlıq', portrait_url: 'https://example.test/portrait.webp' }}
            />
        );

        expect(screen.getByText('Aygün Məmmədova')).toBeInTheDocument();
        expect(screen.getByText('Müasir rəssamlıq')).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', '/artists/aygun-mammadova');
        expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.test/portrait.webp');
    });

    it('renders a placeholder, not a broken image, when portrait_url is null', () => {
        render(<ArtistCard artist={{ slug: 'x', first_name: 'X', last_name: 'Y', direction: 'Z', portrait_url: null }} />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
});

describe('ExhibitionCard', () => {
    it('renders the title, date range, venue, and a link to the detail page', () => {
        render(
            <ExhibitionCard
                exhibition={{ slug: 'winter-show-2026', title: 'Winter Show 2026', status: 'current', start_date: '2026-01-10', end_date: '2026-02-10', venue: 'Main Gallery', media: [{ type: 'photo', url: 'https://example.test/ex.webp' }] }}
            />
        );

        expect(screen.getByText('Winter Show 2026')).toBeInTheDocument();
        expect(screen.getByText('Main Gallery')).toBeInTheDocument();
        expect(screen.getByText('2026-01-10 – 2026-02-10')).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', '/exhibitions/winter-show-2026');
        expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.test/ex.webp');
    });

    it('renders a placeholder when there is no media', () => {
        render(<ExhibitionCard exhibition={{ slug: 'x', title: 'X', status: 'past', start_date: '2025-01-01', end_date: '2025-02-01', venue: 'V', media: [] }} />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
});

describe('ArticleCard', () => {
    it('renders the title, short text, and a link to the detail page', () => {
        render(
            <ArticleCard
                article={{ slug: 'artist-interview-2026', title: 'An Interview With...', short_text: 'A short teaser.', published_at: '2026-01-05T10:00:00+00:00', media: [{ type: 'photo', url: 'https://example.test/article.webp' }] }}
            />
        );

        expect(screen.getByText('An Interview With...')).toBeInTheDocument();
        expect(screen.getByText('A short teaser.')).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', '/articles/artist-interview-2026');
        expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.test/article.webp');
    });

    it('renders a placeholder when there is no media', () => {
        render(<ArticleCard article={{ slug: 'x', title: 'X', short_text: 'Y', published_at: '2025-01-01T00:00:00+00:00', media: [] }} />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
});
