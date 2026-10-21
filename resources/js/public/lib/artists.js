/** An artist's display name: `name` (exhibition artists) or first + last name (the artists API). */
export function artistName(artist) {
    return artist?.name || [artist?.first_name, artist?.last_name].filter(Boolean).join(' ');
}

/** "Kamran Səfərli" → "KS": the first letters of the first two words, upper case. */
export function initials(name) {
    return String(name ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word.charAt(0).toLocaleUpperCase('az'))
        .join('');
}

/** The artist's works among `artworks` (artwork cards with an `artist` object), matched by id or slug. */
export function worksBy(artist, artworks) {
    if (!artist || !Array.isArray(artworks)) return [];

    return artworks.filter((work) => {
        const by = work?.artist;
        if (!by) return false;

        return (artist.id != null && by.id === artist.id) || (Boolean(artist.slug) && by.slug === artist.slug);
    });
}

/**
 * The work an artist card shows: the first one with an image among the works the page has already loaded. No
 * backend field is involved; with no match the card shows the monogram.
 */
export function artworkFor(artist, artworks) {
    return worksBy(artist, artworks).find((work) => work.image_url || work.thumbnail_url) ?? null;
}
