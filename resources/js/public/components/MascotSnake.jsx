import { useEffect, useState } from 'react';
// The one copy of the drawing: brand/maskot-ilan.svg, read as text at build time. Our own temporary drawing; when the
// client's mascot vector arrives only that file changes, as long as it keeps the hooks read below (a stroked
// `.ilan-govde` path with pathLength="1", a filled `.ilan-bas` group, the eye cut out with evenodd).
import source from '../../../../brand/maskot-ilan.svg?raw';

let shape = null;

// Only the geometry is copied out of the file (viewBox, path data, stroke width, the head's transform and fill
// rule): no style, role or colour attribute from it can reach the page. The colour is the call site's currentColor.
function readShape() {
    if (shape) return shape;
    const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
    const body = svg.querySelector('[class~="ilan-govde"]');
    const head = svg.querySelector('[class~="ilan-bas"]');
    const [, , w, h] = svg.getAttribute('viewBox').split(/[\s,]+/).map(Number);
    shape = {
        viewBox: svg.getAttribute('viewBox'),
        ratio: h / w,
        body: { d: body.getAttribute('d'), strokeWidth: body.getAttribute('stroke-width'), linecap: body.getAttribute('stroke-linecap') },
        head: {
            transform: head.getAttribute('transform') || undefined,
            paths: [...head.querySelectorAll('path')].map((p) => ({ d: p.getAttribute('d'), fillRule: p.getAttribute('fill-rule') || undefined })),
        },
    };

    return shape;
}

const REDUCED = '(prefers-reduced-motion: reduce)';

/** true when the visitor asks for reduced motion; follows a change while the page is open. */
function reducedQuery() {
    return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(REDUCED) : null;
}

export function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(() => Boolean(reducedQuery()?.matches));

    useEffect(() => {
        const query = reducedQuery();
        if (!query) return undefined;
        const onChange = () => setReduced(query.matches);
        query.addEventListener?.('change', onChange);

        return () => query.removeEventListener?.('change', onChange);
    }, []);

    return reduced;
}

// Draw lengths in public.css: 1300 ms by default, 1100 ms with the "quick" modifier.
const DRAW_CLASS = { 1300: '', 1100: 'mascot-quick' };

/**
 * The mascot snake, inline (currentColor, and the CSP allows no external image here with a page colour, nor inline
 * style). `mode`:
 * - "draw": the body is drawn once (stroke-dashoffset 1 → 0), then the head fades in over 180 ms. `drawMs` 1300 or
 *   1100. `paused` holds it undrawn until the caller starts it (the home seal waits until it is on screen).
 * - "travel": a short piece of the body (0.18 of its length) runs along it, 1200 ms a lap, endlessly: a status
 *   indicator, not decoration. No head: a moving piece with a still head would read as a broken snake.
 * - "static": drawn, no motion.
 * Nothing turns or moves as a whole: only the dash offset changes. With reduced motion no animation class is put on
 * at all: "draw" shows the finished snake at once, "travel" a still full line.
 */
export default function MascotSnake({ width = 420, mode = 'static', drawMs = 1300, paused = false, className = '' }) {
    const reduced = usePrefersReducedMotion();
    const { viewBox, ratio, body, head } = readShape();
    const animated = !reduced && (mode === 'draw' || mode === 'travel');
    const motion = animated
        ? mode === 'draw'
            ? ['mascot-draw', DRAW_CLASS[drawMs] ?? '', paused ? 'mascot-paused' : ''].filter(Boolean).join(' ')
            : 'mascot-travel'
        : '';

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={viewBox}
            width={width}
            height={Math.round(width * ratio)}
            fill="none"
            aria-hidden="true"
            focusable="false"
            data-mascot={mode}
            className={`mascot block h-auto max-w-full ${motion} ${className}`.replace(/\s+/g, ' ').trim()}
        >
            <path className="ilan-govde" pathLength="1" d={body.d} fill="none" stroke="currentColor" strokeWidth={body.strokeWidth} strokeLinecap={body.linecap} />
            {mode !== 'travel' && (
                <g className="ilan-bas" transform={head.transform}>
                    {head.paths.map((p, index) => <path key={index} d={p.d} fill="currentColor" fillRule={p.fillRule} />)}
                </g>
            )}
        </svg>
    );
}
