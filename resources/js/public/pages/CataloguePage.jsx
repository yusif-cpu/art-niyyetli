import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { listArtworks } from '../services/artworks.js';
import { listArtists } from '../services/artists.js';
import ArtworkCard from '../components/ArtworkCard.jsx';
import FilterBar from '../components/FilterBar.jsx';
import Pagination from '../components/Pagination.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function CataloguePage() {
    const { locale } = useLocale();
    const [filters, setFilters] = useState({});
    const [page, setPage] = useState(1);
    const [retryToken, setRetryToken] = useState(0);

    const artists = useApiData(() => listArtists(locale), [locale]);
    const artworks = useApiData(() => listArtworks(locale, { page, ...filters }), [locale, page, JSON.stringify(filters), retryToken]);

    usePageMeta({ title: `${t(locale, 'nav.artworks')} — ArtNiyyətli` });

    function updateFilters(next) {
        setFilters(next);
        setPage(1);
    }

    return (
        <div className="px-6 py-8">
            <h1 className="mb-6 text-2xl font-semibold">{t(locale, 'nav.artworks')}</h1>
            <FilterBar artists={artists.data || []} filters={filters} onChange={updateFilters} />

            {artworks.loading && <LoadingState />}
            {artworks.error && <ErrorState error={artworks.error} onRetry={() => setRetryToken((t) => t + 1)} />}
            {!artworks.loading && !artworks.error && artworks.data?.length === 0 && <EmptyState />}
            {!artworks.loading && !artworks.error && artworks.data?.length > 0 && (
                <>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {artworks.data.map((artwork) => <ArtworkCard key={artwork.inventory_code} artwork={artwork} />)}
                    </div>
                    <Pagination meta={artworks.meta} onPageChange={setPage} />
                </>
            )}
        </div>
    );
}
