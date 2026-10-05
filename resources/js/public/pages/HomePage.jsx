import { Fragment, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { formatDate, formatDateRange, formatMonthYear } from '../lib/format.js';
import { getHomepage } from '../services/homepage.js';
import { listArticles } from '../services/articles.js';
import { useJournalOpen } from '../layout/SiteDataContext.jsx';
import HomeWall from '../components/HomeWall.jsx';
import ScaledArtworkGrid from '../components/ScaledArtworkGrid.jsx';
import ErrorState from '../components/ErrorState.jsx';
import ExhibitionRow from '../components/ExhibitionRow.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import ArtistCard from '../components/ArtistCard.jsx';

const LATEST_ARTICLES = 3;

// Section keys are free-form admin data, not a fixed backend enum: look known sections up by key (never by
// position — the hero can be deactivated, renamed or reordered) and ignore every other key.
function findSection(page, key) {
    return page?.sections?.find((section) => section.key === key);
}

function SectionCopy({ section, headingClassName, as: Heading }) {
    return (
        <div>
            {section.heading && <Heading className={headingClassName}>{section.heading}</Heading>}
            {section.body && <p className="mt-step-3 max-w-prose font-editorial text-reading text-ink-muted">{section.body}</p>}
        </div>
    );
}

/**
 * The parts of the hero's stats line from `homepage.stats` ("8 əsər kataloqda", "4 rəssam təmsil olunur",
 * "aprel 2027 sərgi"), shown middle-dot separated. The exhibition part is the month of the first current (else
 * upcoming) exhibition and drops when there is none. Without stats (missing, or no positive count): null, no line.
 */
export function heroStats(data, locale) {
    const stats = data?.stats;
    const count = (n) => (typeof n === 'number' && n > 0 ? n : null);
    const parts = [
        count(stats?.artworks) && t(locale, 'home.statsArtworks').replace('{n}', stats.artworks),
        count(stats?.artists) && t(locale, 'home.statsArtists').replace('{n}', stats.artists),
    ].filter(Boolean);
    if (parts.length === 0) return null;

    const show = data.exhibitions?.current?.[0] ?? data.exhibitions?.upcoming?.[0] ?? (data.exhibitions ? null : data.exhibition);
    const month = show ? formatMonthYear(show.start_date, locale) : null;
    if (month) parts.push(t(locale, 'home.statsExhibition').replace('{date}', month));

    return parts;
}

// Sections are set apart by the step-9 rhythm and their labels, not by rules between them.
function Block({ id, label, title, children }) {
    return (
        <section aria-labelledby={id}>
            <div className="mb-step-6">
                <SectionHeading id={id} label={label}>{title}</SectionHeading>
            </div>
            {children}
        </section>
    );
}

/**
 * The current exhibition as a wine band across the full width (out of the page gutter), filled from inside with
 * step-8. It keeps the page's step-9 gaps above and below: flush, the featured works' prices sat on its top edge and
 * the next label on its bottom edge. Wine is a brand surface, not Signal: only wine-ink and wine-ink-muted on it.
 */
function CurrentShowBlock({ exhibition, locale }) {
    const dates = formatDateRange(exhibition.start_date, exhibition.end_date, locale);

    return (
        <section aria-labelledby="home-current-show" data-surface="wine" data-testid="home-current-show" className="-mx-page bg-wine px-page py-step-8 text-wine-ink">
            <p className="mb-step-2 text-label text-wine-ink-muted">{t(locale, 'home.currentExhibition')}</p>
            <h2 id="home-current-show" className="text-heading">{exhibition.title}</h2>
            {(dates || exhibition.venue) && (
                <p className="figures mt-step-3 text-meta text-wine-ink-muted">{[dates, exhibition.venue].filter(Boolean).join(' · ')}</p>
            )}
            {exhibition.short_text && <p className="mt-step-5 max-w-prose font-editorial text-reading">{exhibition.short_text}</p>}
            <a href={`/exhibitions/${encodeURIComponent(exhibition.slug)}`} className="mt-step-5 inline-flex min-h-11 items-center text-ui text-wine-ink underline decoration-1 underline-offset-4">
                {t(locale, 'home.aboutExhibition')}
            </a>
        </section>
    );
}

function Skeleton() {
    return (
        <div className="px-page pt-step-8 pb-step-9" aria-busy="true" data-testid="home-skeleton">
            <div aria-hidden="true" className="flex flex-col gap-step-4">
                <div className="h-12 w-2/3 bg-surface-field" />
                <div className="h-4 w-1/2 bg-surface-field" />
                <div className="mt-step-6 flex items-end gap-step-7">
                    {[[220, 170], [180, 130], [120, 150], [90, 70]].map(([w, h], i) => (
                        <div key={i} className="border border-line bg-surface-field" style={{ width: w, height: h }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * The home page: the hero (text only, text-hero), the wall of works at true size (on the first screen), the featured
 * works, the current exhibition as a wine band, the artists, the other exhibitions, the latest journal articles, the
 * "how it works" copy and the FAQs, and the contact block. Sections are step-9 apart, each with a small label over its
 * heading. Blocks without data are left out entirely. All copy comes from the API. Signal on this screen: the active
 * "Ana səhifə" only (the logo is wine) — none in the blocks, so room stays for an error.
 */
export default function HomePage() {
    const { locale } = useLocale();
    const [retryToken, setRetryToken] = useState(0);
    const { data, loading, error } = useApiData(() => getHomepage(locale), [locale, retryToken]);
    const articles = useApiData(() => listArticles(locale, { per_page: LATEST_ARTICLES }), [locale]);
    const journalOpen = useJournalOpen();

    const hero = findSection(data?.page, 'hero');
    const steps = findSection(data?.page, 'steps');
    const cta = findSection(data?.page, 'cta');
    // A hero heading that already IS the site name (a legitimate admin choice) would otherwise double up as
    // "ArtNiyyətli | ArtNiyyətli"; every other case keeps the "Page Title | ArtNiyyətli" convention.
    const heroTitle = hero?.heading?.trim();
    const homeTitle = heroTitle && heroTitle.toLocaleLowerCase('az') !== 'artniyyətli' ? `${heroTitle} | ArtNiyyətli` : 'ArtNiyyətli';

    usePageMeta({
        title: data ? homeTitle : undefined,
        description: data ? hero?.body : undefined,
    });

    // The current exhibition gets the wine block; the first current one, or the single legacy `exhibition` when it is
    // current. It is then left out of the list below, so it is not shown twice.
    const currentShow = data
        ? (data.exhibitions?.current?.[0] ?? (!data.exhibitions && data.exhibition?.status === 'current' ? data.exhibition : null))
        : null;
    const notFeaturedShow = (exhibition) => exhibition.slug !== currentShow?.slug;

    // `exhibitions` ({current, upcoming}) is the homepage list; the single `exhibition` is only the fallback for a
    // response that predates it (e.g. one still cached from before the API change).
    const exhibitionGroups = (data
        ? data.exhibitions
            ? [
                  { key: 'current', heading: t(locale, 'home.currentExhibitions'), items: data.exhibitions.current ?? [] },
                  { key: 'upcoming', heading: t(locale, 'home.upcomingExhibitions'), items: data.exhibitions.upcoming ?? [] },
              ]
            : data.exhibition
              ? [{ key: 'single', heading: null, items: [data.exhibition] }]
              : []
        : []
    )
        .map((group) => ({ ...group, items: group.items.filter(notFeaturedShow) }))
        .filter((group) => group.items.length > 0);

    if (loading && !data) return <Skeleton />;
    if (error) return <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />;

    const wall = Array.isArray(data.wall) ? data.wall : [];
    const featured = Array.isArray(data.featured) ? data.featured : [];
    const artists = Array.isArray(data.artists) ? data.artists : [];
    const faqs = Array.isArray(data.faqs) ? data.faqs : [];
    // A closed journal (no "articles" menu item) shows no articles block, even with published articles.
    const latest = journalOpen === true && Array.isArray(articles.data) ? articles.data.slice(0, LATEST_ARTICLES) : [];
    const statsParts = heroStats(data, locale);

    return (
        <div className="flex flex-col gap-step-9 px-page pt-step-8 pb-step-9 font-ui">
            {/* Text on the plain surface; with the section's image, a second column from 1024px. The image's height
                follows the viewport (17%, about the text block's own height), so the wall stays on the first screen. Below 1024px
                there is no second column and a full-width 4:3 image would push the wall off the first screen, so the
                image is not shown there. */}
            {hero && (
                <section
                    aria-label={hero.heading || undefined}
                    data-testid="home-hero"
                    className={hero.image_url ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-step-8' : ''}
                >
                    <div>
                        {hero.heading && <h1 className="text-hero">{hero.heading}</h1>}
                        {hero.body && <p className="mt-step-4 max-w-prose font-editorial text-lead text-ink-muted">{hero.body}</p>}
                        {/* Each part keeps together; a narrow screen breaks the line only at the middle dots. */}
                        {statsParts && (
                            <p className="figures mt-step-3 text-meta text-ink-muted" data-testid="home-stats">
                                {statsParts.map((part, index) => (
                                    <Fragment key={part}>
                                        {index > 0 && ' · '}
                                        <span className="whitespace-nowrap">{part}</span>
                                    </Fragment>
                                ))}
                            </p>
                        )}
                    </div>
                    {hero.image_url && (
                        <div className="hidden aspect-[4/3] h-[clamp(140px,17vh,200px)] w-auto overflow-hidden border border-line bg-surface-field lg:block" data-testid="home-hero-image">
                            <img src={hero.image_url} alt={hero.heading || ''} loading="eager" fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
                        </div>
                    )}
                </section>
            )}

            {wall.length > 0 && (
                <section aria-labelledby="home-wall-title" className="-mt-step-5">
                    {/* The wall needs no big title: its label is its heading. */}
                    <h2 id="home-wall-title" className="mb-step-2 text-label text-ink-muted" data-testid="section-label">{t(locale, 'labels.wall')}</h2>
                    <HomeWall artworks={wall} />
                </section>
            )}

            {/* The admin's "featured" flag must show somewhere: a true-size grid, at its own k (its scale rule says so). */}
            {featured.length > 0 && (
                <Block id="home-featured" label={t(locale, 'labels.collection')} title={t(locale, 'home.featured')}>
                    <ScaledArtworkGrid artworks={featured} />
                </Block>
            )}

            {currentShow && <CurrentShowBlock exhibition={currentShow} locale={locale} />}

            {artists.length > 0 && (
                <Block id="home-artists" label={t(locale, 'labels.representation')} title={t(locale, 'home.artists')}>
                    {/* The artists list's own card: 4:5 portrait, name, direction. 4 / 3 / 3 columns, and two below
                        640px: here the portraits are a summary (on the artists page, one column: they are the content). */}
                    <ul className="grid grid-cols-2 gap-x-step-4 gap-y-step-6 sm:gap-x-step-6 sm:gap-y-step-7 md:grid-cols-3 xl:grid-cols-4" data-testid="home-artists">
                        {artists.map((artist) => (
                            <li key={artist.slug}>
                                <ArtistCard artist={artist} />
                            </li>
                        ))}
                    </ul>
                </Block>
            )}

            {exhibitionGroups.length > 0 && (
                <Block id="home-exhibitions" label={t(locale, 'labels.calendar')} title={t(locale, 'nav.exhibitions')}>
                    <div className="flex flex-col gap-step-7">
                        {exhibitionGroups.map(({ key, heading, items }) => (
                            <div key={key}>
                                {heading && <h3 className="mb-step-3 text-subheading">{heading}</h3>}
                                <ul className="border-t border-line">
                                    {items.map((exhibition) => <ExhibitionRow key={exhibition.slug} exhibition={exhibition} />)}
                                </ul>
                            </div>
                        ))}
                    </div>
                </Block>
            )}

            {latest.length > 0 && (
                <Block id="home-articles" label={t(locale, 'labels.journal')} title={t(locale, 'home.articles')}>
                    <ul className="grid grid-cols-1 gap-step-6 md:grid-cols-3">
                        {latest.map((article) => (
                            <li key={article.slug}>
                                <a href={`/articles/${encodeURIComponent(article.slug)}`} className="group flex flex-col gap-step-2 text-ink">
                                    <span className="figures text-caption text-ink-muted">{formatDate(article.published_at, locale)}</span>
                                    <span className="text-subheading decoration-1 underline-offset-2 group-hover:underline">{article.title}</span>
                                    {article.short_text && <span className="font-editorial text-reading-sm text-ink-muted">{article.short_text}</span>}
                                </a>
                            </li>
                        ))}
                    </ul>
                </Block>
            )}

            {/* The admin's "how it works" copy, next to the questions it answers. */}
            {steps && <SectionCopy section={steps} as="h2" headingClassName="text-heading" />}

            {faqs.length > 0 && (
                <Block id="home-faqs" title={t(locale, 'home.faqs')}>
                    <dl className="flex max-w-prose flex-col gap-step-5">
                        {faqs.map((faq) => (
                            <div key={faq.id}>
                                <dt className="text-byline-lg">{faq.question}</dt>
                                <dd className="mt-step-1 font-editorial text-reading-sm text-ink-muted">{faq.answer}</dd>
                            </div>
                        ))}
                    </dl>
                </Block>
            )}

            <section aria-labelledby="home-contact">
                <SectionHeading id="home-contact" label={t(locale, 'labels.contact')}>{cta?.heading || t(locale, 'home.contact')}</SectionHeading>
                {cta?.body && <p className="mt-step-3 max-w-prose font-editorial text-reading text-ink-muted">{cta.body}</p>}
                <a href="/contact" className="mt-step-5 inline-block bg-wine px-step-5 py-step-3 text-ui text-wine-ink">
                    {t(locale, 'home.contact')}
                </a>
            </section>
        </div>
    );
}
