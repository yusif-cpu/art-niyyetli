import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { formatDateRange } from '../lib/format.js';

/** The status label: ink text in a hairline box — never Signal, "current" included. */
export function ExhibitionStatus({ status }) {
    const { locale } = useLocale();
    if (!status) return null;

    return (
        <span className="w-fit border border-line-strong px-step-2 py-0.5 text-caption whitespace-nowrap text-ink">
            {t(locale, `exhibitions.${status === 'past' ? 'archive' : status}`)}
        </span>
    );
}

/**
 * One exhibition as a row between hairlines (the parent `ul` draws the top line): title, date range, venue and
 * status, the whole row one link. Used by the home page and the exhibitions list.
 */
export default function ExhibitionRow({ exhibition }) {
    const { locale } = useLocale();
    const dates = formatDateRange(exhibition.start_date, exhibition.end_date, locale);

    return (
        <li className="border-b border-line">
            <a
                href={`/exhibitions/${encodeURIComponent(exhibition.slug)}`}
                className="group grid gap-step-1 py-step-4 text-ink md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_auto] md:grid-rows-1 md:items-baseline md:gap-step-5"
            >
                <span className="text-byline-lg decoration-1 underline-offset-2 group-hover:underline">{exhibition.title}</span>
                {dates && <span className="figures text-meta text-ink-muted md:col-start-2">{dates}</span>}
                {exhibition.venue && <span className="text-meta text-ink-muted md:col-start-3">{exhibition.venue}</span>}
                {/* A missing field leaves no empty line on phones; on wide screens the status keeps its own column. */}
                {exhibition.status && <span className="md:col-start-4"><ExhibitionStatus status={exhibition.status} /></span>}
            </a>
        </li>
    );
}
