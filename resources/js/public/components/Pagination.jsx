import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';

export default function Pagination({ meta, onPageChange }) {
    const { locale } = useLocale();
    if (!meta || meta.last_page <= 1) return null;

    return (
        <div className="mt-6 flex items-center justify-between text-sm text-neutral-600">
            <span>{meta.current_page} / {meta.last_page} {t(locale, 'pagination.of')} ({meta.total})</span>
            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={meta.current_page <= 1}
                    onClick={() => onPageChange(meta.current_page - 1)}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 disabled:opacity-40"
                >
                    {t(locale, 'pagination.prev')}
                </button>
                <button
                    type="button"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => onPageChange(meta.current_page + 1)}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 disabled:opacity-40"
                >
                    {t(locale, 'pagination.next')}
                </button>
            </div>
        </div>
    );
}
