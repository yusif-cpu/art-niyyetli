import Emphasis from './Emphasis.jsx';

/**
 * A numbered section title (krem-bordo): the small line "01" or "02 · Cari sərgi" (13px 600, wine on cream,
 * wine-muted on wine), then the bold h2 with its `*word*` emphasis (wine on cream, surface on wine). `link` puts a plain
 * "Bütün …" link at the right end of the title's line; `divider` draws the 1px line under the whole heading. `as` sets
 * the heading level, `className` the heading's size.
 */
export default function SectionHeading({ id, number, label, tone = 'cream', link, divider = false, as: Heading = 'h2', className = 'text-section', children }) {
    const wine = tone === 'wine';
    const kicker = [number, label].filter(Boolean).join(' · ');

    return (
        <div data-testid="section-heading" className={`flex items-end justify-between gap-step-5 ${divider ? `border-b pb-step-6 ${wine ? 'border-surface/20' : 'border-line'}` : ''}`}>
            <div className="min-w-0">
                {kicker && (
                    <p className={`figures mb-step-3 text-[13px] leading-[1.3] font-semibold max-md:text-[14px] ${wine ? 'text-wine-muted' : 'text-wine'}`} data-testid="section-label">
                        {kicker}
                    </p>
                )}
                <Heading id={id} className={`${className} ${wine ? 'text-surface' : 'text-wine'}`}>
                    {typeof children === 'string' ? <Emphasis text={children} /> : children}
                </Heading>
            </div>
            {link && (
                <a href={link.href} className={`mb-step-1 inline-flex min-h-11 shrink-0 items-center text-[14px] font-semibold ${wine ? 'text-surface' : 'text-wine'}`}>
                    <span className="link-line">{link.label}</span>
                </a>
            )}
        </div>
    );
}
