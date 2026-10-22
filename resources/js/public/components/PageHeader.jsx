import Emphasis from './Emphasis.jsx';

/**
 * The page-header band (krem-bordo): wine, 88px / 72px / 84px padding at 1440, two columns (1.5fr | 1fr). Left: the
 * small label (13px 600 wine-muted; `dot` adds the red dot of a current show), the h1 (text-banner, 700, its `*word*`
 * in #F0D9CF italic) and the description (Spectral 20px). Right, when given: `meta` — a two-column grid under a 1px
 * surface line at 20%, each a 13px wine-muted caption over a 20px 600 surface value — or any `aside` node. `children`
 * follow inside the band under the columns (a cover image).
 */
export default function PageHeader({ label, dot = false, title, description, meta, aside, children, className = '' }) {
    const items = Array.isArray(meta) ? meta.filter((item) => item && item.value !== null && item.value !== undefined && item.value !== '') : [];
    const right = items.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-step-6 gap-y-step-5 border-t border-surface/20 pt-step-5" data-testid="page-header-meta">
            {items.map((item) => (
                <div key={item.label}>
                    <dt className="mb-step-1 text-[13px] leading-[1.35] text-wine-muted max-md:text-[14px]">{item.label}</dt>
                    <dd className="figures text-[20px] leading-[1.25] font-semibold text-surface">{item.value}</dd>
                </div>
            ))}
        </dl>
    ) : aside;

    return (
        // A <div>, not a <header>: a page-level <header> would be a second "banner" landmark beside the site header.
        <div data-surface="wine" className={`bg-wine text-surface ${className}`} data-testid="page-header">
            <div className={`grid grid-cols-1 gap-step-7 px-page pt-[clamp(56px,6.1vw,88px)] pb-[clamp(56px,5.8vw,84px)] ${right ? 'md:grid-cols-[1.5fr_1fr] md:items-end md:gap-step-8' : ''}`}>
                <div className="min-w-0">
                    {label && (
                        <p className="mb-step-4 flex items-center gap-step-2 text-[13px] leading-[1.35] font-semibold text-wine-muted max-md:text-[14px]" data-testid="page-header-label">
                            {dot && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-brand" />}
                            {label}
                        </p>
                    )}
                    <h1 className="text-banner text-surface">
                        <Emphasis text={title} />
                    </h1>
                    {description && <p className="mt-step-5 max-w-[40rem] font-editorial text-[18px] leading-[1.55] text-wine-muted md:text-[20px]">{description}</p>}
                </div>
                {right && <div className="min-w-0">{right}</div>}
            </div>
            {children}
        </div>
    );
}
