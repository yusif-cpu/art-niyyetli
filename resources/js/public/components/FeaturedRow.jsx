import { useLocale } from '../i18n/LocaleContext.jsx';
import { useElementWidth } from '../lib/useElementWidth.js';
import { VERTICAL_BELOW_PX, computeScale, layoutRow, sizeItems } from '../lib/wall.js';
import { formatDimensions } from '../lib/format.js';
import { fieldToneFor, lowerFirst, priceLine } from './ArtworkCard.jsx';

// The px gap between works in the row (layoutRow needs the same number the CSS uses: gap-x-[40px]).
const GAP_PX = 40;
// The tallest work may take at most this share of the viewport height, and never more than this many px.
const MAX_ITEM_HEIGHT_RATIO = 0.5;
const MAX_ITEM_HEIGHT_PX = 420;
// Phones: one work per line; the tallest at most this share of the viewport height.
const COLUMN_MAX_ITEM_HEIGHT_RATIO = 0.7;

function viewportHeight() {
    return typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 900;
}

/**
 * The featured works in ONE row at one k (lib/wall.js computeScale, row mode: all of them side by side fit the width),
 * bottom-aligned, 40px apart: the true relative sizes are the point. No figure and no scale rule here — those belong
 * to "Divarda gör" on the artwork page. Below md: one work per line, the widest one the full width (column mode).
 * Under each work: the title (Spectral italic 15px), the artist, and "size · price" (12px, ink-muted). Works with
 * unusable sizes are left out (the admin requires both sizes, so this only drops bad data).
 */
export default function FeaturedRow({ artworks }) {
    const { locale } = useLocale();
    const [ref, width] = useElementWidth();
    const list = Array.isArray(artworks) ? artworks : [];
    const column = typeof window !== 'undefined' && window.innerWidth < VERTICAL_BELOW_PX;
    const scale = column
        ? computeScale(list, { mode: 'column', width, share: 1, maxItemHeightPx: Math.round(viewportHeight() * COLUMN_MAX_ITEM_HEIGHT_RATIO) })
        : computeScale(list, { mode: 'row', width, gap: GAP_PX, maxItemHeightPx: Math.min(MAX_ITEM_HEIGHT_PX, Math.round(viewportHeight() * MAX_ITEM_HEIGHT_RATIO)) });
    const items = scale.ready ? (column ? sizeItems(scale.valid, scale.k) : layoutRow(scale.valid, scale.k, { gap: GAP_PX }).items) : [];

    return (
        <div ref={ref} data-k={scale.k || undefined}>
            {items.length > 0 && (
                <ul className={column ? 'flex flex-col gap-step-8' : 'flex items-end gap-x-[40px]'} data-testid="featured-row">
                    {items.map((it) => {
                        const artwork = it.item;
                        const image = artwork.image_url || artwork.thumbnail_url;
                        const artist = artwork.artist?.name;
                        const dims = formatDimensions(it.widthCm, it.heightCm, locale);
                        const price = priceLine(artwork, locale);
                        const details = [dims, price.muted ? lowerFirst(price.text, locale) : price.text].filter(Boolean).join(' · ');

                        return (
                            // Row: the work's width is the column (the captions wrap under it). Column (phones):
                            // one work per line, so the caption takes the full line and only the field is sized.
                            <li key={artwork.inventory_code} className="shrink-0" style={column ? undefined : { width: it.width }}>
                                <a
                                    href={`/artworks/${encodeURIComponent(artwork.inventory_code)}`}
                                    aria-label={[artwork.title, artist, dims].filter(Boolean).join(', ')}
                                    className="group block text-ink"
                                >
                                    <span
                                        className={`block overflow-hidden ${image ? 'bg-surface-field' : fieldToneFor(artwork.inventory_code)}`}
                                        style={column ? { width: it.width, height: it.height } : { height: it.height }}
                                        data-testid="featured-field"
                                    >
                                        {image && <img src={image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
                                    </span>
                                    {artwork.title && (
                                        <span className="mt-step-3 block font-editorial text-[15px] leading-[1.3] italic decoration-1 underline-offset-2 group-hover:underline">{artwork.title}</span>
                                    )}
                                    {artist && <span className="mt-0.5 block text-label text-ink-muted">{artist}</span>}
                                    {details && <span className="figures block text-label text-ink-muted" data-testid="featured-details">{details}</span>}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
