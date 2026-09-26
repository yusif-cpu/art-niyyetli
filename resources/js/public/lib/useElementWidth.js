import { useLayoutEffect, useState } from 'react';

/**
 * The content-box width of an element, kept current with a ResizeObserver — never a timer. Returns 0 until the first
 * measurement, which lib/wall.js treats as "not ready". Changes smaller than `threshold` px are ignored, so
 * sub-pixel jitter does not re-run the wall maths. Usage: const [ref, width] = useElementWidth();
 */
export function useElementWidth({ threshold = 1 } = {}) {
    const [node, setNode] = useState(null);
    const [width, setWidth] = useState(0);

    // A layout effect: the first measurement lands before the browser paints, so a wall/grid never flashes empty.
    useLayoutEffect(() => {
        if (!node) return undefined;

        const update = (next) => setWidth((prev) => (Math.abs(next - prev) >= threshold ? next : prev));
        // Same measure as ResizeObserver's content box: the width inside the padding.
        const style = window.getComputedStyle(node);
        update(Math.max(0, node.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0)));

        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[entries.length - 1];
            update(entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
        });
        observer.observe(node);

        return () => observer.disconnect();
    }, [node, threshold]);

    return [setNode, width];
}
