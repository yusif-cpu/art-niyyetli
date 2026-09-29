import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useElementWidth } from '../lib/useElementWidth.js';
import { PRESETS, computeScale, isValidDims, readDims } from '../lib/wall.js';
import { fieldToneFor } from './ArtworkCard.jsx';
import ScaleRule from './ScaleRule.jsx';

/**
 * The artwork itself: the largest element of its page. The field is sized from centimetres at a k that fills the
 * container width without the work growing taller than 70% of the viewport, capped at 6 px/cm so small works stay
 * smaller than big ones (lib/wall.js, detailMain preset); a ScaleRule states the scale. Several images: a row of thumbnails switches the main image (no lightbox),
 * keyboard reachable, aria-current on the chosen one. The field carries the page's one hung-work shadow.
 */
export default function ArtworkViewer({ artwork }) {
    const { locale } = useLocale();
    const [ref, width] = useElementWidth();
    const images = Array.isArray(artwork.images) ? artwork.images.filter((image) => image.url) : [];
    const [selected, setSelected] = useState(() => Math.max(0, images.findIndex((image) => image.is_main)));
    const current = images[selected] ?? images[0];

    const { w, h } = readDims(artwork);
    const valid = isValidDims(w, h);
    const preset = PRESETS.detailMain;
    const maxItemHeightPx = window.innerHeight > 0 ? Math.round(window.innerHeight * preset.maxItemHeightRatio) : Infinity;
    const { k } = valid ? computeScale([artwork], { mode: preset.mode, width, share: preset.share, maxItemHeightPx, maxK: preset.maxK }) : { k: 0 };
    const alt = [artwork.title, artwork.artist?.name].filter(Boolean).join(', ');

    const fieldClass = `overflow-hidden border border-line shadow-hang ${current ? 'bg-surface-field' : fieldToneFor(artwork.inventory_code)}`;
    const image = current && <img src={current.url} alt={alt} loading="eager" decoding="async" fetchPriority="high" className="h-full w-full object-cover" />;

    return (
        <div ref={ref} className="w-full">
            {k > 0 && (
                <>
                    <ScaleRule k={k} maxWidth={width} className="mb-step-4" />
                    <div className="flex justify-center">
                        <div data-testid="artwork-main-field" className={fieldClass} style={{ width: Math.round(w * k), height: Math.round(h * k) }}>
                            {image}
                        </div>
                    </div>
                </>
            )}
            {!valid && width > 0 && (
                <div data-testid="artwork-main-field" className={`aspect-[4/5] w-full ${fieldClass}`}>
                    {image}
                </div>
            )}

            {images.length > 1 && (
                <ul className="mt-step-5 flex flex-wrap gap-step-2" aria-label={t(locale, 'artwork.images')}>
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
                                    className={`block cursor-pointer border p-0.5 transition-colors duration-[120ms] ease-standard ${chosen ? 'border-line-strong' : 'border-line hover:border-line-strong'}`}
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
    );
}
