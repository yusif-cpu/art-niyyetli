/**
 * The header band of the list pages (catalogue, artists, exhibitions, journal): the small label, the h1 in
 * text-display, a one-sentence description in text-reading-sm / ink-muted when there is one, and a 1px line below.
 * step-7 above, step-6 below the text. `aside` sits at the right end of the band on wide screens (the catalogue's
 * work count). The page's own container starts at the band, so it supplies no top padding of its own.
 */
export default function PageHeader({ label, title, description, aside }) {
    return (
        <header className="flex flex-wrap items-end justify-between gap-x-step-6 gap-y-step-3 border-b border-line pt-step-7 pb-step-6" data-testid="page-header">
            <div className="min-w-0">
                {label && <p className="mb-step-2 text-label text-ink-muted">{label}</p>}
                <h1 className="text-display">{title}</h1>
                {description && <p className="mt-step-3 max-w-prose font-editorial text-reading-sm text-ink-muted">{description}</p>}
            </div>
            {aside}
        </header>
    );
}
