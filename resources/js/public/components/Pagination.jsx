import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';

/** Page numbers to show: first, last, and the current page with one neighbour each side; gaps become "…". */
export function pageWindow(current, last) {
    const pages = new Set([1, last, current - 1, current, current + 1].filter((p) => p >= 1 && p <= last));
    const sorted = [...pages].sort((a, b) => a - b);
    const out = [];
    sorted.forEach((page, index) => {
        if (index > 0 && page - sorted[index - 1] > 1) out.push('…');
        out.push(page);
    });

    return out;
}

const buttonClass = 'min-w-9 cursor-pointer border border-line px-step-2 py-step-1 text-meta text-ink-muted transition-colors duration-[120ms] ease-standard hover:border-line-strong hover:text-ink disabled:cursor-default disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted';

export default function Pagination({ meta, onPageChange }) {
    const { locale } = useLocale();
    if (!meta || meta.last_page <= 1) return null;

    const current = meta.current_page;

    return (
        <nav aria-label={t(locale, 'catalogue.page')} className="mt-step-8 flex flex-wrap items-center gap-step-2 font-ui">
            <button type="button" disabled={current <= 1} onClick={() => onPageChange(current - 1)} className={buttonClass}>
                {t(locale, 'pagination.prev')}
            </button>
            {pageWindow(current, meta.last_page).map((page, index) =>
                page === '…' ? (
                    <span key={`gap-${index}`} aria-hidden="true" className="px-step-1 text-meta text-ink-muted">…</span>
                ) : (
                    <button
                        key={page}
                        type="button"
                        aria-current={page === current ? 'page' : undefined}
                        aria-label={`${t(locale, 'catalogue.page')} ${page}`}
                        onClick={() => page !== current && onPageChange(page)}
                        className={`figures ${buttonClass} ${page === current ? 'border-line-strong text-ink' : ''}`}
                    >
                        {page}
                    </button>
                )
            )}
            <button type="button" disabled={current >= meta.last_page} onClick={() => onPageChange(current + 1)} className={buttonClass}>
                {t(locale, 'pagination.next')}
            </button>
        </nav>
    );
}
