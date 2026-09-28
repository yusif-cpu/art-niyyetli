import { FIGURE_CM, HUMAN_HEIGHT_CM } from '../lib/wall.js';

/** The silhouette's outline in the SVG's centimetre space (y down from the 170 cm line), from FIGURE_CM. */
export function figurePaths(f = FIGURE_CM) {
    const H = HUMAN_HEIGHT_CM;
    const cx = f.width / 2;
    const top = H - f.shoulderHeight; // shoulder line
    const r = f.shoulderRadius;
    const [bl, br] = [cx - f.bodyBottomWidth / 2, cx + f.bodyBottomWidth / 2];
    const [sl, sr] = [cx - f.shoulderWidth / 2, cx + f.shoulderWidth / 2];
    const headR = f.headSize / 2;
    const headTop = H - f.headBottom - f.headSize; // 0 when the head's top is the 170 cm line

    // Body: straight sides narrowing from the floor to the shoulders, flat shoulders with rounded corners.
    const body = `M${bl} ${H} L${sl} ${top + r} Q${sl} ${top} ${sl + r} ${top} H${sr - r} Q${sr} ${top} ${sr} ${top + r} L${br} ${H} Z`;
    // Neck: from just inside the shoulders up into the head, so the shapes join without a seam.
    const neck = { x: cx - f.neckWidth / 2, y: headTop + headR, width: f.neckWidth, height: top - (headTop + headR) + 1 };

    return { body, neck, head: { cx, cy: headTop + headR, r: headR } };
}

/**
 * The 170 cm silhouette, drawn in centimetres (viewBox 46 × 170, the geometry of lib/wall.js FIGURE_CM) and stretched
 * to the pixel box figureAt(k) gives — so it always shares the works' k. Flat, borderless, surface-field-2: a
 * person's outline (tapered body, flat shoulders, a neck, a small head), no detail. Decorative (aria-hidden); the
 * "170 sm" label next to it carries the meaning.
 */
export default function HumanFigure({ width, height, className = '', style }) {
    const { body, neck, head } = figurePaths();

    return (
        <svg
            aria-hidden="true"
            data-testid="human-figure"
            viewBox={`0 0 ${FIGURE_CM.width} ${HUMAN_HEIGHT_CM}`}
            preserveAspectRatio="none"
            width={width}
            height={height}
            className={`fill-surface-field-2 ${className}`}
            style={style}
        >
            <path d={body} data-part="body" />
            <rect x={neck.x} y={neck.y} width={neck.width} height={neck.height} data-part="neck" />
            <circle cx={head.cx} cy={head.cy} r={head.r} data-part="head" />
        </svg>
    );
}
