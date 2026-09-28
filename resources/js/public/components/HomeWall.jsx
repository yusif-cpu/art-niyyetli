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
const CAPTION_BLOCK_PX = 56; // room for title, artist and size under a work
const VERTICAL_INSET_PX = 17; // the vertical surface's padding (16) + its 1px edge
const FLOOR_OVERHANG_PX = 12; // the short floor line under the figure reaches a little past it
// The vertical stack takes k from the width; on a low screen (a phone on its side) that would make the tallest work
// fill the screen. It may take at most this share of the viewport height, never less than the floor.
const STACK_MAX_ITEM_RATIO = 0.6;
const STACK_MAX_ITEM_FLOOR_PX = 200;

function viewportHeight() {
    return typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 900;
}

function wallHeight() {
    return Math.round(Math.min(WALL_MAX_PX, Math.max(WALL_MIN_PX, viewportHeight() * WALL_VIEWPORT_RATIO)));
}

/** The tallest a work may be in the vertical stack: 60% of the viewport height, at least 200px. */
export function stackMaxItemHeight() {
    return Math.max(STACK_MAX_ITEM_FLOOR_PX, Math.round(viewportHeight() * STACK_MAX_ITEM_RATIO));
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
export default function HomeWall({ artworks, label }) {
    const { locale } = useLocale();
    const [ref, width] = useElementWidth();
    const [scrollLeft, setScrollLeft] = useState(0);
    const vertical = typeof window !== 'undefined' && window.innerWidth < VERTICAL_BELOW_PX;
    // Vertical: the works hang inside a framed surface, so they are laid out in the width inside its padding and edge.
    const innerWidth = vertical ? Math.max(0, width - 2 * VERTICAL_INSET_PX) : width;
    const L = wallLayout(artworks, { width: innerWidth, height: wallHeight(), vertical, ...(vertical ? { maxItemHeightPx: stackMaxItemHeight() } : {}) });
    const count = L.items.length;
    // Horizontal: the canvas ends at the floor unless a caption hangs below it (a work reaching the floor).
    const canvasHeight = vertical ? L.height : Math.max(L.floor, ...L.items.map((it) => it.top + it.height + CAPTION_OFFSET_PX + CAPTION_BLOCK_PX));

    return (
        <div ref={ref} className="w-full">
            {L.ready && (
                <>
                    <div
                        tabIndex={0}
                        role="region"
                        aria-label={label || t(locale, 'home.wallLabel')}
                        data-testid="home-wall"
                        className={vertical ? 'border border-line bg-surface-field-3 p-step-4' : 'overflow-x-auto overflow-y-hidden'}                        onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}
                    >
                        <div className="relative" style={{ width: vertical ? '100%' : Math.max(L.width, width), height: canvasHeight }} data-k={L.k}>
                            {/* The wall itself: a surface from the floor line up to its 270 cm top edge, so the air above
                                the works reads as wall. Below the floor stays page (room for a caption that reaches it).
                                Vertical: the whole column is the surface (the scroller's own edge); there is no shared
                                floor, so a short floor line stands under the figure alone. */}
                            {!vertical && <div aria-hidden="true" data-testid="wall-surface" className="absolute top-0 right-0 left-0 border-t border-b border-line bg-surface-field-3" style={{ height: L.floor }} />}
                            <HumanFigure width={L.figure.width} height={L.figure.height} className="absolute" style={{ left: L.figure.left, top: L.figure.top }} />
                            {vertical && <span aria-hidden="true" data-testid="figure-floor" className="absolute block h-px bg-line-strong" style={{ left: L.figure.left, top: L.figure.top + L.figure.height, width: L.figure.width + FLOOR_OVERHANG_PX }} />}
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
                                            style={vertical ? { left: it.left, top: it.top + it.height + CAPTION_OFFSET_PX, width: Math.max(1, innerWidth - it.left), alignItems: 'flex-start', textAlign: 'left' } : { left: it.captionLeft, top: it.top + it.height + CAPTION_OFFSET_PX, width: it.captionWidth }}
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
                    {/* One line under the floor: the two scales on the left (the figure's 170 cm and one metre), the
                        position on the right. */}
                    <div className="mt-step-3 flex items-center justify-between gap-step-5" data-testid="wall-footer">
                        <div className="flex min-w-0 items-center gap-step-5">
                            <span className="text-caption whitespace-nowrap text-ink-muted">{t(locale, 'artwork.figure')}</span>
                            <ScaleRule k={L.k} maxWidth={width} />
                        </div>
                        {!vertical && count > 1 && (
                            <p className="figures text-caption text-ink-muted" data-testid="wall-position" aria-live="polite">
                                <span className="sr-only">{t(locale, 'home.position')} </span>
                                {firstVisibleIndex(L.items, scrollLeft) + 1} / {count}
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
