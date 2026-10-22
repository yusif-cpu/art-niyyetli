import { useLocale } from '../i18n/LocaleContext.jsx';
import { formatDateSpan } from '../lib/format.js';

/** An exhibition's cover: its first photo, or null. */
export function exhibitionCover(exhibition) {
    return Array.isArray(exhibition?.media) ? exhibition.media.find((item) => item.type === 'photo' && item.url)?.url ?? null : null;
}

/**
 * One exhibition as a card (krem-bordo), the whole card a link: the cover 340px tall when there is one (no empty box
 * without), "dates · venue" in 13px ink-muted, the title 28px 600 wine, and the short text in Spectral.
 */
export default function ExhibitionCard({ exhibition }) {
    const { locale } = useLocale();
    const cover = exhibitionCover(exhibition);
    const line = [formatDateSpan(exhibition.start_date, exhibition.end_date, locale), exhibition.venue].filter(Boolean).join(' · ');

    return (
        <a href={`/exhibitions/${encodeURIComponent(exhibition.slug)}`} className="group flex flex-col text-ink" data-testid="exhibition-card">
            {cover && (
                <span className="mb-step-5 block h-[240px] overflow-hidden bg-surface-sunk md:h-[340px]">
                    <img src={cover} alt={exhibition.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                </span>
            )}
            {line && <span className="figures block text-meta text-ink-muted">{line}</span>}
            <span className="mt-step-2 block text-[24px] leading-[1.15] font-semibold tracking-[-0.02em] text-wine decoration-1 underline-offset-4 group-hover:underline md:text-[28px]">{exhibition.title}</span>
            {exhibition.short_text && <span className="mt-step-3 block max-w-prose font-editorial text-[16px] leading-[1.55] text-ink-muted">{exhibition.short_text}</span>}
        </a>
    );
}
