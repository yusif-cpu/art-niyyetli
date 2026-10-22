import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { formatDateSpan, phoneHref } from '../lib/format.js';
import { artworkFor } from '../lib/artists.js';
import { buttonClass } from '../lib/buttons.js';
import { getHomepage } from '../services/homepage.js';
import { listArticles } from '../services/articles.js';
import { useJournalOpen, useSiteSettings } from '../layout/SiteDataContext.jsx';
import ErrorState from '../components/ErrorState.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import ArtistCard from '../components/ArtistCard.jsx';
import ArticleCard from '../components/ArticleCard.jsx';
import FeaturedRow from '../components/FeaturedRow.jsx';
import Emphasis, { plainText } from '../components/Emphasis.jsx';

const LATEST_ARTICLES = 3;

// The site's name in both spellings, lower case: the page titles' "ArtNiyyətli" and the logo's "Art Niyyätli".
const SITE_NAMES = ['artniyyətli', 'art niyyätli'];

// A section's vertical padding: 140px at 1440, 80px at 375 (9.72vw in between).
const SECTION_PAD = 'py-[clamp(80px,9.72vw,140px)]';

// Section keys are free-form admin data, not a fixed backend enum: look known sections up by key (never by
// position — the hero can be deactivated, renamed or reordered) and ignore every other key.
function findSection(page, key) {
    return page?.sections?.find((section) => section.key === key);
}

/**
 * The hero's stats from `homepage.stats`: [{ value: 12, label: 'əsər kolleksiyada' }, { value: 4, label: 'rəssam' }],
 * then the fixed "1:1 həqiqi ölçü". A missing or zero count is left out; with neither count: null, no row.
 */
export function heroStats(data, locale) {
    const stats = data?.stats;
    const count = (n) => (typeof n === 'number' && n > 0 ? n : null);
    const parts = [
        count(stats?.artworks) && { value: stats.artworks, label: t(locale, 'home.statArtworks') },
        count(stats?.artists) && { value: stats.artists, label: t(locale, 'home.statArtists') },
    ].filter(Boolean);
    if (parts.length === 0) return null;

    return [...parts, { value: t(locale, 'home.statScaleValue'), label: t(locale, 'home.statScale') }];
}

function exhibitionCover(show) {
    return Array.isArray(show?.media) ? show.media.find((item) => item.type === 'photo' && item.url)?.url ?? null : null;
}

/**
 * The hero, on wine: two columns (1.15fr | 1fr), at least 808px tall. Left: the current exhibition's line (a red dot,
 * "Cari sərgi", its title and dates, wine-muted), the h1 — the admin's hero heading with its `*word*` emphasis — the
 * subheading (Spectral 21px), "Kolleksiyaya bax" (primary) and "Sərgiyə keç" (secondary, only with a current show),
 * and the stats over a 1px line. Right: the hero photograph, the column's full height, cover-cropped to the edge.
 * Phones: the photograph on top (64vw tall, cropped at 35% from the top), the text under it.
 */
function Hero({ hero, show, stats, locale }) {
    const image = hero?.image_url;
    const heading = hero?.heading || show?.title;
    const dates = show ? formatDateSpan(show.start_date, show.end_date, locale, { year: false }) : null;
    const showHref = show ? `/exhibitions/${encodeURIComponent(show.slug)}` : null;

    if (!image && !heading && !hero?.body) return null;

    return (
        <section aria-label={plainText(heading) || undefined} data-testid="home-hero" data-surface="wine" className={`bg-wine text-surface md:grid md:min-h-[808px] ${image ? 'md:grid-cols-[1.15fr_1fr]' : ''}`}>
            {image && (
                <div className="relative h-[64vw] md:order-2 md:h-auto">
                    <img
                        src={image}
                        alt=""
                        aria-hidden="true"
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                        data-testid="home-hero-image"
                        className="absolute inset-0 block h-full w-full object-cover object-[center_35%] md:object-center"
                    />
                </div>
            )}
            <div className="flex flex-col px-page pt-step-8 pb-step-7 md:order-1 md:py-[96px]">
                {show && (
                    <p className="figures flex items-center gap-step-3 text-[13px] leading-[1.4] font-medium text-wine-muted max-md:text-[14px]" data-testid="home-hero-line">
                        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-brand" />
                        <span>{[t(locale, 'home.currentExhibition'), plainText(show.title), dates].filter(Boolean).join(' · ')}</span>
                    </p>
                )}
                {heading && (
                    <h1 className={`text-hero max-w-[12ch] text-surface ${show ? 'mt-step-6' : ''}`}>
                        <Emphasis text={heading} />
                    </h1>
                )}
                {hero?.body && <p className="mt-step-6 max-w-[34rem] font-editorial text-[19px] leading-[1.55] text-wine-muted md:text-[21px]">{hero.body}</p>}
                <div className="mt-step-7 flex flex-wrap gap-step-3">
                    <a href="/artworks" className={buttonClass('primary', 'wine')}>{t(locale, 'home.seeCollection')}</a>
                    {showHref && <a href={showHref} className={buttonClass('secondary', 'wine')}>{t(locale, 'home.toExhibition')}</a>}
                </div>
                {stats && (
                    // mt-auto pins the stats to the bottom of a tall hero; the padding keeps them clear of the buttons.
                    <div className="mt-step-8 md:mt-auto md:pt-step-8">
                    <dl className="grid grid-cols-3 gap-step-4 border-t border-surface/20 pt-step-6 md:flex md:gap-[56px]" data-testid="home-stats">
                        {stats.map((stat) => (
                            <div key={stat.label} className="flex flex-col-reverse justify-end">
                                <dt className="mt-step-1 text-[13px] leading-[1.35] text-wine-muted max-md:text-[14px]">{stat.label}</dt>
                                <dd className="figures text-[32px] leading-none font-semibold tracking-[-0.02em] md:text-[42px]">{stat.value}</dd>
                            </div>
                        ))}
                    </dl>
                    </div>
                )}
            </div>
        </section>
    );
}

/**
 * The current exhibition on a wine band: the cover (the first photo) on the left, 1.4 : 1 against the text, 80px
 * apart; on phones the cover above. The text: "02 · Cari sərgi", the title (66px), "dates · city · 4 rəssam, 6 əsər",
 * the short text (Spectral) and "Sərgiyə bax". Without a cover, the text alone.
 */
function CurrentShow({ show, number, locale }) {
    const cover = exhibitionCover(show);
    const dates = formatDateSpan(show.start_date, show.end_date, locale);
    const artists = Array.isArray(show.artists) ? show.artists.length : 0;
    const works = Array.isArray(show.artworks) ? show.artworks.length : 0;
    const counts = artists > 0 && works > 0 ? t(locale, 'home.showCounts').replace('{artists}', artists).replace('{works}', works) : null;

    return (
        <section aria-labelledby="home-current-show" data-testid="home-current-show" data-surface="wine" className={`bg-wine px-page text-surface ${SECTION_PAD}`}>
            <div className={cover ? 'grid grid-cols-1 gap-step-7 md:grid-cols-[1.4fr_1fr] md:items-center md:gap-[80px]' : undefined}>
                {cover && <img src={cover} alt={plainText(show.title)} loading="lazy" decoding="async" className="block aspect-[3/2] h-auto w-full object-cover" data-testid="home-current-show-cover" />}
                <div className="min-w-0">
                    <SectionHeading id="home-current-show" number={number} label={t(locale, 'home.currentExhibition')} tone="wine" className="text-[clamp(40px,4.6vw,66px)] leading-[1.02] font-bold tracking-[-0.035em]">
                        {show.title}
                    </SectionHeading>
                    {(dates || show.venue || counts) && <p className="figures mt-step-4 text-meta text-wine-muted">{[dates, show.venue, counts].filter(Boolean).join(' · ')}</p>}
                    {show.short_text && <p className="mt-step-5 max-w-prose font-editorial text-[18px] leading-[1.6] text-wine-muted">{show.short_text}</p>}
                    <a href={`/exhibitions/${encodeURIComponent(show.slug)}`} className={`mt-step-6 ${buttonClass('primary', 'wine')}`}>
                        {t(locale, 'home.viewExhibition')}
                    </a>
                </div>
            </div>
        </section>
    );
}

/** "Əsəri necə almaq olar": three wine-deep cards on a wine band, the dictionary's fixed text. */
function Steps({ number, locale }) {
    const steps = t(locale, 'home.steps');

    return (
        <section aria-labelledby="home-steps" data-testid="home-steps" data-surface="wine" className={`bg-wine px-page text-surface ${SECTION_PAD}`}>
            <SectionHeading id="home-steps" number={number} tone="wine">{t(locale, 'home.stepsTitle')}</SectionHeading>
            <ol className="mt-step-8 grid grid-cols-1 gap-step-5 md:grid-cols-3">
                {steps.map((step, index) => (
                    <li key={step.title} className="bg-wine-deep p-step-6 md:p-[40px]">
                        <span aria-hidden="true" className="figures block text-[56px] leading-none font-bold tracking-[-0.04em] text-surface md:text-[72px]">{String(index + 1).padStart(2, '0')}</span>
                        <h3 className="mt-step-6 text-[24px] leading-[1.2] font-semibold text-surface">{step.title}</h3>
                        <p className="mt-step-3 text-[15px] leading-[1.6] text-wine-muted">{step.text}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}

/** The closing call, on cream under a 1px line: the big question, a Spectral line, "Sorğu göndər" and the phone. */
function FinalCall({ locale, phone }) {
    const tel = phoneHref(phone);

    return (
        <section aria-labelledby="home-cta" data-testid="home-cta" className={`border-t border-line px-page text-center ${SECTION_PAD}`}>
            <h2 id="home-cta" className="mx-auto text-[clamp(44px,6.67vw,96px)] leading-[1] font-bold tracking-[-0.035em] text-wine">
                <Emphasis text={t(locale, 'home.ctaTitle')} />
            </h2>
            <p className="mt-step-5 font-editorial text-[19px] leading-[1.55] text-ink-muted">{t(locale, 'home.ctaText')}</p>
            <div className="mt-step-7 flex flex-wrap justify-center gap-step-3">
                <a href="/contact" className={buttonClass('primary', 'cream')}>{t(locale, 'home.ctaButton')}</a>
                {tel && <a href={tel} className={`figures ${buttonClass('secondary', 'cream')}`}>{phone}</a>}
            </div>
        </section>
    );
}

function Skeleton() {
    return (
        <div aria-busy="true" data-testid="home-skeleton">
            <div aria-hidden="true" className="bg-wine md:grid md:min-h-[808px] md:grid-cols-[1.15fr_1fr]">
                <div className="flex flex-col gap-step-4 px-page py-[96px]">
                    <div className="h-4 w-1/3 bg-wine-deep" />
                    <div className="h-16 w-3/4 bg-wine-deep" />
                    <div className="h-16 w-2/3 bg-wine-deep" />
                </div>
                <div className="h-[64vw] bg-wine-deep md:h-auto" />
            </div>
        </div>
    );
}

/**
 * The home page, krem-bordo: wine and cream sections take turns, titles are bold with one italic word, sections are
 * numbered, the main actions are buttons. Top to bottom: the hero (wine), 01 the featured works at true size (cream),
 * 02 the current exhibition (wine), 03 the artists (cream), 04 how to buy (wine), 05 the journal (cream), and the
 * closing call (cream). Sections are 140px apart at 1440 (80px on phones). A section without data is left out and the
 * numbers close up; a closed journal shows no journal section.
 */
export default function HomePage() {
    const { locale } = useLocale();
    const [retryToken, setRetryToken] = useState(0);
    const { data, loading, error } = useApiData(() => getHomepage(locale), [locale, retryToken]);
    const articles = useApiData(() => listArticles(locale, { per_page: LATEST_ARTICLES }), [locale]);
    const journalOpen = useJournalOpen();
    const settings = useSiteSettings();

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
    // A closed journal (no "articles" menu item) shows no articles section, even with published articles.
    const latest = journalOpen === true && Array.isArray(articles.data) ? articles.data.slice(0, LATEST_ARTICLES) : [];

    // Section numbers follow the sections actually shown.
    let counter = 0;
    const next = () => String(++counter).padStart(2, '0');

    return (
        <div className="font-ui">
            <Hero hero={hero} show={currentShow} stats={heroStats(data, locale)} locale={locale} />

            {featured.length > 0 && (
                <section aria-labelledby="home-featured" className={`px-page ${SECTION_PAD}`}>
                    <SectionHeading id="home-featured" number={next()} divider link={{ href: '/artworks', label: t(locale, 'home.allArtworks') }}>
                        {t(locale, 'home.featuredTitle')}
                    </SectionHeading>
                    <div className="mt-step-8">
                        <FeaturedRow artworks={featured} />
                    </div>
                </section>
            )}

            {currentShow && <CurrentShow show={currentShow} number={next()} locale={locale} />}

            {artists.length > 0 && (
                <section aria-labelledby="home-artists-title" className={`px-page ${SECTION_PAD}`}>
                    <SectionHeading id="home-artists-title" number={next()} divider link={{ href: '/artists', label: t(locale, 'home.allArtists') }}>
                        {t(locale, 'home.artistsTitle')}
                    </SectionHeading>
                    <ul className="mt-step-8 grid grid-cols-2 gap-x-step-4 gap-y-step-7 md:grid-cols-4 md:gap-x-step-5" data-testid="home-artists">
                        {artists.map((artist) => (
                            <li key={artist.slug}>
                                <ArtistCard artist={artist} artwork={artworkFor(artist, loadedWorks)} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <Steps number={next()} locale={locale} />

            {latest.length > 0 && (
                <section aria-labelledby="home-articles" className={`px-page ${SECTION_PAD}`}>
                    <SectionHeading id="home-articles" number={next()} divider link={{ href: '/articles', label: t(locale, 'home.allArticles') }}>
                        {t(locale, 'home.journalTitle')}
                    </SectionHeading>
                    <ul className="mt-step-8 grid grid-cols-1 gap-step-8 md:grid-cols-3 md:gap-step-6" data-testid="home-articles-list">
                        {latest.map((article) => (
                            <li key={article.slug}>
                                <ArticleCard article={article} size="lg" withText={false} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <FinalCall locale={locale} phone={settings?.phone} />
        </div>
    );
}

