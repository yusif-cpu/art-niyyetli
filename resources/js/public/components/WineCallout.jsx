import { buttonClass } from '../lib/buttons.js';
import Emphasis from './Emphasis.jsx';

/**
 * The closing wine band of a page (catalogue, artist): a small label, a bold title with its `*word*`, a Spectral line,
 * and the cream (primary-on-wine) button at the right. It ends the page, so it touches the footer: the footer's own
 * 1px surface line at 14% keeps the two wine blocks apart.
 */
export default function WineCallout({ id, label, title, text, action }) {
    return (
        <section aria-labelledby={id} data-surface="wine" data-testid="wine-callout" className="bg-wine px-page py-[clamp(72px,7.6vw,110px)] text-surface">
            <div className="flex flex-col gap-step-6 md:flex-row md:items-center md:justify-between md:gap-step-8">
                <div className="min-w-0">
                    {label && <p className="mb-step-3 text-[13px] leading-[1.35] font-semibold text-wine-muted max-md:text-[14px]">{label}</p>}
                    <h2 id={id} className="text-[clamp(36px,4vw,58px)] leading-[1.05] font-bold tracking-[-0.03em] text-surface">
                        <Emphasis text={title} />
                    </h2>
                    {text && <p className="mt-step-4 max-w-[36rem] font-editorial text-[18px] leading-[1.55] text-wine-muted">{text}</p>}
                </div>
                {action && (
                    <a href={action.href} className={`shrink-0 self-start md:self-center ${buttonClass('primary', 'wine')}`}>
                        {action.label}
                    </a>
                )}
            </div>
        </section>
    );
}
