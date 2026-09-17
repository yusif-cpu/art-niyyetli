import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { listExhibitions } from '../services/exhibitions.js';
import ExhibitionCard from '../components/ExhibitionCard.jsx';
import Pagination from '../components/Pagination.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';

const TAB_KEYS = [
    { value: undefined, key: 'exhibitions.all' },
    { value: 'current', key: 'exhibitions.current' },
    { value: 'upcoming', key: 'exhibitions.upcoming' },
    { value: 'archive', key: 'exhibitions.archive' },
];

export default function ExhibitionsPage() {
    const { locale } = useLocale();
    const [filter, setFilter] = useState(undefined);
    const [page, setPage] = useState(1);
    const { data, meta, loading, error } = useApiData(() => listExhibitions(locale, { filter, page }), [locale, filter, page]);

    return (
        <div className="px-6 py-8">
            <h1 className="mb-6 text-2xl font-semibold">{t(locale, 'nav.exhibitions')}</h1>
            <div className="mb-6 flex gap-2">
                {TAB_KEYS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => { setFilter(tab.value); setPage(1); }}
                        className={`rounded-md px-3 py-1.5 text-sm ${filter === tab.value ? 'bg-neutral-900 text-white' : 'border border-neutral-300'}`}
                    >
                        {t(locale, tab.key)}
                    </button>
                ))}
            </div>

            {loading && <LoadingState />}
            {error && <ErrorState error={error} />}
            {!loading && !error && data?.length === 0 && <EmptyState />}
            {!loading && !error && data?.length > 0 && (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {data.map((exhibition) => <ExhibitionCard key={exhibition.slug} exhibition={exhibition} />)}
                    </div>
                    <Pagination meta={meta} onPageChange={setPage} />
                </>
            )}
        </div>
    );
}
