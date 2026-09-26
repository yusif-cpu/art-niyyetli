import { FIGURE_CM, HUMAN_HEIGHT_CM } from '../lib/wall.js';

/**
 * The 170 cm silhouette, drawn in centimetres (viewBox 46 × 170) and stretched to the pixel box that lib/wall.js
 * figureAt(k) gives — so it always shares the works' k. An SVG, not rounded CSS boxes: the page has no radius.
 * Decorative (aria-hidden); the "170 sm" label next to it carries the meaning.
 */
export default function HumanFigure({ width, height, className = '', style }) {
    const f = FIGURE_CM;
    const bodyTop = HUMAN_HEIGHT_CM - f.bodyHeight;
    const r = f.bodyWidth / 2;
    const headR = f.headSize / 2;
    const headCy = HUMAN_HEIGHT_CM - f.headBottom - headR;

    return (
        <svg
            aria-hidden="true"
            data-testid="human-figure"
            viewBox={`0 0 ${f.width} ${HUMAN_HEIGHT_CM}`}
            preserveAspectRatio="none"
            width={width}
            height={height}
            className={`fill-surface-field-2 ${className}`}
            style={style}
        >
            <path d={`M${f.bodyLeft} ${HUMAN_HEIGHT_CM} V${bodyTop + r} A${r} ${r} 0 0 1 ${f.bodyLeft + f.bodyWidth} ${bodyTop + r} V${HUMAN_HEIGHT_CM} Z`} />
            <circle cx={f.headLeft + headR} cy={headCy} r={headR} />
        </svg>
    );
}
