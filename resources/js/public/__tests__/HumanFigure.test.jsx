import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HumanFigure, { figurePaths } from '../components/HumanFigure.jsx';
import { FIGURE_CM, HUMAN_HEIGHT_CM, figureAt } from '../lib/wall.js';

describe('HumanFigure', () => {
    it('is 170 × k tall and 46 × k wide at any k (the works\' k)', () => {
        for (const k of [1.0082, 1.6963, 2.4]) {
            const f = figureAt(k);
            const { unmount } = render(<HumanFigure width={f.width} height={f.height} />);
            const svg = screen.getByTestId('human-figure');
            expect(svg).toHaveAttribute('height', String(Math.round(HUMAN_HEIGHT_CM * k)));
            expect(svg).toHaveAttribute('width', String(Math.round(46 * k)));
            expect(svg).toHaveAttribute('viewBox', `0 0 46 ${HUMAN_HEIGHT_CM}`);
            unmount();
        }
    });

    it('reads as a person: a body widening to flat shoulders, a neck, a smaller head, all from FIGURE_CM', () => {
        const { body, neck, head } = figurePaths();
        // Shoulders wider than the base (34 against 30 cm): narrowing upwards read as a bottle or a chess pawn.
        expect(FIGURE_CM.shoulderWidth).toBe(34);
        expect(FIGURE_CM.bodyBottomWidth).toBe(30);
        expect(FIGURE_CM.width).toBe(46);
        expect(FIGURE_CM.headSize).toBeLessThan(18); // smaller than the old Ø18
        expect(FIGURE_CM.shoulderRadius).toBeLessThan(FIGURE_CM.shoulderWidth / 2); // flat, not a half-circle
        expect(head.cy - head.r).toBe(0); // the head's top is the 170 cm line
        expect(neck.width).toBe(FIGURE_CM.neckWidth);
        expect(neck.y + neck.height).toBeGreaterThan(HUMAN_HEIGHT_CM - FIGURE_CM.shoulderHeight); // joins the shoulders
        expect(body).toMatch(new RegExp(`^M${23 - 15} ${HUMAN_HEIGHT_CM} `)); // floor, 30 cm wide, centred
        expect(body).toContain(`L${23 + 15} ${HUMAN_HEIGHT_CM} Z`);
        expect(body).toContain(`H${23 + 17 - FIGURE_CM.shoulderRadius} `); // flat shoulders 34 cm wide, centred
    });

    it('stays flat and borderless, in surface-field-2, with no detail', () => {
        const { container } = render(<HumanFigure width={46} height={170} />);

        const svg = screen.getByTestId('human-figure');
        expect(svg).toHaveClass('fill-surface-field-2');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
        expect(container.querySelectorAll('[stroke]')).toHaveLength(0);
        expect([...svg.children].map((el) => el.dataset.part)).toEqual(['body', 'neck', 'head']);
    });
});
