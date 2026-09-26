/**
 * A one-metre scale bar for a true-size grid: a 1px line 100 cm × k long with "1 m" above it. The grid's k follows
 * the list on screen (a filtered list can have a larger k), so the bar is what lets a reader compare views. No Signal.
 * Renders nothing while k is not known (0).
 */
export default function ScaleRule({ k, className = '' }) {
    if (!(k > 0)) return null;
    const length = Math.round(100 * k);

    return (
        <div className={`flex flex-col items-start gap-step-1 ${className}`} data-testid="scale-rule">
            <span className="figures text-caption text-ink-muted">1 m</span>
            <span aria-hidden="true" className="block h-px bg-line-strong" style={{ width: length }} data-testid="scale-rule-line" />
        </div>
    );
}
