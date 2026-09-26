import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { formatDate, formatDateRange } from '../lib/format.js';
import { getHomepage } from '../services/homepage.js';
import { listArticles } from '../services/articles.js';
import HomeWall from '../components/HomeWall.jsx';
import ErrorState from '../components/ErrorState.jsx';

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

function Block({ id, title, children }) {
    return (
        <section aria-labelledby={id} className="border-t border-line pt-step-6">
            <h2 id={id} className="mb-step-6 text-heading">{title}</h2>
            {children}
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
 * The home page, in the order of the brief: a short introduction (the "hero" section), the wall of works at true
 * size (on the first screen), the artists, current and upcoming exhibitions, the latest journal articles, and the
 * contact block. Blocks without data are left out entirely. All copy comes from the API. Signal on this screen: the
 * brand and the active "Ana səhifə" only — none in the blocks, so a third stays free for an error.
 */
export default function HomePage() {
    const { locale } = useLocale();
    const [retryToken, setRetryToken] = useState(0);
    const { data, loading, error } = useApiData(() => getHomepage(locale), [locale, retryToken]);
    const articles = useApiData(() => listArticles(locale, { per_page: LATEST_ARTICLES }), [locale]);

    const hero = findSection(data?.page, 'hero');
    const steps = findSection(data?.page, 'steps');
    const cta = findSection(data?.page, 'cta');
    usePageMeta({
        title: data ? (hero ? `${hero.heading} — ArtNiyyətli` : 'ArtNiyyətli') : undefined,
        description: data ? hero?.body : undefined,
    });

    // `exhibitions` ({current, upcoming}) is the homepage list; the single `exhibition` is only the fallback for a
    // response that predates it (e.g. one still cached from before the API change).
    const exhibitionGroups = data
        ? data.exhibitions
            ? [
                  { key: 'current', heading: t(locale, 'home.currentExhibitions'), items: data.exhibitions.current ?? [] },
                  { key: 'upcoming', heading: t(locale, 'home.upcomingExhibitions'), items: data.exhibitions.upcoming ?? [] },
              ].filter((group) => group.items.length > 0)
            : data.exhibition
              ? [{ key: 'single', heading: null, items: [data.exhibition] }]
              : []
        : [];

    if (loading && !data) return <Skeleton />;
    if (error) return <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />;

    const wall = Array.isArray(data.wall) ? data.wall : [];
    const artists = Array.isArray(data.artists) ? data.artists : [];
    const faqs = Array.isArray(data.faqs) ? data.faqs : [];
    const latest = Array.isArray(articles.data) ? articles.data.slice(0, LATEST_ARTICLES) : [];

    return (
        <div className="flex flex-col gap-step-9 px-page pt-step-7 pb-step-9 font-ui">
            {hero && (
                <section aria-label={hero.heading || undefined}>
                    {hero.heading && <h1 className="text-display">{hero.heading}</h1>}
                    {hero.body && <p className="mt-step-4 max-w-prose font-editorial text-lead text-ink-muted">{hero.body}</p>}
                </section>
            )}

            {wall.length > 0 && (
                <section aria-labelledby="home-wall-title" className="-mt-step-5">
                    <h2 id="home-wall-title" className="sr-only">{t(locale, 'home.wall')}</h2>
                    <HomeWall artworks={wall} />
                </section>
            )}

            {steps && <SectionCopy section={steps} as="h2" headingClassName="text-heading" />}

            {artists.length > 0 && (
                <Block id="home-artists" title={t(locale, 'home.artists')}>
                    <ul className="grid grid-cols-1 gap-x-step-6 gap-y-step-5 sm:grid-cols-2 lg:grid-cols-4">
                        {artists.map((artist) => (
                            <li key={artist.slug}>
                                <a href={`/artists/${encodeURIComponent(artist.slug)}`} className="group flex items-start gap-step-3 text-ink">
                                    {artist.portrait_url && <img src={artist.portrait_url} alt="" loading="lazy" decoding="async" className="h-16 w-16 shrink-0 border border-line object-cover" />}
                                    <span className="flex flex-col">
                                        <span className="text-byline-lg decoration-1 underline-offset-2 group-hover:underline">{[artist.first_name, artist.last_name].filter(Boolean).join(' ')}</span>
                                        {artist.direction && <span className="text-meta text-ink-muted">{artist.direction}</span>}
                                    </span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </Block>
            )}

            {exhibitionGroups.length > 0 && (
                <Block id="home-exhibitions" title={t(locale, 'nav.exhibitions')}>
                    <div className="flex flex-col gap-step-7">
                        {exhibitionGroups.map(({ key, heading, items }) => (
                            <div key={key}>
                                {heading && <h3 className="mb-step-3 text-subheading">{heading}</h3>}
                                <ul className="border-t border-line">
                                    {items.map((exhibition) => (
                                        <li key={exhibition.slug} className="border-b border-line">
                                            <a href={`/exhibitions/${encodeURIComponent(exhibition.slug)}`} className="group grid gap-step-1 py-step-4 text-ink md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_auto] md:items-baseline md:gap-step-5">
                                                <span className="text-byline-lg decoration-1 underline-offset-2 group-hover:underline">{exhibition.title}</span>
                                                <span className="figures text-meta text-ink-muted">{formatDateRange(exhibition.start_date, exhibition.end_date, locale)}</span>
                                                <span className="text-meta text-ink-muted">{exhibition.venue}</span>
                                                {/* Status in ink with a hairline border — never Signal, "current" included. */}
                                                <span className="w-fit border border-line-strong px-step-2 py-0.5 text-caption text-ink">{t(locale, `exhibitions.${exhibition.status === 'past' ? 'archive' : exhibition.status}`)}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </Block>
            )}

            {latest.length > 0 && (
                <Block id="home-articles" title={t(locale, 'home.articles')}>
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

            <section aria-labelledby="home-contact" className="border-t border-line pt-step-6">
                <h2 id="home-contact" className="text-heading">{cta?.heading || t(locale, 'home.contact')}</h2>
                {cta?.body && <p className="mt-step-3 max-w-prose font-editorial text-reading text-ink-muted">{cta.body}</p>}
                <a href="/contact" className="mt-step-5 inline-block bg-wine px-step-5 py-step-3 text-ui text-wine-ink">
                    {t(locale, 'home.contact')}
                </a>
            </section>
        </div>
    );
}
