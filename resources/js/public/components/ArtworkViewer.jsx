import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useElementWidth } from '../lib/useElementWidth.js';
import { PRESETS, computeScale, isValidDims, readDims } from '../lib/wall.js';
import { fieldToneFor } from './ArtworkCard.jsx';
import ScaleRule from './ScaleRule.jsx';

// The work on its stage: at most this tall (and 75% of the viewport), at most this share of the stage's width.
const STAGE_WORK_PX = 640;
const STAGE_SHARE = 0.8;

/**
 * The artwork itself, on its surface-sunk stage (krem-bordo): the work centred, about 640px tall — a wide work 80% of
 * the stage's width — still capped at 6 px/cm so a small work stays smaller than a big one (lib/wall.js, the
 * detailMain preset's maxK). It carries the hang shadow and the soft presentation shadow. A ScaleRule under it states
 * the scale. Several images: a row of thumbnails switches the main image (no lightbox), keyboard reachable,
 * aria-current on the chosen one.
 */
export default function ArtworkViewer({ artwork }) {
    const { locale } = useLocale();
    const [ref, width] = useElementWidth();
    const images = Array.isArray(artwork.images) ? artwork.images.filter((image) => image.url) : [];
    const [selected, setSelected] = useState(() => Math.max(0, images.findIndex((image) => image.is_main)));
    const current = images[selected] ?? images[0];

    const { w, h } = readDims(artwork);
    const valid = isValidDims(w, h);
    const maxItemHeightPx = Math.round(Math.min(STAGE_WORK_PX, window.innerHeight > 0 ? window.innerHeight * 0.75 : STAGE_WORK_PX));
    const { k } = valid ? computeScale([artwork], { mode: 'grid', width, share: STAGE_SHARE, maxItemHeightPx, maxK: PRESETS.detailMain.maxK }) : { k: 0 };
    const alt = [artwork.title, artwork.artist?.name].filter(Boolean).join(', ');

    const fieldClass = `overflow-hidden shadow-present ${current ? 'bg-surface-field' : fieldToneFor(artwork.inventory_code)}`;
    const image = current && <img src={current.url} alt={alt} loading="eager" decoding="async" fetchPriority="high" className="h-full w-full object-cover" />;

    return (
        <div className="flex flex-col bg-surface-sunk px-page py-step-8 lg:min-h-[860px] lg:py-[96px]" data-testid="artwork-stage">
            <div ref={ref} className="flex w-full flex-1 items-center justify-center">
                {k > 0 && (
                    <div data-testid="artwork-main-field" className={fieldClass} style={{ width: Math.round(w * k), height: Math.round(h * k) }}>
                        {image}
                    </div>
                )}
                {!valid && width > 0 && (
                    <div data-testid="artwork-main-field" className={`aspect-[4/5] w-3/4 ${fieldClass}`}>
                        {image}
                    </div>
                )}
            </div>

            <div className="mt-step-7 flex flex-wrap items-end justify-between gap-step-4">
                {k > 0 ? <ScaleRule k={k} maxWidth={width / 2} /> : <span />}
                {images.length > 1 && (
                    <ul className="flex flex-wrap gap-step-2" aria-label={t(locale, 'artwork.images')}>
                        {images.map((img, index) => {
                            const chosen = index === selected;
                            const type = t(locale, `artwork.imageType.${img.type}`);

                            return (
                                <li key={img.url}>
                                    <button
                                        type="button"
                                        aria-current={chosen ? 'true' : undefined}
                                        aria-label={`${t(locale, 'artwork.image')} ${index + 1}: ${type}`}
                                        onClick={() => setSelected(index)}
                                        className={`block cursor-pointer border p-0.5 transition-colors duration-[120ms] ease-standard ${chosen ? 'border-wine' : 'border-line hover:border-line-strong'}`}
                                    >
                                        {/* The 64px choice loads the thumbnail variant (S8), not the full image; older data without it falls back to url. */}
                                        <img src={img.thumbnail_url || img.url} alt="" loading="lazy" decoding="async" className="h-16 w-16 object-cover" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
