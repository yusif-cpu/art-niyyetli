import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BrandLogo from '../components/BrandLogo.jsx';

const brand = (file) => readFileSync(resolve(__dirname, '../../../../brand', file), 'utf8');
const BRAND_FILES = ['artniyyetli-lockup.svg', 'artniyyetli-mark.svg', 'artniyyetli-wordmark.svg'];

describe('BrandLogo', () => {
    // (was: named "ArtNiyyətli") — the accessible name follows the new logo's own spelling.
    it('is an inline SVG named "Art Niyyätli" as the logo spells it, filled with currentColor, not an <img>', () => {
        const { container } = render(<BrandLogo />);

        const logo = screen.getByRole('img', { name: 'Art Niyyätli' });
        expect(logo.tagName.toLowerCase()).toBe('svg');
        expect(logo).toHaveAttribute('fill', 'currentColor');
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('[fill]:not([fill="currentColor"])')).toBeNull();
        expect(container.querySelectorAll('[style]')).toHaveLength(0);
    });

    // (was: 3 : 1, 239.42 × 79.33) — the client's lockup is 2090 × 849, about 2.46 : 1.
    it('draws the 2.46 : 1 lockup by default and the practically square mark on request', () => {
        const { rerender } = render(<BrandLogo />);
        expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 2090 849');
        const [, , lw, lh] = screen.getByRole('img').getAttribute('viewBox').split(' ').map(Number);
        expect(lw / lh).toBeCloseTo(2.46, 2);

        rerender(<BrandLogo variant="mark" />);
        expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 1682 1706');
        const [, , mw, mh] = screen.getByRole('img').getAttribute('viewBox').split(' ').map(Number);
        expect(mw / mh).toBeCloseTo(1, 1);
        expect(screen.getByRole('img')).toHaveAttribute('data-logo', 'mark');
    });

    it('carries the same drawing as the brand files: their path data and the potrace transform, unchanged', () => {
        for (const [variant, file] of [['lockup', 'artniyyetli-lockup.svg'], ['mark', 'artniyyetli-mark.svg']]) {
            const svg = brand(file);
            const { container, unmount } = render(<BrandLogo variant={variant} />);
            const fold = (d) => d.replace(/\s+/g, ' ').trim();

            expect(container.querySelector('g').getAttribute('transform')).toBe(/<g\b[^>]*\stransform="([^"]+)"/.exec(svg)[1]);
            expect([...container.querySelectorAll('path')].map((p) => p.getAttribute('d'))).toEqual(
                [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => fold(m[1]))
            );
            unmount();
        }
    });

    it('takes its height and colour from className (the width follows the viewBox)', () => {
        render(<BrandLogo className="h-7 text-brand" />);

        expect(screen.getByRole('img')).toHaveClass('h-7', 'text-brand', 'w-auto');
    });
});

describe('the brand SVG files', () => {
    it.each(BRAND_FILES)('%s has no inline style and draws with currentColor only', (file) => {
        const svg = brand(file);

        expect(svg).not.toMatch(/style\s*=|<style/i);
        expect(svg).toMatch(/<svg[^>]*\sfill="currentColor"/);
        // Every fill is currentColor, no fixed colour anywhere, and nothing is stroked.
        expect([...svg.matchAll(/fill="([^"]+)"/g)].map((m) => m[1])).toEqual(expect.arrayContaining(['currentColor']));
        expect([...svg.matchAll(/fill="([^"]+)"/g)].every((m) => m[1] === 'currentColor')).toBe(true);
        expect(svg).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i);
        expect(svg).not.toMatch(/stroke="(?!none")/);
    });
});
