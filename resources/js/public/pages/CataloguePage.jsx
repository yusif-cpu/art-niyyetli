import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { activeFilterCount, invalidRangePairs, parseQuery, toSearch } from '../lib/catalogueQuery.js';
import { listArtworks } from '../services/artworks.js';
import { listArtists } from '../services/artists.js';
import { listGenres, listMediums } from '../services/lookups.js';
import ScaledArtworkGrid from '../components/ScaledArtworkGrid.jsx';
import FilterBar from '../components/FilterBar.jsx';
import Pagination from '../components/Pagination.jsx';
import ErrorState from '../components/ErrorState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import WineCallout from '../components/WineCallout.jsx';
import { formatPrice } from '../lib/format.js';
import { PRESETS } from '../lib/wall.js';

// The catalogue's true-size grid without the side column: the widest work takes 30% of the width (180 cm ≈ 390px at
// 1440), not the 44% it took beside the filters.
const GRID_PRESET = { ...PRESETS.catalogue, share: 0.3 };

/**
 * The header band's figures, from one unfiltered catalogue answer: the number of works, of artists, the width range
 * ("40 – 180 sm") and the lowest price ("900 AZN-dən"). Only from a complete answer (every work on the one page);
 * otherwise only the total. null without data.
 */
export function collectionMeta(response, locale) {
    const works = Array.isArray(response?.data) ? response.data : null;
    const total = typeof response?.meta?.total === 'number' ? response.meta.total : works?.length;
    if (!works || typeof total !== 'number') return null;
    const label = (key) => t(locale, `pages.catalogue.${key}`);
    const items = [{ label: label('metaWorks'), value: String(total) }];
    if (works.length !== total || works.length === 0) return items;

    const artists = new Set(works.map((w) => w.artist?.id ?? w.artist?.slug).filter((id) => id !== undefined && id !== null));
    const widths = works.map((w) => w.width_cm).filter((n) => typeof n === 'number' && n > 0);
    const prices = works.filter((w) => w.availability !== 'sold').map((w) => w.price).filter((n) => typeof n === 'number' && n > 0);
    const currency = works.find((w) => w.price === Math.min(...prices))?.currency;
    if (artists.size > 0) items.push({ label: label('metaArtists'), value: String(artists.size) });
    if (widths.length > 0) {
        const unit = locale === 'en' ? 'cm' : 'sm';
        const [min, max] = [Math.min(...widths), Math.max(...widths)];
        items.push({ label: label('metaSize'), value: min === max ? `${min} ${unit}` : `${min} – ${max} ${unit}` });
    }
    if (prices.length > 0) items.push({ label: label('metaPrice'), value: label('priceFrom').replace('{price}', formatPrice(Math.min(...prices), currency)) });

    return items;
}

// A fixed loading pattern (field sizes in px): static, no shimmer, never random.
const SKELETON = [[240, 180], [180, 140], [150, 190], [210, 150], [130, 100], [170, 130]];

function prefersReducedMotion() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The catalogue. Its whole state (filters, sort, page) lives in the URL query under the API's own parameter names:
 * a filter change REPLACES the history entry, a page change PUSHES one, and Back restores the previous page.
 * No Signal on this screen until an error shows: the active-filter count is plain ink (colour belongs to the works).
 */
export default function CataloguePage() {
    const { locale } = useLocale();
    const [query, setQuery] = useState(() => parseQuery(window.location.search));
    // A snapshot taken once, from the URL the visitor actually arrived with (before parseQuery's cross-field
    // cleanup below ever runs): a hand-edited or shared link with price_max below price_min still needs its
    // validation message and its original values shown, even though the request itself must stay valid.
    const [invalidRanges] = useState(() => invalidRangePairs(window.location.search));
    const [retryToken, setRetryToken] = useState(0);
    const listRef = useRef(null);

    useEffect(() => {
        const onPopState = () => setQuery(parseQuery(window.location.search));
        window.addEventListener('popstate', onPopState);

        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    // The address bar must not go on showing a price_max/size_max that nothing is actually applying.
    useEffect(() => {
        if (Object.keys(invalidRanges).length > 0) {
            window.history.replaceState(null, '', `${window.location.pathname}${toSearch(query)}`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const genres = useApiData(() => listGenres(locale), [locale]);
    const mediums = useApiData(() => listMediums(locale), [locale]);
    const artists = useApiData(() => listArtists(locale), [locale]);
    const search = toSearch(query);
    const artworks = useApiData(() => listArtworks(locale, query), [locale, search, retryToken]);
    // The header's figures describe the whole collection: taken from an unfiltered first page that holds every work,
    // and kept while the visitor filters. Arriving on a filtered link, the band shows none (no extra request).
    const [collection, setCollection] = useState(null);
    const unfiltered = activeFilterCount(query) === 0 && !(query.page > 1);
    const completeAnswer = unfiltered && !artworks.loading && !artworks.error && Array.isArray(artworks.data) && artworks.meta?.total === artworks.data.length;
    useEffect(() => {
        if (completeAnswer) setCollection({ data: artworks.data, meta: artworks.meta, locale });
    }, [completeAnswer, artworks.data, artworks.meta, locale]);

    // Matches the server's own count-bearing description (PublicPageSeoResolver::catalogue()) once it is known, so
    // hydration does not swap the crawler-visible description for an unrelated static one; /catalogue is an alias
    // of this same page, so its canonical must keep pointing at /artworks, the one URL the server ever indexes.
    const seoDescription = typeof artworks.meta?.total === 'number'
        ? t(locale, 'catalogue.descriptionWithCount').replace('{count}', artworks.meta.total)
        : t(locale, 'catalogue.description');
    usePageMeta({ title: `${t(locale, 'nav.artworks')} | ArtNiyyətli`, description: seoDescription, canonicalPath: '/artworks' });

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
        <button type="button" onClick={clearFilters} className="cursor-pointer text-meta text-ink-muted link-line hover:text-ink">
            {t(locale, 'filters.clear')}
        </button>
    );

    const shown = typeof total === 'number' && (
        <p className="figures flex flex-wrap items-baseline gap-x-step-4 gap-y-step-1 text-meta text-ink-muted">
            <span>{t(locale, 'pages.catalogue.shown').replace('{n}', total)}</span>
            {count > 0 && (
                // Information, not an alert: ink, never Signal.
                <span className="text-ink" data-testid="active-filter-count">
                    {count}
                    <span className="sr-only"> {t(locale, 'filters.activeCount')}</span>
                </span>
            )}
            {clearButton}
        </p>
    );

    return (
        <div className="font-ui">
            <PageHeader
                label={t(locale, 'labels.collection')}
                title={t(locale, 'pages.catalogue.title')}
                description={t(locale, 'catalogue.description')}
                meta={collection?.locale === locale ? collectionMeta(collection, locale) : null}
            />

            {/* The filter strip on cream, a 1px line under it. */}
            <div className="border-b border-line px-page py-step-5">
                <h2 id="catalogue-filters-title" className="sr-only">{t(locale, 'filters.title')}</h2>
                <FilterBar filters={query} onChange={updateFilters} genres={genres.data || []} mediums={mediums.data || []} artists={artists.data || []} invalidRanges={invalidRanges} />
            </div>

            <section ref={listRef} aria-busy={artworks.loading ? 'true' : 'false'} aria-label={t(locale, 'nav.artworks')} className="scroll-mt-28 px-page pt-step-6 pb-[clamp(80px,9.72vw,140px)]">
                {artworks.loading && (
                    <div className="flex flex-wrap items-end gap-x-[56px] gap-y-step-7" aria-hidden="true">
                        {SKELETON.map(([w, h], index) => (
                            <div key={index} className="bg-surface-sunk" style={{ width: w, height: h }} />
                        ))}
                    </div>
                )}
                {/* Without a grid (loading, error, empty) the active-filter count still shows, on its own line. */}
                {count > 0 && !(artworks.data?.length > 0 && !artworks.loading && !artworks.error) && (
                    <p className="figures mb-step-5 text-meta text-ink" data-testid="active-filter-count">
                        {count}
                        <span className="sr-only"> {t(locale, 'filters.activeCount')}</span>
                    </p>
                )}
                {artworks.error && <ErrorState error={artworks.error} onRetry={() => setRetryToken((n) => n + 1)} />}
                {!artworks.loading && !artworks.error && artworks.data?.length === 0 && outOfRange && (
                    <div className="flex flex-col items-start gap-step-3 py-step-6">
                        <p className="text-ui text-ink-muted">{t(locale, 'catalogue.pageOutOfRange')}</p>
                        <button type="button" onClick={() => changePage(1)} className="cursor-pointer text-meta text-ink link-line hover:text-ink-muted">
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
                        <ScaledArtworkGrid artworks={artworks.data} preset={GRID_PRESET} lead={shown} />
                        <Pagination meta={artworks.meta} onPageChange={changePage} />
                    </>
                )}
            </section>

            <WineCallout
                id="catalogue-callout"
                label={t(locale, 'pages.catalogue.calloutLabel')}
                title={t(locale, 'pages.catalogue.calloutTitle')}
                text={t(locale, 'pages.catalogue.calloutText')}
                action={{ href: '/contact', label: t(locale, 'pages.catalogue.calloutButton') }}
            />
        </div>
    );
}
