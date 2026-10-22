import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useElementWidth } from '../lib/useElementWidth.js';
import { MIN_CARD_PX, PRESETS, VERTICAL_BELOW_PX, computeScale, packRows } from '../lib/wall.js';
import ArtworkCard from './ArtworkCard.jsx';
import ScaleRule from './ScaleRule.jsx';

// Gaps between cards (krem-bordo: 72px between rows, 56px between cards). packRows needs the same number the CSS uses.
const CARD_GAP_PX = 56;

/**
 * Artworks at true relative size: one k for the whole list (lib/wall.js computeScale, grid mode), packed into rows
 * with a per-row zone and bottom-aligned fields (packRows). Renders nothing until the container has a width, so the
 * layout never jumps from a guessed size. Works with unusable sizes follow as unscaled cards. `lead` sits at the left
 * of the ScaleRule's line (the catalogue's result count), the rule on the right.
 */
export default function ScaledArtworkGrid({ artworks, preset = PRESETS.catalogue, showScale = true, lead = null }) {
    const { locale } = useLocale();
    const [ref, width] = useElementWidth();
    const list = Array.isArray(artworks) ? artworks : [];

    // "Narrow" is the VIEWPORT below md (like the header), not the container: at lg the filter column makes the
    // container narrower than 768px, and it must not switch to the phone share there.
    const narrow = typeof window !== 'undefined' && window.innerWidth < VERTICAL_BELOW_PX;
    const maxItemHeightPx = typeof window !== 'undefined' && window.innerHeight > 0 ? Math.round(window.innerHeight * preset.maxItemHeightRatio) : Infinity;
    const scale = computeScale(list, { mode: 'grid', width, share: narrow ? preset.shareVertical : preset.share, maxItemHeightPx, minItemPx: preset.minItemPx });
    const { rows, skipped } = packRows(list, { containerWidth: width, k: scale.k, gap: CARD_GAP_PX });

    return (
        <div ref={ref} className="flex flex-col gap-[clamp(48px,5vw,72px)]" data-k={scale.k || undefined}>
            {(lead || (showScale && rows.length > 0)) && (
                <div className="flex flex-wrap items-center justify-between gap-step-4">
                    {lead}
                    {showScale && rows.length > 0 && <ScaleRule k={scale.k} maxWidth={lead ? width / 2 : width} className={lead ? 'ml-auto' : ''} />}
                </div>
            )}
            {rows.map((row, index) => (
                <div key={index} className="flex gap-x-[56px] [&>*]:shrink-0">
                    {row.items.map((cell) => (
                        <ArtworkCard
                            key={cell.item.inventory_code}
                            artwork={cell.item}
                            zoneHeight={row.zoneHeight}
                            size={{ fieldWidth: cell.fieldWidth, fieldHeight: cell.fieldHeight, cardWidth: cell.cardWidth }}
                        />
                    ))}
                </div>
            ))}
            {width > 0 && skipped.length > 0 && (
                <div className="flex flex-wrap gap-x-[56px] gap-y-step-7" aria-label={t(locale, 'catalogue.unsized')}>
                    {skipped.map(({ item }) => (
                        <div key={item.inventory_code} style={{ width: MIN_CARD_PX }}>
                            <ArtworkCard artwork={item} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
