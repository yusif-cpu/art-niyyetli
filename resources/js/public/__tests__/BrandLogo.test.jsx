import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BrandLogo from '../components/BrandLogo.jsx';

describe('BrandLogo', () => {
    it('is an inline SVG named "ArtNiyyətli", filled with currentColor, not an <img>', () => {
        const { container } = render(<BrandLogo />);

        const logo = screen.getByRole('img', { name: 'ArtNiyyətli' });
        expect(logo.tagName.toLowerCase()).toBe('svg');
        expect(logo).toHaveAttribute('fill', 'currentColor');
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('[fill]:not([fill="currentColor"])')).toBeNull();
    });

    it('draws the 3 : 1 lockup by default and the square mark on request', () => {
        const { rerender } = render(<BrandLogo />);
        const [, , lw, lh] = screen.getByRole('img').getAttribute('viewBox').split(' ').map(Number);
        expect(lw / lh).toBeCloseTo(3, 0);

        rerender(<BrandLogo variant="mark" />);
        const [, , mw, mh] = screen.getByRole('img').getAttribute('viewBox').split(' ').map(Number);
        expect(mw / mh).toBeCloseTo(1, 1);
        expect(screen.getByRole('img')).toHaveAttribute('data-logo', 'mark');
    });

    it('takes its height and colour from className (the width follows the viewBox)', () => {
        render(<BrandLogo className="h-7 text-brand" />);

        expect(screen.getByRole('img')).toHaveClass('h-7', 'text-brand', 'w-auto');
    });
});
