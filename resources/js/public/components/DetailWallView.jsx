import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useElementWidth } from '../lib/useElementWidth.js';
import { PRESETS, WALL_HEIGHTS_CM, detailWallLayout } from '../lib/wall.js';
import { formatDimensions } from '../lib/format.js';
import { fieldToneFor } from './ArtworkCard.jsx';
import HumanFigure from './HumanFigure.jsx';
import Emphasis from './Emphasis.jsx';

// The wall may use at most this share of the viewport height (and never more than this many px).
const WALL_VIEWPORT_RATIO = 0.55;
const WALL_MAX_PX = 520;
// The "170 sm" label: 6px from the figure, and the room it needs (14px text on phones, about 52px wide).
const FIGURE_LABEL_GAP_PX = 6;
const FIGURE_LABEL_ROOM_PX = 60;

function metres(cm, locale) {
    const text = (cm / 100).toFixed(2).replace(/0$/, '');

    return `${locale === 'en' ? text : text.replace('.', ',')} m`;
}

/**
 * "Divarda gör": the work on a 240 / 270 / 320 cm wall next to the 170 cm figure — one k, from this section's own
 * container (lib/wall.js detailWallLayout, cap 1.6 px/cm; the maths is unchanged). Krem-bordo frame: a wine band with
 * the label and the bold title on the left and the wall-height choice on the right (the chosen height on cream); the
 * wall itself is a cream surface with a floor strip, the figure the warm grey silhouette. No arrows, no animation — a
 * new wall height simply redraws. A work taller than the wall raises it (the caption in the wall's corner says so).
 */
export default function DetailWallView({ artwork }) {
    const { locale } = useLocale();
    const [wallCm, setWallCm] = useState(PRESETS.detailWall.wallCm);
    const [ref, width] = useElementWidth();
    const height = typeof window !== 'undefined' && window.innerHeight > 0 ? Math.round(Math.min(window.innerHeight * WALL_VIEWPORT_RATIO, WALL_MAX_PX)) : WALL_MAX_PX;
    const L = detailWallLayout(artwork, { width, height, wallCm });

    return (
        <section aria-labelledby="wall-view-title" data-surface="wine" className="bg-wine px-page py-[clamp(72px,7.6vw,110px)] font-ui text-surface" data-testid="wall-band">
            <div className="flex flex-wrap items-end justify-between gap-step-5">
                <div className="min-w-0">
                    <p className="mb-step-3 text-[13px] leading-[1.35] font-semibold text-wine-muted max-md:text-[14px]">{t(locale, 'artwork.wallTitle')}</p>
                    <h2 id="wall-view-title" className="text-section text-surface">
                        <Emphasis text={t(locale, 'pages.artwork.wallTitle')} />
                    </h2>
                </div>
                <fieldset className="flex flex-col items-start gap-step-2 md:items-end">
                    <legend className="sr-only">{t(locale, 'artwork.wallHeight')}</legend>
                    <span aria-hidden="true" className="text-[13px] text-wine-muted max-md:text-[14px]">{t(locale, 'artwork.wallHeight')}</span>
                    <div className="flex border border-surface/30">
                        {WALL_HEIGHTS_CM.map((cm) => (
                            <button
                                key={cm}
                                type="button"
                                aria-pressed={cm === wallCm}
                                aria-label={metres(cm, locale)}
                                onClick={() => setWallCm(cm)}
                                className={`figures inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center px-step-4 text-[13px] font-semibold transition-colors duration-150 max-md:text-[14px] ${cm === wallCm ? 'bg-surface text-wine' : 'text-surface hover:bg-surface/10'}`}
                            >
                                {cm} {locale === 'en' ? 'cm' : 'sm'}
                            </button>
                        ))}
                    </div>
                </fieldset>
            </div>

            <div ref={ref} className="mt-step-7">
                {L.ready && (
                    <>
                        <div data-testid="wall" className="relative bg-surface" style={{ height: L.wall.height }}>
                            <span className="absolute top-step-3 left-step-3 text-caption text-ink-muted">
                                {t(locale, 'artwork.wallCaption')} {metres(L.wall.heightCm, locale)}
                            </span>
                            <div
                                data-testid="wall-work"
                                className={`absolute overflow-hidden shadow-present ${artwork.image_url ? 'bg-surface-field' : fieldToneFor(artwork.inventory_code)}`}
                                style={{ left: L.work.left, bottom: L.work.bottom, width: L.work.width, height: L.work.height }}
                            >
                                {artwork.image_url && <img src={artwork.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
                            </div>
                            <HumanFigure width={L.figure.width} height={L.figure.height} className="absolute bottom-0" style={{ left: L.figure.left }} />
                            {/* "170 sm" beside the figure's head: on its right, or on its left when the right edge is too
                                close (a phone: the scene fills the width and the figure stands near the edge). */}
                            <span
                                className="absolute text-caption whitespace-nowrap text-ink-muted"
                                data-testid="wall-figure-label"
                                style={L.figure.left + L.figure.width + FIGURE_LABEL_GAP_PX + FIGURE_LABEL_ROOM_PX <= width
                                    ? { left: L.figure.left + L.figure.width + FIGURE_LABEL_GAP_PX, bottom: L.figure.height - 12 }
                                    : { right: width - L.figure.left + FIGURE_LABEL_GAP_PX, bottom: L.figure.height - 12 }}
                            >
                                {t(locale, 'artwork.figure')}
                            </span>
                        </div>
                        {/* The floor. */}
                        <div aria-hidden="true" className="h-step-4 bg-surface-field-2" data-testid="wall-floor" />
                        <div className="mt-step-3 flex flex-wrap justify-between gap-x-step-5 gap-y-step-1 text-[13px] text-wine-muted max-md:text-[14px]">
                            <span>{t(locale, 'pages.artwork.wallNote')}</span>
                            <span className="figures">{formatDimensions(artwork.width_cm, artwork.height_cm, locale)}</span>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
