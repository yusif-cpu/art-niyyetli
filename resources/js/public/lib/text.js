/** The first `max` characters of plain text, cut at a word boundary (never mid-word), with "…" when shortened. */
export function excerpt(text, max = 155) {
    const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;

    const cut = clean.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(' ');

    return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}
