import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { artworkFor } from '../lib/artists.js';
import { listArtists } from '../services/artists.js';
import { listArtworks } from '../services/artworks.js';
import ArtistCard from '../components/ArtistCard.jsx';
import Pagination from '../components/Pagination.jsx';
import ErrorState from '../components/ErrorState.jsx';
import PageHeader from '../components/PageHeader.jsx';

// The home page's artist grid: two columns on phones, four from md.
const GRID = 'grid grid-cols-2 gap-x-step-4 gap-y-step-7 md:grid-cols-4 md:gap-x-step-5';
// The artists list carries no works: one catalogue page (the API's largest) gives each card a work to show.
const WORKS_PER_PAGE = 60;

/**
 * All artists, in the API's own order (curator sort order), each card showing one of the artist's works (from the
 * catalogue, the existing E7 endpoint) or the monogram. E5 is not paginated today; if a response ever carries
 * pagination meta, the shared Pagination renders it (it renders nothing for a single page).
 */
export default function ArtistsPage() {
    const { locale } = useLocale();
    const [page, setPage] = useState(1);
    const [retryToken, setRetryToken] = useState(0);
    const { data, meta, loading, error } = useApiData(() => listArtists(locale, page > 1 ? { page } : undefined), [locale, page, retryToken]);
    // The works only decorate the cards: a failed or empty answer leaves the monograms, never an error.
    const works = useApiData(() => listArtworks(locale, { per_page: WORKS_PER_PAGE }), [locale]);
    const workList = Array.isArray(works.data) ? works.data : [];

    usePageMeta({ title: `${t(locale, 'nav.artists')} | ArtNiyyətli`, description: t(locale, 'artist.listDescription') });

    return (
        <div className="font-ui">
            <PageHeader label={t(locale, 'nav.artists')} title={t(locale, 'pages.artist.listTitle')} description={t(locale, 'artist.listDescription')} />

            <div className="px-page py-[clamp(80px,9.72vw,140px)]">
                {loading && !data && (
                    <div className={GRID} aria-busy="true" data-testid="artists-skeleton">
                        {Array.from({ length: 4 }, (_, i) => (
                            <div key={i} aria-hidden="true">
                                {/* The cards' work area, so the page does not jump when they load. */}
                                <div className="h-[200px] bg-surface-sunk md:h-[340px]" />
                                <div className="mt-step-4 h-4 w-2/3 bg-surface-sunk" />
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
                                    <ArtistCard artist={artist} artwork={artworkFor(artist, workList)} />
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
