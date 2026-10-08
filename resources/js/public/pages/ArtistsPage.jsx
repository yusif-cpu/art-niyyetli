import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { listArtists } from '../services/artists.js';
import ArtistCard from '../components/ArtistCard.jsx';
import Pagination from '../components/Pagination.jsx';
import ErrorState from '../components/ErrorState.jsx';
import PageHeader from '../components/PageHeader.jsx';

const GRID = 'grid grid-cols-1 gap-x-step-6 gap-y-step-7 md:grid-cols-3 xl:grid-cols-4';

/**
 * All artists, in the API's own order (curator sort order). E5 is not paginated today; if a response ever carries
 * pagination meta, the shared Pagination renders it (it renders nothing for a single page).
 */
export default function ArtistsPage() {
    const { locale } = useLocale();
    const [page, setPage] = useState(1);
    const [retryToken, setRetryToken] = useState(0);
    const { data, meta, loading, error } = useApiData(() => listArtists(locale, page > 1 ? { page } : undefined), [locale, page, retryToken]);

    usePageMeta({ title: `${t(locale, 'nav.artists')} | ArtNiyyətli`, description: t(locale, 'artist.listDescription') });

    return (
        <div className="px-page pb-step-9 font-ui">
            <PageHeader label={t(locale, 'labels.representation')} title={t(locale, 'nav.artists')} description={t(locale, 'artist.listDescription')} />

            <div className="mt-step-7">
                {loading && !data && (
                    <div className={GRID} aria-busy="true" data-testid="artists-skeleton">
                        {Array.from({ length: 4 }, (_, i) => (
                            <div key={i} aria-hidden="true">
                                {/* The cards' round portrait, so the page does not jump when they load. */}
                                <div className="aspect-square w-full rounded-full border border-line bg-surface-field" />
                                <div className="mt-step-3 h-4 w-2/3 bg-surface-field" />
                            </div>
                        ))}
                    </div>
                )}
                {error && <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />}
                {!error && data?.length === 0 && <p className="text-ui text-ink-muted">{t(locale, 'common.empty')}</p>}
                {!error && data?.length > 0 && (
                    <>
                        <ul className={GRID}>
                            {data.map((artist) => (
                                <li key={artist.slug}>
                                    <ArtistCard artist={artist} />
                                </li>
                            ))}
                        </ul>
                        <Pagination meta={meta} onPageChange={setPage} />
                    </>
                )}
            </div>
        </div>
    );
}
