/**
 * A section title with its small label above: the label in text-label / ink-muted (sentence case, never capitals —
 * the brief allows no uppercase labels), step-2 below it, then the heading. Labels are interface text from the
 * dictionary (`labels.*`), not content. `as` sets the heading level, `className` the heading's size.
 */
export default function SectionHeading({ id, label, as: Heading = 'h2', className = 'text-heading', children }) {
    return (
        <div data-testid="section-heading">
            {label && <p className="mb-step-2 text-label text-ink-muted" data-testid="section-label">{label}</p>}
            <Heading id={id} className={className}>{children}</Heading>
        </div>
    );
}
