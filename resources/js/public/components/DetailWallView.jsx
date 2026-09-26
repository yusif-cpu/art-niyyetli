import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useElementWidth } from '../lib/useElementWidth.js';
import { PRESETS, WALL_HEIGHTS_CM, detailWallLayout } from '../lib/wall.js';
import { formatDimensions } from '../lib/format.js';
import { fieldToneFor } from './ArtworkCard.jsx';
import HumanFigure from './HumanFigure.jsx';

// The wall may use at most this share of the viewport height (and never more than this many px).
const WALL_VIEWPORT_RATIO = 0.55;
const WALL_MAX_PX = 520;

function metres(cm, locale) {
    const text = (cm / 100).toFixed(2).replace(/0$/, '');

    return `${locale === 'en' ? text : text.replace('.', ',')} m`;
}

/**
 * "Divarda gör": the work on a 240 / 270 / 320 cm wall next to the 170 cm figure — one k, from this section's own
 * container (lib/wall.js detailWallLayout, cap 1.6 px/cm). The restrained version only: the wall is surface, the
 * floor a 1px line, the figure a borderless surface-field-2 shape, captions in ink-muted. No colour fill, no arrows,
 * no animation — a new wall height simply redraws. A work taller than the wall raises it (the caption says so).
 */
export default function DetailWallView({ artwork }) {
    const { locale } = useLocale();
    const [wallCm, setWallCm] = useState(PRESETS.detailWall.wallCm);
    const [ref, width] = useElementWidth();
    const height = typeof window !== 'undefined' && window.innerHeight > 0 ? Math.round(Math.min(window.innerHeight * WALL_VIEWPORT_RATIO, WALL_MAX_PX)) : WALL_MAX_PX;
    const L = detailWallLayout(artwork, { width, height, wallCm });

    return (
        <section aria-labelledby="wall-view-title" className="font-ui">
            <div className="flex flex-wrap items-baseline justify-between gap-step-4">
                <h2 id="wall-view-title" className="text-subheading">{t(locale, 'artwork.wallTitle')}</h2>
                <fieldset className="flex flex-wrap items-baseline gap-step-2">
                    <legend className="sr-only">{t(locale, 'artwork.wallHeight')}</legend>
                    <span aria-hidden="true" className="mr-step-2 text-label text-ink-muted">{t(locale, 'artwork.wallHeight')}</span>
                    {WALL_HEIGHTS_CM.map((cm) => (
                        <button
                            key={cm}
                            type="button"
                            aria-pressed={cm === wallCm}
                            onClick={() => setWallCm(cm)}
                            className={`figures cursor-pointer border px-step-2 py-step-1 text-meta ${cm === wallCm ? 'border-line-strong text-ink' : 'border-line text-ink-muted hover:text-ink'}`}
                        >
                            {metres(cm, locale)}
                        </button>
                    ))}
                </fieldset>
            </div>

            <div ref={ref} className="mt-step-5">
                {L.ready && (
                    <>
                        <div data-testid="wall" className="relative border-b border-line bg-surface" style={{ height: L.wall.height }}>
                            <span className="absolute top-0 left-0 text-caption text-ink-muted">
                                {t(locale, 'artwork.wallCaption')} {metres(L.wall.heightCm, locale)}
                            </span>
                            <div
                                data-testid="wall-work"
                                className={`absolute overflow-hidden border border-line ${artwork.image_url ? 'bg-surface-field' : fieldToneFor(artwork.inventory_code)}`}
                                style={{ left: L.work.left, bottom: L.work.bottom, width: L.work.width, height: L.work.height }}
                            >
                                {artwork.image_url && <img src={artwork.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
                            </div>
                            <HumanFigure width={L.figure.width} height={L.figure.height} className="absolute bottom-0" style={{ left: L.figure.left }} />
                            <span className="absolute text-caption whitespace-nowrap text-ink-muted" style={{ left: L.figure.left + L.figure.width + 6, bottom: L.figure.height - 12 }}>
                                {t(locale, 'artwork.figure')}
                            </span>
                        </div>
                        <p className="mt-step-2 text-caption text-ink-muted">{formatDimensions(artwork.width_cm, artwork.height_cm, locale)}</p>
                    </>
                )}
            </div>
        </section>
    );
}
