// Lengths the rule may show, longest first (cm). One metre whenever it fits.
const STEPS_CM = [100, 50, 20, 10, 5];

// Room kept for the label at the line's right end when choosing the length.
const LABEL_PX = 48;

function label(cm) {
    return cm >= 100 ? `${cm / 100} m` : `${cm} sm`;
}

/**
 * A scale bar for a true-size view: a 1px line `length × k` long with its length written at its right end, on the
 * same line. A grid's k follows the list on screen (a filtered list can have a larger k), so the bar is what lets a
 * reader compare views. It shows one metre; when a metre and its label would be wider than `maxWidth` (a single small
 * work shown large) it steps down to 50 / 20 / 10 / 5 cm, so it never overflows. No Signal. Renders nothing while k is
 * not known (0).
 */
export default function ScaleRule({ k, maxWidth = Infinity, className = '' }) {
    if (!(k > 0)) return null;
    const cm = STEPS_CM.find((step) => step * k + LABEL_PX <= maxWidth) ?? STEPS_CM[STEPS_CM.length - 1];
    const length = Math.round(cm * k);

    return (
        <div className={`flex min-w-0 items-center gap-step-2 ${className}`} data-testid="scale-rule">
            <span aria-hidden="true" className="block h-px max-w-full shrink bg-line-strong" style={{ width: length }} data-testid="scale-rule-line" />
            <span className="figures text-caption whitespace-nowrap text-ink-muted">{label(cm)}</span>
        </div>
    );
}
