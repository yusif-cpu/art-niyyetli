import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { artistName } from '../lib/artists.js';
import { isValidDims, readDims } from '../lib/wall.js';
import Monogram from './Monogram.jsx';

/**
 * One artist in a list (the home page, /artists): a surface-sunk box 340px tall (200px on phones) with one of the
 * artist's works (`artwork`, picked by the caller from works the page already has — lib/artists.js artworkFor) in its
 * own proportions, centred 36px inside the box with the hang shadow; without a work, the artist's monogram. Under it
 * the name (20px 600, wine) and "direction · 12 əsər" (13px, ink-muted; the count from `artworks_count`, none for 0).
 * A card with a slug is one link; hover underlines the name, nothing moves.
 */
export default function ArtistCard({ artist, artwork = null }) {
    const { locale } = useLocale();
    const name = artistName(artist);
    const count = typeof artist.artworks_count === 'number' && artist.artworks_count > 0 ? artist.artworks_count : null;
    const image = artwork?.image_url || artwork?.thumbnail_url || null;
    const { w, h } = readDims(artwork);
    // The work's own ratio before the image arrives (scaled down by max-width / max-height), so nothing jumps.
    const ratio = image && isValidDims(w, h) ? { width: Math.round(w * 10), height: Math.round(h * 10) } : {};

    const body = (
        <>
            <span className="flex h-[200px] items-center justify-center bg-surface-sunk p-step-5 md:h-[340px] md:p-[36px]" data-testid="artist-card-work">
                {image ? (
                    <img src={image} alt="" loading="lazy" decoding="async" {...ratio} className="block h-auto max-h-full w-auto max-w-full shadow-hang" />
                ) : (
                    <Monogram name={name} className="text-[56px] text-wine md:text-[84px]" />
                )}
            </span>
            <span className="mt-step-4 block text-[20px] leading-[1.25] font-semibold tracking-[-0.01em] text-wine decoration-1 underline-offset-4 group-hover:underline">{name}</span>
            {(artist.direction || count) && (
                <span className="mt-step-1 block text-meta text-ink-muted">
                    {artist.direction}
                    {artist.direction && count && ' · '}
                    {count && (
                        <span className="figures" data-testid="artist-works-count">
                            {count} {t(locale, 'catalogue.count')}
                        </span>
                    )}
                </span>
            )}
        </>
    );

    // An artist without a slug has no page: the card is plain, not a link.
    return artist.slug ? (
        <a href={`/artists/${encodeURIComponent(artist.slug)}`} className="group block font-ui text-ink">{body}</a>
    ) : (
        <div className="block font-ui text-ink">{body}</div>
    );
}
