import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ScaleRule from '../components/ScaleRule.jsx';

describe('ScaleRule', () => {
    it('draws one metre at k: 100 × 2.5 = 250px, labelled "1 m", without Signal', () => {
        const { container } = render(<ScaleRule k={2.5} />);

        expect(screen.getByTestId('scale-rule-line')).toHaveStyle({ width: '250px' });
        expect(screen.getByTestId('scale-rule-line')).toHaveClass('h-px', 'bg-line-strong');
        expect(screen.getByText('1 m')).toHaveClass('text-caption', 'text-ink-muted');
        expect(container.innerHTML).not.toMatch(/signal/);
    });

    it('steps down from 1 m when a metre would be wider than the space (a small work shown large)', () => {
        render(<ScaleRule k={21} maxWidth={840} />); // 1 m = 2100px, 50 cm = 1050px, 20 cm = 420px

        expect(screen.getByText('20 sm')).toBeInTheDocument();
        expect(screen.getByTestId('scale-rule-line')).toHaveStyle({ width: '420px' });
    });

    it('renders nothing while k is 0 or unknown', () => {
        for (const k of [0, undefined, Number.NaN, -1]) {
            const { container, unmount } = render(<ScaleRule k={k} />);
            expect(container).toBeEmptyDOMElement();
            unmount();
        }
    });
});
