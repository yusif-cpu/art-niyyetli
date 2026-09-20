import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BrandMark from '../components/BrandMark.jsx';

describe('BrandMark', () => {
    it('renders logo and text together in logo_text mode', () => {
        const { container } = render(<BrandMark logoUrl="https://example.test/logo.png" displayMode="logo_text" brandText="ArtNiyyətli" />);

        expect(screen.getByText('ArtNiyyətli')).toBeInTheDocument();
        // A decorative (alt="") image has no accessible "img" role, since the
        // adjacent visible text already conveys the name to assistive tech.
        const img = container.querySelector('img');
        expect(img).toHaveAttribute('src', 'https://example.test/logo.png');
        expect(img).toHaveAttribute('alt', '');
    });

    it('loads the logo eagerly, since it is above the fold on every page, and decodes it asynchronously', () => {
        const { container } = render(<BrandMark logoUrl="https://example.test/logo.png" displayMode="logo_text" brandText="ArtNiyyətli" />);

        const img = container.querySelector('img');
        expect(img).toHaveAttribute('loading', 'eager');
        expect(img).toHaveAttribute('decoding', 'async');
    });

    it('renders only the logo in logo_only mode, with the brand text as its accessible name', () => {
        render(<BrandMark logoUrl="https://example.test/logo.png" displayMode="logo_only" brandText="ArtNiyyətli" />);

        expect(screen.queryByText('ArtNiyyətli')).not.toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'ArtNiyyətli' })).toHaveAttribute('src', 'https://example.test/logo.png');
    });

    it('renders only text in text_only mode, even when a logo is set', () => {
        render(<BrandMark logoUrl="https://example.test/logo.png" displayMode="text_only" brandText="ArtNiyyətli" />);

        expect(screen.getByText('ArtNiyyətli')).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('falls back to text when logo_only mode has no logo url', () => {
        render(<BrandMark logoUrl={null} displayMode="logo_only" brandText="ArtNiyyətli" />);

        expect(screen.getByText('ArtNiyyətli')).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('falls back to text when logo_text mode has no logo url', () => {
        render(<BrandMark logoUrl={null} displayMode="logo_text" brandText="ArtNiyyətli" />);

        expect(screen.getByText('ArtNiyyətli')).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
});
