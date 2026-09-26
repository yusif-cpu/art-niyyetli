// Lengths the rule may show, longest first (cm). One metre whenever it fits.
const STEPS_CM = [100, 50, 20, 10, 5];

function label(cm) {
    return cm >= 100 ? `${cm / 100} m` : `${cm} sm`;
}

/**
 * A scale bar for a true-size view: a 1px line `length × k` long with its length written above it. A grid's k
 * follows the list on screen (a filtered list can have a larger k), so the bar is what lets a reader compare views.
 * It shows one metre; when a metre would be wider than `maxWidth` (a single small work shown large) it steps down to
 * 50 / 20 / 10 / 5 cm, so it never overflows. No Signal. Renders nothing while k is not known (0).
 */
export default function ScaleRule({ k, maxWidth = Infinity, className = '' }) {
    if (!(k > 0)) return null;
    const cm = STEPS_CM.find((step) => step * k <= maxWidth) ?? STEPS_CM[STEPS_CM.length - 1];
    const length = Math.round(cm * k);

    return (
        <div className={`flex flex-col items-start gap-step-1 ${className}`} data-testid="scale-rule">
            <span className="figures text-caption text-ink-muted">{label(cm)}</span>
            <span aria-hidden="true" className="block h-px max-w-full bg-line-strong" style={{ width: length }} data-testid="scale-rule-line" />
        </div>
    );
}
