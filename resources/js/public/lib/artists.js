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

/**
 * The work an artist card shows: the first one with an image among the works the page has already loaded, matched
 * by the artist's id (or slug). No backend field is involved; with no match the card shows the monogram.
 */
export function artworkFor(artist, artworks) {
    if (!artist || !Array.isArray(artworks)) return null;

    return (
        artworks.find((work) => {
            const by = work?.artist;
            if (!by || !(work.image_url || work.thumbnail_url)) return false;

            return (artist.id != null && by.id === artist.id) || (Boolean(artist.slug) && by.slug === artist.slug);
        }) ?? null
    );
}
