import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useElementWidth } from '../lib/useElementWidth.js';
import { VERTICAL_BELOW_PX, wallLayout } from '../lib/wall.js';
import { formatDimensions } from '../lib/format.js';
import { fieldToneFor } from './ArtworkCard.jsx';
import HumanFigure from './HumanFigure.jsx';
import ScaleRule from './ScaleRule.jsx';

// The wall area on the first screen: this share of the viewport height, clamped (it includes the caption band).
const WALL_VIEWPORT_RATIO = 0.58;
const WALL_MIN_PX = 320;
const WALL_MAX_PX = 640;
const CAPTION_OFFSET_PX = 10;

function wallHeight() {
    const vh = typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 900;

    return Math.round(Math.min(WALL_MAX_PX, Math.max(WALL_MIN_PX, vh * WALL_VIEWPORT_RATIO)));
}

/** Index of the first work whose right edge is past the scroll position: what the "1 / 8" counter shows. */
export function firstVisibleIndex(items, scrollLeft) {
    const index = items.findIndex((item) => item.left + item.width > scrollLeft + 1);

    return index === -1 ? items.length - 1 : index;
}

/**
 * The home wall: the works at true relative size on a 270 cm wall, centres at 150 cm, the 170 cm figure on the
 * floor at the left, all at one k from lib/wall.js wallLayout (height-based; vertical below md). A plain horizontal
 * scroller — no auto-scroll, no animation, no edge fade — focusable and named, so arrow keys scroll it; a "1 / 8"
 * counter follows the scroll. Each work links to its page and carries the hung-work shadow. Captions give title,
 * artist and size, never a price: the wall is not a shop window. Horizontal captions are centred under their work
 * (≤ 180px, the box wallLayout spaces for); vertical captions run from the work to the right edge, so a small work
 * does not squeeze its text.
 */
export default function HomeWall({ artworks }) {
    const { locale } = useLocale();
    const [ref, width] = useElementWidth();
    const [scrollLeft, setScrollLeft] = useState(0);
    const vertical = typeof window !== 'undefined' && window.innerWidth < VERTICAL_BELOW_PX;
    const L = wallLayout(artworks, { width, height: wallHeight(), vertical });
    const count = L.items.length;

    return (
        <div ref={ref} className="w-full">
            {L.ready && (
                <>
                    <ScaleRule k={L.k} maxWidth={width} className="mb-step-4" />
                    <div
                        tabIndex={0}
                        role="region"
                        aria-label={t(locale, 'home.wallLabel')}
                        data-testid="home-wall"
                        className={vertical ? '' : 'overflow-x-auto overflow-y-hidden'}
                        onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}
                    >
                        <div className="relative" style={{ width: vertical ? '100%' : L.width, height: L.height }} data-k={L.k}>
                            {!vertical && <div aria-hidden="true" className="absolute right-0 left-0 border-b border-line" style={{ top: L.floor }} />}
                            <HumanFigure width={L.figure.width} height={L.figure.height} className="absolute" style={{ left: L.figure.left, top: L.figure.top }} />
                            <span className="absolute text-caption whitespace-nowrap text-ink-muted" style={{ left: L.figure.left, top: L.figure.top + L.figure.height + 4 }}>
                                {t(locale, 'artwork.figure')}
                            </span>
                            {L.items.map((it) => {
                                const artwork = it.item;
                                const dims = formatDimensions(it.widthCm, it.heightCm, locale);
                                const artist = artwork.artist?.name;

                                return (
                                    <a
                                        key={artwork.inventory_code}
                                        href={`/artworks/${encodeURIComponent(artwork.inventory_code)}`}
                                        aria-label={[artwork.title, artist, dims].filter(Boolean).join(', ')}
                                        className="group text-ink"
                                        data-testid="wall-item"
                                    >
                                        <span
                                            className={`absolute block overflow-hidden border border-line shadow-hang transition-colors duration-[120ms] ease-standard group-hover:border-line-strong ${artwork.image_url ? 'bg-surface-field' : fieldToneFor(artwork.inventory_code)}`}
                                            style={{ left: it.left, top: it.top, width: it.width, height: it.height }}
                                            data-testid="wall-field"
                                        >
                                            {artwork.image_url && <img src={artwork.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
                                        </span>
                                        <span
                                            className="absolute flex flex-col items-center text-center"
                                            style={vertical ? { left: it.left, top: it.top + it.height + CAPTION_OFFSET_PX, width: Math.max(1, width - it.left), alignItems: 'flex-start', textAlign: 'left' } : { left: it.captionLeft, top: it.top + it.height + CAPTION_OFFSET_PX, width: it.captionWidth }}
                                            data-testid="wall-caption"
                                        >
                                            {artwork.title && <span className="font-editorial text-title-sm italic decoration-1 underline-offset-2 group-hover:underline">{artwork.title}</span>}
                                            {artist && <span className="text-byline">{artist}</span>}
                                            {dims && <span className="text-caption text-ink-muted">{dims}</span>}
                                        </span>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                    {!vertical && count > 1 && (
                        <p className="figures mt-step-3 text-caption text-ink-muted" data-testid="wall-position" aria-live="polite">
                            <span className="sr-only">{t(locale, 'home.position')} </span>
                            {firstVisibleIndex(L.items, scrollLeft) + 1} / {count}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
