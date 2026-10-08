// Two tones only: the palest field (surface-field-3) reads as a blank sheet at portrait size.
const PORTRAIT_TONES = ['bg-surface-field', 'bg-surface-field-2'];

/** The field colour of an artist without a portrait: picked from the slug, so it never changes between visits. */
export function portraitToneFor(slug) {
    let hash = 0;
    for (const ch of String(slug ?? '')) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;

    return PORTRAIT_TONES[hash % PORTRAIT_TONES.length];
}

// The two shapes. "rect" is the brief's own: a 4:5 upright rectangle, no radius. "circle" is the one exception to
// "no rounded corner", decided by the client for the artist cards only (the artists list and the home page's
// artists block): a square crop in a full circle. The artist page and the exhibition page keep the rectangle.
const SHAPE_CLASS = { rect: 'aspect-[4/5]', circle: 'aspect-square rounded-full' };

/**
 * An artist's portrait: 1px line, no shadow, cover-cropped, as a 4:5 rectangle or (`shape="circle"`) a circle.
 * Without a portrait the field keeps a tone picked from the slug, like an artwork without an image.
 * `className` sets the width; `hover` lets a parent `group` darken the edge.
 */
export default function ArtistPortrait({ artist, shape = 'rect', className = 'w-full', hover = false, priority = false }) {
    const name = [artist.first_name, artist.last_name].filter(Boolean).join(' ');

    return (
        <div
            data-testid="artist-portrait"
            data-shape={shape}
            className={`${SHAPE_CLASS[shape] ?? SHAPE_CLASS.rect} overflow-hidden border border-line ${hover ? 'transition-colors duration-[120ms] ease-standard group-hover:border-line-strong' : ''} ${artist.portrait_url ? 'bg-surface-field' : portraitToneFor(artist.slug)} ${className}`}
        >
            {artist.portrait_url && (
                <img src={artist.portrait_url} alt={name} loading={priority ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover" />
            )}
        </div>
    );
}
