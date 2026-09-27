// Two tones only: the palest field (surface-field-3) reads as a blank sheet at portrait size.
const PORTRAIT_TONES = ['bg-surface-field', 'bg-surface-field-2'];

/** The field colour of an artist without a portrait: picked from the slug, so it never changes between visits. */
export function portraitToneFor(slug) {
    let hash = 0;
    for (const ch of String(slug ?? '')) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;

    return PORTRAIT_TONES[hash % PORTRAIT_TONES.length];
}

/**
 * An artist's portrait: a 4:5 upright rectangle (never a circle — the brief allows no radius), 1px line, no shadow,
 * cover-cropped. Without a portrait the field keeps a tone picked from the slug, like an artwork without an image.
 * `className` sets the width; `hover` lets a parent `group` darken the edge.
 */
export default function ArtistPortrait({ artist, className = 'w-full', hover = false, priority = false }) {
    const name = [artist.first_name, artist.last_name].filter(Boolean).join(' ');

    return (
        <div
            data-testid="artist-portrait"
            className={`aspect-[4/5] overflow-hidden border border-line ${hover ? 'transition-colors duration-[120ms] ease-standard group-hover:border-line-strong' : ''} ${artist.portrait_url ? 'bg-surface-field' : portraitToneFor(artist.slug)} ${className}`}
        >
            {artist.portrait_url && (
                <img src={artist.portrait_url} alt={name} loading={priority ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover" />
            )}
        </div>
    );
}
