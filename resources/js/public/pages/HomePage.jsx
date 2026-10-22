import { Fragment, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { formatDate, formatDateRange } from '../lib/format.js';
import { artworkFor } from '../lib/artists.js';
import { getHomepage } from '../services/homepage.js';
import { listArticles } from '../services/articles.js';
import { useJournalOpen } from '../layout/SiteDataContext.jsx';
import ErrorState from '../components/ErrorState.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import ArtistCard from '../components/ArtistCard.jsx';
import FeaturedRow from '../components/FeaturedRow.jsx';
import Emphasis, { plainText } from '../components/Emphasis.jsx';

const LATEST_ARTICLES = 3;

// The site's name in both spellings, lower case: the page titles' "ArtNiyyətli" and the logo's "Art Niyyätli".
const SITE_NAMES = ['artniyyətli', 'art niyyätli'];

// The space between the home page's sections: 180px at 1440, 96px at 375 (12.5vw in between).
const SECTION_GAP = 'gap-[clamp(96px,12.5vw,180px)]';

// Section keys are free-form admin data, not a fixed backend enum: look known sections up by key (never by
// position — the hero can be deactivated, renamed or reordered) and ignore every other key.
function findSection(page, key) {
    return page?.sections?.find((section) => section.key === key);
}

/**
 * The parts of the statement's meta line from `homepage.stats`: "12 əsər", "4 rəssam", shown middle-dot separated.
 * A missing or zero count is left out; with neither: null, no line.
 */
export function statementMeta(data, locale) {
    const stats = data?.stats;
    const count = (n) => (typeof n === 'number' && n > 0 ? n : null);
    const parts = [
        count(stats?.artworks) && t(locale, 'home.metaArtworks').replace('{n}', stats.artworks),
        count(stats?.artists) && t(locale, 'home.metaArtists').replace('{n}', stats.artists),
    ].filter(Boolean);

    return parts.length > 0 ? parts : null;
}

/** A plain text link with the line under it, on a 44px touch box. */
function LineLink({ href, children, className = '' }) {
    return (
        <a href={href} className={`inline-flex min-h-11 shrink-0 items-center text-meta text-ink ${className}`}>
            <span className="link-line">{children}</span>
        </a>
    );
}

/** A section: the small label over its light h2 on the left, a "Bütün …" link on the label's line on the right. */
function Block({ id, label, title, link, children }) {
    return (
        <section aria-labelledby={id}>
            <div className="mb-step-7 flex items-baseline justify-between gap-step-5">
                <SectionHeading id={id} label={label}>{title}</SectionHeading>
                {link && <LineLink href={link.href}>{link.label}</LineLink>}
            </div>
            {children}
        </section>
    );
}

/**
 * The hero: the section's photograph across the full width, as it is — no overlay, no text on it — min(78vh, 760px)
 * tall (60vh on phones), cover-cropped. Under it, on the page gutter, one line: the current exhibition's title
 * (Spectral italic 22px) over its artists, dates and city (12px, ink-muted), and "Sərgiyə bax" on the right (below it
 * on phones). Without a current exhibition the line holds the hero's heading and subheading. The page's h1 is the
 * hero heading: visible in that fallback, for screen readers only when the exhibition takes the line.
 */
function Hero({ hero, show, locale }) {
    const image = hero?.image_url;
    const heading = hero?.heading;
    const dates = show ? formatDateRange(show.start_date, show.end_date, locale) : null;
    const names = show && Array.isArray(show.artists) ? show.artists.map((artist) => artist.name).filter(Boolean).join(', ') : '';
    const showMeta = show ? [names, dates, show.venue].filter(Boolean).join(' · ') : '';

    if (!image && !show && !heading && !hero?.body) return null;

    return (
        <section aria-label={plainText(heading) || show?.title || undefined} data-testid="home-hero" className={image ? undefined : 'pt-step-8'}>
            {image && (
                <div className="-mx-page">
                    <img
                        src={image}
                        alt=""
                        aria-hidden="true"
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                        data-testid="home-hero-image"
                        className="block h-[60vh] w-full object-cover md:h-[min(78vh,760px)]"
                    />
                </div>
            )}
            <div className="mt-step-5 flex flex-col items-start gap-step-2 md:flex-row md:items-end md:justify-between md:gap-step-6" data-testid="home-hero-line">
                {show ? (
                    <div className="min-w-0">
                        {heading && <h1 className="sr-only">{plainText(heading)}</h1>}
                        <p className="font-editorial text-[22px] leading-[1.3] italic">{show.title}</p>
                        {showMeta && <p className="figures mt-step-1 text-label text-ink-muted">{showMeta}</p>}
                    </div>
                ) : (
                    <div className="min-w-0">
                        {heading && <h1 className="font-editorial text-[22px] leading-[1.3] italic"><Emphasis text={heading} /></h1>}
                        {hero?.body && <p className="mt-step-1 text-label text-ink-muted">{hero.body}</p>}
                    </div>
                )}
                {show && <LineLink href={`/exhibitions/${encodeURIComponent(show.slug)}`}>{t(locale, 'home.viewExhibition')}</LineLink>}
            </div>
        </section>
    );
}

/** The statement: the hero's subheading as one large light sentence, then "12 əsər · 4 rəssam" in 12px ink-muted. */
function Statement({ text, meta }) {
    if (!text && !meta) return null;

    return (
        <section data-testid="home-statement">
            {text && <p className="max-w-[900px] font-editorial text-[clamp(30px,3.2vw,46px)] leading-[1.22] font-light">{text}</p>}
            {meta && (
                <p className={`figures text-label text-ink-muted ${text ? 'mt-step-5' : ''}`} data-testid="home-stats">
                    {meta.map((part, index) => (
                        <Fragment key={part}>
                            {index > 0 && ' · '}
                            <span className="whitespace-nowrap">{part}</span>
                        </Fragment>
                    ))}
                </p>
            )}
        </section>
    );
}

/**
 * The current exhibition: its cover (the first photo) on the left, 1.55 : 1 against the text, 72px apart and
 * bottom-aligned; on phones the cover above the text. The text: the label, the title (h2), the dates and city, the
 * short text (Spectral 300, 17px) and "Sərgi haqqında". No wine band. Without a cover, the text alone.
 */
function CurrentShow({ show, locale }) {
    const cover = Array.isArray(show.media) ? show.media.find((item) => item.type === 'photo' && item.url)?.url : null;
    const dates = formatDateRange(show.start_date, show.end_date, locale);

    return (
        <section
            aria-labelledby="home-current-show"
            data-testid="home-current-show"
            className={cover ? 'grid grid-cols-1 gap-step-6 md:grid-cols-[1.55fr_1fr] md:items-end md:gap-[72px]' : undefined}
        >
            {cover && <img src={cover} alt={show.title} loading="lazy" decoding="async" className="block h-auto w-full" data-testid="home-current-show-cover" />}
            <div className="min-w-0">
                <SectionHeading id="home-current-show" label={t(locale, 'home.currentExhibition')}>{show.title}</SectionHeading>
                {(dates || show.venue) && <p className="figures mt-step-3 text-label text-ink-muted">{[dates, show.venue].filter(Boolean).join(' · ')}</p>}
                {show.short_text && <p className="mt-step-5 max-w-prose font-editorial text-reading font-light">{show.short_text}</p>}
                <LineLink href={`/exhibitions/${encodeURIComponent(show.slug)}`} className="mt-step-4">{t(locale, 'home.aboutExhibition')}</LineLink>
            </div>
        </section>
    );
}

function Skeleton() {
    return (
        <div className="px-page pb-step-9" aria-busy="true" data-testid="home-skeleton">
            <div aria-hidden="true" className="flex flex-col gap-step-4">
                <div className="-mx-page h-[60vh] bg-surface-field md:h-[min(78vh,760px)]" />
                <div className="h-5 w-1/3 bg-surface-field" />
                <div className="h-3 w-1/2 bg-surface-field" />
            </div>
        </div>
    );
}

/**
 * The home page, gallery-style: large space, colour only in the works. Top to bottom: the hero photograph with the
 * current exhibition's line under it, the statement, the current exhibition, the featured works in one true-size row,
 * the artists (each card one of their works), and the journal ("Qeydlər"). Sections are 180px apart at 1440 (96px on
 * phones). Blocks without data are left out entirely; a closed journal shows no journal block. All copy comes from the
 * API. No Signal on this screen, so room stays for an error.
 */
export default function HomePage() {
    const { locale } = useLocale();
    const [retryToken, setRetryToken] = useState(0);
    const { data, loading, error } = useApiData(() => getHomepage(locale), [locale, retryToken]);
    const articles = useApiData(() => listArticles(locale, { per_page: LATEST_ARTICLES }), [locale]);
    const journalOpen = useJournalOpen();

    const hero = findSection(data?.page, 'hero');
    // A hero heading that already IS the site name (a legitimate admin choice) would otherwise double up as
    // "ArtNiyyətli | ArtNiyyətli"; every other case keeps the "Page Title | ArtNiyyətli" convention. The name as the
    // logo spells it ("Art Niyyätli") counts as the site name too, so that heading leaves the title as it was.
    const heroTitle = hero?.heading ? plainText(hero.heading).trim() : undefined;
    const isSiteName = (text) => SITE_NAMES.includes(text.toLocaleLowerCase('az').replace(/\s+/g, ' '));
    const homeTitle = heroTitle && !isSiteName(heroTitle) ? `${heroTitle} | ArtNiyyətli` : 'ArtNiyyətli';

    usePageMeta({
        title: data ? homeTitle : undefined,
        description: data ? hero?.body : undefined,
    });

    if (loading && !data) return <Skeleton />;
    if (error) return <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />;

    // The first current exhibition, or the single legacy `exhibition` when it is current (a response that predates the
    // `exhibitions` lists).
    const currentShow = data.exhibitions?.current?.[0] ?? (!data.exhibitions && data.exhibition?.status === 'current' ? data.exhibition : null);
    const featured = Array.isArray(data.featured) ? data.featured : [];
    const artists = Array.isArray(data.artists) ? data.artists : [];
    // The works this response already carries, for the artist cards: featured first, then the wall and the shows.
    const loadedWorks = [
        ...featured,
        ...(Array.isArray(data.wall) ? data.wall : []),
        ...[...(data.exhibitions?.current ?? []), ...(data.exhibitions?.upcoming ?? [])].flatMap((show) => (Array.isArray(show.artworks) ? show.artworks : [])),
    ];
    // A closed journal (no "articles" menu item) shows no articles block, even with published articles.
    const latest = journalOpen === true && Array.isArray(articles.data) ? articles.data.slice(0, LATEST_ARTICLES) : [];

    return (
        <div className={`flex flex-col ${SECTION_GAP} px-page pb-[clamp(96px,12.5vw,180px)] font-ui`}>
            <Hero hero={hero} show={currentShow} locale={locale} />

            <Statement text={hero?.body} meta={statementMeta(data, locale)} />

            {currentShow && <CurrentShow show={currentShow} locale={locale} />}

            {/* The old wall and the featured grid are one section now: the featured works, one row, one k. */}
            {featured.length > 0 && (
                <Block id="home-featured" label={t(locale, 'labels.collection')} title={t(locale, 'home.featured')} link={{ href: '/artworks', label: t(locale, 'home.allArtworks') }}>
                    <FeaturedRow artworks={featured} />
                </Block>
            )}

            {artists.length > 0 && (
                <Block id="home-artists-title" label={t(locale, 'labels.representation')} title={t(locale, 'home.artists')} link={{ href: '/artists', label: t(locale, 'home.allArtists') }}>
                    <ul className="grid grid-cols-2 gap-x-step-4 gap-y-step-7 md:grid-cols-4 md:gap-x-step-6" data-testid="home-artists">
                        {artists.map((artist) => (
                            <li key={artist.slug}>
                                <ArtistCard artist={artist} artwork={artworkFor(artist, loadedWorks)} />
                            </li>
                        ))}
                    </ul>
                </Block>
            )}

            {latest.length > 0 && (
                <Block id="home-articles" label={t(locale, 'labels.journal')} title={t(locale, 'home.notes')} link={{ href: '/articles', label: t(locale, 'home.allArticles') }}>
                    <ul className="grid grid-cols-1 gap-step-7 border-t border-line pt-step-6 md:grid-cols-3 md:gap-step-6" data-testid="home-articles-list">
                        {latest.map((article) => (
                            <li key={article.slug}>
                                <a href={`/articles/${encodeURIComponent(article.slug)}`} className="group block text-ink">
                                    <span className="figures block text-label text-ink-muted">{formatDate(article.published_at, locale)}</span>
                                    <span className="mt-step-3 block font-editorial text-[24px] leading-[1.25] font-light decoration-1 underline-offset-4 group-hover:underline">{article.title}</span>
                                    {article.short_text && <span className="mt-step-3 block text-meta text-ink-muted">{article.short_text}</span>}
                                </a>
                            </li>
                        ))}
                    </ul>
                </Block>
            )}
        </div>
    );
}
