import { useLocale } from '../i18n/LocaleContext.jsx';
import { useElementWidth } from '../lib/useElementWidth.js';
import { VERTICAL_BELOW_PX, computeScale, layoutRow, sizeItems } from '../lib/wall.js';
import { formatDimensions } from '../lib/format.js';
import { ArtworkCaption, fieldToneFor } from './ArtworkCard.jsx';

// The px gap between works in a row (layoutRow needs the same number the CSS uses: gap-x-[48px]).
const GAP_PX = 48;
// The tallest work may take at most this share of the viewport height, and never more than this many px.
const MAX_ITEM_HEIGHT_RATIO = 0.5;
const MAX_ITEM_HEIGHT_PX = 420;
// Phones: one work per line; the tallest at most this share of the viewport height.
const COLUMN_MAX_ITEM_HEIGHT_RATIO = 0.7;

function viewportHeight() {
    return typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 900;
}

/** The list cut into two rows: the first half (rounded up), then the rest. */
export function splitRows(list) {
    const half = Math.ceil(list.length / 2);

    return [list.slice(0, half), list.slice(half)].filter((row) => row.length > 0);
}

/**
 * The featured works in TWO rows at ONE k (lib/wall.js computeScale, row mode, per row; the smaller k wins so both rows
 * fit), each row bottom-aligned, 48px apart: the true relative sizes are the point. Each work carries the hang shadow.
 * Below md: one work per line, the widest one the full width (column mode). Under each work the shared caption: title
 * (Spectral italic 18px), "artist · size" and the price or status. Works with unusable sizes are left out (the admin
 * requires both sizes, so this only drops bad data).
 */
export default function FeaturedRow({ artworks }) {
    const { locale } = useLocale();
    const [ref, width] = useElementWidth();
    const list = Array.isArray(artworks) ? artworks : [];
    const column = typeof window !== 'undefined' && window.innerWidth < VERTICAL_BELOW_PX;

    let rows = [];
    let k = 0;
    if (column) {
        const scale = computeScale(list, { mode: 'column', width, share: 1, maxItemHeightPx: Math.round(viewportHeight() * COLUMN_MAX_ITEM_HEIGHT_RATIO) });
        k = scale.k;
        rows = scale.ready ? [sizeItems(scale.valid, scale.k)] : [];
    } else {
        const maxItemHeightPx = Math.min(MAX_ITEM_HEIGHT_PX, Math.round(viewportHeight() * MAX_ITEM_HEIGHT_RATIO));
        const scales = splitRows(list).map((row) => computeScale(row, { mode: 'row', width, gap: GAP_PX, maxItemHeightPx })).filter((scale) => scale.ready);
        k = scales.length > 0 ? Math.min(...scales.map((scale) => scale.k)) : 0;
        rows = k > 0 ? scales.map((scale) => layoutRow(scale.valid, k, { gap: GAP_PX }).items) : [];
    }

    return (
        <div ref={ref} data-k={k || undefined}>
            {rows.length > 0 && (
                <div className={column ? 'flex flex-col gap-step-8' : 'flex flex-col gap-[72px]'} data-testid="featured-row">
                    {rows.map((items, index) => (
                        <ul key={index} className={column ? 'flex flex-col gap-step-8' : 'flex items-end gap-x-[48px]'} data-testid="featured-line">
                            {items.map((it) => {
                                const artwork = it.item;
                                const image = artwork.image_url || artwork.thumbnail_url;
                                const dims = formatDimensions(it.widthCm, it.heightCm, locale);

                                return (
                                    // Row: the work's width is the column (the caption wraps under it). Column (phones):
                                    // one work per line, so the caption takes the full line and only the field is sized.
                                    <li key={artwork.inventory_code} className="shrink-0" style={column ? undefined : { width: it.width }}>
                                        <a
                                            href={`/artworks/${encodeURIComponent(artwork.inventory_code)}`}
                                            aria-label={[artwork.title, artwork.artist?.name, dims].filter(Boolean).join(', ')}
                                            className="group block text-ink"
                                        >
                                            <span
                                                className={`block overflow-hidden shadow-hang ${image ? 'bg-surface-field' : fieldToneFor(artwork.inventory_code)}`}
                                                style={column ? { width: it.width, height: it.height } : { height: it.height }}
                                                data-testid="featured-field"
                                            >
                                                {image && <img src={image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
                                            </span>
                                            <ArtworkCaption artwork={artwork} dims={dims} />
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    ))}
                </div>
            )}
        </div>
    );
}
