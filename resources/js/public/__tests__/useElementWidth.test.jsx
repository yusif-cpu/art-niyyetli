import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useElementWidth } from '../lib/useElementWidth.js';

function Probe() {
    const [ref, width] = useElementWidth();

    return <div ref={ref}>width:{width}</div>;
}

describe('useElementWidth', () => {
    const original = global.ResizeObserver;
    afterEach(() => {
        global.ResizeObserver = original;
    });

    it('reports the ResizeObserver width, ignores sub-pixel changes, and disconnects on unmount', () => {
        let callback;
        const disconnect = vi.fn();
        global.ResizeObserver = vi.fn(function ResizeObserver(cb) {
            callback = cb;
            this.observe = vi.fn();
            this.disconnect = disconnect;
        });

        const { unmount } = render(<Probe />);
        expect(screen.getByText('width:0')).toBeInTheDocument(); // jsdom has no layout: 0 until observed

        act(() => callback([{ contentBoxSize: [{ inlineSize: 812 }], contentRect: { width: 812 } }]));
        expect(screen.getByText('width:812')).toBeInTheDocument();

        act(() => callback([{ contentRect: { width: 812.4 } }]));
        expect(screen.getByText('width:812')).toBeInTheDocument();

        act(() => callback([{ contentRect: { width: 640 } }]));
        expect(screen.getByText('width:640')).toBeInTheDocument();

        unmount();
        expect(disconnect).toHaveBeenCalled();
    });

    it('still renders without ResizeObserver (width stays at the first measurement)', () => {
        global.ResizeObserver = undefined;
        render(<Probe />);
        expect(screen.getByText('width:0')).toBeInTheDocument();
    });
});
