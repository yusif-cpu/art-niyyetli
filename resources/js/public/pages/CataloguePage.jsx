import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { activeFilterCount, parseQuery, toSearch } from '../lib/catalogueQuery.js';
import { listArtworks } from '../services/artworks.js';
import { listArtists } from '../services/artists.js';
import { listGenres, listMediums } from '../services/lookups.js';
import ScaledArtworkGrid from '../components/ScaledArtworkGrid.jsx';
import FilterBar from '../components/FilterBar.jsx';
import Pagination from '../components/Pagination.jsx';
import ErrorState from '../components/ErrorState.jsx';
import PageHeader from '../components/PageHeader.jsx';

// A fixed loading pattern (field sizes in px): static, no shimmer, never random.
const SKELETON = [[240, 180], [180, 140], [150, 190], [210, 150], [130, 100], [170, 130]];

function prefersReducedMotion() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The catalogue. Its whole state (filters, sort, page) lives in the URL query under the API's own parameter names:
 * a filter change REPLACES the history entry, a page change PUSHES one, and Back restores the previous page.
 * Signal budget on this screen: the header uses two (brand, active "Əsərlər"); the active-filter count is the third.
 */
export default function CataloguePage() {
    const { locale } = useLocale();
    const [query, setQuery] = useState(() => parseQuery(window.location.search));
    const [retryToken, setRetryToken] = useState(0);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const listRef = useRef(null);

    useEffect(() => {
        const onPopState = () => setQuery(parseQuery(window.location.search));
        window.addEventListener('popstate', onPopState);

        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const genres = useApiData(() => listGenres(locale), [locale]);
    const mediums = useApiData(() => listMediums(locale), [locale]);
    const artists = useApiData(() => listArtists(locale), [locale]);
    const search = toSearch(query);
    const artworks = useApiData(() => listArtworks(locale, query), [locale, search, retryToken]);

    usePageMeta({ title: `${t(locale, 'nav.artworks')} | ArtNiyyətli`, description: t(locale, 'catalogue.description') });

    function writeUrl(next, mode) {
        const nextSearch = toSearch(next);
        const method = mode === 'push' ? 'pushState' : 'replaceState';
        window.history[method](null, '', `${window.location.pathname}${nextSearch}`);
        setQuery(parseQuery(nextSearch));
    }

    function updateFilters(patch) {
        const next = { ...query, ...patch };
        delete next.page; // a new filter starts again at page 1
        writeUrl(next, 'replace');
    }

    function clearFilters() {
        writeUrl(query.sort ? { sort: query.sort } : {}, 'replace');
    }

    function changePage(page) {
        writeUrl({ ...query, page }, 'push');
        listRef.current?.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }

    const count = activeFilterCount(query);
    const total = artworks.meta?.total;
    // Past the last real page (e.g. a hand-edited ?page=5): the API returns an empty page, not an error, so this
    // reads like "no artworks match" unless told apart from a genuinely empty filter result.
    const outOfRange = Boolean(artworks.meta && artworks.meta.current_page > artworks.meta.last_page);
    const clearButton = count > 0 && (
        <button type="button" onClick={clearFilters} className="cursor-pointer text-meta text-ink-muted underline decoration-1 underline-offset-2 hover:text-ink">
            {t(locale, 'filters.clear')}
        </button>
    );

    return (
        <div className="px-page pb-step-9 font-ui">
            <PageHeader
                label={t(locale, 'labels.collection')}
                title={t(locale, 'nav.artworks')}
                description={t(locale, 'catalogue.description')}
                aside={typeof total === 'number' && (
                    <p className="figures text-meta text-ink-muted">
                        {total} {t(locale, 'catalogue.count')}
                    </p>
                )}
            />

            <div className="mt-step-6 lg:grid lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-step-8">
                <aside aria-labelledby="catalogue-filters-title">
                    <div className="flex flex-wrap items-baseline justify-between gap-step-3">
                        <h2 id="catalogue-filters-title" className="flex items-baseline gap-step-2 text-nav">
                            {t(locale, 'filters.title')}
                            {count > 0 && (
                                // An error on screen takes the Signal: the count (information) falls back to ink-muted.
                                <span className={`figures ${artworks.error ? 'text-ink-muted' : 'text-signal-ink'}`} data-testid="active-filter-count">
                                    {count}
                                    <span className="sr-only"> {t(locale, 'filters.activeCount')}</span>
                                </span>
                            )}
                        </h2>
                        <div className="flex items-baseline gap-step-4">
                            {clearButton}
                            <button
                                type="button"
                                aria-expanded={filtersOpen}
                                aria-controls="catalogue-filters"
                                onClick={() => setFiltersOpen((open) => !open)}
                                className="-my-step-3 inline-flex min-h-11 cursor-pointer items-center text-meta text-ink lg:hidden"
                            >
                                {t(locale, filtersOpen ? 'filters.hide' : 'filters.show')}
                            </button>
                        </div>
                    </div>
                    {/* Below lg the panel folds under the heading; no animation. */}
                    <div id="catalogue-filters" className={`${filtersOpen ? 'block' : 'hidden'} mt-step-5 lg:block`}>
                        <FilterBar filters={query} onChange={updateFilters} genres={genres.data || []} mediums={mediums.data || []} artists={artists.data || []} />
                    </div>
                </aside>

                <section ref={listRef} aria-busy={artworks.loading ? 'true' : 'false'} aria-label={t(locale, 'nav.artworks')} className="mt-step-7 scroll-mt-28 lg:mt-0">
                    {artworks.loading && (
                        <div className="flex flex-wrap items-end gap-x-step-5 gap-y-step-7" aria-hidden="true">
                            {SKELETON.map(([w, h], index) => (
                                <div key={index} className="border border-line bg-surface-field" style={{ width: w, height: h }} />
                            ))}
                        </div>
                    )}
                    {artworks.error && <ErrorState error={artworks.error} onRetry={() => setRetryToken((n) => n + 1)} />}
                    {!artworks.loading && !artworks.error && artworks.data?.length === 0 && outOfRange && (
                        <div className="flex flex-col items-start gap-step-3 py-step-6">
                            <p className="text-ui text-ink-muted">{t(locale, 'catalogue.pageOutOfRange')}</p>
                            <button type="button" onClick={() => changePage(1)} className="cursor-pointer text-meta text-ink underline decoration-1 underline-offset-2 hover:text-ink-muted">
                                {t(locale, 'catalogue.backToFirstPage')}
                            </button>
                        </div>
                    )}
                    {!artworks.loading && !artworks.error && artworks.data?.length === 0 && !outOfRange && (
                        <div className="flex flex-col items-start gap-step-3 py-step-6">
                            <p className="text-ui text-ink-muted">{t(locale, 'catalogue.empty')}</p>
                            {clearButton}
                        </div>
                    )}
                    {!artworks.loading && !artworks.error && artworks.data?.length > 0 && (
                        <>
                            <ScaledArtworkGrid artworks={artworks.data} />
                            <Pagination meta={artworks.meta} onPageChange={changePage} />
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
