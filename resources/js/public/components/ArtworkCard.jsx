import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { cardSize, isValidDims, readDims } from '../lib/wall.js';
import { formatDimensions, formatPrice } from '../lib/format.js';

const FIELD_TONES = ['bg-surface-field', 'bg-surface-field-2', 'bg-surface-field-3'];

/** The field colour of a work without an image: picked from its code, so it never changes between visits. */
export function fieldToneFor(code) {
    let hash = 0;
    for (const ch of String(code ?? '')) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;

    return FIELD_TONES[hash % FIELD_TONES.length];
}

function lowerFirst(text, locale) {
    return text ? text.charAt(0).toLocaleLowerCase(locale) + text.slice(1) : text;
}

function priceLine(artwork, locale) {
    if (artwork.availability === 'sold') return { text: t(locale, 'artwork.sold'), muted: true };
    if (artwork.availability === 'reserved') return { text: t(locale, 'artwork.reserved'), muted: true };
    const price = formatPrice(artwork.price, artwork.currency);

    return price ? { text: price, muted: false } : { text: t(locale, 'artwork.priceOnRequest'), muted: true };
}

/**
 * One artwork. With `k` (px per cm, from lib/wall.js) the field is the work at true relative size and the card is at
 * least 155px wide with the field centred; `zoneHeight` bottom-aligns the fields of one row. Without `k` (screens not
 * yet on the wall module) the card fills its column and the field keeps the work's cm proportions.
 * The whole card is one link. No shadow: the one-shadow exception belongs to works hung on a wall.
 */
export default function ArtworkCard({ artwork, k, zoneHeight, size: packedSize }) {
    const { locale } = useLocale();
    const { w, h } = readDims(artwork);
    const validDims = isValidDims(w, h);
    // `size` comes from packRows (edge-rounded to the row); otherwise the card sizes itself from k.
    const size = packedSize ?? (k > 0 && validDims ? cardSize(w, h, k) : null);
    const dims = validDims ? formatDimensions(w, h, locale) : null;
    const medium = lowerFirst(artwork.medium?.name, locale);
    const artistName = artwork.artist?.name || null;
    const price = priceLine(artwork, locale);
    const label = [artwork.title, artistName, dims].filter(Boolean).join(', ');
    // image_url is the "catalogue" media variant (800px longest edge) — sized for a card this size. thumbnail_url
    // is the 300px variant meant for genuinely small art (e.g. the 64px image-picker strip on the detail page);
    // using it here upscales a 300px asset into a ~400-560px card, which is what caused the visible blur.
    const cardImage = artwork.image_url || artwork.thumbnail_url;

    const field = (
        <div
            data-testid="artwork-field"
            className={`overflow-hidden border border-line transition-colors duration-[120ms] ease-standard group-hover:border-line-strong ${cardImage ? 'bg-surface-field' : fieldToneFor(artwork.inventory_code)}`}
            style={size ? { width: size.fieldWidth, height: size.fieldHeight } : { aspectRatio: validDims ? `${w} / ${h}` : '4 / 5' }}
        >
            {cardImage && <img src={cardImage} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
        </div>
    );

    return (
        <a
            href={`/artworks/${encodeURIComponent(artwork.inventory_code)}`}
            aria-label={label || undefined}
            className="group block text-ink"
            style={size ? { width: size.cardWidth } : undefined}
        >
            {size ? (
                <div className="flex items-end justify-center" style={{ height: zoneHeight ?? size.fieldHeight }}>
                    {field}
                </div>
            ) : (
                field
            )}
            <div className="mt-step-3 flex flex-col gap-0.5">
                <p className="figures text-caption text-ink-muted">{artwork.inventory_code}</p>
                {artwork.title && <p className="font-editorial text-title-sm italic decoration-1 underline-offset-2 group-hover:underline">{artwork.title}</p>}
                {artistName && <p className="text-byline">{artistName}</p>}
                {(dims || medium) && <p className="text-caption text-ink-muted">{[dims, medium].filter(Boolean).join(', ')}</p>}
                <p className={`text-ui ${price.muted ? 'text-ink-muted' : 'figures'}`}>{price.text}</p>
            </div>
        </a>
    );
}
