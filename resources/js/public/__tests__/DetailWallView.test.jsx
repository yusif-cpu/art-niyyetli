import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import DetailWallView from '../components/DetailWallView.jsx';

const artwork = { inventory_code: 'AN-1', title: 'A', image_url: null, width_cm: 180, height_cm: 140 };
const originalRO = global.ResizeObserver;

function renderAt(width) {
    global.ResizeObserver = class {
        constructor(cb) { this.cb = cb; }
        observe() { this.cb([{ contentRect: { width } }]); }
        disconnect() {}
    };
    render(<LocaleProvider><DetailWallView artwork={artwork} /></LocaleProvider>);
}

describe('DetailWallView: the "170 sm" label', () => {
    afterEach(() => {
        global.ResizeObserver = originalRO;
    });

    it('stands right of the figure when there is room (a desktop wall)', () => {
        renderAt(900);

        const label = screen.getByTestId('wall-figure-label');
        expect(label.style.left).not.toBe('');
        expect(label.style.right).toBe('');
    });

    it('moves left of the figure when the right edge is too close (320px phone), so it is never cut', () => {
        renderAt(280);

        const label = screen.getByTestId('wall-figure-label');
        expect(label.style.left).toBe('');
        expect(parseFloat(label.style.right)).toBeGreaterThan(0);
        expect(label).toHaveTextContent('170 sm');
    });

    it('gives each wall-height choice a 44px touch target', () => {
        renderAt(280);

        screen.getAllByRole('button').forEach((button) => expect(button).toHaveClass('min-h-11', 'min-w-11'));
    });
});
