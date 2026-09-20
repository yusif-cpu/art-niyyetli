import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ImageWithFallback from '../components/ImageWithFallback.jsx';

describe('ImageWithFallback', () => {
    it('lazy-loads and asynchronously decodes by default, with no fetch priority hint', () => {
        const { container } = render(<ImageWithFallback src="https://example.test/a.webp" alt="A" className="aspect-square" />);

        const img = container.querySelector('img');
        expect(img).toHaveAttribute('src', 'https://example.test/a.webp');
        expect(img).toHaveAttribute('alt', 'A');
        expect(img).toHaveAttribute('class', 'aspect-square');
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('decoding', 'async');
        expect(img).not.toHaveAttribute('fetchpriority');
    });

    it('loads a priority image eagerly with high fetch priority', () => {
        const { container } = render(<ImageWithFallback src="https://example.test/a.webp" alt="A" priority />);

        const img = container.querySelector('img');
        expect(img).toHaveAttribute('loading', 'eager');
        expect(img).toHaveAttribute('fetchpriority', 'high');
        expect(img).toHaveAttribute('decoding', 'async');
    });

    it('adds no width or height attributes: the API does not provide dimensions and the aspect classes reserve the space', () => {
        const { container } = render(<ImageWithFallback src="https://example.test/a.webp" alt="A" />);

        const img = container.querySelector('img');
        expect(img).not.toHaveAttribute('width');
        expect(img).not.toHaveAttribute('height');
    });

    it('renders a decorative placeholder, not an image, when there is no src', () => {
        const { container } = render(<ImageWithFallback src={null} alt="A" className="aspect-square" priority />);

        expect(container.querySelector('img')).toBeNull();
        expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
        expect(container.firstChild).toHaveClass('aspect-square');
    });
});
